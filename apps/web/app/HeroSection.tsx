"use client";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black pt-16 sm:pt-20 md:pt-24">
      {/* Geometric Shapes - Bold & Graphic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Massive White Parallelogram Stack - Responsive Scaling */}
        <div className="absolute -top-20 -right-32 w-[300px] h-[200px] sm:w-[400px] sm:h-[280px] md:w-[500px] md:h-[350px] lg:w-[650px] lg:h-[450px] bg-white transform skew-y-[-12deg] opacity-100" />
        <div className="absolute top-20 sm:top-32 md:top-40 right-0 w-[280px] h-[180px] sm:w-[380px] sm:h-[280px] md:w-[480px] md:h-[340px] lg:w-[620px] lg:h-[420px] bg-white transform skew-y-[-12deg] opacity-95" />
        <div className="absolute top-40 sm:top-56 md:top-96 right-16 sm:right-20 md:right-32 w-[260px] h-[160px] sm:w-[360px] sm:h-[260px] md:w-[460px] md:h-[340px] lg:w-[580px] lg:h-[380px] bg-white transform skew-y-[-12deg] opacity-90" />
        
        {/* Cyan Accent - Bottom Right */}
        <div className="absolute bottom-0 right-0 w-[400px] h-[150px] sm:w-[500px] sm:h-[200px] md:w-[600px] md:h-[250px] lg:w-[700px] lg:h-[250px] bg-gradient-to-r from-cyan-400 to-cyan-500 transform skew-y-[-12deg]" />
        
        {/* Left Side Graphic Elements */}
        <div className="absolute top-20 sm:top-32 md:top-40 -left-12 sm:-left-16 md:-left-20 w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] md:w-[300px] md:h-[300px] bg-cyan-500/20 rounded-full blur-[80px] sm:blur-[100px]" />
        <div className="absolute bottom-10 sm:bottom-16 md:bottom-20 left-2 sm:left-6 lg:left-10 w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] md:w-[200px] md:h-[200px] lg:w-64 lg:h-64 border-4 border-white/10 transform rotate-12" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-8 py-20 sm:py-24 md:py-32">
        <div className="max-w-4xl ml-0">

          {/* Massive Heading - Responsive Typography - Left Aligned */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl 2xl:text-[9rem] font-black text-white leading-[0.9] mb-6 sm:mb-8 tracking-tight text-left">
            Code.<br />
            Build.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500">
              Repeat.
            </span>
          </h1>

          {/* Subheading - Responsive Typography - Left Aligned */}
          <p className="text-base sm:text-lg md:text-2xl lg:text-3xl text-gray-300 mb-8 sm:mb-12 leading-relaxed font-light max-w-2xl text-left">
            Platformă românească de învățare programare. 
            <span className="text-white font-medium"> Cursuri video, exerciții practice și proiecte reale.</span>
          </p>

          {/* CTA - Touch-friendly buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-5">
            <a
              href="/cursuri"
              className="group px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 bg-white text-black font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl transition-all hover:bg-cyan-400 hover:text-black inline-flex items-center justify-center sm:justify-start gap-3 shadow-2xl hover:shadow-cyan-400/50 min-h-[44px]"
            >
              Începe să înveți
              <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <a
              href="/despre/povestea-noastra"
              className="px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 bg-transparent text-white font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl border-2 border-white/20 hover:border-white/40 transition-all backdrop-blur-sm inline-flex items-center justify-center min-h-[44px]"
            >
              Povestea noastră
            </a>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-20">
        <div className="flex flex-col items-center gap-2 text-white/40 animate-bounce">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
}
