"use client";

const stats = [
  { number: "2,500+", label: "Studenți activi", icon: "👥" },
  { number: "35+", label: "Cursuri disponibile", icon: "📚" },
  { number: "8,000+", label: "Exerciții rezolvate", icon: "✅" },
  { number: "4.8/5", label: "Rating mediu", icon: "⭐" }
];

const testimonials = [
  {
    name: "Alex M.",
    role: "Junior Developer",
    company: "@ Tech Startup",
    text: "Am trecut de la zero programare la primul job în 6 luni. Cursurile sunt clare, exercițiile sunt practice.",
    avatar: "AM"
  },
  {
    name: "Maria P.",
    role: "Frontend Developer",
    company: "@ Digital Agency",
    text: "Cel mai bun lucru e editorul de cod integrat. Scrii cod, vezi rezultatul instant. Super eficient.",
    avatar: "MP"
  },
  {
    name: "Andrei L.",
    role: "Full Stack Dev",
    company: "@ Remote Company",
    text: "Am încercat Udemy, Coursera, nimic nu se compară cu DevAtlas pentru învățarea în română.",
    avatar: "AL"
  }
];

export default function SocialProofSection() {
  return (
    <section className="relative py-32 bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-5xl mb-4">{stat.icon}</div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.number}</div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials Section */}
        <div className="mb-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Ce spun studenții
            </h2>
            <p className="text-xl text-gray-400">
              Oameni reali, rezultate reale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-900/50 border border-white/10 rounded-2xl p-8 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                    <div className="text-xs text-gray-500">{testimonial.company}</div>
                  </div>
                </div>
                <p className="text-gray-300 leading-relaxed">&quot;{testimonial.text}&quot;</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-20 pt-12 border-t border-white/10">
          <div className="text-center mb-8">
            <p className="text-gray-500 text-sm uppercase tracking-wider">Folosit de studenți de la</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50">
            <div className="text-2xl font-bold text-white">UBB Cluj</div>
            <div className="text-2xl font-bold text-white">UPT</div>
            <div className="text-2xl font-bold text-white">UTCN</div>
            <div className="text-2xl font-bold text-white">Poli București</div>
          </div>
        </div>
      </div>
    </section>
  );
}
