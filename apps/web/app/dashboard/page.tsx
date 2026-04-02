import Link from "next/link";

export default function DashboardHomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">DevAtlas Dashboard</p>
        <h1 className="mt-4 text-4xl font-black sm:text-6xl">Support center</h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-300">
          Aici vezi toate requesturile, statusul lor și poți răspunde direct către user.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Link
            href="/dashboard/support"
            className="rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/10"
          >
            <div className="text-sm uppercase tracking-[0.24em] text-gray-400">Tickets</div>
            <div className="mt-3 text-3xl font-bold">Vezi toate tichetele</div>
            <div className="mt-2 text-gray-300">Filtre, status, prioritate și reply.</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
