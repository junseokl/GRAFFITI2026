import { GameInfoTabs } from "@/app/components/GameInfoTabs";

export default function GameInfoPage() {
  return (
    <main className="page-shell max-w-6xl">
      <header className="mb-6">
        <h1 className="text-4xl font-semibold">
          투자 게임 설명
        </h1>
      </header>
      <GameInfoTabs />
    </main>
  );
}
