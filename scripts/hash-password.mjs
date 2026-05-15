// 비밀번호 해시를 생성하는 유틸리티
// 사용법: npm run hash-password -- <비밀번호>
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("사용법: npm run hash-password -- <비밀번호>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log(hash);
