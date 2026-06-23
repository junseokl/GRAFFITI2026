# GRAFFITI2026 투자 게임 — 프로젝트 개요

> 이 파일은 Claude Code 가 세션 시작 시 자동 로드. 새 Claude 세션이 빠르게 파악할 수 있도록 작성됨.

## 한 줄 요약

스타트업 투자 게임. 약 25팀 참가, 4라운드(Seed → Series A → B → C), 각 라운드마다 주식 단계(투자) → 결과 발표(정산) → 매칭권 단계(입찰)로 진행. admin 이 라운드 진행을 통제하고, 참가자(플레이어)는 자기 화면에서 투자·입찰·매칭권 판매를 직접 함.

## 기술 스택

- **Next.js 15** (App Router, Server Actions, RSC)
- **TypeScript**, **Tailwind CSS** (현 단계 디자인 미적용 — 최소 스타일)
- **Neon Postgres** (`@neondatabase/serverless` HTTP fetch 모드)
- **JWT 세션** (`jose`, HS256), **bcryptjs** 비밀번호 해시
- **Vercel** 배포 (git push → 자동 재배포)
- 외부 의존성 최소: pie chart 도 직접 그린 SVG (라이브러리 없음)

## 파일 구조

```
투자게임/
├── CLAUDE.md                    ← 이 파일
├── config/
│   ├── teams.ts                 ← TEAM_COUNT(25), AVG_INITIAL_SEED(1천만)
│   └── yield.ts                 ← 수익률 공식 매개변수 (비대칭 σ)
├── lib/
│   ├── db.ts                    ← Neon SQL 클라이언트
│   ├── auth.ts                  ← JWT 세션 생성·검증·삭제 (7일 만료)
│   ├── users.ts                 ← AUTH_USERS_B64 디코드, bcrypt 검증
│   ├── permissions.ts           ← isAdminUsername, requireAdmin
│   └── game.ts                  ← 게임 코어 로직 (op* 함수들, settleStockRound, computeYieldPct)
├── app/
│   ├── layout.tsx               ← 루트 레이아웃 + NavBar
│   ├── globals.css              ← Tailwind 임포트만
│   ├── page.tsx                 ← Home
│   ├── components/
│   │   ├── NavBar.tsx           ← 상단 네비 (서버 컴포넌트, 세션 읽음)
│   │   └── LoginForm.tsx        ← 클라이언트, 401/500 구분 에러 표시
│   ├── login/page.tsx           ← 이미 로그인 시 / 로 리다이렉트
│   ├── game/
│   │   ├── info/
│   │   │   ├── page.tsx         ← 게임 설명 (Seed/A/B/C 4탭)
│   │   │   └── (GameInfoTabs)   ← components/GameInfoTabs.tsx
│   │   └── play/
│   │       ├── page.tsx         ← 서버 컴포넌트, 로그인 게이트 + admin/player 분기 + DB 페치
│   │       ├── types.ts         ← 공유 타입 + ROUND/PHASE_LABELS + describeNext, latestSettledRound
│   │       ├── AdminDashboard.tsx ← 클라이언트, 큰 파일 (~700줄)
│   │       ├── PlayerView.tsx   ← 클라이언트, 투자·입찰·판매·결과 표시
│   │       └── shared.tsx       ← PieChart(SVG), SettledResultsPanel, TicketHoldingsTable
│   ├── components/GameInfoTabs.tsx ← 게임 설명 페이지 4탭 (클라이언트)
│   ├── actions/
│   │   ├── admin.ts             ← admin 전용 서버 액션 (requireAdmin 필수)
│   │   └── player.ts            ← player 전용 (세션 username 사용, 남의 팀 조작 불가)
│   └── api/
│       ├── login/route.ts       ← POST: 401(잘못된 비번) / 500(서버 설정 오류) 구분
│       └── logout/route.ts      ← POST → 303 redirect to /
├── scripts/
│   ├── hash-password.mjs        ← bcrypt 해시 1개 생성
│   ├── build-auth-users.mjs     ← AUTH_USERS_B64 생성 (여러 계정 일괄)
│   ├── db-init.mjs              ← 모든 테이블 CREATE IF NOT EXISTS
│   └── db-reset.mjs             ← 모든 테이블 DROP (스키마 변경 시 reset → init)
├── .env.local                   ← gitignored — 비밀 값들
├── .env.example                 ← 커밋되는 템플릿
└── package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.mjs
```

## 환경 변수 (.env.local / Vercel)

