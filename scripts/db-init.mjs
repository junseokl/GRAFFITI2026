// DB 스키마 초기화 스크립트
// 사용법: npm run db:init
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

const statements = [
  `CREATE TABLE IF NOT EXISTS game_state (
     id INTEGER PRIMARY KEY DEFAULT 1,
     current_round TEXT NOT NULL DEFAULT 'seed',
     current_phase TEXT NOT NULL DEFAULT 'idle',
     CHECK (id = 1),
     CHECK (current_round IN ('seed','series-a','series-b','series-c','ended')),
     CHECK (current_phase IN ('idle','stock','matching'))
   )`,

  `INSERT INTO game_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,

  `CREATE TABLE IF NOT EXISTS companies (
     id SERIAL PRIMARY KEY,
     name TEXT UNIQUE NOT NULL,
     min_order_price INTEGER NOT NULL DEFAULT 0 CHECK (min_order_price >= 0),
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE TABLE IF NOT EXISTS teams (
     username TEXT PRIMARY KEY,
     seed INTEGER NOT NULL DEFAULT 0 CHECK (seed >= 0)
   )`,

  `CREATE TABLE IF NOT EXISTS tickets (
     team_username TEXT NOT NULL REFERENCES teams(username) ON DELETE CASCADE,
     company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
     count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
     PRIMARY KEY (team_username, company_id)
   )`,

  `CREATE TABLE IF NOT EXISTS investments (
     team_username TEXT NOT NULL REFERENCES teams(username) ON DELETE CASCADE,
     company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
     amount INTEGER NOT NULL CHECK (amount >= 0),
     PRIMARY KEY (team_username, company_id)
   )`,

  `CREATE TABLE IF NOT EXISTS bids (
     team_username TEXT NOT NULL REFERENCES teams(username) ON DELETE CASCADE,
     company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
     price INTEGER NOT NULL CHECK (price >= 0),
     count INTEGER NOT NULL CHECK (count > 0),
     PRIMARY KEY (team_username, company_id)
   )`,
];

for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, " ").slice(0, 70);
  console.log("→", preview, "...");
  await sql.query(stmt);
}

console.log("✓ DB 초기화 완료");
