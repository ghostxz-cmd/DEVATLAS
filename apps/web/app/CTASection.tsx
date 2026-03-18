"use client";

import Link from "next/link";

export default function CTASection() {
  return (
    <section className="relative py-48 bg-gradient-to-br from-black via-gray-950 to-black overflow-hidden">
      {/* Massive Graphic Elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-[200px]" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 transform -translate-x-1/2 translate-y-1/2 blur-[150px]" />
      
      {/* Diagonal Lines */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-white to-transparent transform -skew-x-12" />
        <div className="absolute top-0 left-2/4 w-1 h-full bg-gradient-to-b from-transparent via-white to-transparent transform -skew-x-12" />
        <div className="absolute top-0 left-3/4 w-1 h-full bg-gradient-to-b from-transparent via-white to-transparent transform -skew-x-12" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-4xl">
          {/* Super Large Heading */}
          <h2 className="text-[6rem] md:text-[8rem] lg:text-[11rem] font-black text-white leading-[0.85] mb-12 tracking-tighter">
            Ready<br />
            to start?
          </h2>
          
          <p className="text-3xl md:text-4xl text-gray-300 mb-16 leading-relaxed max-w-3xl font-light">
            Primul curs e <span className="text-white font-bold">gratuit</span>. 
            Fără card, fără bullshit. Doar intri și începi.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-6">
            <Link
              href="/cursuri"
              className="group px-12 py-6 bg-cyan-400 hover:bg-cyan-500 text-black font-black text-xl rounded-2xl transition-all hover:scale-105 inline-flex items-center gap-4 shadow-2xl shadow-cyan-400/30"
            >
              Începe acum
              <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            
            <Link
              href="/despre/povestea-noastra"
              className="px-12 py-6 bg-transparent text-white font-bold text-xl rounded-2xl border-2 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all"
            >
              Povestea noastră
            </Link>
          </div>

          {/* Social Proof */}
          <div className="mt-20 flex items-center gap-8 text-gray-400">
            <div className="flex -space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border-2 border-black" />
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-black" />
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-black" />
            </div>
            <p className="text-lg">
              <span className="text-white font-bold">100+</span> developeri învață pe DevAtlas
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
