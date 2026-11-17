import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f6f4] px-6 py-20 text-[#111111]">
      <div className="w-full max-w-[580px] rounded-2xl border border-black/[0.09] bg-[#efeeec] p-8 sm:p-10">
        <p className="label-mono text-[#fe3619]">404 · Page Not Found</p>

        <h1 className="mt-3 text-[clamp(1.75rem,3.4vw,2.4rem)] font-medium leading-[1.12] tracking-[-0.03em]">
          This page doesn&apos;t exist.
        </h1>

        <p className="mt-3 text-[15px] leading-[1.6] text-[#111111]/75">
          The link you followed may be outdated, or the page has moved. Head back to explore Think
          Sessions and Media.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="label-mono inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>

          <Link
            href="/sessions"
            className="label-mono inline-flex min-h-[46px] items-center rounded-xl border border-black/10 bg-[#f7f6f4] px-5 py-3 text-[#111111] transition-colors hover:bg-[#e5e3e0]"
          >
            <span>See Think Sessions</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
