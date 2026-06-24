"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { GameData } from "../types";
import { ROUND_LABELS, PHASE_LABELS } from "../types";
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

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-8 text-center">
        <div className="text-sm text-gray-500 mb-1">GRAFFITI2026 투자 게임</div>
        <h1 className="text-4xl font-bold">
          {state ? ROUND_LABELS[state.current_round] : "-"}{" "}
          <span className="text-gray-400">/</span>{" "}
          {state ? PHASE_LABELS[state.current_phase] : "-"}
        </h1>
      </header>

      <AllTeamsSeedTable teams={data.teams} />

      <SettledResultsPanel
        companies={data.companies}
        investments={data.investments}
        roundResults={data.roundResults}
      />

      <TicketHoldingsTable
        companies={data.companies}
        teams={data.teams}
        tickets={data.tickets}
      />
    </main>
  );
}
