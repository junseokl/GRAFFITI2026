// ===== 주식 단계 수익률 공식 매개변수 (비대칭 σ) =====
//
// 공식:
//   R(M, Z) = mean(M) + σ(M, Z) · Z
//
//   mean(M)   = μ_max − 2·μ_max / (1 + k·M)
//
//   σ(M, Z>=0) = σ_up_base   + σ_up_bonus   / (1 + k·M)         ← M 클수록 감소
//   σ(M, Z<0)  = σ_down_base + σ_down_growth · (k·M) / (1+k·M)  ← M 클수록 증가
//
//   k = k_scale / (TEAM_COUNT × AVG_INITIAL_SEED)   ← config/teams.ts 의 값에서 자동 산출
//
// 의도:
//   - σ_up 은 M 클수록 줄어들어서 "적은 M 일수록 고점이 높음"
//   - σ_down 은 M 클수록 늘어나서 "평균 상승(+μ_max 로 수렴)을 상쇄"
//   - σ_up_bonus / σ_down_growth 를 7 안팎으로 맞춰 |2·u_max − σ_up_bonus| ≈ |2·u_max − σ_down_growth|
//     → 저점 변화량과 고점 변화량이 거의 같아짐 (M 변화에 따른 비대칭 완화)
//
// 변수 의미:
//   M                 : 해당 회사에 모든 팀이 투자한 시드머니 총합
//   Z                 : 정규분포를 따르고 [-1, 1] 로 잘린 확률변수
//   μ_max             : 평균의 수렴 절대값 (큰 M 에서 +μ_max, 작은 M 에서 -μ_max 부근)
//   σ_up_base         : 큰 M 에서 유지되는 양의 변동성 최소값
//   σ_up_bonus        : 작은 M 에서 양의 변동성에 추가되는 보너스
//   σ_down_base       : 작은 M 에서의 음의 변동성 (저점이 가장 낮을 때의 σ)
//   σ_down_growth     : 큰 M 에서 음의 변동성에 추가되는 양 (평균 상승 상쇄용)
//   k_scale           : k 의 스케일링 상수.
//                       10 이면 "모든 팀이 한 회사에 몰빵" 일 때 거의 saturation.

export const YIELD_CONFIG = {
  u_max: 5,
  sigma_up_base: 10,
  sigma_up_bonus: 17,
  sigma_down_base: 15,
  sigma_down_growth: 3,
  k_scale: 10,
} as const;
