"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  setGameState,
  advanceToNextPhase,
  addCompany,
  updateCompany,
  deleteCompany,
  setTeamSeed,
  deleteTeam,
  setTeamTickets,
  setInvestment,
  clearInvestment,
  setBid,
  clearBid,
  awardBid,
  refundFailedBid,
  sellTickets,
} from "@/app/actions/admin";
import type {
  Bid,
  Company,
  GameData,
  GameState,
  Investment,
  Phase,
  Round,
  Team,
  Ticket,
} from "./types";
import { ROUND_LABELS, PHASE_LABELS, describeNext } from "./types";
import { SettledResultsPanel, TicketHoldingsTable } from "./shared";

type RunFn = (action: () => Promise<unknown>) => Promise<void>;

export function AdminDashboard({ data }: { data: GameData }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [router]);

  const run: RunFn = async (fn) => {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!data.state) {
    return (
      <main className="max-w-2xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold mb-4">게임 상태가 없습니다</h1>
        <p className="text-sm">
          <code>npm run db:init</code> 을 다시 실행해 주세요.
        </p>
      </main>
    );
  }

  const state = data.state;
  const phase = state.current_phase;

  return (
    <main className="max-w-6xl mx-auto px-5 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin 대시보드</h1>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-100 border border-red-300 rounded flex justify-between items-center">
          <span className="text-red-800 text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-800 font-bold px-2"
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <GameStateSection
        key={`${state.current_round}-${state.current_phase}`}
        state={state}
        run={run}
      />
      <CompaniesSection companies={data.companies} run={run} />
      <TeamsSection
        teams={data.teams}
        companies={data.companies}
        tickets={data.tickets}
        configuredUsernames={data.configuredUsernames}
        run={run}
      />

      {phase === "stock" && (
        <StockPhaseSection
          round={state.current_round}
          teams={data.teams}
          companies={data.companies}
          investments={data.investments}
          run={run}
        />
      )}

      {phase === "matching" && (
        <MatchingPhaseSection
          teams={data.teams}
          companies={data.companies}
          bids={data.bids}
          tickets={data.tickets}
          run={run}
        />
      )}

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

      <AdvanceButton state={state} run={run} />
    </main>
  );
}

// ============================================================
// 다음 단계로 넘어가기 버튼 (맨 아래 오른쪽)
// ============================================================

function AdvanceButton({ state, run }: { state: GameState; run: RunFn }) {
  const ended = state.current_round === "ended";
  return (
    <div className="mt-8 flex justify-end items-center gap-3">
      {!ended && (
        <span className="text-sm text-gray-600">
          다음: {describeNext(state.current_round, state.current_phase)}
        </span>
      )}
      <button
        type="button"
        disabled={ended}
        onClick={() => {
          if (
            confirm(
              `다음 단계로 넘어갈까요?\n→ ${describeNext(
                state.current_round,
                state.current_phase,
              )}`,
            )
          ) {
            run(() => advanceToNextPhase());
          }
        }}
        className="px-5 py-2 bg-gray-900 text-white rounded disabled:opacity-40"
      >
        다음 단계로 넘어가기 ▶
      </button>
    </div>
  );
}

// ============================================================
// 게임 상태
// ============================================================

