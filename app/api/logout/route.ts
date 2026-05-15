import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await destroySession();
  // 303 으로 GET 으로 변환해 Home 으로 이동 (브라우저에서 form 제출 시 정석)
  return NextResponse.redirect(new URL("/", req.url), 303);
}
