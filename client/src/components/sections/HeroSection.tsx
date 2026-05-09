// DRAMAFORGE SCOUT — Hero Section
// Anime Legal Battle: Speed lines, impact typography, anime courtroom bg

import { useEffect, useState } from "react";

interface HeroSectionProps {
  onStart: () => void;
}

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/hero_bg-mUp84k8qRsngJYjHVe4Cir.webp";
const CHAR_JUDGE = "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_judge-fkcYYmvfKxmx2rg4rZEzY9.webp";
const CHAR_PLAINTIFF = "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_plaintiff-cmbVj2wtDZwKYqA4tkwQ7K.webp";
const CHAR_DEFENDANT = "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_defendant-bvyV8J4edbFiRJRXLKtG7c.webp";

export default function HeroSection({ onStart }: HeroSectionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col" style={{ background: "#0A0E1A" }}>
      {/* Background courtroom */}
      <div className="absolute inset-0">
        <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(10,14,26,0.4) 0%, rgba(10,14,26,0.7) 60%, #0A0E1A 100%)" }} />
      </div>

      {/* Speed lines overlay */}
      <div className="absolute inset-0 speed-lines opacity-20 pointer-events-none" />

      {/* Top nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: "#FF1744", fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.2rem", color: "white" }}>
            DF
          </div>
          <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.1rem", letterSpacing: "0.15em", color: "#FFD700" }}>
            DRAMAFORGE SCOUT
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            Powered by
          </span>
          <div className="flex gap-2">
            {["Adaption AI", "Gemini", "ElevenLabs", "Convex"].map((api) => (
              <span key={api} className="px-2 py-1 text-[10px] uppercase tracking-wider rounded" style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                {api}
              </span>
            ))}
          </div>
        </div>
      </nav>

      {/* Main hero content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Objection badge */}
        <div className={`mb-6 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
          <span className="impact-badge text-sm tracking-widest">
            ⚖️ Case File Active
          </span>
        </div>

        {/* Main title */}
        <div className={`transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h1 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: "clamp(3.5rem, 10vw, 8rem)",
            letterSpacing: "0.05em",
            lineHeight: 0.9,
            color: "white",
          }}>
            DRAMA
            <span style={{ color: "#FF1744", textShadow: "0 0 40px rgba(255,23,68,0.6)" }}>FORGE</span>
            <br />
            <span style={{ color: "#FFD700", textShadow: "0 0 40px rgba(255,215,0,0.4)" }}>SCOUT</span>
          </h1>
        </div>

        {/* Tagline */}
        <div className={`mt-6 transition-all duration-700 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <p style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.3rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.7)" }}>
            INTERNET DRAMA → AI COURTROOM → FINAL VERDICT
          </p>
          <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif", lineHeight: 1.7 }}>
            We take the internet's messiest drama, clean it with AI, build characters, generate an animatic clip, and put the whole thing on trial. Who's wrong? The court decides.
          </p>
        </div>

        {/* Characters row */}
        <div className={`mt-10 flex items-end justify-center gap-4 transition-all duration-700 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="flex flex-col items-center">
            <img src={CHAR_PLAINTIFF} alt="Plaintiff" className="h-48 object-contain drop-shadow-2xl" style={{ filter: "drop-shadow(0 0 20px rgba(255,23,68,0.4))" }} />
            <span className="impact-badge text-xs mt-2">Plaintiff</span>
          </div>
          <div className="flex flex-col items-center">
            <img src={CHAR_JUDGE} alt="Judge" className="h-64 object-contain drop-shadow-2xl" style={{ filter: "drop-shadow(0 0 30px rgba(255,215,0,0.5))" }} />
            <span className="gold-badge text-xs mt-2">Judge</span>
          </div>
          <div className="flex flex-col items-center">
            <img src={CHAR_DEFENDANT} alt="Defendant" className="h-48 object-contain drop-shadow-2xl" style={{ filter: "drop-shadow(0 0 20px rgba(74,144,217,0.4))" }} />
            <span className="impact-badge text-xs mt-2" style={{ background: "#4A90D9" }}>Defendant</span>
          </div>
        </div>

        {/* CTA */}
        <div className={`mt-10 flex flex-col items-center gap-4 transition-all duration-700 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <button
            onClick={onStart}
            className="relative group overflow-hidden px-12 py-4 text-white font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: "1.3rem",
              letterSpacing: "0.2em",
              background: "#FF1744",
              clipPath: "polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)",
              boxShadow: "0 0 30px rgba(255,23,68,0.5)",
            }}
          >
            <span className="relative z-10">⚡ OPEN THE CASE FILE</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(90deg, #FF1744, #C41230)" }} />
          </button>
          <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            No API keys required · Mock data ready · Demo mode active
          </p>
        </div>
      </div>

      {/* Bottom scroll indicator */}
      <div className="relative z-10 flex justify-center pb-6">
        <div className="flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>Scroll</span>
          <div className="w-px h-8" style={{ background: "linear-gradient(to bottom, rgba(255,215,0,0.5), transparent)" }} />
        </div>
      </div>
    </div>
  );
}
