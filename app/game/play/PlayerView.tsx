"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  playerSetInvestment,
  playerClearInvestment,
} from "@/app/actions/player";
import type { Company, GameData, Investment } from "./types";
import { ROUND_LABELS, PHASE_LABELS, latestSettledRound } from "./types";
import { SettledResultsPanel, TicketHoldingsTable } from "./shared";

export function PlayerView({
  data,
  username,
}: {
  data: GameData;
  username: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [router]);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const state = data.state;
  const myTeam = data.teams.find((t) => t.username === username) ?? null;

  return (
    <main className="max-w-3xl mx-auto px-5 py-8">
      <h1 className="text-2xl font-bold mb-1">내 팀 현황</h1>
      <p className="text-sm text-gray-600 mb-4">팀: {username}</p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-100 border border-red-300 rounded flex justify-between items-center">
          <span className="text-red-800 text-sm">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-800 font-bold px-2"
          >
            ×
          </button>
        </div>
      )}

      <div className="mb-4 p-4 border border-gray-300 rounded flex gap-8">
        <div>
          <div className="text-sm text-gray-600">현재 라운드</div>
          <div className="text-lg font-semibold">
            {state ? ROUND_LABELS[state.current_round] : "-"} /{" "}
            {state ? PHASE_LABELS[state.current_phase] : "-"}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">내 seed</div>
          <div className="text-2xl font-bold">
            {myTeam ? myTeam.seed.toLocaleString() : "—"}원
          </div>
        </div>
      </div>

      {!myTeam && (
        <p className="mb-4 text-sm text-amber-700">
          아직 admin 이 이 팀의 초기 seed 를 설정하지 않았습니다.
        </p>
      )}

      {state?.current_phase === "stock" && myTeam && (
        <InvestSection
          companies={data.companies}
          investments={data.investments.filter(
            (i) =>
              i.round === state.current_round &&
              i.team_username === username,
          )}
          seed={myTeam.seed}
          run={run}
        />
      )}

      <MyResultsPanel data={data} username={username} />

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

// ===== 주식 단계: 투자하기 =====

function InvestSection({
  companies,
  investments,
  seed,
  run,
}: {
  companies: Company[];
  investments: Investment[];
  seed: number;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const investedTotal = investments.reduce((s, i) => s + i.amount, 0);

  return (
    <section className="mb-6 p-4 border border-blue-300 bg-blue-50 rounded">
      <h2 className="text-lg font-bold mb-1">투자하기</h2>
      <p className="text-sm text-gray-700 mb-3">
        남은 seed <strong>{seed.toLocaleString()}원</strong> · 이번 라운드 투자
        합계 {investedTotal.toLocaleString()}원
      </p>

      {companies.length === 0 ? (
        <p className="text-sm text-gray-500">아직 등록된 회사가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {companies.map((c) => {
            const inv = investments.find((i) => i.company_id === c.id);
            return (
              <InvestRow
                key={`${c.id}-${inv?.amount ?? 0}`}
                company={c}
                currentAmount={inv?.amount ?? 0}
                run={run}
              />
            );
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">
        투자 금액은 보유 seed 를 넘을 수 없습니다. 저장하면 seed 에서 즉시
        차감되고, 취소하면 되돌아옵니다.
      </p>
    </section>
  );
}

function InvestRow({
  company,
  currentAmount,
  run,
}: {
  company: Company;
  currentAmount: number;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [v, setV] = useState(String(currentAmount));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="w-40 font-semibold">{company.name}</span>
      <span className="text-xs text-gray-500 w-28">
        현재 투자 {currentAmount.toLocaleString()}원
      </span>
      <input
        type="number"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="border border-gray-300 px-2 py-1 rounded w-32"
      />
      <button
        type="button"
        onClick={() => run(() => playerSetInvestment(company.id, Number(v)))}
        className="px-3 py-1 bg-gray-800 text-white rounded text-sm"
      >
        저장
      </button>
      {currentAmount > 0 && (
        <button
          type="button"
          onClick={() => run(() => playerClearInvestment(company.id))}
          className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm"
        >
          취소
        </button>
      )}
    </div>
  );
}

// ===== 결과 발표: 내 팀 투자 결과 =====

function MyResultsPanel({
  data,
  username,
}: {
  data: GameData;
  username: string;
}) {
  const settledRound = latestSettledRound(data.roundResults);
  if (!settledRound) return null;

  const myInvestments = data.investments.filter(
    (i) => i.round === settledRound && i.team_username === username,
  );
  const yieldByCompany = new Map<number, number>();
  for (const rr of data.roundResults) {
    if (rr.round === settledRound) {
      yieldByCompany.set(rr.company_id, rr.yield_pct);
    }
  }
  const myTeam = data.teams.find((t) => t.username === username);

  return (
    <section className="mb-6 p-4 border border-purple-300 bg-purple-50 rounded">
      <h2 className="text-lg font-bold mb-1">
        내 팀 결과 — {ROUND_LABELS[settledRound]} 라운드
      </h2>
      {myInvestments.length === 0 ? (
        <p className="text-sm text-gray-600">
          이 라운드에 투자한 내역이 없습니다.
        </p>
      ) : (
        <table className="w-full text-sm mb-2">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-1">회사</th>
              <th className="py-1 text-right">내 투자액</th>
              <th className="py-1 text-right">수익률</th>
              <th className="py-1 text-right">정산 후 회수액</th>
            </tr>
          </thead>
          <tbody>
            {myInvestments.map((i) => {
              const company = data.companies.find(
                (c) => c.id === i.company_id,
              );
              const y = yieldByCompany.get(i.company_id) ?? 0;
              const payout = Math.max(
                0,
                Math.floor(i.amount * (1 + y / 100)),
              );
              return (
                <tr key={i.company_id} className="border-b border-gray-100">
                  <td className="py-1">{company?.name ?? i.company_id}</td>
                  <td className="py-1 text-right">
                    {i.amount.toLocaleString()}원
                  </td>
                  <td className="py-1 text-right">{y}%</td>
                  <td className="py-1 text-right">
                    {payout.toLocaleString()}원
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="text-sm">
        현재 내 팀 최종 seed:{" "}
        <strong>
          {myTeam ? myTeam.seed.toLocaleString() : "—"}원
        </strong>
      </p>
    </section>
  );
}
