// 서버에서만 import. /game/play 와 /game/play/display 가 함께 사용.
import { sql } from "@/lib/db";
import { isAdminUsername } from "@/lib/permissions";
import { getAllUsernames } from "@/lib/users";
import type {
  Bid,
  Company,
  GameData,
  GameState,
  Investment,
  RoundResult,
  Team,
  Ticket,
} from "./types";

export async function fetchGameData(
  isAdmin: boolean,
  username: string,
): Promise<GameData> {
  const [
    stateRows,
    companyRows,
    teamRows,
    ticketRows,
    investmentRows,
    roundResultRows,
  ] = await Promise.all([
    sql`SELECT current_round, current_phase, team_count, avg_initial_seed FROM game_state WHERE id = 1`,
    sql`SELECT id, name, min_order_price, sort_order FROM companies ORDER BY sort_order, id`,
    sql`SELECT username, seed FROM teams ORDER BY username`,
    sql`SELECT team_username, company_id, count FROM tickets`,
    sql`SELECT round, team_username, company_id, amount FROM investments`,
    sql`SELECT round, company_id, yield_pct FROM round_results`,
  ]);

  // admin 은 모든 입찰을, 플레이어는 자기 팀 입찰만 받음
  const bidRows = isAdmin
    ? await sql`SELECT team_username, company_id, price, count FROM bids`
    : await sql`SELECT team_username, company_id, price, count FROM bids WHERE team_username = ${username}`;

  const configuredUsernames = getAllUsernames().filter(
    (u) => !isAdminUsername(u),
  );

  // Neon 이 INTEGER/NUMERIC 을 string 으로 줄 수 있는 케이스 방어
  const state = stateRows[0] as
    | (Omit<GameState, "team_count" | "avg_initial_seed"> & {
        team_count: number | string;
        avg_initial_seed: number | string;
      })
    | undefined;

  return {
    state: state
      ? {
          current_round: state.current_round,
          current_phase: state.current_phase,
          team_count: Number(state.team_count) || 25,
          avg_initial_seed: Number(state.avg_initial_seed) || 10_000_000,
        }
      : undefined,
    companies: (companyRows as Company[]).map((c) => ({
      ...c,
      id: Number(c.id),
      min_order_price: Number(c.min_order_price),
      sort_order: Number(c.sort_order),
    })),
    teams: (teamRows as Team[]).map((t) => ({
      ...t,
      seed: Number(t.seed),
    })),
    tickets: (ticketRows as Ticket[]).map((t) => ({
      ...t,
      company_id: Number(t.company_id),
      count: Number(t.count),
    })),
    investments: (investmentRows as Investment[]).map((i) => ({
      ...i,
      company_id: Number(i.company_id),
      amount: Number(i.amount),
    })),
    roundResults: (roundResultRows as RoundResult[]).map((r) => ({
      ...r,
      company_id: Number(r.company_id),
      yield_pct: Number(r.yield_pct),
    })),
    bids: (bidRows as Bid[]).map((b) => ({
      ...b,
      company_id: Number(b.company_id),
      price: Number(b.price),
      count: Number(b.count),
    })),
    configuredUsernames,
  };
}
