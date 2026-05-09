// DRAMAFORGE SCOUT — Courtroom Mode Section

import { useState } from "react";
import { courtroomDialogue, characterBible } from "@/lib/mockData";

interface CourtroomModeProps {
  storyId: string;
  onContinue: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  Plaintiff: "#FF1744",
  Defendant: "#4A90D9",
  Judge: "#FFD700",
  Witness: "#2ECC71",
};

const ROLE_ICONS: Record<string, string> = {
  Plaintiff: "⚔️",
  Defendant: "🛡️",
  Judge: "⚖️",
  Witness: "📋",
};

const CHAR_IMAGES: Record<string, string> = {
  Plaintiff: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_plaintiff-cmbVj2wtDZwKYqA4tkwQ7K.webp",
  Defendant: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_defendant-bvyV8J4edbFiRJRXLKtG7c.webp",
  Judge: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_judge-fkcYYmvfKxmx2rg4rZEzY9.webp",
  Witness: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_witness-FJyE4XFzTg2HGnHbXpPxj4.webp",
};

const TYPE_LABELS: Record<string, string> = {
  opening: "OPENING ARGUMENT",
  testimony: "TESTIMONY",
  question: "JUDGE'S QUESTION",
  ruling: "RULING",
};

export default function CourtroomMode({ storyId, onContinue }: CourtroomModeProps) {
  const dialogue = courtroomDialogue[storyId] || courtroomDialogue["story-001"];
  const [revealed, setRevealed] = useState(1);

  const handleRevealNext = () => {
    if (revealed < dialogue.length) {
      setRevealed((r) => r + 1);
    }
  };

  const allRevealed = revealed >= dialogue.length;

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "#0A0E1A" }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="gold-badge text-sm mb-4 inline-block">Step 7 — Courtroom Mode</span>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "white", letterSpacing: "0.05em" }}>
            THE <span style={{ color: "#FFD700" }}>TRIAL</span>
          </h2>
          <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>
            Court is now in session. Reveal each statement one by one.
          </p>
        </div>

        {/* Courtroom background banner */}
        <div className="rounded-lg overflow-hidden mb-8" style={{ height: "120px", position: "relative" }}>
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/hero_bg-mUp84k8qRsngJYjHVe4Cir.webp"
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(10,14,26,0.6)" }}>
            <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.5rem", letterSpacing: "0.3em", color: "#FFD700", textShadow: "0 0 20px rgba(255,215,0,0.5)" }}>
              ⚖️ COURT IS IN SESSION ⚖️
            </div>
          </div>
        </div>

        {/* Dialogue cards */}
        <div className="space-y-4 mb-8">
          {dialogue.slice(0, revealed).map((line, idx) => {
            const color = ROLE_COLORS[line.role] || "white";
            const icon = ROLE_ICONS[line.role] || "💬";
            const img = CHAR_IMAGES[line.role];
            const isJudge = line.role === "Judge";

            return (
              <div
                key={idx}
                className="manga-panel rounded-lg overflow-hidden animate-slide-up"
                style={{
                  background: isJudge ? "rgba(255,215,0,0.06)" : `${color}08`,
                  animationDelay: `${idx * 0.05}s`,
                }}
              >
                <div className="flex gap-4 p-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div className="w-14 h-14 rounded overflow-hidden" style={{ border: `2px solid ${color}40` }}>
                      <img src={img} alt={line.role} className="w-full h-full object-cover object-top" />
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-center" style={{ color, fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                      {line.role}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs" style={{ color, fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}>
                        {icon} {line.speaker}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${color}15`, color: `${color}bb`, fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.08em" }}>
                        {TYPE_LABELS[line.type]}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Noto Sans, sans-serif", fontStyle: "italic" }}>
                      "{line.text}"
                    </p>
                  </div>
                </div>

                {/* Special: OBJECTION for judge ruling */}
                {line.type === "ruling" && (
                  <div className="px-4 pb-3">
                    <div className="inline-block objection-bubble text-sm">
                      🔨 RULING DELIVERED
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4">
          {!allRevealed ? (
            <button
              onClick={handleRevealNext}
              className="px-10 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: "1rem",
                letterSpacing: "0.2em",
                background: "rgba(255,215,0,0.15)",
                color: "#FFD700",
                border: "1px solid rgba(255,215,0,0.4)",
                clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
              }}
            >
              ▼ NEXT STATEMENT ({revealed}/{dialogue.length})
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4 animate-scale-in">
              <div className="text-center">
                <div className="text-3xl mb-2">🔨</div>
                <p style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.2rem", letterSpacing: "0.15em", color: "#FFD700" }}>
                  THE JUDGE HAS SPOKEN
                </p>
              </div>
              <button
                onClick={onContinue}
                className="px-12 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105 animate-pulse-red"
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: "1.1rem",
                  letterSpacing: "0.2em",
                  background: "#FF1744",
                  color: "white",
                  clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                }}
              >
                📜 SEE THE FINAL VERDICT →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