| 변수 | 용도 | 비고 |
|---|---|---|
| `SESSION_SECRET` | JWT 서명 키 (32자+) | 비밀 |
| `AUTH_USERS_B64` | `[{username, passwordHash}, ...]` 의 base64 | `$` 문자가 dotenv-expand 와 충돌해서 base64 로 감쌈 |
| `ADMIN_USERNAMES` | admin 권한 username 콤마 구분 | 기본 `admin` |
| `DATABASE_URL` | Neon Postgres 연결 문자열 | `POSTGRES_URL` 도 fallback |
| `NEXT_PUBLIC_NOTION_URL` | (선택) 상단 Notion 버튼 링크 | 비우면 비활성 |

현재 계정 (기본): `admin/1234`, `test/test`, `test2/test2`.

## DB 스키마

`npm run db:init` 로 생성. 모두 Neon Postgres.

| 테이블 | 컬럼 | 용도 |
|---|---|---|
| `game_state` | id PK(=1), current_round, current_phase | 싱글톤. round ∈ {seed,series-a,series-b,series-c,ended}, phase ∈ {idle,stock,results,matching} |
| `companies` | id SERIAL PK, name UNIQUE, min_order_price, created_at | 회사 목록 + 매칭권 최소 주문 금액 |
| `teams` | username PK, seed (CHECK >= 0) | 팀별 현재 시드 머니. admin 이 추가/수정 |
| `tickets` | (team_username, company_id) PK, count | 팀별 회사별 매칭권 보유 |
| `investments` | (round, team_username, company_id) PK, amount | **라운드별** 투자 내역. 정산 후에도 보존(history) |
| `round_results` | (round, company_id) PK, yield_pct | 정산 결과(회사별 수익률%) |
| `bids` | (team_username, company_id) PK, price, count | 현재 매칭권 단계의 입찰. 한 팀 한 회사 = 한 가격. 정산/취소 시 삭제 |

## 게임 진행 상태 머신

```
(seed, idle) → stock → results → matching →
(series-a, idle) → stock → results → matching →
(series-b, idle) → stock → results → matching →
(series-c, idle) → stock → results → matching →
(ended, idle)
```

전이는 [lib/game.ts](lib/game.ts) `computeNextState(round, phase)`. admin 대시보드 맨 아래 오른쪽 **"다음 단계로 넘어가기"** 버튼이 이 흐름을 따라감. **stock → results** 로 넘어갈 때 자동 정산(`settleStockRound`).

> admin 화면 상단의 라운드/페이즈 직접 선택 박스(`setGameState`)는 **escape hatch** — 정산을 건너뛰니 일반 흐름에선 쓰지 말 것.

## 수익률 공식 (현재 비대칭 σ)

```
R(M, Z) = mean(M) + σ(M, Z) · Z,   Z ~ N(0,1) ∩ [-1, 1]

mean(M)   = μ_max − 2·μ_max / (1 + k·M)
σ_up(M)   = σ_up_base   + σ_up_bonus   / (1 + k·M)         (Z ≥ 0)
σ_down(M) = σ_down_base + σ_down_growth · k·M / (1+k·M)    (Z < 0)

k = k_scale / (TEAM_COUNT × AVG_INITIAL_SEED)
```

- M: 회사별 모든 팀의 총 투자금 (원)
- 적은 M = 낮은 평균 + 높은 σ_up (한방 가능)
- 많은 M = 높은 평균 + 낮은 σ_up + 높은 σ_down (안정·작은 수익)
- σ_up_bonus > σ_down_growth → 고점 변화 폭 > 저점 변화 폭

**파라미터** ([config/yield.ts](config/yield.ts)):
- u_max=5, σ_up_base=10, σ_up_bonus=20, σ_down_base=15, σ_down_growth=5, k_scale=10

**팀 수 조정**: [config/teams.ts](config/teams.ts) 의 `TEAM_COUNT` 만 바꾸면 k 자동 재계산. 곡선의 "모양"은 유지되고 "총 머니 대비 비율" 로 동일하게 동작.

구현: [lib/game.ts](lib/game.ts) `computeYieldPct(M)`. `settleStockRound(round)` 는 회사별로 한 번씩 Z 샘플링 → R(M) 계산 → 모든 투자에 적용 → `round_results` 기록 (idempotent — round_results 가 이미 있으면 skip).

## 인증 & 권한

- 비밀번호는 **bcrypt 해시**만 env 에 (`AUTH_USERS_B64`)
- 로그인: `/api/login` 에서 검증 → 성공 시 JWT 발급 → httpOnly+secure(prod)+sameSite=lax 쿠키, 7일 만료
- 모든 admin server action: `requireAdmin()` 1번째 줄에서 검증 (throw UNAUTHORIZED/FORBIDDEN)
- 모든 player server action: 세션 username 만 사용해서 자기 팀만 수정 가능, 매칭 단계/주식 단계 phase 검증
- LoginForm 은 **401** vs **500** 을 구분해 표시: 500 이면 환경변수 문제임을 알려줌

