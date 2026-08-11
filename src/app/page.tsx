import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Mark } from "@/components/Mark";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/app");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <Mark className="h-14 w-14 text-brand" />

      <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl">
        O sistema operacional da sua empresa
      </h1>
      <p className="max-w-xl text-balance text-lg text-text-dim">
        Capture reuniões e atendimentos, deixe a <strong className="text-text">Karmen AI</strong>{" "}
        resumir e transformar em tarefas — e pergunte qualquer coisa sobre a sua operação em
        linguagem natural.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-accent px-5 py-2.5 font-medium text-accent-fg transition hover:opacity-90"
        >
          Começar agora
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-border px-5 py-2.5 font-medium text-text transition hover:bg-surface"
        >
          Entrar
        </Link>
      </div>

      <p className="text-sm text-text-dim">
        A plataforma se adapta à sua empresa: pequena, média ou grande.
      </p>
    </main>
  );
}
