import { NextResponse, type NextRequest } from "next/server";
import { verifyCredentials } from "@/lib/users";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { username?: unknown }).username !== "string" ||
    typeof (body as { password?: unknown }).password !== "string"
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { username, password } = body as { username: string; password: string };

  try {
    const ok = await verifyCredentials(username, password);
    if (!ok) {
      return NextResponse.json(
        { error: "invalid_credentials" },
        { status: 401 },
      );
    }

    await createSession(username);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // 환경변수 누락/오류 등 서버 설정 문제. Vercel 로그에 남기고 메시지 반환.
    const message = e instanceof Error ? e.message : String(e);
    console.error("[login] server error:", message);
    return NextResponse.json(
      { error: "server_error", message },
      { status: 500 },
    );
  }
}
