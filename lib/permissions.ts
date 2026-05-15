import { getSession } from "@/lib/auth";

export function getAdminUsernames(): string[] {
  return (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdminUsername(username: string): boolean {
  return getAdminUsernames().includes(username);
}

export async function requireAdmin(): Promise<{ username: string }> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  if (!isAdminUsername(session.username)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
