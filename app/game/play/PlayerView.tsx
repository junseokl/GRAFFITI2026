"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  playerSetInvestment,
  playerClearInvestment,
  playerSetBid,
  playerClearBid,
  playerSellTickets,
  type ActionResult,
} from "@/app/actions/player";
import type { Bid, Company, GameData, Investment, Ticket } from "./types";
import { ROUND_LABELS, PHASE_LABELS, latestSettledRound } from "./types";
import { SettledResultsPanel, TicketHoldingsTable } from "./shared";
import { formatManwon, manwonToWon, wonToManwon, MANWON } from "./format";

type RunFn = (
  fn: () => Promise<ActionResult | unknown>,
) => Promise<void>;

function isError(result: unknown): string | null {
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    typeof (result as { error?: unknown }).error === "string" &&
    (result as { error: string }).error
  ) {
    return (result as { error: string }).error;
  }
  return null;
}

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

  const run: RunFn = async (fn) => {
    setError(null);
    try {
      const result = await fn();
      const err = isError(result);
      if (err) {
        setError(err);
        return;
      }
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
          <div className="text-3xl font-bold">
            {myTeam ? formatManwon(myTeam.seed) : "—"}
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

      {state?.current_phase === "matching" && myTeam && (
        <BidSection
          companies={data.companies}
          bids={data.bids}
          seed={myTeam.seed}
          run={run}
        />
      )}

      {state?.current_phase === "matching" && myTeam && (
        <SellSection
          companies={data.companies}
          tickets={data.tickets.filter((t) => t.team_username === username)}
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
  run: RunFn;
}) {
  const investedTotal = investments.reduce((s, i) => s + i.amount, 0);

  return (
    <section className="mb-6 p-4 border border-blue-300 bg-blue-50 rounded">
      <h2 className="text-lg font-bold mb-1">투자하기</h2>
      <p className="text-sm text-gray-700 mb-3">
        남은 seed <strong>{formatManwon(seed)}</strong> · 이번 라운드 투자
        합계 {formatManwon(investedTotal)}
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
        모든 금액은 <strong>만원</strong> 단위. 보유 seed 를 초과해서 투자할
        수 없습니다. 저장 시 seed 에서 즉시 차감되고, 취소하면 되돌아옵니다.
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
  run: RunFn;
}) {
  const [v, setV] = useState(String(wonToManwon(currentAmount)));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="w-40 font-semibold">{company.name}</span>
      <span className="text-xs text-gray-500 w-32">
        현재 투자 {formatManwon(currentAmount)}
      </span>
      <input
        type="number"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="border border-gray-300 px-2 py-1 rounded w-28"
      />
      <span className="text-xs text-gray-500">만원</span>
      <button
        type="button"
        onClick={() =>
          run(() => playerSetInvestment(company.id, manwonToWon(Number(v))))
        }
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

// ===== 매칭권 단계: 입찰하기 =====

function BidSection({
  companies,
  bids,
  seed,
  run,
}: {
  companies: Company[];
  bids: Bid[];
  seed: number;
  run: RunFn;
}) {
  const bidTotal = bids.reduce((s, b) => s + b.price * b.count, 0);

  return (
    <section className="mb-6 p-4 border border-green-300 bg-green-50 rounded">
      <h2 className="text-lg font-bold mb-1">매칭권 구매</h2>
      <p className="text-sm text-gray-700 mb-3">
        남은 seed <strong>{formatManwon(seed)}</strong> · 현재 입찰에 묶인
        금액 {formatManwon(bidTotal)}
      </p>

      {companies.length === 0 ? (
        <p className="text-sm text-gray-500">아직 등록된 회사가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {companies.map((c) => {
            const bid = bids.find((b) => b.company_id === c.id);
            return (
              <BidRow
                key={`${c.id}-${bid?.price ?? 0}-${bid?.count ?? 0}`}
                company={c}
                currentBid={bid ?? null}
                run={run}
              />
            );
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">
        가격은 만원 단위. 회사 최소 주문 금액 이상이어야 합니다. 한 회사에는
        하나의 가격으로만 입찰. 입찰하면 (가격 × 개수) 만큼 seed 에서 즉시
        차감되고, 취소하면 전액 되돌아옵니다. 최종 매칭권 획득·정산은 admin
        이 처리합니다.
      </p>
    </section>
  );
}

function BidRow({
  company,
  currentBid,
  run,
}: {
  company: Company;
  currentBid: Bid | null;
  run: RunFn;
}) {
  const [priceManwon, setPriceManwon] = useState(
    currentBid ? String(wonToManwon(currentBid.price)) : "",
  );
  const [count, setCount] = useState(
    currentBid ? String(currentBid.count) : "",
  );

  const priceManwonNum = Number(priceManwon);
  const countNum = Number(count);
  const priceValid =
    priceManwon.trim() !== "" && Number.isFinite(priceManwonNum);
  const countValid =
    count.trim() !== "" && Number.isInteger(countNum) && countNum >= 1;
  const priceWon = manwonToWon(priceManwonNum);
  const tooLow = priceValid && priceWon < company.min_order_price;
  const costWon = (priceValid ? priceWon : 0) * (countValid ? countNum : 0);
  const canBid = priceValid && countValid && !tooLow;

  return (
    <div className="border border-gray-200 rounded p-2 bg-white">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-40 font-semibold">{company.name}</span>
        <span className="text-xs text-gray-500">
          최소 {formatManwon(company.min_order_price)}
        </span>
        <span className="text-xs text-gray-600">
          현재 입찰:{" "}
          {currentBid
            ? `${formatManwon(currentBid.price)} × ${currentBid.count}개 = ${formatManwon(currentBid.price * currentBid.count)}`
            : "없음"}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <input
          type="number"
          placeholder="가격"
          value={priceManwon}
          onChange={(e) => setPriceManwon(e.target.value)}
          className="border border-gray-300 px-2 py-1 rounded w-24"
        />
        <span className="text-xs text-gray-500">만원</span>
        <input
          type="number"
          placeholder="개수"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="border border-gray-300 px-2 py-1 rounded w-20"
        />
        <button
          type="button"
          disabled={!canBid}
          onClick={() =>
            run(() => playerSetBid(company.id, priceWon, countNum))
          }
          className="px-3 py-1 bg-gray-800 text-white rounded text-sm disabled:opacity-40"
        >
          입찰
        </button>
        {currentBid && (
          <button
            type="button"
            onClick={() => run(() => playerClearBid(company.id))}
            className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm"
          >
            취소
          </button>
        )}
        <span className="text-sm">
          이 회사에 쓸 금액: <strong>{formatManwon(costWon)}</strong>
        </span>
        {tooLow && (
          <span className="text-red-600 text-sm font-semibold">
            금액이 낮습니다
          </span>
        )}
      </div>
    </div>
  );
}

// ===== 매칭권 단계: 판매하기 (80% 환불) =====

function SellSection({
  companies,
  tickets,
  run,
}: {
  companies: Company[];
  tickets: Ticket[];
  run: RunFn;
}) {
  const owned = companies
    .map((c) => ({
      company: c,
      count: tickets.find((t) => t.company_id === c.id)?.count ?? 0,
    }))
    .filter((o) => o.count > 0);

  return (
    <section className="mb-6 p-4 border border-amber-300 bg-amber-50 rounded">
      <h2 className="text-lg font-bold mb-1">매칭권 판매</h2>
      <p className="text-sm text-gray-700 mb-3">
        보유한 매칭권을 현재 회사 최소 주문 금액의 80% 가격으로 되팔 수
        있습니다.
      </p>
      {owned.length === 0 ? (
        <p className="text-sm text-gray-500">보유한 매칭권이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {owned.map((o) => (
            <SellRow
              key={`${o.company.id}-${o.count}`}
              company={o.company}
              owned={o.count}
              run={run}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SellRow({
  company,
  owned,
  run,
}: {
  company: Company;
  owned: number;
  run: RunFn;
}) {
  const [count, setCount] = useState("");

  const countNum = Number(count);
  const countEntered = count.trim() !== "" && Number.isInteger(countNum);
  const tooMany = countEntered && countNum > owned;
  const valid = countEntered && countNum >= 1 && countNum <= owned;
  const refund = valid
    ? Math.floor((company.min_order_price * countNum * 0.8) / MANWON) * MANWON
    : 0;

  return (
    <div className="flex items-center gap-2 flex-wrap border border-gray-200 rounded p-2 bg-white">
      <span className="w-40 font-semibold">{company.name}</span>
      <span className="text-xs text-gray-500">
        보유 {owned}개 · 최소가 {formatManwon(company.min_order_price)}
      </span>
      <input
        type="number"
        placeholder="판매 개수"
        value={count}
        onChange={(e) => setCount(e.target.value)}
        className="border border-gray-300 px-2 py-1 rounded w-28"
      />
      <button
        type="button"
        disabled={!valid}
        onClick={() => run(() => playerSellTickets(company.id, countNum))}
        className="px-3 py-1 bg-gray-800 text-white rounded text-sm disabled:opacity-40"
      >
        판매
      </button>
      <span className="text-sm">
        예상 환불: <strong>{formatManwon(refund)}</strong>
      </span>
      {tooMany && (
        <span className="text-red-600 text-sm">보유 개수보다 많습니다</span>
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
              const payoutWon = Math.max(
                0,
                Math.floor((i.amount * (1 + y / 100)) / MANWON) * MANWON,
              );
              return (
                <tr key={i.company_id} className="border-b border-gray-100">
                  <td className="py-1">{company?.name ?? i.company_id}</td>
                  <td className="py-1 text-right">
                    {formatManwon(i.amount)}
                  </td>
                  <td className="py-1 text-right">{y}%</td>
                  <td className="py-1 text-right">
                    {formatManwon(payoutWon)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="text-sm">
        현재 내 팀 최종 seed:{" "}
        <strong>{myTeam ? formatManwon(myTeam.seed) : "—"}</strong>
      </p>
    </section>
  );
}
