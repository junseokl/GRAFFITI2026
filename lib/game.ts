import { sql } from "@/lib/db";
import { YIELD_CONFIG } from "@/config/yield";

// 플레이 가능한 라운드 순서 ('ended' 는 제외)
export const ROUND_ORDER = [
  "seed",
  "series-a",
  "series-b",
  "series-c",
] as const;

// ===== 수익률 공식 =====
// R(M) = ( μ_max − 2·μ_max / (1 + k1·M) ) + ( σ_base + σ_bonus / (1 + k2·M) ) · Z
//   Z ~ 정규분포 (표준), [-1, 1] 로 잘림

// 표준정규분포 샘플 (Box-Muller). |z|>1 이면 [-1, 1] 안의 값을 얻을 때까지 재시도.
function sampleTruncatedNormal(): number {
  for (let i = 0; i < 100; i++) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    if (z >= -1 && z <= 1) return z;
  }
  return 0; // 안전망 — 사실상 도달 불가
}

// 회사별 총 투자금 M 으로부터 수익률(%) 계산
function computeYieldPct(M: number): number {
  const { u_max, k1, k2, sigma_base, sigma_bonus } = YIELD_CONFIG;
  const mean = u_max - (2 * u_max) / (1 + k1 * M);
  const sigma = sigma_base + sigma_bonus / (1 + k2 * M);
  const Z = sampleTruncatedNormal();
  return mean + sigma * Z;
}

export type GameStateRow = {
  current_round: string;
  current_phase: string;
};

export async function readGameState(): Promise<GameStateRow> {
  const rows = (await sql`
    SELECT current_round, current_phase FROM game_state WHERE id = 1
  `) as GameStateRow[];
  if (!rows[0]) {
    throw new Error("게임 상태가 없습니다 — npm run db:init 을 실행하세요.");
  }
  return rows[0];
}

// 다음 단계 계산: idle → stock → results → matching → (다음 라운드) idle ...
export function computeNextState(
  round: string,
  phase: string,
): { round: string; phase: string } {
  if (round === "ended") return { round, phase };
  if (phase === "idle") return { round, phase: "stock" };
  if (phase === "stock") return { round, phase: "results" };
  if (phase === "results") return { round, phase: "matching" };
  if (phase === "matching") {
    const idx = (ROUND_ORDER as readonly string[]).indexOf(round);
    if (idx < 0 || idx >= ROUND_ORDER.length - 1) {
      return { round: "ended", phase: "idle" };
    }
    return { round: ROUND_ORDER[idx + 1], phase: "idle" };
  }
  return { round, phase };
}

// ===== 투자 (round 별) =====

export async function opSetInvestment(
  round: string,
  username: string,
  companyId: number,
  amount: number,
): Promise<void> {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("투자 금액은 0 이상의 정수여야 합니다");
  }

  const existing = (await sql`
    SELECT amount FROM investments
    WHERE round = ${round} AND team_username = ${username} AND company_id = ${companyId}
  `) as { amount: number }[];
  const prev = existing[0]?.amount ?? 0;
  const delta = amount - prev;

  if (delta > 0) {
    const teamRows = (await sql`
      SELECT seed FROM teams WHERE username = ${username}
    `) as { seed: number }[];
    const seed = teamRows[0]?.seed ?? 0;
    if (seed < delta) {
      throw new Error(`seed 가 부족합니다 (보유 ${seed}, 추가 필요 ${delta})`);
    }
  }

  if (delta !== 0) {
    await sql`UPDATE teams SET seed = seed - ${delta} WHERE username = ${username}`;
  }
  await sql`
    INSERT INTO investments (round, team_username, company_id, amount)
    VALUES (${round}, ${username}, ${companyId}, ${amount})
    ON CONFLICT (round, team_username, company_id)
    DO UPDATE SET amount = EXCLUDED.amount
  `;
}

export async function opClearInvestment(
  round: string,
  username: string,
  companyId: number,
): Promise<void> {
  const existing = (await sql`
    SELECT amount FROM investments
    WHERE round = ${round} AND team_username = ${username} AND company_id = ${companyId}
  `) as { amount: number }[];
  const prev = existing[0]?.amount ?? 0;

  if (prev > 0) {
    await sql`UPDATE teams SET seed = seed + ${prev} WHERE username = ${username}`;
  }
  await sql`
    DELETE FROM investments
    WHERE round = ${round} AND team_username = ${username} AND company_id = ${companyId}
  `;
}

