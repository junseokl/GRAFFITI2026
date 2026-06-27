"use client";

import { useState } from "react";

type Stage = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  /** 모노스페이스로 표시할 공식 등 (선택) */
  formula?: string;
};

const STAGES: Stage[] = [
  {
    id: "seed",
    title: "Seed",
    summary: "스타트업 키워드 공개",
    detail:
      "여기에 Seed 단계 (스타트업 키워드 공개) 에 대한 자세한 설명이 들어갈 예정입니다.",
  },
  {
    id: "series-a",
    title: "Series A",
    summary: "스타트업 문제 인식 및 해결 방안",
    detail:
      "여기에 Series A 단계 (스타트업 문제 인식 및 해결 방안) 에 대한 자세한 설명이 들어갈 예정입니다.",
  },
  {
    id: "series-b",
    title: "Series B",
    summary: "사회적 가치와 영리적 가치의 균형",
    detail:
      "여기에 Series B 단계 (사회적 가치와 영리적 가치의 균형) 에 대한 자세한 설명이 들어갈 예정입니다.",
  },
  {
    id: "series-c",
    title: "Series C",
    summary: "미래 전망 및 투자 유치 현황",
    detail:
      "여기에 Series C 단계 (미래 전망 및 투자 유치 현황) 에 대한 자세한 설명이 들어갈 예정입니다.",
  },
  {
    id: "hint",
    title: "힌트",
    summary: "수익률 공식 & 전략",
    detail:
      "각 회사의 수익률 R 은 다음 공식으로 결정됩니다.\n\n" +
      "  R(M, Z) = mean(M) + σ(M, Z) · Z\n\n" +
      "여기서\n" +
      "  M : 그 회사에 모든 팀이 투자한 총 시드머니\n" +
      "  Z : 정규분포를 따르며 [-1, +1] 사이의 무작위 값\n\n" +
      "평균과 변동성은 M 에 따라 달라집니다 — 평균은 M 이 클수록 +μ_max 에 가까워지고, 작을수록 −μ_max 에 가까워집니다. " +
      "변동성은 Z 의 부호에 따라 두 가지로 나뉘는데, 수익 방향(Z≥0) 의 σ_up 은 M 이 작을수록 커지고, " +
      "손실 방향(Z<0) 의 σ_down 은 M 이 클수록 커지면서 평균 상승을 일부 상쇄합니다.\n\n" +
      "즉,\n" +
      "  • 많은 팀이 모이는 회사 → 평균 수익률 ↑, 수익 쪽 변동성 ↓ (안정적인 작은 수익)\n" +
      "  • 적은 팀만 모이는 회사 → 평균 수익률 ↓, 수익 쪽 변동성 ↑ (대박 가능, 단 큰 손실 위험도 있음)\n\n" +
      "인기 종목은 무난한 수익을, 비인기 종목은 큰 한방을 노릴 수 있는 구조입니다. " +
      "다른 팀들이 어디에 몰릴지 예측해서 균형을 잡거나, 역으로 비인기 종목에 베팅해보세요.",
    formula:
      "  mean(M)   = μ_max − 2·μ_max / (1 + k·M)\n" +
      "  σ_up(M)   = σ_up_base + σ_up_bonus / (1 + k·M)         (Z ≥ 0)\n" +
      "  σ_down(M) = σ_down_base + σ_down_growth · k·M / (1+k·M) (Z < 0)",
  },
];

export function GameInfoTabs() {
  const [selectedId, setSelectedId] = useState<string>("seed");
  const selected = STAGES.find((s) => s.id === selectedId) ?? STAGES[0];

  return (
    <div>
      <div className="grid grid-cols-5 gap-3">
        {STAGES.map((stage) => {
          const active = stage.id === selectedId;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setSelectedId(stage.id)}
              className={
                "text-left p-4 rounded border transition " +
                (active
                  ? "border-gray-800 bg-gray-100"
                  : "border-gray-300 hover:bg-gray-50")
              }
            >
              <h3 className="font-bold mb-2">{stage.title}</h3>
              <p className="text-sm text-gray-700">{stage.summary}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 border border-gray-300 rounded">
        <h3 className="font-bold mb-2">
          {selected.title} — {selected.summary}
        </h3>
        <div className="whitespace-pre-wrap leading-7">{selected.detail}</div>
        {selected.formula && (
          <pre className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-sm overflow-x-auto">
            {selected.formula}
          </pre>
        )}
      </div>
    </div>
  );
}
