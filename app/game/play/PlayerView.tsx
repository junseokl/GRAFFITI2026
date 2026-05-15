"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PlayerViewData } from "./types";
import { ROUND_LABELS, PHASE_LABELS } from "./types";

export function PlayerView({
  data,
  username,
}: {
  data: PlayerViewData;
  username: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [router]);

  const ticketsByCompany = new Map<number, number>();
  for (const t of data.tickets) {
    ticketsByCompany.set(t.company_id, t.count);
  }

  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-bold mb-2">내 팀 현황</h1>
      <p className="text-sm text-gray-600 mb-6">팀: {username}</p>

      <div className="mb-6 p-4 border border-gray-300 rounded">
        <div className="text-sm text-gray-600">현재 라운드</div>
        <div className="text-lg font-semibold">
          {data.state ? ROUND_LABELS[data.state.current_round] : "-"}
          {" / "}
          {data.state ? PHASE_LABELS[data.state.current_phase] : "-"}
        </div>
      </div>

      <div className="mb-6 p-4 border border-gray-300 rounded">
        <div className="text-sm text-gray-600">내 seed</div>
        <div className="text-3xl font-bold">
          {data.team ? data.team.seed.toLocaleString() : "—"}원
        </div>
        {!data.team && (
          <p className="text-xs text-amber-700 mt-2">
            아직 admin 이 이 팀의 초기 seed 를 설정하지 않았습니다.
          </p>
        )}
      </div>

      <div className="p-4 border border-gray-300 rounded">
        <h2 className="font-bold mb-3">보유 매칭권</h2>
        {data.companies.length === 0 ? (
          <p className="text-sm text-gray-500">
            아직 등록된 회사가 없습니다.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="py-1">회사</th>
                <th className="py-1 text-right">매칭권 개수</th>
              </tr>
            </thead>
            <tbody>
              {data.companies.map((c) => (
                <tr key={c.id} className="border-b border-gray-100">
                  <td className="py-1">{c.name}</td>
                  <td className="py-1 text-right">
                    {ticketsByCompany.get(c.id) ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        ※ 투자/입찰 등 모든 조작은 현재 admin 이 대신 입력합니다. 자신의
        seed, 매칭권 변화가 보입니다.
      </p>
    </main>
  );
}
