"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import {
  readGameState,
  computeNextState,
  settleStockRound,
  opSetInvestment,
  opClearInvestment,
  opSetBid,
  opClearBid,
  opSellTickets,
} from "@/lib/game";

const ROUNDS = ["seed", "series-a", "series-b", "series-c", "ended"] as const;
const PHASES = ["idle", "stock", "results", "matching"] as const;

export type ActionResult = { error?: string };

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
  revalidatePath("/game/play/display");
}

// 모든 admin 액션의 공통 패턴: 비즈니스 에러는 {error} 로 반환,
// 권한 에러(requireAdmin)만 throw. Next.js 의 server-error 오버레이를 피하기 위함.
async function guard(
  fn: () => Promise<void>,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await fn();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// ===== 게임 상태 =====

export async function setGameState(
  round: string,
  phase: string,
): Promise<ActionResult> {
  return guard(async () => {
    if (!(ROUNDS as readonly string[]).includes(round)) {
      throw new Error("잘못된 round 값");
    }
    if (!(PHASES as readonly string[]).includes(phase)) {
      throw new Error("잘못된 phase 값");
    }
    await sql`UPDATE game_state SET current_round = ${round}, current_phase = ${phase} WHERE id = 1`;
    refresh();
  });
}

// "다음 단계로 넘어가기": idle→stock→results→matching→(다음 라운드)
// stock → results 로 넘어갈 때 자동 정산.
export async function advanceToNextPhase(): Promise<ActionResult> {
  return guard(async () => {
    const { current_round, current_phase } = await readGameState();
    if (current_phase === "stock") {
      await settleStockRound(current_round);
    }
    const next = computeNextState(current_round, current_phase);
    await sql`
      UPDATE game_state
      SET current_round = ${next.round}, current_phase = ${next.phase}
      WHERE id = 1
    `;
    refresh();
  });
}

// ===== 게임 설정 (팀 수, 평균 시드머니) — 수익률 공식에 사용됨 =====

export async function setGameConfig(
  teamCount: number,
  avgInitialSeed: number,
): Promise<ActionResult> {
  return guard(async () => {
    const tc = assertInt(teamCount, "teamCount", { min: 1 });
    const ai = assertInt(avgInitialSeed, "avgInitialSeed", { min: 10000 });
    await sql`
      UPDATE game_state
      SET team_count = ${tc}, avg_initial_seed = ${ai}
      WHERE id = 1
    `;
    refresh();
  });
}

// ===== 회사 관리 =====

export async function addCompany(
  name: string,
  minOrderPrice: number,
): Promise<ActionResult> {
  return guard(async () => {
    const n = assertString(name, "name");
    const p = assertInt(minOrderPrice, "minOrderPrice", { min: 0 });
    // 새 회사는 sort_order 의 max + 1
    const maxRows = (await sql`
      SELECT COALESCE(MAX(sort_order), -1) AS m FROM companies
    `) as { m: number | string }[];
    const nextOrder = Number(maxRows[0]?.m ?? -1) + 1;
    await sql`
      INSERT INTO companies (name, min_order_price, sort_order)
      VALUES (${n}, ${p}, ${nextOrder})
    `;
    refresh();
  });
}

export async function updateCompany(
  id: number,
  name: string,
  minOrderPrice: number,
): Promise<ActionResult> {
  return guard(async () => {
    const i = assertInt(id, "id");
    const n = assertString(name, "name");
    const p = assertInt(minOrderPrice, "minOrderPrice", { min: 0 });
    await sql`UPDATE companies SET name = ${n}, min_order_price = ${p} WHERE id = ${i}`;
    refresh();
  });
}

export async function deleteCompany(id: number): Promise<ActionResult> {
  return guard(async () => {
    const i = assertInt(id, "id");
    await sql`DELETE FROM companies WHERE id = ${i}`;
    // sort_order 를 다시 0..N-1 로 압축
    const rows = (await sql`
      SELECT id FROM companies ORDER BY sort_order, id
    `) as { id: number }[];
    for (let idx = 0; idx < rows.length; idx++) {
      await sql`UPDATE companies SET sort_order = ${idx} WHERE id = ${rows[idx].id}`;
    }
    refresh();
  });
}

// 드래그로 회사 순서 변경. orderedIds = 새 순서대로 회사 id 리스트.
export async function reorderCompanies(
  orderedIds: number[],
): Promise<ActionResult> {
  return guard(async () => {
    if (!Array.isArray(orderedIds)) {
      throw new Error("orderedIds 는 배열이어야 합니다");
    }
    for (let i = 0; i < orderedIds.length; i++) {
      const id = assertInt(orderedIds[i], `orderedIds[${i}]`);
      await sql`UPDATE companies SET sort_order = ${i} WHERE id = ${id}`;
    }
    refresh();
  });
}

// ===== 팀 관리 =====

export async function setTeamSeed(
  username: string,
  seed: number,
): Promise<ActionResult> {
  return guard(async () => {
    const u = assertString(username, "username");
    const s = assertInt(seed, "seed", { min: 0 });
    await sql`
      INSERT INTO teams (username, seed) VALUES (${u}, ${s})
      ON CONFLICT (username) DO UPDATE SET seed = EXCLUDED.seed
    `;
    refresh();
  });
}

export async function deleteTeam(username: string): Promise<ActionResult> {
  return guard(async () => {
    const u = assertString(username, "username");
    await sql`DELETE FROM teams WHERE username = ${u}`;
    refresh();
  });
}

export async function setTeamTickets(
  username: string,
  companyId: number,
  count: number,
): Promise<ActionResult> {
  return guard(async () => {
    const u = assertString(username, "username");
    const c = assertInt(companyId, "companyId");
    const n = assertInt(count, "count", { min: 0 });
    await sql`INSERT INTO teams (username, seed) VALUES (${u}, 0) ON CONFLICT (username) DO NOTHING`;
    await sql`
      INSERT INTO tickets (team_username, company_id, count) VALUES (${u}, ${c}, ${n})
      ON CONFLICT (team_username, company_id) DO UPDATE SET count = EXCLUDED.count
    `;
    refresh();
  });
}

// ===== 주식 단계: 투자 (admin 이 팀 대신 입력) =====

export async function setInvestment(
  username: string,
  companyId: number,
  amount: number,
): Promise<ActionResult> {
  return guard(async () => {
    const u = assertString(username, "username");
    const c = assertInt(companyId, "companyId");
    const a = assertInt(amount, "amount", { min: 0 });
    const { current_round } = await readGameState();
    await opSetInvestment(current_round, u, c, a);
    refresh();
  });
}

export async function clearInvestment(
  username: string,
  companyId: number,
): Promise<ActionResult> {
  return guard(async () => {
    const u = assertString(username, "username");
    const c = assertInt(companyId, "companyId");
    const { current_round } = await readGameState();
    await opClearInvestment(current_round, u, c);
    refresh();
  });
}

// ===== 매칭권 단계 =====

export async function setBid(
  username: string,
  companyId: number,
  price: number,
  count: number,
): Promise<ActionResult> {
  return guard(async () => {
    const u = assertString(username, "username");
    const c = assertInt(companyId, "companyId");
    const p = assertInt(price, "price", { min: 0 });
    const n = assertInt(count, "count", { min: 1 });
    await opSetBid(u, c, p, n);
    refresh();
  });
}

export async function clearBid(
  username: string,
  companyId: number,
): Promise<ActionResult> {
  return guard(async () => {
    const u = assertString(username, "username");
    const c = assertInt(companyId, "companyId");
    await opClearBid(u, c);
    refresh();
  });
}

// 입찰 승자 처리: 입찰 count 만큼 tickets 추가, 환불 없음 (이미 차감됨)
export async function awardBid(
  username: string,
  companyId: number,
): Promise<ActionResult> {
  return guard(async () => {
    const u = assertString(username, "username");
    const c = assertInt(companyId, "companyId");

    const bidRows = (await sql`
      SELECT count FROM bids WHERE team_username = ${u} AND company_id = ${c}
    `) as { count: number }[];
    if (!bidRows[0]) throw new Error("해당 입찰을 찾을 수 없습니다");
    const cnt = Number(bidRows[0].count);

    await sql`INSERT INTO teams (username, seed) VALUES (${u}, 0) ON CONFLICT (username) DO NOTHING`;
    await sql`
      INSERT INTO tickets (team_username, company_id, count) VALUES (${u}, ${c}, ${cnt})
      ON CONFLICT (team_username, company_id) DO UPDATE SET count = tickets.count + EXCLUDED.count
    `;
    await sql`DELETE FROM bids WHERE team_username = ${u} AND company_id = ${c}`;
    refresh();
  });
}

// 패자 처리: 입찰 가격 * 개수 의 50% 환불 (만원 내림), 입찰 삭제
export async function refundFailedBid(
  username: string,
  companyId: number,
): Promise<ActionResult> {
  return guard(async () => {
    const u = assertString(username, "username");
    const c = assertInt(companyId, "companyId");

    const bidRows = (await sql`
      SELECT price, count FROM bids WHERE team_username = ${u} AND company_id = ${c}
    `) as { price: number; count: number }[];
    if (!bidRows[0]) throw new Error("해당 입찰을 찾을 수 없습니다");

    const total = Number(bidRows[0].price) * Number(bidRows[0].count);
    const refundAmt = Math.floor((total * 0.5) / 10000) * 10000;
    await sql`UPDATE teams SET seed = seed + ${refundAmt} WHERE username = ${u}`;
    await sql`DELETE FROM bids WHERE team_username = ${u} AND company_id = ${c}`;
    refresh();
  });
}

// 자발적 매칭권 판매 (admin 이 대신 실행). 80% 환불.
export async function sellTickets(
  username: string,
  companyId: number,
  count: number,
): Promise<ActionResult> {
  return guard(async () => {
    const u = assertString(username, "username");
    const c = assertInt(companyId, "companyId");
    const n = assertInt(count, "count", { min: 1 });
    await opSellTickets(u, c, n);
    refresh();
  });
}
