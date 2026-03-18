"use client";

import Link from "next/link";
import Navbar from "../../Navbar";

export default function PovesteaNoastra() {
  return (
    <>
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-gray-900 via-black to-black overflow-hidden pt-24">
        {/* Geometric Background */}
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-cyan-500/10 transform skew-y-[-12deg]" />
        <div className="absolute bottom-20 left-0 w-[300px] h-[300px] bg-white/5 transform skew-y-[12deg]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
              <span className="text-cyan-400 text-sm font-medium">Despre noi</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-8 leading-tight">
              DevAtlas a început <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                dintr-o frustrare
              </span>
            </h1>
            
            <p className="text-2xl text-gray-400 leading-relaxed">
              Învățam programare din tutoriale slabe, cursuri în engleză pe care le înțelegeam pe jumătate, 
              și exerciții care nu-mi arătau nimic relevant.
            </p>
          </div>
        </div>
      </section>

      {/* Story Content */}
      <section className="bg-black py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          
          {/* Section 1 - Asymmetric */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start mb-32">
            <div className="lg:col-span-7">
              <h2 className="text-4xl font-bold text-white mb-6">
                Problema era evidentă
              </h2>
              <div className="space-y-6 text-xl text-gray-400 leading-relaxed">
                <p>
                  Resursele de învățare pentru programare în română erau fie prea vechi, 
                  fie prea teoretice. Cursurile bune erau în engleză, dar te blocai la termeni 
                  pe care nu-i înțelegeai.
                </p>
                <p>
                  Pe platformele existente, scriai cod într-un editor local, apoi încercai 
                  să-l testezi singur. Fără feedback, fără să știi dacă e corect sau nu.
                </p>
                <p>
                  Am zis: "Fuck it, fac eu una."
                </p>
              </div>
            </div>
            
            <div className="lg:col-span-5">
              <div className="bg-gray-900/50 border border-white/10 rounded-3xl p-8">
                <div className="text-5xl font-bold text-cyan-400 mb-4">2026</div>
                <p className="text-gray-300 text-lg">
                  Anul în care am început să construim DevAtlas. 
                  Zero investitori, zero bullshit corporate.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2 - Full Width */}
          <div className="mb-32">
            <div className="border-l-4 border-cyan-500 pl-8 mb-12">
              <h2 className="text-4xl font-bold text-white mb-6">
                Ce face DevAtlas diferit?
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">Totul în română</h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Lecții, exerciții, feedback - tot. Fără să traduci în cap termenii tehnici 
                  sau să te pierzi prin documentații în engleză.
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">Editor integrat</h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Scrii cod direct în browser. Fără să instalezi Node, Python, VS Code - nimic. 
                  Click pe "Run" și vezi rezultatul instant.
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">Feedback instant</h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Rezolvi un exercițiu, primești feedback imediat. Ai greșit? Ți se arată exact unde 
                  și de ce. Fără să aștepți un mentor.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">Proiecte reale</h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Nu exerciții abstracte de tipul "calculează factorial". Construiești chestii 
                  pe care le poți pune în portofoliu.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 - Quote Style */}
          <div className="max-w-4xl mx-auto mb-32">
            <div className="bg-gray-900/50 border-l-4 border-cyan-500 rounded-r-3xl p-12">
              <blockquote className="text-3xl font-bold text-white leading-relaxed mb-6">
                "Nu vreau să fac cea mai mare platformă de e-learning. 
                Vreau să fac una pe care mi-aș fi dorit-o când am început eu."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-xl">D</span>
                </div>
                <div>
                  <div className="text-white font-semibold">Rares - Fondator DevAtlas</div>
                  <div className="text-gray-500 text-sm">2026</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 - Vision */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-5xl font-bold text-white mb-8 leading-tight">
                Unde mergem <br />
                <span className="text-cyan-400">de aici?</span>
              </h2>
              <div className="space-y-6 text-xl text-gray-400 leading-relaxed">
                <p>
                  Acum avem câteva cursuri live, un editor funcțional și câteva sute de exerciții. 
                  Dar asta e doar începutul.
                </p>
                <p>
                  Planul e să adăugăm mai multe limbaje, proiecte mai complexe, 
                  și un sistem de mentoring unde devii mai experimentat ajuți pe ăia care încep.
                </p>
                <p>
                  Totul open, totul transparent. Fără paywall-uri de rahat pe conținut esențial.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Mai multe cursuri</h3>
                  <p className="text-gray-400">Python, React, Node.js, databases - tot ce ai nevoie pentru full-stack.</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Comunitate activă</h3>
                  <p className="text-gray-400">Forum, Discord, mentoring - un loc unde poți întreba orice fără să fii judecat.</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Conținut gratuit</h3>
                  <p className="text-gray-400">Cursurile de bază vor fi mereu gratis. Nimeni nu ar trebui să plătească ca să învețe fundamentele.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 py-24 border-y border-cyan-500/20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Vrei să faci parte din poveste?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Începe primul curs gratuit și vezi dacă DevAtlas e pentru tine.
          </p>
          <Link
            href="/cursuri"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black font-bold text-lg rounded-xl transition-all hover:bg-gray-100"
          >
            Explorează cursurile
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>
    </>
  );
}
