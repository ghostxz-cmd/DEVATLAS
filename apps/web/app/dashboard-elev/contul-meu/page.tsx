export default function StudentDashboardAccountPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-[#070b14]/95 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Contul meu</div>
        <h2 className="mt-2 text-2xl font-bold text-white">Setări avansate profil & securitate</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Ecran pregătit pentru opțiuni avansate: autentificare, securitate sesiune, preferințe de cont și notificări.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-[#070b14]/95 p-5">
          <div className="text-sm font-semibold text-white">Profil</div>
          <div className="mt-2 text-sm text-slate-400">Nume, avatar, timezone, date personale.</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#070b14]/95 p-5">
          <div className="text-sm font-semibold text-white">Securitate</div>
          <div className="mt-2 text-sm text-slate-400">Parolă, device-uri active, verificări suplimentare.</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#070b14]/95 p-5">
          <div className="text-sm font-semibold text-white">Preferințe</div>
          <div className="mt-2 text-sm text-slate-400">Tema, notificări, comportament dashboard.</div>
        </div>
      </div>
    </section>
  );
}
