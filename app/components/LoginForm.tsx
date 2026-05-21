"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });

    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else if (res.status === 401) {
      setError("ID 또는 비밀번호가 틀렸습니다");
      setSubmitting(false);
    } else {
      const data = (await res.json().catch(() => null)) as
        | { message?: string }
        | null;
      setError(
        `서버 오류 (${res.status}): ${data?.message ?? "환경변수 설정을 확인하세요"}`,
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 font-semibold">
        ID
        <input
          name="username"
          type="text"
          autoComplete="username"
          required
          className="p-2 border border-gray-300 rounded font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        비밀번호
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="p-2 border border-gray-300 rounded font-normal"
        />
      </label>
      <p className="text-red-600 min-h-[1.25rem] m-0">{error}</p>
      <button
        type="submit"
        disabled={submitting}
        className="p-2 bg-gray-800 text-white rounded disabled:opacity-50"
      >
        {submitting ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
