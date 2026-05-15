"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";

const ROUNDS = ["seed", "series-a", "series-b", "series-c", "ended"] as const;
type Round = (typeof ROUNDS)[number];

const PHASES = ["idle", "stock", "matching"] as const;
type Phase = (typeof PHASES)[number];

function assertInt(
  v: unknown,
  name: string,
  opts: { min?: number; max?: number } = {},
): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  if (typeof n !== "number" || !Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error(`${name} 은 정수여야 합니다`);
  }
  if (opts.min !== undefined && n < opts.min) {
    throw new Error(`${name} 은 ${opts.min} 이상이어야 합니다`);
  }
  if (opts.max !== undefined && n > opts.max) {
    throw new Error(`${name} 은 ${opts.max} 이하여야 합니다`);
  }
  return n;
}

function assertString(v: unknown, name: string): string {
  if (typeof v !== "string" || v.trim() === "") {
    throw new Error(`${name} 은 비어있을 수 없습니다`);
  }
  return v.trim();
}

function refresh() {
  revalidatePath("/game/play");
}

// ===== 게임 상태 =====

export async function setGameState(round: string, phase: string) {
  await requireAdmin();
  if (!(ROUNDS as readonly string[]).includes(round)) {
    throw new Error("잘못된 round 값");
  }
  if (!(PHASES as readonly string[]).includes(phase)) {
    throw new Error("잘못된 phase 값");
  }
  await sql`UPDATE game_state SET current_round = ${round}, current_phase = ${phase} WHERE id = 1`;
  refresh();
}

// ===== 회사 관리 =====

export async function addCompany(name: string, minOrderPrice: number) {
  await requireAdmin();
  const n = assertString(name, "name");
  const p = assertInt(minOrderPrice, "minOrderPrice", { min: 0 });
  await sql`INSERT INTO companies (name, min_order_price) VALUES (${n}, ${p})`;
  refresh();
}

export async function updateCompany(
  id: number,
  name: string,
  minOrderPrice: number,
) {
  await requireAdmin();
  const i = assertInt(id, "id");
  const n = assertString(name, "name");
  const p = assertInt(minOrderPrice, "minOrderPrice", { min: 0 });
  await sql`UPDATE companies SET name = ${n}, min_order_price = ${p} WHERE id = ${i}`;
  refresh();
}

export async function deleteCompany(id: number) {
  await requireAdmin();
  const i = assertInt(id, "id");
  await sql`DELETE FROM companies WHERE id = ${i}`;
  refresh();
}

// ===== 팀 관리 =====

export async function setTeamSeed(username: string, seed: number) {
  await requireAdmin();
  const u = assertString(username, "username");
  const s = assertInt(seed, "seed", { min: 0 });
  await sql`
    INSERT INTO teams (username, seed) VALUES (${u}, ${s})
    ON CONFLICT (username) DO UPDATE SET seed = EXCLUDED.seed
  `;
  refresh();
}

export async function deleteTeam(username: string) {
  await requireAdmin();
  const u = assertString(username, "username");
  await sql`DELETE FROM teams WHERE username = ${u}`;
  refresh();
}

export async function setTeamTickets(
  username: string,
  companyId: number,
  count: number,
) {
  await requireAdmin();
  const u = assertString(username, "username");
  const c = assertInt(companyId, "companyId");
  const n = assertInt(count, "count", { min: 0 });
  await sql`INSERT INTO teams (username, seed) VALUES (${u}, 0) ON CONFLICT (username) DO NOTHING`;
  await sql`
    INSERT INTO tickets (team_username, company_id, count) VALUES (${u}, ${c}, ${n})
    ON CONFLICT (team_username, company_id) DO UPDATE SET count = EXCLUDED.count
  `;
  refresh();
}

// ===== 주식 단계: 투자 set / clear / 정산 =====

