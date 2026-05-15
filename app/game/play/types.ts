export type Round =
  | "seed"
  | "series-a"
  | "series-b"
  | "series-c"
  | "ended";

export type Phase = "idle" | "stock" | "matching";

export type GameState = {
  current_round: Round;
  current_phase: Phase;
};

export type Company = {
  id: number;
  name: string;
  min_order_price: number;
};

export type Team = {
  username: string;
  seed: number;
};

export type Ticket = {
  team_username: string;
  company_id: number;
  count: number;
};

export type Investment = {
  team_username: string;
  company_id: number;
  amount: number;
};

export type Bid = {
  team_username: string;
  company_id: number;
  price: number;
  count: number;
};

export type AdminViewData = {
  state: GameState | undefined;
  companies: Company[];
  teams: Team[];
  tickets: Ticket[];
  investments: Investment[];
  bids: Bid[];
  /** 인증 env 에 등록되어 있지만 admin 이 아닌 사용자 목록 */
  configuredUsernames: string[];
};

export type PlayerViewData = {
  state: GameState | undefined;
  companies: Company[];
  team: Team | null;
  tickets: Ticket[];
};

export const ROUND_LABELS: Record<Round, string> = {
  seed: "Seed",
  "series-a": "Series A",
  "series-b": "Series B",
  "series-c": "Series C",
  ended: "종료",
};

export const PHASE_LABELS: Record<Phase, string> = {
  idle: "대기",
  stock: "주식 단계",
  matching: "매칭권 단계",
};
