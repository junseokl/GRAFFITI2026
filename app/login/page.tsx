import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/app/components/LoginForm";

export default async function LoginPage() {
  if (await getSession()) {
    redirect("/");
  }
  return (
    <main className="max-w-md mx-auto px-5 py-10">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <LoginForm />
    </main>
  );
}
