import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-bg-subtle px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Image src="/assets/logos/polla-mark.svg" alt="" width={32} height={32} className="rounded-lg" priority />
          <span className="font-heading text-lg font-bold text-text">
            Polla <span className="text-accent">BetPlay</span>
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
