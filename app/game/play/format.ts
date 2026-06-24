// 모든 금액은 DB 에 won (원) 단위로 저장되지만 UI 에서는 만원(10,000) 단위로 표시·입력.
// 만원 미만 단위 (천원 이하) 는 모든 계산에서 버림.

export const MANWON = 10_000;

/** won → 만원 (내림). 화면 표시용 */
export function wonToManwon(won: number): number {
  return Math.floor((Number(won) || 0) / MANWON);
}

/** 만원 → won. 입력값 변환용 */
export function manwonToWon(manwon: number): number {
  return Math.floor((Number(manwon) || 0) * MANWON);
}

/** won 값을 "N만원" 형태로 포맷. 만원 미만은 버림. */
export function formatManwon(won: number): string {
  const m = wonToManwon(won);
  return `${m.toLocaleString()}만원`;
}

/** 만원 단위로 내림 정렬 — 계산 결과를 항상 만원의 배수로 만듦. */
export function floorToManwon(won: number): number {
  return Math.floor((Number(won) || 0) / MANWON) * MANWON;
}
