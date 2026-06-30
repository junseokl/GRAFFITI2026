"use client";

import { useState } from "react";
import type { Company, Investment, RoundResult, Team, Ticket } from "./types";
import { ROUND_LABELS, latestSettledRound } from "./types";
import { formatManwon } from "./format";

export const SLICE_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export type PieSlice = { label: string; value: number };

// ===== 원그래프 (직접 그린 SVG, 호버 시 툴팁) =====

export function PieChart({
  slices,
  size = 150,
}: {
  slices: PieSlice[];
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const positive = slices.filter((s) => s.value > 0);
  const total = positive.reduce((s, x) => s + x.value, 0);

  if (total <= 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-[#cfd7cc] bg-[#fbfcfa] text-xs font-medium text-[#8a9488]"
        style={{ width: size, height: size }}
      >
        투자 없음
      </div>
    );
  }

  const r = size / 2;

  if (positive.length === 1) {
    return (
      <div className="relative inline-block">
        <svg width={size} height={size}>
          <circle
            cx={r}
            cy={r}
            r={r}
            fill={SLICE_COLORS[0]}
            onMouseEnter={() => setHover(0)}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
        {hover === 0 && (
          <PieTooltip
            label={positive[0].label}
            pct={100}
            value={positive[0].value}
          />
        )}
      </div>
    );
  }

  let angle = -90;
  const arcs = positive.map((slice, i) => {
    const frac = slice.value / total;
    const start = angle;
    const end = angle + frac * 360;
    angle = end;
    return {
      d: arcPath(r, r, r, start, end),
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      slice,
      frac,
      i,
    };
  });

  return (
    <div className="relative inline-block">
      <svg width={size} height={size}>
        {arcs.map((a) => (
          <path
            key={a.i}
            d={a.d}
            fill={a.color}
            stroke="white"
            strokeWidth={1}
            opacity={hover === null || hover === a.i ? 1 : 0.35}
            onMouseEnter={() => setHover(a.i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover !== null && arcs[hover] && (
        <PieTooltip
          label={arcs[hover].slice.label}
          pct={arcs[hover].frac * 100}
          value={arcs[hover].slice.value}
        />
      )}
    </div>
  );
}

function PieTooltip({
  label,
  pct,
  value,
}: {
  label: string;
  pct: number;
  value: number;
}) {
  return (
    <div className="pointer-events-none absolute left-1 top-1 z-10 whitespace-nowrap rounded-md bg-[#151713] px-2 py-1 text-xs font-semibold text-white shadow-lg">
      {label} · {pct.toFixed(1)}% · {formatManwon(value)}
    </div>
  );
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const s = polar(cx, cy, r, endDeg);
  const e = polar(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

// ===== 직전 정산 결과 패널 (회사별 수익률 + 투자 분포 원그래프) =====

export function SettledResultsPanel({
  companies,
  investments,
  roundResults,
}: {
  companies: Company[];
  investments: Investment[];
  roundResults: RoundResult[];
}) {
  const settledRound = latestSettledRound(roundResults);
  if (!settledRound) return null;

  const roundInvestments = investments.filter((i) => i.round === settledRound);
  const yieldByCompany = new Map<number, number>();
  for (const rr of roundResults) {
    if (rr.round === settledRound) {
      yieldByCompany.set(rr.company_id, rr.yield_pct);
    }
  }

  return (
    <section className="surface-panel panel-pad mb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Results</p>
          <h2 className="text-xl font-black">
            {ROUND_LABELS[settledRound]} 라운드 정산
          </h2>
        </div>
        <span className="phase-pill">회사별 투자 분포</span>
      </div>
      <p className="sr-only">
        원그래프에 마우스를 올리면 팀, 비율, 금액을 확인할 수 있습니다.
      </p>
      {companies.length === 0 ? (
        <p className="text-sm text-[#667065]">회사가 없습니다.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {companies.map((c) => {
            const compInvestments = roundInvestments
              .filter((i) => i.company_id === c.id)
              .sort((a, b) => b.amount - a.amount);
            const total = compInvestments.reduce(
              (s, i) => s + i.amount,
              0,
            );
            const slices: PieSlice[] = compInvestments.map((i) => ({
              label: i.team_username,
              value: i.amount,
            }));
            return (
              <div key={c.id} className="rounded-lg border border-[#dfe4dc] bg-[#fbfcfa] p-4 text-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-black">{c.name}</div>
                    <div className="muted-label">총 투자 {formatManwon(total)}</div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#0f766e]">
                    {yieldByCompany.get(c.id) ?? 0}%
                  </div>
                </div>
                <PieChart slices={slices} />
                <div className="mt-3 space-y-1">
                  {slices.map((s, i) => (
                    <div
                      key={s.label}
                      className="flex items-center justify-between gap-2 text-xs text-[#4e584d]"
                    >
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block h-3 w-3 rounded-sm"
                          style={{
                            background: SLICE_COLORS[i % SLICE_COLORS.length],
                          }}
                        />
                        {s.label}
                      </span>
                      <span className="font-semibold">{formatManwon(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ===== 매칭권 보유 현황 (팀 × 회사 매트릭스, 읽기 전용) =====

export function TicketHoldingsTable({
  companies,
  teams,
  tickets,
}: {
  companies: Company[];
  teams: Team[];
  tickets: Ticket[];
}) {
  if (teams.length === 0 || companies.length === 0) return null;

  const get = (u: string, cid: number) =>
    tickets.find((t) => t.team_username === u && t.company_id === cid)?.count ??
    0;

  return (
    <section className="surface-panel panel-pad mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Tickets</p>
          <h2 className="text-xl font-black">매칭권 보유 현황</h2>
          <p className="muted-label mt-1">
            각 회사 매칭권의 가격은 <strong>이번 라운드 매칭권 최소 주문 금액</strong>
            (직전 매칭권 단계 승자 중 최저가).
          </p>
        </div>
        <span className="phase-pill">개수</span>
      </div>
      <div className="overflow-x-auto">
        <table className="table-modern">
          <thead>
            <tr>
              <th>팀</th>
              {companies.map((c) => (
                <th key={c.id} className="text-right">
                  <div>{c.name}</div>
                  <div className="muted-label mt-0.5 font-normal">
                    {formatManwon(c.min_order_price)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.username}>
                <td className="font-mono font-semibold">{t.username}</td>
                {companies.map((c) => (
                  <td key={c.id} className="text-right font-semibold tabular-nums">
                    {get(t.username, c.id)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ===== 전체 팀 시드 요약 (display 페이지용) =====

export function AllTeamsSeedTable({ teams }: { teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <section className="surface-panel panel-pad mb-6">
        <h2 className="text-xl font-black">전체 팀 시드</h2>
        <p className="text-sm text-[#667065]">등록된 팀이 없습니다.</p>
      </section>
    );
  }
  const total = teams.reduce((s, t) => s + t.seed, 0);
  const sorted = [...teams].sort((a, b) => b.seed - a.seed);

  return (
    <section className="surface-panel panel-pad mb-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h2 className="text-xl font-black">전체 팀 시드</h2>
        </div>
        <div className="text-right">
          <div className="muted-label">합계</div>
          <div className="text-lg font-black">{formatManwon(total)}</div>
        </div>
      </div>
      <table className="table-modern">
        <thead>
          <tr>
            <th>순위</th>
            <th>팀</th>
            <th className="text-right">seed</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, idx) => (
            <tr key={t.username}>
              <td className="font-black tabular-nums">{idx + 1}</td>
              <td className="font-mono font-semibold">{t.username}</td>
              <td className="text-right font-black">{formatManwon(t.seed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
