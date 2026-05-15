import { neon } from "@neondatabase/serverless";

const url =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";

// 빈 값일 때 모듈 로드 자체는 통과시키고 (build 시 환경변수가 없을 수 있음)
// 실제 쿼리 시점에 의미 있는 에러가 나도록 함.
export const sql = neon(url || "postgresql://placeholder:placeholder@invalid/db");

export function assertDbConfigured(): void {
  if (!url) {
    throw new Error(
      "DATABASE_URL 환경 변수가 설정되어 있지 않습니다. .env.local 또는 Vercel 환경변수에 Neon 연결 문자열을 추가하세요.",
    );
  }
}
