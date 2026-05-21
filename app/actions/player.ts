"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { isAdminUsername } from "@/lib/permissions";
import { readGameState, opSetInvestment, opClearInvestment } from "@/lib/game";

// 플레이어 본인 팀 투자. username 은 세션에서만 가져오므로 남의 팀은 조작 불가.
async function requirePlayer(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("로그인이 필요합니다");
  if (isAdminUsername(session.username)) {
    throw new Error("admin 계정은 이 기능을 사용할 수 없습니다");
  }
  return session.username;
}

export async function playerSetInvestment(companyId: number, amount: number) {
  const username = await requirePlayer();
  if (!Number.isInteger(companyId)) throw new Error("잘못된 회사");
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("투자 금액은 0 이상의 정수여야 합니다");
  }

  const state = await readGameState();
  if (state.current_phase !== "stock") {
    throw new Error("지금은 투자할 수 있는 단계가 아닙니다");
  }

  await opSetInvestment(state.current_round, username, companyId, amount);
  revalidatePath("/game/play");
}

export async function playerClearInvestment(companyId: number) {
  const username = await requirePlayer();
  if (!Number.isInteger(companyId)) throw new Error("잘못된 회사");

  const state = await readGameState();
  if (state.current_phase !== "stock") {
    throw new Error("지금은 투자를 취소할 수 있는 단계가 아닙니다");
  }

  await opClearInvestment(state.current_round, username, companyId);
  revalidatePath("/game/play");
}
