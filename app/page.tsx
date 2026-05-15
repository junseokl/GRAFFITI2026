export default function HomePage() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-bold mb-4">Home</h1>
      <p className="mb-3">이곳에 사이트에 대한 기본적인 설명이 들어갑니다.</p>
      <p className="mb-3">
        위쪽 메뉴에서 <strong>Notion</strong> 또는{" "}
        <strong>Investment Game</strong> 으로 이동할 수 있습니다.
      </p>
      <ul className="list-disc pl-5">
        <li>
          <strong>Notion</strong> — 추후에 추가될 노션 페이지로 연결됩니다.
        </li>
        <li>
          <strong>Investment Game</strong> — 게임 설명 / 플레이 페이지로
          연결됩니다.
        </li>
      </ul>
    </main>
  );
}
