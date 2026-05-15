import Link from "next/link";
import { getSession } from "@/lib/auth";
import { isAdminUsername } from "@/lib/permissions";
import { sql } from "@/lib/db";
import { getAllUsernames } from "@/lib/users";
import { AdminDashboard } from "./AdminDashboard";
import { PlayerView } from "./PlayerView";
import type {
  AdminViewData,
  Bid,
  Company,
  GameState,
  Investment,
  PlayerViewData,
  Team,
  Ticket,
} from "./types";

export const dynamic = "force-dynamic";

export default async function GamePlayPage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="max-w-md mx-auto px-5 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">로그인 하시오!</h1>
        <p className="mb-6 text-gray-600">
          게임 플레이 페이지는 로그인 후에 이용할 수 있습니다.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-gray-800 text-white rounded"
        >
          로그인 페이지로 이동
        </Link>
      </main>
    );
  }

  const isAdmin = isAdminUsername(session.username);

  try {
    if (isAdmin) {
      const data = await fetchAdminData();
      return <AdminDashboard data={data} />;
    }
    const data = await fetchPlayerData(session.username);
    return <PlayerView data={data} username={session.username} />;
  } catch (e) {
    return (
      <main className="max-w-2xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold mb-4">DB 초기화 필요</h1>
        <p className="mb-2 text-sm">
          DB 연결 또는 스키마에 문제가 있습니다.
        </p>
        <p className="mb-4 text-xs text-gray-600">
          에러: {(e as Error).message}
        </p>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>
            <code>.env.local</code> 의 <code>DATABASE_URL</code> 확인
          </li>
          <li>
            터미널에서 <code>npm run db:init</code> 실행
          </li>
          <li>이 페이지 새로고침</li>
        </ol>
      </main>
    );
  }
}

async function fetchAdminData(): Promise<AdminViewData> {
  const [
    stateRows,
    companyRows,
    teamRows,
    ticketRows,
    investmentRows,
    bidRows,
  ] = await Promise.all([
    sql`SELECT current_round, current_phase FROM game_state WHERE id = 1`,
    sql`SELECT id, name, min_order_price FROM companies ORDER BY id`,
    sql`SELECT username, seed FROM teams ORDER BY username`,
    sql`SELECT team_username, company_id, count FROM tickets`,
    sql`SELECT team_username, company_id, amount FROM investments`,
    sql`SELECT team_username, company_id, price, count FROM bids`,
  ]);

  const configuredUsernames = getAllUsernames().filter(
    (u) => !isAdminUsername(u),
  );

  return {
    state: stateRows[0] as GameState | undefined,
    companies: companyRows as Company[],
    teams: teamRows as Team[],
    tickets: ticketRows as Ticket[],
    investments: investmentRows as Investment[],
    bids: bidRows as Bid[],
    configuredUsernames,
  };
}

async function fetchPlayerData(username: string): Promise<PlayerViewData> {
  const [stateRows, companyRows, teamRows, ticketRows] = await Promise.all([
    sql`SELECT current_round, current_phase FROM game_state WHERE id = 1`,
    sql`SELECT id, name, min_order_price FROM companies ORDER BY id`,
    sql`SELECT username, seed FROM teams WHERE username = ${username}`,
    sql`SELECT team_username, company_id, count FROM tickets WHERE team_username = ${username}`,
  ]);

  return {
    state: stateRows[0] as GameState | undefined,
    companies: companyRows as Company[],
    team: (teamRows[0] as Team | undefined) ?? null,
    tickets: ticketRows as Ticket[],
  };
}