// 주식 단계 정산: 회사별 총 투자금 M 으로 R(M) 을 계산해 수익률을 결정,
// 모든 투자에 적용하고 round_results 에 기록.
// 이미 정산된 라운드면 (round_results 존재) 아무것도 하지 않음 (중복 정산 방지).
export async function settleStockRound(round: string): Promise<void> {
  const already = (await sql`
    SELECT 1 FROM round_results WHERE round = ${round} LIMIT 1
  `) as unknown[];
  if (already.length > 0) return;

  const companies = (await sql`SELECT id FROM companies`) as { id: number }[];

  for (const c of companies) {
    // 회사별 총 투자금 M 집계
    const sumRows = (await sql`
      SELECT COALESCE(SUM(amount), 0)::INTEGER AS m
      FROM investments
      WHERE company_id = ${c.id} AND round = ${round}
    `) as { m: number }[];
    const M = sumRows[0]?.m ?? 0;

    // 공식으로 수익률 계산 후 정수로 반올림 (round_results.yield_pct 가 INTEGER)
    const yieldPct = Math.round(computeYieldPct(M));

    await sql`
      UPDATE teams t
      SET seed = t.seed + GREATEST(
        0,
        FLOOR(i.amount * (1 + (${yieldPct}::numeric) / 100.0))::INTEGER
      )
      FROM investments i
      WHERE t.username = i.team_username
        AND i.company_id = ${c.id}
        AND i.round = ${round}
    `;
    await sql`
      INSERT INTO round_results (round, company_id, yield_pct)
      VALUES (${round}, ${c.id}, ${yieldPct})
      ON CONFLICT (round, company_id) DO UPDATE SET yield_pct = EXCLUDED.yield_pct
    `;
  }
}

// ===== 매칭권 입찰 (한 팀, 한 회사 = 한 가격) =====

export async function opSetBid(
  username: string,
  companyId: number,
  price: number,
  count: number,
): Promise<void> {
  if (!Number.isInteger(price) || price < 0) {
    throw new Error("가격은 0 이상의 정수여야 합니다");
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("개수는 1 이상의 정수여야 합니다");
  }

  const companyRows = (await sql`
    SELECT min_order_price FROM companies WHERE id = ${companyId}
  `) as { min_order_price: number }[];
  if (!companyRows[0]) throw new Error("회사를 찾을 수 없습니다");
  if (price < companyRows[0].min_order_price) {
    throw new Error(
      `최소 주문 금액(${companyRows[0].min_order_price}) 이상이어야 합니다`,
    );
  }

  const existing = (await sql`
    SELECT price, count FROM bids
    WHERE team_username = ${username} AND company_id = ${companyId}
  `) as { price: number; count: number }[];
  const prevTotal = existing[0] ? existing[0].price * existing[0].count : 0;
  const newTotal = price * count;
  const delta = newTotal - prevTotal;

  if (delta > 0) {
    const teamRows = (await sql`
      SELECT seed FROM teams WHERE username = ${username}
    `) as { seed: number }[];
    const seed = teamRows[0]?.seed ?? 0;
    if (seed < delta) {
      throw new Error(`seed 가 부족합니다 (보유 ${seed}, 추가 필요 ${delta})`);
    }
  }

  if (delta !== 0) {
    await sql`UPDATE teams SET seed = seed - ${delta} WHERE username = ${username}`;
  }
  await sql`
    INSERT INTO bids (team_username, company_id, price, count)
    VALUES (${username}, ${companyId}, ${price}, ${count})
    ON CONFLICT (team_username, company_id)
    DO UPDATE SET price = EXCLUDED.price, count = EXCLUDED.count
  `;
}

export async function opClearBid(
  username: string,
  companyId: number,
): Promise<void> {
  const existing = (await sql`
    SELECT price, count FROM bids
    WHERE team_username = ${username} AND company_id = ${companyId}
  `) as { price: number; count: number }[];

  if (existing[0]) {
    const refund = existing[0].price * existing[0].count;
    await sql`UPDATE teams SET seed = seed + ${refund} WHERE username = ${username}`;
  }
  await sql`
    DELETE FROM bids WHERE team_username = ${username} AND company_id = ${companyId}
  `;
}

// 매칭권 자발적 판매: 현재 최소 주문 금액 × 개수 의 80% 환불
export async function opSellTickets(
  username: string,
  companyId: number,
  count: number,
): Promise<void> {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("개수는 1 이상의 정수여야 합니다");
  }

  const ticketRows = (await sql`
    SELECT count FROM tickets
    WHERE team_username = ${username} AND company_id = ${companyId}
  `) as { count: number }[];
  const owned = ticketRows[0]?.count ?? 0;
  if (owned < count) {
    throw new Error(`보유 매칭권이 부족합니다 (보유 ${owned}, 요청 ${count})`);
  }

  const companyRows = (await sql`
    SELECT min_order_price FROM companies WHERE id = ${companyId}
  `) as { min_order_price: number }[];
  if (!companyRows[0]) throw new Error("회사를 찾을 수 없습니다");

  const refund = Math.floor(companyRows[0].min_order_price * count * 0.8);
  await sql`UPDATE teams SET seed = seed + ${refund} WHERE username = ${username}`;
  await sql`
    UPDATE tickets SET count = count - ${count}
    WHERE team_username = ${username} AND company_id = ${companyId}
  `;
}
