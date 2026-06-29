import type { ReactNode } from "react";

const PROGRAMS = [
  {
    title: "🧊 아이스 브레이킹 (Ice Breaking)",
    body: "투자 게임에 앞서 팀 간의 진목을 도모하는 활동입니다. 미니 게임을 넘어, 행사 취지에 부합하면서도 즐겁게 첫 시간을 엽니다.",
  },
  {
    title: "📈 투자 게임 (Investment Game)",
    body: "참가자가 직접 투자자가 되어 스타트업의 가치를 평가해보는 세션입니다. 투자자의 관점을 길러보고, 이를 바탕으로 팀 프로젝트를 함께할 스타트업과 매칭됩니다!",
  },
  {
    title: "🎤 강연 (Talks)",
    body: "VC·기술창업 전문가의 강연을 통해 기술이 창업에 어떻게 쓰이는지 인사이트와 영감을 얻고, 팀 프로젝트 아이디어를 구체화합니다.",
  },
  {
    title: "🎮 써머나잇 (Summer Night)",
    body: "행사 속 또 다른 행사! 다양한 대학생들과 팀을 이뤄 미니게임과 레크리에이션을 즐기며 친목을 다지는 시간입니다. 우승 팀에게는 특별한 상품도 준비되어 있습니다.",
  },
  {
    title: "🛠 팀 프로젝트 (Team Project)",
    body: "4~6인 팀이 스타트업의 기술로 새로운 문제를 정의하고, 시장조사를 거쳐 기술 기반 서비스·제품을 구체화합니다. 발표와 피드백까지 전 과정을 직접 경험합니다.",
  },
  {
    title: "🤝 네트워킹 파티 (Networking Party)",
    body: "스타트업 대표님·연사님·전국의 대학생과 자유롭게 교류하는 시간. 케이터링(출장 뷔페)과 함께 새로운 인연과 아이디어를 만나는 네트워킹의 장이 펼쳐집니다.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#050b16] text-[#eef6ff]">
      <section className="relative isolate flex min-h-[calc(100vh-73px)] items-center overflow-hidden px-5 pb-36 pt-20 sm:px-8 sm:pb-40">
        <HeroSignalBackdrop />

        <div className="relative z-10 mx-auto max-w-6xl text-center">
          <p className="text-base font-medium text-[#a8cceb]">
            ICISTS Presents
          </p>

          <h1 className="mx-auto mt-7 max-w-5xl text-[clamp(3.8rem,9vw,8.5rem)] font-semibold leading-[0.92] text-transparent bg-clip-text bg-[linear-gradient(100deg,#ffffff_0%,#bfe8ff_32%,#77d8ff_54%,#76e6c9_78%,#f3b6df_100%)]">
            GRAFFITI 2026
          </h1>

          <p className="mx-auto mt-8 max-w-4xl text-2xl font-medium leading-snug text-[#dcecff] sm:text-4xl">
            "One Idea can Paint the Future"
          </p>

          <p className="mx-auto mt-9 max-w-3xl text-lg leading-9 text-[#c7d7e7] sm:text-xl">
            여름의 정점, 당신의 아이디어를 세상에 낙서하듯 그릴 시간!
            Tech 스타트업의 기술로 새로운 문제를 풀어내는, 색다른 창업
            해커톤에 당신을 초대합니다
          </p>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#071426] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-white sm:text-5xl">
              🎨 왜 GRAFFITI인가요?
            </h2>
            <p className="mt-6 text-lg leading-8 text-[#c7d7e7]">
              대학생이 직접 현직 스타트업의 기술을 응용해 '세상을 바꿀 색다른
              해결책'을 그려 나가자는 메시지를 담고 있습니다.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <ArticleCard title="The Problem">
              세계적으로 기술 경쟁이 심화되지만, 대학생이 최첨단 기술을 직접
              개발하거나 연구에 참여하기엔 환경적 한계가 큽니다. 기술 개발이라는
              진입 장벽 앞에서 좋은 아이디어가 멈춰 서곤 합니다.
            </ArticleCard>
            <ArticleCard title="Our Solution">
              GRAFFITI 2026은 현직 테크 스타트업의 기술을 응용하는 방식을
              택했습니다. 기술을 처음부터 만드는 대신, 기술이 주어진 상태에서
              "무엇을 바꿀 수 있을까?"를 고민하며 아이디어와 기획의 가치에
              집중합니다.
            </ArticleCard>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-semibold text-white sm:text-5xl">
            🚀 행사 개요
          </h2>

          <div className="relative mt-14">
            <div className="absolute left-4 top-0 hidden h-full w-px bg-gradient-to-b from-cyan-200/0 via-cyan-200/40 to-cyan-200/0 md:block" />
            {PROGRAMS.map((program, index) => (
              <article
                key={program.title}
                className="relative mb-5 grid gap-4 rounded-[8px] border border-white/10 bg-white/[0.04] p-6 shadow-lg shadow-black/10 md:ml-12 md:grid-cols-[110px_1fr]"
              >
                <div className="absolute -left-[39px] top-7 hidden h-3 w-3 rounded-full border border-cyan-200/70 bg-[#071426] shadow-[0_0_18px_rgba(125,211,252,0.7)] md:block" />
                <div>
                  <div className="inline-flex rounded-full border border-cyan-200/20 px-3 py-1 text-sm font-medium text-[#8fb5d8]">
                    Step {String(index + 1).padStart(2, "0")}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {program.title}
                  </h3>
                  <p className="mt-4 text-base leading-8 text-[#c7d7e7]">
                    {program.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[linear-gradient(135deg,#071426,#0b2035)] px-5 py-20 text-center sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-semibold text-white sm:text-5xl">
            당신의 아이디어로 미래를 그릴 준비가 되셨나요?
          </h2>
          <p className="mt-6 text-lg leading-8 text-[#c7d7e7]">
            망설이지 마세요. GRAFFITI 2026는 당신의 아이디어가 현실이 되는
            무대입니다.
          </p>
          <div className="mt-8 inline-flex rounded-full border border-[#67a6d8]/40 px-5 py-2 text-sm font-medium text-[#b9d7f2]">
            인스타 링크 연결
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-sm leading-7 text-[#8fb5d8] sm:px-8">
        <div>GRAFFITI 2026 by ICISTS</div>
        <div>문의: 인스타그램 DM 또는 이메일 icists@icists.org</div>
        <div>© 2026 KAIST ICISTS. All rights reserved.</div>
      </footer>
    </main>
  );
}

function HeroSignalBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#071426_0%,#050b16_58%,#06111f_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,213,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(148,213,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <svg
        viewBox="0 0 1440 820"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="heroSignal" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="38%" stopColor="#67e8f9" stopOpacity="0.52" />
            <stop offset="72%" stopColor="#a7f3d0" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#f0abfc" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="heroHorizon" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0" />
            <stop offset="56%" stopColor="#7dd3fc" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M0 612 C210 560 338 684 534 626 C722 570 818 476 1012 534 C1194 589 1280 674 1440 628 L1440 820 L0 820 Z"
          fill="url(#heroHorizon)"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#050b16] to-transparent" />
    </div>
  );
}

function ArticleCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-[8px] border border-white/10 bg-white/[0.045] p-7 shadow-lg shadow-black/10">
      <h3 className="text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-4 text-base leading-8 text-[#c7d7e7]">{children}</p>
    </article>
  );
}
