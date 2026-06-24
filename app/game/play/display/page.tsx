import Link from "next/link";
import { getSession } from "@/lib/auth";
import { isAdminUsername } from "@/lib/permissions";
import { fetchGameData } from "../data";
import { DisplayView } from "./DisplayView";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="max-w-md mx-auto px-5 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">로그인 하시오!</h1>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-gray-800 text-white rounded"
        >
          로그인
        </Link>
      </main>
    );
  }

  if (!isAdminUsername(session.username)) {
    return (
      <main className="max-w-md mx-auto px-5 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">접근 권한 없음</h1>
        <p className="text-sm text-gray-600 mb-6">
          이 페이지는 admin 전용 큰화면 디스플레이입니다.
        </p>
        <Link href="/game/play" className="text-blue-600 underline">
          내 팀 화면으로
        </Link>
      </main>
    );
  }

  try {
    const data = await fetchGameData(true, session.username);
    return <DisplayView data={data} />;
  } catch (e) {
    return (
      <main className="max-w-2xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold mb-4">DB 초기화 필요</h1>
        <p className="text-xs text-gray-600">에러: {(e as Error).message}</p>
      </main>
    );
  }
}
