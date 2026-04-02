"use client";

import { useState } from "react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("Te-ai înscris cu succes! 🎉");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Ceva n-a mers. Încearcă din nou.");
      }
    } catch {
      setStatus("error");
      setMessage("Eroare la conexiune. Încearcă din nou.");
    }
  };

  return (
    <section className="relative py-24 bg-gradient-to-br from-gray-900 to-black">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-3xl p-12 border border-cyan-500/20 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Rămâi la curent cu noutățile
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Cursuri noi, tips & tricks, și conținut exclusiv. Direct în inbox.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="adresa.ta@email.com"
                  required
                  disabled={status === "loading"}
                  className="flex-1 px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:bg-white/15 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {status === "loading" ? "Se trimite..." : "Abonează-te"}
                </button>
              </form>

              {message && (
                <div className={`mt-4 p-4 rounded-xl ${
                  status === "success" 
                    ? "bg-green-500/10 border border-green-500/20 text-green-400" 
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}>
                  {message}
                </div>
              )}

              <p className="text-sm text-gray-500 mt-4">
                Fără spam. Te poți dezabona oricând.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
