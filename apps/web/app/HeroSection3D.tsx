"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function HeroSection3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const codeBlockRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Animate title on mount
    if (titleRef.current) {
      const words = titleRef.current.querySelectorAll("span");
      gsap.fromTo(
        words,
        {
          opacity: 0,
          y: 40,
          rotationX: -90,
        },
        {
          opacity: 1,
          y: 0,
          rotationX: 0,
          duration: 2,
          delay: 0.1,
          stagger: 0.15,
          ease: "cubic.out",
        }
      );
    }

    // Animate subtitle
    if (subtitleRef.current) {
      gsap.fromTo(
        subtitleRef.current,
        {
          opacity: 0,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: 1.5,
          delay: 1.2,
          ease: "cubic.out",
        }
      );
    }

    // Animate CTA button
    if (buttonRef.current) {
      gsap.fromTo(
        buttonRef.current,
        {
          opacity: 0,
          scale: 0.8,
        },
        {
          opacity: 1,
          scale: 1,
          duration: 1,
          delay: 1.5,
          ease: "elastic.out(1, 0.5)",
        }
      );

      // Hover effect
      buttonRef.current.addEventListener("mouseenter", () => {
        gsap.to(buttonRef.current, {
          scale: 1.05,
          boxShadow: "0 20px 60px rgba(0, 217, 255, 0.4)",
          duration: 0.3,
        });
      });

      buttonRef.current.addEventListener("mouseleave", () => {
        gsap.to(buttonRef.current, {
          scale: 1,
          boxShadow: "0 10px 40px rgba(0, 217, 255, 0.2)",
          duration: 0.3,
        });
      });
    }

    // Floating animation for code block
    if (codeBlockRef.current) {
      gsap.fromTo(
        codeBlockRef.current,
        {
          opacity: 0,
          x: 100,
          rotationY: -45,
        },
        {
          opacity: 1,
          x: 0,
          rotationY: 0,
          duration: 2,
          delay: 0.8,
          ease: "cubic.out",
        }
      );

      // Continuous floating effect
      gsap.to(codeBlockRef.current, {
        y: 20,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }

    // Mouse parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const { clientX, clientY } = e;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const x = (clientX / width - 0.5) * 20;
      const y = (clientY / height - 0.5) * 20;

      if (codeBlockRef.current) {
        gsap.to(codeBlockRef.current, {
          x: x * 2,
          y: y * 2,
          duration: 0.5,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black pt-24 perspective"
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient overlay */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-cyan-600/20 to-transparent rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-10 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/15 to-transparent rounded-full blur-[120px]" />
        </div>

        {/* Grid pattern - subtle */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(0,217,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,217,255,0.2) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-8 lg:px-12 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-8">
            {/* Animated Title */}
            <h1
              ref={titleRef}
              className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter"
            >
              <span className="block">Code.</span>
              <span className="block">Build.</span>
              <span className="inline-block bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 bg-clip-text text-transparent">
                Repeat.
              </span>
            </h1>

            {/* Animated Subtitle */}
            <p
              ref={subtitleRef}
              className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-xl font-light"
            >
              Platformă românească de învățare programare cu{" "}
              <span className="text-white font-semibold">cursuri video, exerciții practice și proiecte reale</span>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 pt-4">
              <a
                ref={buttonRef}
                href="/cursuri"
                className="group px-10 py-4 bg-white text-black font-bold text-lg rounded-2xl transition-all duration-300 inline-flex items-center justify-center gap-3 shadow-2xl hover:shadow-cyan-400/50 backdrop-blur-sm hover:backdrop-blur-lg"
              >
                Începe Acum
                <svg
                  className="w-6 h-6 group-hover:translate-x-2 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
              <a
                href="/despre"
                className="px-10 py-4 bg-transparent text-white font-bold text-lg rounded-2xl border-2 border-white/30 hover:border-white/60 transition-all duration-300 backdrop-blur-sm inline-flex items-center justify-center"
              >
                Povestea Noastră
              </a>
            </div>

            {/* Stats row */}
            <div className="flex gap-8 pt-8 border-t border-white/10">
              <div>
                <div className="text-3xl font-black text-cyan-400">50K+</div>
                <div className="text-sm text-gray-400">Studenți activi</div>
              </div>
              <div>
                <div className="text-3xl font-black text-white">200+</div>
                <div className="text-sm text-gray-400">Cursuri premium</div>
              </div>
              <div>
                <div className="text-3xl font-black text-white">4.9/5</div>
                <div className="text-sm text-gray-400">Rating mediu</div>
              </div>
            </div>
          </div>

          {/* 3D Code Block - Floating */}
          <div className="relative h-full min-h-96 flex items-center justify-center">
            <div
              ref={codeBlockRef}
              className="w-full max-w-md bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl border border-cyan-500/30 p-8 shadow-2xl"
              style={{
                perspective: "1000px",
              }}
            >
              {/* Code snippet */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-cyan-500/20">
                  <span className="text-cyan-400 font-mono text-xs">main.js</span>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                  </div>
                </div>

                <pre className="text-cyan-300 font-mono text-sm leading-relaxed overflow-hidden">
                  <code>{`function buildMastery() {
  const path = [
    "Learn",
    "Practice", 
    "Build",
  ];

  return path.map(
    step => master(step)
  );
}`}</code>
                </pre>

                <div className="mt-6 pt-4 border-t border-cyan-500/20">
                  <div className="inline-flex items-center gap-2 text-green-400 text-xs font-mono">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Running...
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-40 w-60 h-60 bg-blue-500/5 rounded-full blur-3xl" />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
        <div className="flex flex-col items-center gap-3 text-white/50 animate-bounce">
          <span className="text-xs tracking-widest uppercase font-semibold">Scroll Down</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
