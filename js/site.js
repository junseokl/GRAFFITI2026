// ===== 사이트 공통 설정 =====
// 나중에 Notion 링크가 정해지면 아래 NOTION_URL 값만 바꾸면 됩니다.
const SITE_CONFIG = {
  NOTION_URL: "", // 예: "https://www.notion.so/..." (아직 비어 있음)
};

// ===== 로그인 상태 관리 =====
// 로그인한 아이디는 localStorage 에 저장되어 페이지를 이동/새로고침해도 유지됩니다.
const AUTH_KEY = "loggedInUser";

function getCurrentUser() {
  return localStorage.getItem(AUTH_KEY);
}

function setCurrentUser(username) {
  localStorage.setItem(AUTH_KEY, username);
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  location.href = "index.html";
}

// config.js 의 ACCOUNTS 목록과 비교해서 로그인 성공 여부를 반환합니다.
function attemptLogin(username, password) {
  if (typeof ACCOUNTS === "undefined") return false;
  return ACCOUNTS.some(
    (a) => a.username === username && a.password === password
  );
}

// ===== 상단 네비게이션 바 =====
// 각 페이지의 <body> 안에 <div id="nav"></div> 만 넣어두면 자동으로 채워집니다.
function renderNav() {
  const mount = document.getElementById("nav");
  if (!mount) return;

  // 현재 페이지 파일 이름 (예: "index.html")
  const current = location.pathname.split("/").pop() || "index.html";

  // Notion 링크: 아직 값이 없으면 비활성화 상태로 표시
  const notionLink = SITE_CONFIG.NOTION_URL
    ? `<a href="${SITE_CONFIG.NOTION_URL}" target="_blank" rel="noopener">Notion</a>`
    : `<a href="#" class="disabled" title="Notion 링크가 아직 등록되지 않았습니다"
         onclick="alert('Notion 링크는 추후에 추가될 예정입니다.'); return false;">Notion</a>`;

  // 로그인 영역: 로그인 상태면 아이디 + (호버 시) 로그아웃 버튼, 아니면 Login 링크
  const user = getCurrentUser();
  const authArea = user
    ? `<div class="auth-user">
         <span class="auth-username">${user}</span>
         <button class="auth-logout" onclick="logout()">로그아웃</button>
       </div>`
    : `<a href="login.html" class="${current === "login.html" ? "active" : ""}">Login</a>`;

  // Investment Game: 호버하면 "게임 설명 / 플레이" 두 메뉴가 펼쳐짐
  const isGamePage =
    current === "game-info.html" || current === "game-play.html";

  mount.innerHTML = `
    <nav class="site-nav">
      <span class="site-brand">GRAFFITI2026</span>
      <a href="index.html" class="${current === "index.html" || current === "" ? "active" : ""}">Home</a>
      ${notionLink}
      <div class="nav-dropdown">
        <span class="nav-dropdown-label ${isGamePage ? "active" : ""}">Investment Game</span>
        <div class="nav-dropdown-menu">
          <a href="game-info.html" class="${current === "game-info.html" ? "active" : ""}">게임 설명</a>
          <a href="game-play.html" class="${current === "game-play.html" ? "active" : ""}">플레이</a>
        </div>
      </div>
      <div class="nav-auth">${authArea}</div>
    </nav>
  `;
}

// ===== 로그인 페이지 폼 처리 =====
// login.html 에 있는 폼이 제출되면 동작합니다.
function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const errorBox = document.getElementById("login-error");

    if (attemptLogin(username, password)) {
      setCurrentUser(username);
      location.href = "index.html"; // 성공 시 Home 으로 이동
    } else {
      errorBox.textContent = "ID 또는 비밀번호가 틀렸습니다";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  initLoginForm();
});
