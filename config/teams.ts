// ===== 게임 참가 팀 관련 기본값 =====
//
// TEAM_COUNT 만 바꿔도 수익률 공식이 자동으로 재조정됩니다.
// (수익률 공식의 k 가 TEAM_COUNT × AVG_INITIAL_SEED 로부터 계산되기 때문)
//
// 실제 팀 등록은 admin 대시보드의 "팀" 섹션에서 따로 합니다.
// 여기 값은 "기대 팀 수 / 평균 시작 머니" 라는 게임 디자인 기준선 역할만 합니다.

export const TEAM_COUNT = 25;

/** 팀당 평균 시작 시드 머니 (원). admin 이 팀별로 다르게 설정할 수 있지만 공식은 이 평균값을 기준으로 합니다. */
export const AVG_INITIAL_SEED = 10_000_000;