export async function setInvestment(
  username: string,
  companyId: number,
  amount: number,
) {
  await requireAdmin();
  const u = assertString(username, "username");
  const c = assertInt(companyId, "companyId");
  const a = assertInt(amount, "amount", { min: 0 });

  const existingRows = (await sql`
    SELECT amount FROM investments WHERE team_username = ${u} AND company_id = ${c}
  `) as { amount: number }[];
  const prev = existingRows[0]?.amount ?? 0;
  const delta = a - prev;

  if (delta > 0) {
    const teamRows = (await sql`
      SELECT seed FROM teams WHERE username = ${u}
    `) as { seed: number }[];
    const currentSeed = teamRows[0]?.seed ?? 0;
    if (currentSeed < delta) {
      throw new Error(`seed 부족 (현재 ${currentSeed}, 필요 ${delta})`);
    }
  }

  if (delta !== 0) {
    await sql`UPDATE teams SET seed = seed - ${delta} WHERE username = ${u}`;
  }
  await sql`
    INSERT INTO investments (team_username, company_id, amount) VALUES (${u}, ${c}, ${a})
    ON CONFLICT (team_username, company_id) DO UPDATE SET amount = EXCLUDED.amount
  `;
  refresh();
}

export async function clearInvestment(username: string, companyId: number) {
  await requireAdmin();
  const u = assertString(username, "username");
  const c = assertInt(companyId, "companyId");

  const existing = (await sql`
    SELECT amount FROM investments WHERE team_username = ${u} AND company_id = ${c}
  `) as { amount: number }[];
  const prev = existing[0]?.amount ?? 0;

  if (prev > 0) {
    await sql`UPDATE teams SET seed = seed + ${prev} WHERE username = ${u}`;
  }
  await sql`DELETE FROM investments WHERE team_username = ${u} AND company_id = ${c}`;
  refresh();
}

// 주식 단계 정산: 회사별 수익률 입력 → 각 팀 seed 갱신, investments 비우기
// yields: { [companyId]: yieldPct }  예: { 1: 20, 2: -10 }
export async function closeStockPhaseWithYields(yields: Record<string, number>) {
  await requireAdmin();

  for (const [companyIdStr, yieldPctRaw] of Object.entries(yields)) {
    const cid = assertInt(companyIdStr, "companyId");
    const pct = Number(yieldPctRaw);
    if (!Number.isFinite(pct)) {
      throw new Error(`yield 값이 잘못됨: ${yieldPctRaw}`);
    }
    await sql`
      UPDATE teams t
      SET seed = t.seed + GREATEST(
        0,
        FLOOR(i.amount * (1 + (${pct}::numeric) / 100.0))::INTEGER
      )
      FROM investments i
      WHERE t.username = i.team_username AND i.company_id = ${cid}
    `;
  }

  await sql`DELETE FROM investments`;
  await sql`UPDATE game_state SET current_phase = 'idle' WHERE id = 1`;
  refresh();
}

// ===== 매칭권 단계 =====

export async function setBid(
  username: string,
  companyId: number,
  price: number,
  count: number,
) {
  await requireAdmin();
  const u = assertString(username, "username");
  const c = assertInt(companyId, "companyId");
  const p = assertInt(price, "price", { min: 0 });
  const n = assertInt(count, "count", { min: 1 });

  // 회사 최소 주문 금액 확인
  const companyRows = (await sql`
    SELECT min_order_price FROM companies WHERE id = ${c}
  `) as { min_order_price: number }[];
  if (!companyRows[0]) throw new Error("회사를 찾을 수 없습니다");
  if (p < companyRows[0].min_order_price) {
    throw new Error(
      `최소 주문 금액(${companyRows[0].min_order_price}) 이상이어야 합니다`,
    );
  }

  const existingRows = (await sql`
    SELECT price, count FROM bids WHERE team_username = ${u} AND company_id = ${c}
  `) as { price: number; count: number }[];
  const prevTotal = existingRows[0]
    ? existingRows[0].price * existingRows[0].count
    : 0;
  const newTotal = p * n;
  const delta = newTotal - prevTotal;

  if (delta > 0) {
    const teamRows = (await sql`
      SELECT seed FROM teams WHERE username = ${u}
    `) as { seed: number }[];
    const currentSeed = teamRows[0]?.seed ?? 0;
    if (currentSeed < delta) {
      throw new Error(`seed 부족 (현재 ${currentSeed}, 필요 ${delta})`);
    }
  }

  if (delta !== 0) {
    await sql`UPDATE teams SET seed = seed - ${delta} WHERE username = ${u}`;
  }
  await sql`
    INSERT INTO bids (team_username, company_id, price, count) VALUES (${u}, ${c}, ${p}, ${n})
    ON CONFLICT (team_username, company_id) DO UPDATE SET price = EXCLUDED.price, count = EXCLUDED.count
  `;
  refresh();
}

