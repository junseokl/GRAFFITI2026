"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { GameData } from "../types";
import { ROUND_LABELS, PHASE_LABELS } from "../types";
import { formatManwon } from "../format";
import {
  SettledResultsPanel,
  TicketHoldingsTable,
  AllTeamsSeedTable,
} from "../shared";

// 큰 화면용 읽기 전용 디스플레이. 게임 진행 중에 별도 화면에 띄워서 보여줌.
// admin 컨트롤 UI 는 없음. 폴링으로 자동 갱신.
export function DisplayView({ data }: { data: GameData }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [router]);

  const state = data.state;
  const totalSeed = data.teams.reduce((sum, team) => sum + team.seed, 0);
  const ticketTotal = data.tickets.reduce((sum, ticket) => sum + ticket.count, 0);

  return (
    <main className="page-shell max-w-7xl">
      <header className="surface-panel mb-6 overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.5fr_1fr]">
          <div className="bg-[#151713] p-6 text-white sm:p-8">
            <p className="text-xs font-semibold uppercase text-[#b7c4b2]">
              GRAFFITI2026 Investment Game
            </p>
            <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">
              {state ? ROUND_LABELS[state.current_round] : "-"}
            </h1>
            <div className="mt-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-xl font-black">
              {state ? PHASE_LABELS[state.current_phase] : "-"}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-[#fbfcfa] p-5 sm:p-8">
            <DisplayMetric label="총 seed" value={formatManwon(totalSeed)} />
            <DisplayMetric label="참가 팀" value={`${data.teams.length}팀`} />
            <DisplayMetric label="회사" value={`${data.companies.length}개`} />
            <DisplayMetric label="매칭권" value={`${ticketTotal}개`} />
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <AllTeamsSeedTable teams={data.teams} topN={5} />
        <SettledResultsPanel
          companies={data.companies}
          investments={data.investments}
          roundResults={data.roundResults}
        />
      </div>

      {/* 매칭권 보유 현황은 평소엔 자주 안 보지만, 필요할 때 큰 화면에서 한눈에 보려고 맨 아래 가로 풀폭으로 둠. */}
      <TicketHoldingsTable
        companies={data.companies}
        teams={data.teams}
        tickets={data.tickets}
      />
    </main>
  );
}

function DisplayMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dfe4dc] bg-white p-4">
      <div className="muted-label">{label}</div>
      <div className="mt-1 text-2xl font-black tabular-nums">{value}</div>
    </div>
  );
}
