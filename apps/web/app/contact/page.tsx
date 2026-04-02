"use client";

import { FormEvent, useState } from "react";
import Navbar from "../Navbar";
import Footer from "../Footer";

type ContactState = {
  fullName: string;
  email: string;
  category: string;
  priority: string;
  subject: string;
  details: string;
};

const initialState: ContactState = {
  fullName: "",
  email: "",
  category: "technical",
  priority: "normal",
  subject: "",
  details: "",
};

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessTicketId(null);

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          category: formData.category,
          priority: formData.priority,
          subject: formData.subject,
          details: formData.details,
          source: "contact_page",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Nu am putut trimite ticketul.");
      }

      const data = (await response.json()) as { ticketPublicId?: string };
      if (!data.ticketPublicId) {
        throw new Error("Raspuns invalid de la server.");
      }

      setSuccessTicketId(data.ticketPublicId);
      setFormData(initialState);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "A aparut o eroare la trimitere. Incearca din nou.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="relative overflow-hidden pt-36 pb-20 sm:pt-44 sm:pb-24 border-b border-white/10 bg-gradient-to-b from-black via-gray-950 to-black">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-blue-500/10 blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <p className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs tracking-[0.2em] uppercase text-cyan-300">
            Contact & Support
          </p>
          <h1 className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
            Hai sa rezolvam
            <span className="block text-cyan-400">problema ta rapid</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg sm:text-xl text-gray-300 leading-relaxed">
            Trimite-ne un ticket cu toate detaliile, iar echipa DevAtlas revine
            cu un raspuns clar direct in dashboard si pe email.
          </p>

        </div>
      </section>

      <section className="relative py-16 sm:py-20 bg-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <div className="lg:col-span-7 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/0 p-6 sm:p-8 lg:p-10">
            <div className="mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold">Deschide un ticket nou</h2>
              <p className="mt-3 text-gray-300 leading-relaxed">
                Completeaza formularul cu email valid, categorie si o descriere
                clara. Dupa trimitere primesti confirmare automata cu ID-ul
                ticketului.
              </p>
            </div>

            {successTicketId && (
              <div className="mb-8 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4">
                <p className="text-sm text-emerald-200">
                  Ticket creat cu succes.
                </p>
                <p className="text-lg font-bold text-emerald-100 mt-1">
                  ID: {successTicketId}
                </p>
                <p className="text-sm text-emerald-200/90 mt-1">
                  Vei primi confirmare automata pe email pentru acest ticket.
                </p>
              </div>
            )}

            {submitError && (
              <div className="mb-8 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4">
                <p className="text-sm text-red-200">Trimiterea a esuat.</p>
                <p className="text-sm text-red-100 mt-1 break-words">{submitError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-200">Nume complet</span>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                    placeholder="Ex: Antoci Rares"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-200">Email</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                    placeholder="exemplu@email.com"
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-200">Categorie problema</span>
                  <select
                    value={formData.category}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, category: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                    required
                  >
                    <option value="technical">Problema tehnica</option>
                    <option value="account">Cont si autentificare</option>
                    <option value="course">Cursuri si progres</option>
                    <option value="other">Altele</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-200">Prioritate</span>
                  <select
                    value={formData.priority}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, priority: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                    required
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
              </div>

              <label className="space-y-2 block">
                <span className="text-sm font-medium text-gray-200">Subiect</span>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, subject: event.target.value }))
                  }
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                  placeholder="Ex: Doresc sa raportez o eroare"
                  required
                />
              </label>

              <label className="space-y-2 block">
                <span className="text-sm font-medium text-gray-200">Descriere problema</span>
                <textarea
                  value={formData.details}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, details: event.target.value }))
                  }
                  className="min-h-36 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                  placeholder="Descrie pasii, ce ai incercat si ce eroare primesti."
                  required
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-cyan-400 px-8 py-3 text-black font-bold transition-all hover:bg-cyan-300 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Se trimite..." : "Trimite ticket"}
              </button>
            </form>
          </div>

          <aside className="lg:col-span-5 space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
              <h3 className="text-2xl font-bold">Ce se intampla dupa trimitere</h3>
              <ol className="mt-5 space-y-4 text-gray-300">
                <li className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 text-xs font-bold">1</span>
                  <span>Se creeaza ticketul si primesti un ID unic.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 text-xs font-bold">2</span>
                  <span>Primesti email automat de confirmare.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 text-xs font-bold">3</span>
                  <span>Adminul raspunde din dashboard, iar tu primesti email cu raspunsul.</span>
                </li>
              </ol>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-6 sm:p-8">
              <h3 className="text-2xl font-bold">Securitate support</h3>
              <ul className="mt-5 space-y-3 text-gray-200">
                <li>Validare stricta pe backend</li>
                <li>Rate limit anti-spam pe submit</li>
                <li>Audit trail pentru fiecare actiune</li>
                <li>RLS activ in baza de date</li>
                <li>Service key folosita doar in API</li>
              </ul>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
              <h3 className="text-2xl font-bold">FAQ rapid</h3>
              <div className="mt-5 space-y-4 text-gray-300">
                <div>
                  <p className="font-semibold text-white">Pot vedea istoricul ticketelor?</p>
                  <p className="mt-1">Da, in dashboard-ul tau de utilizator.</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Pot atasa fisiere?</p>
                  <p className="mt-1">Da, in faza urmatoare activam upload securizat in bucket dedicat.</p>
                </div>
                <div>
                  <p className="font-semibold text-white">Cum urgenta se trateaza ticketul critic?</p>
                  <p className="mt-1">Ticketele critical/high intra prioritar in coada de procesare.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}
