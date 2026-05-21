import { sql } from "@/lib/db";

// 플레이 가능한 라운드 순서 ('ended' 는 제외)
export const ROUND_ORDER = [
  "seed",
  "series-a",
  "series-b",
  "series-c",
] as const;

// 주식 단계 정산 시 적용하는 임시 수익률 (%). 추후 공식으로 교체 예정.
export const FLAT_YIELD_PCT = 10;

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

// 주식 단계 정산: 해당 라운드 투자에 FLAT_YIELD_PCT 적용 → seed 지급, round_results 기록.
// 이미 정산된 라운드면 (round_results 존재) 아무것도 하지 않음 (중복 정산 방지).
export async function settleStockRound(round: string): Promise<void> {
  const already = (await sql`
    SELECT 1 FROM round_results WHERE round = ${round} LIMIT 1
  `) as unknown[];
  if (already.length > 0) return;

  const companies = (await sql`SELECT id FROM companies`) as { id: number }[];

  for (const c of companies) {
    await sql`
      UPDATE teams t
      SET seed = t.seed + GREATEST(
        0,
        FLOOR(i.amount * (1 + (${FLAT_YIELD_PCT}::numeric) / 100.0))::INTEGER
      )
      FROM investments i
      WHERE t.username = i.team_username
        AND i.company_id = ${c.id}
        AND i.round = ${round}
    `;
    await sql`
      INSERT INTO round_results (round, company_id, yield_pct)
      VALUES (${round}, ${c.id}, ${FLAT_YIELD_PCT})
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