function GameStateSection({ state, run }: { state: GameState; run: RunFn }) {
  const [round, setRound] = useState<Round>(state.current_round);
  const [phase, setPhase] = useState<Phase>(state.current_phase);

  return (
    <section className="mb-6 p-4 border border-gray-300 rounded">
      <h2 className="text-lg font-bold mb-3">게임 상태</h2>
      <p className="mb-3 text-sm">
        현재:{" "}
        <strong>
          {ROUND_LABELS[state.current_round]} /{" "}
          {PHASE_LABELS[state.current_phase]}
        </strong>
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={round}
          onChange={(e) => setRound(e.target.value as Round)}
          className="border border-gray-300 px-2 py-1 rounded"
        >
          {(Object.keys(ROUND_LABELS) as Round[]).map((k) => (
            <option key={k} value={k}>
              {ROUND_LABELS[k]}
            </option>
          ))}
        </select>
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value as Phase)}
          className="border border-gray-300 px-2 py-1 rounded"
        >
          {(Object.keys(PHASE_LABELS) as Phase[]).map((k) => (
            <option key={k} value={k}>
              {PHASE_LABELS[k]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => run(() => setGameState(round, phase))}
          className="px-3 py-1 bg-gray-800 text-white rounded text-sm"
        >
          상태 직접 변경
        </button>
        <span className="text-xs text-gray-500">
          (정상 진행은 맨 아래 "다음 단계로" 버튼 사용 — 이건 수동 보정용)
        </span>
      </div>
    </section>
  );
}

// ============================================================
// 회사
// ============================================================

function CompaniesSection({
  companies,
  run,
}: {
  companies: Company[];
  run: RunFn;
}) {
  return (
    <section className="mb-6 p-4 border border-gray-300 rounded">
      <h2 className="text-lg font-bold mb-3">회사</h2>
      <AddCompanyForm run={run} />
      <div className="mt-4">
        {companies.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 회사가 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="py-1 w-16">ID</th>
                <th className="py-1">이름</th>
                <th className="py-1 w-40">최소 주문 금액</th>
                <th className="py-1 w-40">작업</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <CompanyRow key={c.id} company={c} run={run} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function AddCompanyForm({ run }: { run: RunFn }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  return (
    <div className="flex gap-2 flex-wrap">
      <input
        type="text"
        placeholder="회사 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border border-gray-300 px-2 py-1 rounded flex-1 min-w-40"
      />
      <input
        type="number"
        placeholder="최소 주문 금액"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="border border-gray-300 px-2 py-1 rounded w-40"
      />
      <button
        type="button"
        onClick={async () => {
          await run(() => addCompany(name, Number(price)));
          setName("");
          setPrice("");
        }}
        className="px-3 py-1 bg-gray-800 text-white rounded text-sm"
      >
        추가
      </button>
    </div>
  );
}

function CompanyRow({ company, run }: { company: Company; run: RunFn }) {
  const [name, setName] = useState(company.name);
  const [price, setPrice] = useState(String(company.min_order_price));

  return (
    <tr className="border-b border-gray-100">
      <td className="py-1">{company.id}</td>
      <td className="py-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-gray-300 px-2 py-1 rounded w-full"
        />
      </td>
      <td className="py-1">
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border border-gray-300 px-2 py-1 rounded w-32"
        />
      </td>
      <td className="py-1">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() =>
              run(() => updateCompany(company.id, name, Number(price)))
            }
            className="px-2 py-1 bg-gray-200 rounded text-xs"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`회사 "${company.name}" 을 삭제할까요?`)) {
                run(() => deleteCompany(company.id));
              }
            }}
            className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================
// 팀
// ============================================================

function TeamsSection({
  teams,
  companies,
  tickets,
  configuredUsernames,
  run,
}: {
  teams: Team[];
  companies: Company[];
  tickets: Ticket[];
  configuredUsernames: string[];
  run: RunFn;
}) {
  const existing = new Set(teams.map((t) => t.username));
  const unregistered = configuredUsernames.filter((u) => !existing.has(u));

  return (
    <section className="mb-6 p-4 border border-gray-300 rounded">
      <h2 className="text-lg font-bold mb-3">팀</h2>
      <AddTeamForm unregisteredUsernames={unregistered} run={run} />

      <div className="mt-4 overflow-x-auto">
        {teams.length === 0 ? (
          <p className="text-sm text-gray-500">아직 등록된 팀이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="py-1">팀</th>
                <th className="py-1 w-44">seed</th>
                {companies.map((c) => (
                  <th key={c.id} className="py-1 w-32">
                    {c.name} 매칭권
                  </th>
                ))}
                <th className="py-1 w-20">작업</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <TeamRow
                  key={t.username}
                  team={t}
                  companies={companies}
                  tickets={tickets}
                  run={run}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function AddTeamForm({
  unregisteredUsernames,
  run,
}: {
  unregisteredUsernames: string[];
  run: RunFn;
}) {
  const [username, setUsername] = useState("");
  const [seed, setSeed] = useState("");

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <input
        type="text"
        placeholder="팀 username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        list="unregistered-usernames"
        className="border border-gray-300 px-2 py-1 rounded min-w-40"
      />
      <datalist id="unregistered-usernames">
        {unregisteredUsernames.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <input
        type="number"
        placeholder="초기 seed"
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
        className="border border-gray-300 px-2 py-1 rounded w-40"
      />
      <button
        type="button"
        onClick={async () => {
          await run(() => setTeamSeed(username, Number(seed)));
          setUsername("");
          setSeed("");
        }}
        className="px-3 py-1 bg-gray-800 text-white rounded text-sm"
      >
        팀 추가/수정
      </button>
      {unregisteredUsernames.length > 0 && (
        <span className="text-xs text-gray-500">
          미등록 계정: {unregisteredUsernames.join(", ")}
        </span>
      )}
    </div>
  );
}

function TeamRow({
  team,
  companies,
  tickets,
  run,
}: {
  team: Team;
  companies: Company[];
  tickets: Ticket[];
  run: RunFn;
}) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-1 font-mono">{team.username}</td>
      <td className="py-1">
        <NumberEditor
          key={`seed-${team.seed}`}
          initial={team.seed}
          onSave={(v) => run(() => setTeamSeed(team.username, v))}
        />
      </td>
      {companies.map((c) => {
        const ticket = tickets.find(
          (t) => t.team_username === team.username && t.company_id === c.id,
        );
        return (
          <td key={c.id} className="py-1">
            <NumberEditor
              key={`tk-${team.username}-${c.id}-${ticket?.count ?? 0}`}
              initial={ticket?.count ?? 0}
              onSave={(v) => run(() => setTeamTickets(team.username, c.id, v))}
            />
          </td>
        );
      })}
      <td className="py-1">
        <button
          type="button"
          onClick={() => {
            if (confirm(`${team.username} 팀을 삭제할까요?`)) {
              run(() => deleteTeam(team.username));
            }
          }}
          className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs"
        >
          삭제
        </button>
      </td>
    </tr>
  );
}

function NumberEditor({
  initial,
  onSave,
}: {
  initial: number;
  onSave: (value: number) => void;
}) {
  const [v, setV] = useState(String(initial));
  return (
    <div className="flex gap-1">
      <input
        type="number"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="border border-gray-300 px-2 py-1 rounded w-24"
      />
      <button
        type="button"
        onClick={() => onSave(Number(v))}
        className="px-2 py-1 bg-gray-200 rounded text-xs"
      >
        저장
      </button>
    </div>
  );
}

// ============================================================
// 주식 단계
// ============================================================

function StockPhaseSection({
  round,
  teams,
  companies,
  investments,
  run,
}: {
  round: Round;
  teams: Team[];
  companies: Company[];
  investments: Investment[];
  run: RunFn;
}) {
  const roundInvestments = investments.filter((i) => i.round === round);

  return (
    <section className="mb-6 p-4 border border-blue-300 bg-blue-50 rounded">
      <h2 className="text-lg font-bold mb-1">주식 단계 — 투자 관리</h2>
      <p className="text-xs text-gray-600 mb-3">
        팀이 직접 투자할 수도 있고, admin 이 여기서 대신 입력할 수도 있습니다.
        정산은 맨 아래 "다음 단계로" 버튼이 처리합니다
        (<code>config/yield.ts</code> 의 R(M) 공식 적용).
      </p>

      <div className="overflow-x-auto">
        {teams.length === 0 || companies.length === 0 ? (
          <p className="text-sm text-gray-500">팀과 회사를 먼저 추가하세요.</p>
        ) : (
          <table className="w-full text-sm bg-white">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="py-1 px-2">팀 \ 회사</th>
                {companies.map((c) => (
                  <th key={c.id} className="py-1 px-2">
                    {c.name}
                  </th>
                ))}
                <th className="py-1 px-2 text-right">투자 합계</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => {
                const teamInvestments = roundInvestments.filter(
                  (i) => i.team_username === t.username,
                );
                const total = teamInvestments.reduce(
                  (s, i) => s + i.amount,
                  0,
                );
                return (
                  <tr key={t.username} className="border-b border-gray-100">
                    <td className="py-1 px-2">
                      <div className="font-mono">{t.username}</div>
                      <div className="text-xs text-gray-500">
                        seed {t.seed.toLocaleString()}원
                      </div>
                    </td>
                    {companies.map((c) => {
                      const inv = teamInvestments.find(
                        (i) => i.company_id === c.id,
                      );
                      return (
                        <td key={c.id} className="py-1 px-2">
                          <InvestmentCell
                            key={`inv-${t.username}-${c.id}-${inv?.amount ?? 0}`}
                            username={t.username}
                            companyId={c.id}
                            currentAmount={inv?.amount ?? 0}
                            run={run}
                          />
                        </td>
                      );
                    })}
                    <td className="py-1 px-2 text-right font-semibold">
                      {total.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function InvestmentCell({
  username,
  companyId,
  currentAmount,
  run,
}: {
  username: string;
  companyId: number;
  currentAmount: number;
  run: RunFn;
}) {
  const [v, setV] = useState(String(currentAmount));
  return (
    <div className="flex gap-1 items-center">
      <input
        type="number"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="border border-gray-300 px-2 py-1 rounded w-24 text-sm"
      />
      <button
        type="button"
        onClick={() => run(() => setInvestment(username, companyId, Number(v)))}
        className="px-1 py-1 bg-gray-200 rounded text-xs"
      >
        저장
      </button>
      {currentAmount > 0 && (
        <button
          type="button"
          onClick={() => run(() => clearInvestment(username, companyId))}
          className="px-1 py-1 bg-red-100 text-red-800 rounded text-xs"
        >
          취소
        </button>
      )}
    </div>
  );
}

// ============================================================
// 매칭권 단계
// ============================================================

function MatchingPhaseSection({
  teams,
  companies,
  bids,
  tickets,
  run,
}: {
  teams: Team[];
  companies: Company[];
  bids: Bid[];
  tickets: Ticket[];
  run: RunFn;
}) {
  return (
    <section className="mb-6 p-4 border border-green-300 bg-green-50 rounded">
      <h2 className="text-lg font-bold mb-3">매칭권 단계</h2>

      <div className="overflow-x-auto mb-4">
        {teams.length === 0 || companies.length === 0 ? (
          <p className="text-sm text-gray-500">팀과 회사를 먼저 추가하세요.</p>
        ) : (
          <table className="w-full text-sm bg-white">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="py-1 px-2">팀 \ 회사</th>
                {companies.map((c) => (
                  <th key={c.id} className="py-1 px-2">
                    {c.name}
                    <div className="text-xs text-gray-500 font-normal">
                      최소 {c.min_order_price.toLocaleString()}원
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.username} className="border-b border-gray-100">
                  <td className="py-1 px-2">
                    <div className="font-mono">{t.username}</div>
                    <div className="text-xs text-gray-500">
                      seed {t.seed.toLocaleString()}원
                    </div>
                  </td>
                  {companies.map((c) => {
                    const bid = bids.find(
                      (b) =>
                        b.team_username === t.username &&
                        b.company_id === c.id,
                    );
                    return (
                      <td key={c.id} className="py-1 px-2">
                        <BidCell
                          key={`bid-${t.username}-${c.id}-${bid?.price ?? 0}-${bid?.count ?? 0}`}
                          username={t.username}
                          companyId={c.id}
                          currentBid={bid ?? null}
                          run={run}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BidResolutionList bids={bids} companies={companies} run={run} />

      <TicketSellForm
        teams={teams}
        companies={companies}
        tickets={tickets}
        run={run}
      />
    </section>
  );
}

function BidCell({
  username,
  companyId,
  currentBid,
  run,
}: {
  username: string;
  companyId: number;
  currentBid: Bid | null;
  run: RunFn;
}) {
  const [price, setPrice] = useState(
    currentBid ? String(currentBid.price) : "",
  );
  const [count, setCount] = useState(
    currentBid ? String(currentBid.count) : "",
  );

  return (
    <div className="flex flex-col gap-1">
      <input
        type="number"
        placeholder="가격"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="border border-gray-300 px-2 py-1 rounded w-24 text-xs"
      />
      <input
        type="number"
        placeholder="개수"
        value={count}
        onChange={(e) => setCount(e.target.value)}
        className="border border-gray-300 px-2 py-1 rounded w-24 text-xs"
      />
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() =>
            run(() => setBid(username, companyId, Number(price), Number(count)))
          }
          className="px-1 py-1 bg-gray-200 rounded text-xs flex-1"
        >
          입찰
        </button>
        {currentBid && (
          <button
            type="button"
            onClick={() => run(() => clearBid(username, companyId))}
            className="px-1 py-1 bg-red-100 text-red-800 rounded text-xs"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}

function BidResolutionList({
  bids,
  companies,
  run,
}: {
  bids: Bid[];
  companies: Company[];
  run: RunFn;
}) {
  if (bids.length === 0) return null;

  const grouped: Record<number, Bid[]> = {};
  for (const b of bids) {
    if (!grouped[b.company_id]) grouped[b.company_id] = [];
    grouped[b.company_id].push(b);
  }
  for (const k of Object.keys(grouped)) {
    grouped[Number(k)].sort((a, b) => b.price - a.price);
  }

  return (
    <div className="mt-4 p-3 bg-white border border-gray-300 rounded">
      <h3 className="font-bold mb-2">입찰 정산 (회사별 가격 내림차순)</h3>
      {companies
        .filter((c) => grouped[c.id]?.length > 0)
        .map((c) => (
          <div key={c.id} className="mb-3">
            <div className="text-sm font-semibold mb-1">{c.name}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="py-1">순위</th>
                  <th className="py-1">팀</th>
                  <th className="py-1 text-right">가격</th>
                  <th className="py-1 text-right">개수</th>
                  <th className="py-1 text-right">합계</th>
                  <th className="py-1 w-44">작업</th>
                </tr>
              </thead>
              <tbody>
                {grouped[c.id].map((b, idx) => (
                  <tr
                    key={`${b.team_username}-${b.company_id}`}
                    className={
                      idx < 2
                        ? "border-b border-gray-100 bg-green-100"
                        : "border-b border-gray-100"
                    }
                  >
                    <td className="py-1">{idx + 1}</td>
                    <td className="py-1 font-mono">{b.team_username}</td>
                    <td className="py-1 text-right">
                      {b.price.toLocaleString()}
                    </td>
                    <td className="py-1 text-right">{b.count}</td>
                    <td className="py-1 text-right">
                      {(b.price * b.count).toLocaleString()}
                    </td>
                    <td className="py-1">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            run(() => awardBid(b.team_username, b.company_id))
                          }
                          className="px-2 py-1 bg-green-200 rounded text-xs"
                        >
                          확정
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            run(() =>
                              refundFailedBid(b.team_username, b.company_id),
                            )
                          }
                          className="px-2 py-1 bg-yellow-200 rounded text-xs"
                        >
                          50% 환불
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      <p className="text-xs text-gray-500 mt-2">
        상위 2개는 초록 배경. "확정" 은 입찰 개수를 매칭권으로 전환(추가 환불
        없음), "50% 환불" 은 패자 처리 (가격×개수의 50% 환불 + 입찰 삭제).
      </p>
    </div>
  );
}

function TicketSellForm({
  teams,
  companies,
  tickets,
  run,
}: {
  teams: Team[];
  companies: Company[];
  tickets: Ticket[];
  run: RunFn;
}) {
  const [username, setUsername] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [count, setCount] = useState("");

  const ownedCount =
    username && companyId
      ? tickets.find(
          (t) =>
            t.team_username === username &&
            t.company_id === Number(companyId),
        )?.count ?? 0
      : null;

  return (
    <div className="mt-4 p-3 bg-white border border-gray-300 rounded">
      <h3 className="font-bold mb-2">
        매칭권 자발적 판매 (최소 주문 금액의 80% 환불)
      </h3>
      <div className="flex gap-2 items-center flex-wrap">
        <select
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border border-gray-300 px-2 py-1 rounded"
        >
          <option value="">팀 선택</option>
          {teams.map((t) => (
            <option key={t.username} value={t.username}>
              {t.username}
            </option>
          ))}
        </select>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="border border-gray-300 px-2 py-1 rounded"
        >
          <option value="">회사 선택</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="개수"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="border border-gray-300 px-2 py-1 rounded w-24"
        />
        {ownedCount !== null && (
          <span className="text-xs text-gray-600">보유: {ownedCount}</span>
        )}
        <button
          type="button"
          onClick={async () => {
            await run(() =>
              sellTickets(username, Number(companyId), Number(count)),
            );
            setCount("");
          }}
          className="px-3 py-1 bg-gray-800 text-white rounded text-sm"
        >
          판매
        </button>
      </div>
    </div>
  );
}
