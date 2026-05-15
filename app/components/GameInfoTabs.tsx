"use client";

import { useState } from "react";

type Stage = {
  id: string;
  title: string;
  summary: string;
  detail: string;
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
];

export function GameInfoTabs() {
  const [selectedId, setSelectedId] = useState<string>("seed");
  const selected = STAGES.find((s) => s.id === selectedId) ?? STAGES[0];

  return (
    <div>
      <div className="grid grid-cols-4 gap-3">
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
        <p>{selected.detail}</p>
      </div>
    </div>
  );
}
