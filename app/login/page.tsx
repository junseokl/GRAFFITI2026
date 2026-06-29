import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/app/components/LoginForm";

export default async function LoginPage() {
  if (await getSession()) {
    redirect("/");
  }
  return (
    <main className="page-shell flex min-h-[calc(100vh-73px)] max-w-6xl items-center">
      <section className="surface-panel mx-auto grid w-full max-w-4xl overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-[#151713] p-8 text-white sm:p-10">
          <p className="text-xs font-semibold uppercase text-[#b7c4b2]">
            Secure Access
          </p>
          <h1 className="mt-5 text-4xl font-semibold">
            Login
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#dfe4dc]">
            팀 계정으로 접속하면 현재 라운드, 보유 seed, 투자와 매칭권
            액션을 바로 확인할 수 있습니다.
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
