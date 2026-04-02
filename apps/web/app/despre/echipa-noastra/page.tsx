"use client";

import Navbar from "../../Navbar";

export default function EchipaNoastra() {
  return (
    <>
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-gray-900 via-black to-black overflow-hidden pt-24">
        {/* Geometric Background */}
        <div className="absolute top-20 left-0 w-[500px] h-[400px] bg-white/5 transform skew-y-[12deg]" />
        <div className="absolute bottom-40 right-0 w-[400px] h-[400px] bg-cyan-500/10 transform skew-y-[-12deg]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
              <span className="text-cyan-400 text-sm font-medium">Echipa</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-8 leading-tight">
              Un om. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                O viziune.
              </span>
            </h1>
            
            <p className="text-2xl text-gray-400 leading-relaxed">
              DevAtlas e construit de la zero de o singură persoană. Fără echipă mare, 
              fără corporate bullshit, doar muncă onestă.
            </p>
          </div>
        </div>
      </section>

      {/* Team Member Section */}
      <section className="bg-black py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          
          {/* Founder Card - Asymmetric Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start mb-20">
            
            {/* Left - Image/Avatar Area */}
            <div className="lg:col-span-5">
              <div className="relative">
                {/* Placeholder Avatar */}
                <div className="w-full aspect-square bg-gradient-to-br from-cyan-500 to-blue-500 rounded-3xl flex items-center justify-center mb-6">
                  <span className="text-9xl font-bold text-white">R</span>
                </div>
                
                {/* Floating Badge */}
                <div className="absolute -bottom-6 -right-6 bg-black border-4 border-cyan-500 rounded-2xl p-6">
                  <div className="text-cyan-400 text-sm font-medium mb-1">Role</div>
                  <div className="text-white text-xl font-bold">Fondator</div>
                </div>
              </div>
            </div>

            {/* Right - Info */}
            <div className="lg:col-span-7">
              <h2 className="text-5xl font-bold text-white mb-4">Rares</h2>
              <div className="text-2xl text-cyan-400 font-medium mb-8">Fondator & Developer</div>
              
              <div className="space-y-6 text-xl text-gray-400 leading-relaxed mb-12">
                <p>
                  Am început să învăț programare acum câțiva ani, învârtindu-mă prin tutoriale YouTube, 
                  cursuri pe Udemy și documentații pe care le înțelegeam pe jumătate.
                </p>
                <p>
                  M-am săturat de resurse slabe în română și de platforme care nu-mi dădeau feedback 
                  real pe cod. Așa că am zis: &quot;Dacă nu există, o fac eu.&quot;
                </p>
                <p>
                  DevAtlas e rezultatul a sute de ore de muncă - design, frontend, backend, bază de date, 
                  infrastructură, totul. E construit cu Next.js, NestJS și PostgreSQL.
                </p>
              </div>

              {/* Skills/Tech Stack */}
              <div className="mb-12">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Tech Stack</h3>
                <div className="flex flex-wrap gap-3">
                  {["TypeScript", "React", "Next.js", "NestJS", "PostgreSQL", "Tailwind CSS", "Prisma"].map((tech) => (
                    <span key={tech} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quote */}
              <div className="border-l-4 border-cyan-500 pl-6">
                <p className="text-2xl font-bold text-white italic">
                  &quot;Nu contează cât de mare devine. Contează să rămână onest.&quot;
                </p>
              </div>
            </div>
          </div>

          {/* Philosophy Section */}
          <div className="mt-32 max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-12 text-center">
              De ce un singur om?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">Viteză de execuție</h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Fără meetings, fără aprobări, fără birocație. Văd o problemă, o rezolv. 
                  Am o idee, o implementez.
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">Viziune clară</h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Nu trebuie să conving pe nimeni de nimic. Știu exact ce vreau să construiesc 
                  și mă duc direct spre țintă.
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">Control total</h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Fiecare linie de cod, fiecare feature, fiecare decizie de design - totul e făcut 
                  cu grijă și gândit până la capăt.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">Zero compromisuri</h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Nu trebuie să fac platformă &quot;marketable&quot; sau să scot feature-uri ca să lansez mai repede. 
                  Iese când e gata.
                </p>
              </div>
            </div>
          </div>

          {/* Future Team Section */}
          <div className="mt-32 bg-gray-900/50 border border-white/10 rounded-3xl p-12 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Poate în viitor...
            </h2>
            <p className="text-xl text-gray-400 leading-relaxed max-w-3xl mx-auto">
              DevAtlas e solo acum, dar asta nu înseamnă că o să rămână așa pentru totdeauna. 
              Când proiectul crește și când găsesc oameni care înțeleg viziunea, 
              o să construim împreună ceva și mai bun.
            </p>
            <p className="text-lg text-cyan-400 mt-6 font-medium">
              Deocamdată însă, suntem doar eu și codul. 
            </p>
          </div>

        </div>
      </section>
    </>
  );
}
