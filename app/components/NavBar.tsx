import Link from "next/link";
import { getSession } from "@/lib/auth";

export async function NavBar() {
  const session = await getSession();
  const notionUrl = process.env.NEXT_PUBLIC_NOTION_URL;

  return (
    <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#03111f]/95 px-4 py-3 text-white backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center gap-2">
        <Link
          href="/"
          className="mr-3 rounded-md px-2 py-1 text-lg font-semibold text-white"
        >
          GRAFFITI2026
        </Link>

        <Link
          href="/"
          className="rounded-md px-3 py-2 text-sm font-semibold text-[#cbd5e1] hover:bg-white/10 hover:text-white"
        >
          Home
        </Link>

        {notionUrl ? (
          <a
            href={notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-3 py-2 text-sm font-semibold text-[#cbd5e1] hover:bg-white/10 hover:text-white"
          >
            Notion
          </a>
        ) : (
          <span
            className="rounded-md px-3 py-2 text-sm font-semibold text-[#64748b]"
            title="Notion 링크가 아직 등록되지 않았습니다"
          >
            Notion
          </span>
        )}

        <div className="group relative">
          <span className="inline-block rounded-md px-3 py-2 text-sm font-semibold text-[#cbd5e1] group-hover:bg-white/10 group-hover:text-white">
            Investment Game
          </span>
          <div className="absolute left-0 top-full hidden min-w-40 overflow-hidden rounded-lg border border-white/10 bg-[#061a2e] shadow-2xl group-hover:block">
            <Link
              href="/game/info"
              className="block px-4 py-2 text-sm font-semibold text-[#cbd5e1] hover:bg-white/10 hover:text-white"
            >
              게임 설명
            </Link>
            <Link
              href="/game/play"
              className="block px-4 py-2 text-sm font-semibold text-[#cbd5e1] hover:bg-white/10 hover:text-white"
            >
              플레이
            </Link>
          </div>
        </div>

        <div className="ml-auto">
          {session ? (
            <div className="group relative">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm font-semibold text-white group-hover:bg-white/10">
                {session.username}
              </span>
              <form
                action="/api/logout"
                method="POST"
                className="absolute right-0 top-full hidden pt-2 group-hover:block"
              >
                <button
                  type="submit"
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#03111f] shadow-lg hover:bg-[#e0f2fe]"
                >
                  로그아웃
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-md border border-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
