import Link from "next/link";
import { getSession } from "@/lib/auth";

export async function NavBar() {
  const session = await getSession();
  const notionUrl = process.env.NEXT_PUBLIC_NOTION_URL;

  return (
    <nav className="flex items-center gap-2 px-5 py-3 bg-gray-100 border-b border-gray-300">
      <span className="font-bold text-lg mr-4">GRAFFITI2026</span>

      <Link
        href="/"
        className="px-4 py-2 rounded text-gray-800 hover:bg-gray-200"
      >
        Home
      </Link>

      {notionUrl ? (
        <a
          href={notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded text-gray-800 hover:bg-gray-200"
        >
          Notion
        </a>
      ) : (
        <span
          className="px-4 py-2 rounded text-gray-400 cursor-not-allowed"
          title="Notion 링크가 아직 등록되지 않았습니다"
        >
          Notion
        </span>
      )}

      <div className="relative group">
        <span className="inline-block px-4 py-2 rounded text-gray-800 cursor-default group-hover:bg-gray-200">
          Investment Game
        </span>
        <div className="absolute top-full left-0 hidden group-hover:block bg-gray-800 rounded min-w-full whitespace-nowrap">
          <Link
            href="/game/info"
            className="block px-4 py-2 text-white hover:bg-gray-700"
          >
            게임 설명
          </Link>
          <Link
            href="/game/play"
            className="block px-4 py-2 text-white hover:bg-gray-700"
          >
            플레이
          </Link>
        </div>
      </div>

      <div className="ml-auto">
        {session ? (
          <div className="relative group">
            <span className="inline-block px-4 py-2 rounded font-semibold text-gray-800 cursor-default group-hover:bg-gray-200">
              {session.username}
            </span>
            <form
              action="/api/logout"
              method="POST"
              className="absolute top-full right-0 hidden group-hover:block"
            >
              <button
                type="submit"
                className="px-4 py-2 bg-gray-800 text-white rounded whitespace-nowrap hover:bg-gray-700"
              >
                로그아웃
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 rounded text-gray-800 hover:bg-gray-200"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