## Server Actions 목록

### [app/actions/admin.ts](app/actions/admin.ts) (`requireAdmin` 필수)

| 함수 | 용도 |
|---|---|
| `setGameState(round, phase)` | 라운드/페이즈 직접 변경 (escape hatch) |
| `advanceToNextPhase()` | 정상 흐름. stock→results 시 자동 정산 |
| `addCompany / updateCompany / deleteCompany` | 회사 CRUD |
| `setTeamSeed / deleteTeam / setTeamTickets` | 팀 시드·매칭권 직접 조정 |
| `setInvestment / clearInvestment` | admin 이 팀 대신 투자 입력 |
| `setBid / clearBid` | admin 이 팀 대신 입찰 입력 |
| `awardBid(team, company)` | 승자 처리: 입찰 count → tickets 로 전환 (추가 환불 없음) |
| `refundFailedBid(team, company)` | 패자 처리: 가격×개수의 50% 환불 + 입찰 삭제 |
| `sellTickets(team, company, count)` | admin 이 팀 대신 매칭권 판매 (80% 환불) |

### [app/actions/player.ts](app/actions/player.ts) (세션 username 사용)

| 함수 | 사용 가능 phase |
|---|---|
| `playerSetInvestment(companyId, amount)` | stock |
| `playerClearInvestment(companyId)` | stock |
| `playerSetBid(companyId, price, count)` | matching |
| `playerClearBid(companyId)` | matching |
| `playerSellTickets(companyId, count)` | matching |

### [lib/game.ts](lib/game.ts) 공유 ops (auth 검증 안 함, 액션이 wrap)

`opSetInvestment`, `opClearInvestment`, `opSetBid`, `opClearBid`, `opSellTickets`, `settleStockRound`, `readGameState`, `computeNextState`.

## /game/play UI

서버 컴포넌트 [page.tsx](app/game/play/page.tsx):
1. 세션 없으면 "로그인 하시오!" 페이지
2. admin 이면 `<AdminDashboard />`, 아니면 `<PlayerView />`
3. DB 미초기화면 "DB 초기화 필요" 안내

**AdminDashboard 섹션 순서**:
1. 게임 상태 (직접 변경 박스)
2. 회사 (추가/수정/삭제)
3. 팀 (seed, 매칭권 수정, 삭제, 미등록 계정 자동완성)
4. 주식 단계 매트릭스 (phase=stock 일 때, 팀×회사 투자 금액 표)
5. 매칭권 단계 (phase=matching 일 때, 팀×회사 입찰 표 + 정산 리스트 + 판매 폼)
6. 정산 결과 패널 (round_results 있으면 항상 표시, 회사별 수익률 + pie chart)
7. 매칭권 보유 현황 (팀×회사 매트릭스)
8. **"다음 단계로 넘어가기"** 버튼 (오른쪽 아래)

**PlayerView 섹션**:
1. 헤더 (라운드/페이즈, 내 seed)
2. 주식 단계 시: 투자하기 (회사별 입력, 남은 seed/투자 합계 표시)
3. 매칭권 단계 시: 매칭권 구매 (가격·개수 입력, 라이브 "이 회사에 쓸 금액", 최소가 미만 시 "금액이 낮습니다" + 버튼 비활성)
4. 매칭권 단계 시: 매칭권 판매 (80% 환불, 예상 환불 미리보기)
5. 내 결과 패널 (정산 후, 회사별 내 투자/수익률/회수액)
6. 전체 정산 결과 패널 (모든 팀의 분포 pie chart)
7. 매칭권 보유 현황 (전체 팀)

**폴링**: 양쪽 다 3초마다 `router.refresh()` → 서버 컴포넌트 재실행 → 신규 데이터 자동 반영. 입력 중인 텍스트는 로컬 state 라 덮어쓰이지 않음.

**보안**: 플레이어에겐 자기 입찰만 fetch (page.tsx 에서 `WHERE team_username = username`), 다른 팀 입찰가 노출 안 됨.

## 자주 하는 작업

