// DB 전체 초기화 (모든 테이블 DROP 후 재생성)
// 사용법: npm run db:reset
// 주의: 모든 게임 데이터가 사라집니다.
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL 환경 변수가 설정되어 있지 않습니다.");
  process.exit(1);
}

const sql = neon(url);

const drops = [
  `DROP TABLE IF EXISTS bids CASCADE`,
  `DROP TABLE IF EXISTS round_results CASCADE`,
  `DROP TABLE IF EXISTS investments CASCADE`,
  `DROP TABLE IF EXISTS tickets CASCADE`,
  `DROP TABLE IF EXISTS teams CASCADE`,
  `DROP TABLE IF EXISTS companies CASCADE`,
  `DROP TABLE IF EXISTS game_state CASCADE`,
];

for (const stmt of drops) {
  console.log("→", stmt);
  await sql.query(stmt);
}

console.log("✓ 모든 테이블 DROP 완료. 'npm run db:init' 으로 다시 만드세요.");
