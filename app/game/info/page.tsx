import { GameInfoTabs } from "@/app/components/GameInfoTabs";

export default function GameInfoPage() {
  return (
    <main className="max-w-5xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-bold mb-6">투자 게임 규칙 설명</h1>
      <GameInfoTabs />
    </main>
  );
}