| 하고 싶은 것 | 방법 |
|---|---|
| 계정 추가/비번 변경 | `npm run build-auth-users -- admin:1234 test:test test2:test2 newname:newpw` → 출력 base64 를 `.env.local` 의 `AUTH_USERS_B64=` 에 교체 + Vercel env vars 동일 갱신 |
| 수익률 공식 튜닝 | [config/yield.ts](config/yield.ts) 의 6개 숫자 수정 → git push |
| 팀 수 기준 변경 | [config/teams.ts](config/teams.ts) 의 `TEAM_COUNT` 수정 → 자동으로 k 재계산 |
| DB 스키마 변경 후 적용 | `npm run db:reset && npm run db:init` (테스트 데이터 초기화 OK 가정) |
| 로컬 개발 | `npm run dev` → http://localhost:3000 |
| Vercel 재배포 | `git push` 하면 자동 |
| 비밀번호 잊음 | bcrypt 는 일방향 — 새로 발급해서 교체. 또는 사용자에게 위 표 1행 참조 |
| Notion 링크 활성화 | `NEXT_PUBLIC_NOTION_URL` env 채우고 재배포 (NEXT_PUBLIC_ 은 빌드 타임이라 무조건 재배포 필요) |

## 알아두면 좋은 디테일 / 함정

- **dotenv `$` 확장 문제**: bcrypt 해시에 `$` 가 있어서 평문으로 env 에 못 넣음. → JSON 을 base64 로 감싸 `AUTH_USERS_B64` 로 보관. `lib/users.ts` 가 디코드.
- **`@vercel/postgres` deprecated**: `@neondatabase/serverless` 사용. HTTP fetch 모드라 단일 쿼리만 가능, 다중 statement 는 `sql.query()` 로 별도 호출.
- **`investments.round` PK 컬럼**: 정산 후에도 안 지움. 회사별 분포 pie chart 와 "내 결과" 패널이 이 history 를 읽음.
- **`bids` 는 history 아님**: 매칭 단계 진행 중 데이터. award/refund/clear 시 삭제됨.
- **정산 idempotency**: `settleStockRound` 는 `round_results` 가 이미 있으면 no-op. admin 이 페이즈를 강제로 stock 으로 되돌리고 advance 해도 중복 정산 안 됨.
- **manual setGameState 는 정산 skip**: admin 이 직접 phase 를 results 로 바꾸면 round_results 가 안 채워짐. 그러면 결과 패널이 비어 보임. 정상 흐름은 "다음 단계로" 버튼.
- **bid 의 seed 차감**: 입찰 시 `price × count` 만큼 seed 즉시 차감. `clearBid` 는 전액 환불, `awardBid` 는 환불 없음(매칭권으로 전환), `refundFailedBid` 는 50% 환불.
- **`opSellTickets`** 환불액 = `floor(min_order_price × count × 0.8)`. 최소 주문 금액은 admin 이 매칭 단계에서 조정 가능.
- **`min_order_price` 의 의미**: 매칭권 입찰 가격의 하한. 자발적 판매 가격(80%) 의 기준이기도 함.
- **세션 만료 7일**: [lib/auth.ts](lib/auth.ts) `MAX_AGE_SECONDS`.
- **OneDrive 경로**: 로컬 경로가 OneDrive 안이라 npm install 중 가끔 파일 잠금 발생 가능 — 그럴 땐 OneDrive 일시정지 후 재시도.

## 배포

- 레포: `https://github.com/Micron-726/GRAFFITI2026`
- Vercel: GitHub 연결돼 있어서 `git push` 만 하면 자동 배포 (Hobby 플랜, 무료)
- DB: Neon (현재 로컬·prod 같은 DB 공유 — 분리하고 싶으면 Neon 에서 새 프로젝트 만들어 prod env 만 새 URL)
- 환경변수 변경 시 Vercel 에서 **Redeploy** 한 번 필요 (특히 `NEXT_PUBLIC_*` 은 빌드 타임 변수)
- 한 번도 deploy 안 한 상태라면: Vercel → New Project → repo import → 5개 env var 입력 → Deploy

## 게임 룰 핵심 (게임 디자이너 의도)

- **매칭권의 효용**: 게임 종료 후 별도로 사용 (게임 중에는 그냥 보유 카운트만 의미). 최종 결과는 팀별 seed + 회사별 매칭권 개수.
- **자발적 매칭권 판매 (80%)** 와 **패자 매칭권 회수 (50% 환불)** 는 매칭 단계 안에서 별개의 admin 행동.
- **매칭권 정산**: top 2 자동 판정 안 함. admin 이 입찰 정산 리스트에서 "확정" / "50% 환불" 을 손으로 누름 (현재 룰에서 동률 처리도 admin 재량).
- **seed 음수 불가**: DB CHECK 제약. 정산 페이아웃은 `GREATEST(0, ...)` 로 클램프.
- **수익률 공식의 미래 변경**: 공식 자체를 새로 받으면 `computeYieldPct` 만 교체하면 됨. `round_results.yield_pct` 가 INTEGER 라 소수점 필요해지면 컬럼 타입 변경 필요.