export async function clearBid(username: string, companyId: number) {
  await requireAdmin();
  const u = assertString(username, "username");
  const c = assertInt(companyId, "companyId");

  const existing = (await sql`
    SELECT price, count FROM bids WHERE team_username = ${u} AND company_id = ${c}
  `) as { price: number; count: number }[];

  if (existing[0]) {
    const refundAmt = existing[0].price * existing[0].count;
    await sql`UPDATE teams SET seed = seed + ${refundAmt} WHERE username = ${u}`;
  }
  await sql`DELETE FROM bids WHERE team_username = ${u} AND company_id = ${c}`;
  refresh();
}

// 입찰 승자 처리: 입찰 count 만큼 tickets 추가, 환불 없음 (이미 차감됨)
export async function awardBid(username: string, companyId: number) {
  await requireAdmin();
  const u = assertString(username, "username");
  const c = assertInt(companyId, "companyId");

  const bidRows = (await sql`
    SELECT count FROM bids WHERE team_username = ${u} AND company_id = ${c}
  `) as { count: number }[];
  if (!bidRows[0]) throw new Error("해당 입찰을 찾을 수 없습니다");
  const cnt = bidRows[0].count;

  await sql`INSERT INTO teams (username, seed) VALUES (${u}, 0) ON CONFLICT (username) DO NOTHING`;
  await sql`
    INSERT INTO tickets (team_username, company_id, count) VALUES (${u}, ${c}, ${cnt})
    ON CONFLICT (team_username, company_id) DO UPDATE SET count = tickets.count + EXCLUDED.count
  `;
  await sql`DELETE FROM bids WHERE team_username = ${u} AND company_id = ${c}`;
  refresh();
}

// 패자 처리: 입찰 가격 * 개수 의 50% 환불, 입찰 삭제
export async function refundFailedBid(username: string, companyId: number) {
  await requireAdmin();
  const u = assertString(username, "username");
  const c = assertInt(companyId, "companyId");

  const bidRows = (await sql`
    SELECT price, count FROM bids WHERE team_username = ${u} AND company_id = ${c}
  `) as { price: number; count: number }[];
  if (!bidRows[0]) throw new Error("해당 입찰을 찾을 수 없습니다");

  const refundAmt = Math.floor(bidRows[0].price * bidRows[0].count * 0.5);
  await sql`UPDATE teams SET seed = seed + ${refundAmt} WHERE username = ${u}`;
  await sql`DELETE FROM bids WHERE team_username = ${u} AND company_id = ${c}`;
  refresh();
}

// 자발적 매칭권 판매: 현재 최소 주문 금액 × 개수 의 80% 환불
export async function sellTickets(
  username: string,
  companyId: number,
  count: number,
) {
  await requireAdmin();
  const u = assertString(username, "username");
  const c = assertInt(companyId, "companyId");
  const n = assertInt(count, "count", { min: 1 });

  const ticketRows = (await sql`
    SELECT count FROM tickets WHERE team_username = ${u} AND company_id = ${c}
  `) as { count: number }[];
  const owned = ticketRows[0]?.count ?? 0;
  if (owned < n) {
    throw new Error(`보유 매칭권 부족 (현재 ${owned}, 요청 ${n})`);
  }

  const companyRows = (await sql`
    SELECT min_order_price FROM companies WHERE id = ${c}
  `) as { min_order_price: number }[];
  if (!companyRows[0]) throw new Error("회사를 찾을 수 없습니다");
  const minPrice = companyRows[0].min_order_price;

  const refundAmt = Math.floor(minPrice * n * 0.8);
  await sql`UPDATE teams SET seed = seed + ${refundAmt} WHERE username = ${u}`;
  await sql`
    UPDATE tickets SET count = count - ${n}
    WHERE team_username = ${u} AND company_id = ${c}
  `;
  refresh();
}
