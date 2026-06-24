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
        className="flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300 rounded"
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
    <div className="absolute top-1 left-1 bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10">
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
    <section className="mb-6 p-4 border border-purple-300 bg-purple-50 rounded">
      <h2 className="text-lg font-bold mb-1">
        직전 정산 결과 — {ROUND_LABELS[settledRound]} 라운드
      </h2>
      <p className="text-xs text-gray-600 mb-3">
        각 회사에 모든 팀이 투자한 금액 분포 (원그래프에 마우스를 올리면 팀 /
        비율 / 금액 표시).
      </p>
      {companies.length === 0 ? (
        <p className="text-sm text-gray-500">회사가 없습니다.</p>
      ) : (
        <div className="flex flex-wrap gap-6">
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
              <div key={c.id} className="text-sm">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-gray-600 mb-1">
                  수익률 {yieldByCompany.get(c.id) ?? 0}% · 총 투자{" "}
                  {formatManwon(total)}
                </div>
                <PieChart slices={slices} />
                <div className="mt-1 space-y-0.5">
                  {slices.map((s, i) => (
                    <div
                      key={s.label}
                      className="flex items-center gap-1 text-xs"
                    >
                      <span
                        className="inline-block w-3 h-3 rounded-sm"
                        style={{
                          background: SLICE_COLORS[i % SLICE_COLORS.length],
                        }}
                      />
                      {s.label}: {formatManwon(s.value)}
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
    <section className="mb-6 p-4 border border-gray-300 rounded">
      <h2 className="text-lg font-bold mb-3">매칭권 보유 현황 (개)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-1 px-2">팀</th>
              {companies.map((c) => (
                <th key={c.id} className="py-1 px-2 text-right">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.username} className="border-b border-gray-100">
                <td className="py-1 px-2 font-mono">{t.username}</td>
                {companies.map((c) => (
                  <td key={c.id} className="py-1 px-2 text-right">
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
      <section className="mb-6 p-4 border border-gray-300 rounded">
        <h2 className="text-lg font-bold mb-3">전체 팀 시드</h2>
        <p className="text-sm text-gray-500">등록된 팀이 없습니다.</p>
      </section>
    );
  }
  const total = teams.reduce((s, t) => s + t.seed, 0);
  const sorted = [...teams].sort((a, b) => b.seed - a.seed);

  return (
    <section className="mb-6 p-4 border border-gray-300 rounded">
      <h2 className="text-lg font-bold mb-1">전체 팀 시드</h2>
      <p className="text-sm text-gray-600 mb-3">
        합계: <strong>{formatManwon(total)}</strong>
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-1 px-2">순위</th>
            <th className="py-1 px-2">팀</th>
            <th className="py-1 px-2 text-right">seed</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, idx) => (
            <tr key={t.username} className="border-b border-gray-100">
              <td className="py-1 px-2">{idx + 1}</td>
              <td className="py-1 px-2 font-mono">{t.username}</td>
              <td className="py-1 px-2 text-right">{formatManwon(t.seed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
