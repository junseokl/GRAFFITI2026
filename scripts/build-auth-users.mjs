// AUTH_USERS_B64 값을 생성하는 유틸리티
// 사용법: npm run build-auth-users -- admin:1234 test:test
import bcrypt from "bcryptjs";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("사용법: npm run build-auth-users -- <username>:<password> [...]");
  process.exit(1);
}

const users = [];
for (const arg of args) {
  const idx = arg.indexOf(":");
  if (idx === -1) {
    console.error(`잘못된 인자: "${arg}" (형식: username:password)`);
    process.exit(1);
  }
  const username = arg.slice(0, idx);
  const password = arg.slice(idx + 1);
  const passwordHash = await bcrypt.hash(password, 10);
  users.push({ username, passwordHash });
}

const base64 = Buffer.from(JSON.stringify(users)).toString("base64");
console.log(base64);
