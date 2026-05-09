// DRAMAFORGE SCOUT — Theme Selection

import { useState } from "react";

interface Theme {
  id: string;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

interface ThemeSelectionProps {
  themes: Theme[];
  onSelect: (themeId: string) => void;
}

export default function ThemeSelection({ themes, onSelect }: ThemeSelectionProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "#0A0E1A" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="gold-badge text-sm mb-4 inline-block">Step 4 — Theme Selection</span>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "white", letterSpacing: "0.05em" }}>
            CHOOSE YOUR <span style={{ color: "#FF1744" }}>STYLE</span>
          </h2>
          <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif" }}>
            Pick a cinematic style for your courtroom clip. All themes use fictional characters only.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelected(theme.id)}
              className="manga-panel rounded-lg p-5 text-left transition-all duration-200 hover:scale-105"
              style={{
                background: selected === theme.id ? `${theme.color}15` : "rgba(255,255,255,0.03)",
                border: selected === theme.id ? `2px solid ${theme.color}` : "2px solid rgba(255,255,255,0.08)",
                boxShadow: selected === theme.id ? `0 0 20px ${theme.color}40` : "none",
              }}
            >
              <div className="text-3xl mb-3">{theme.emoji}</div>
              <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1rem", letterSpacing: "0.05em", color: selected === theme.id ? theme.color : "white" }}>
                {theme.label}
              </div>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "Noto Sans, sans-serif" }}>
                {theme.description}
              </p>
              {selected === theme.id && (
                <div className="mt-3">
                  <span className="text-xs px-2 py-1 rounded" style={{ background: `${theme.color}30`, color: theme.color, fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}>
                    ✓ SELECTED
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {selected && (
          <div className="flex justify-center animate-slide-up">
            <button
              onClick={() => onSelect(selected)}
              className="px-12 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: "1.1rem",
                letterSpacing: "0.2em",
                background: "#FF1744",
                color: "white",
                clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                boxShadow: "0 0 20px rgba(255,23,68,0.4)",
              }}
            >
              BUILD CHARACTER BIBLE →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
