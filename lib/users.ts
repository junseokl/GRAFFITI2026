import bcrypt from "bcryptjs";

type User = { username: string; passwordHash: string };

// AUTH_USERS_B64 형식:
//   Base64( JSON.stringify([ { username, passwordHash }, ... ]) )
// Base64 로 감싸는 이유: bcrypt 해시에 들어가는 '$' 문자가
//   dotenv-expand 에서 변수 확장으로 처리되어 망가지는 것을 막기 위함.
function loadUsers(): User[] {
  const raw = process.env.AUTH_USERS_B64;
  if (!raw) return [];

  let decoded: string;
  try {
    decoded = Buffer.from(raw, "base64").toString("utf8");
  } catch {
    throw new Error("AUTH_USERS_B64 이 올바른 base64 가 아닙니다.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error("AUTH_USERS_B64 이 올바른 JSON 이 아닙니다.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("AUTH_USERS_B64 의 JSON 은 배열이어야 합니다.");
  }

  return parsed.map((u, i) => {
    if (
      !u ||
      typeof u !== "object" ||
      typeof (u as { username?: unknown }).username !== "string" ||
      typeof (u as { passwordHash?: unknown }).passwordHash !== "string"
    ) {
      throw new Error(`AUTH_USERS_B64 [${i}] 형식이 잘못되었습니다.`);
    }
    return {
      username: (u as User).username,
      passwordHash: (u as User).passwordHash,
    };
  });
}

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const user = loadUsers().find((u) => u.username === username);
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export function getAllUsernames(): string[] {
  return loadUsers().map((u) => u.username);
}
