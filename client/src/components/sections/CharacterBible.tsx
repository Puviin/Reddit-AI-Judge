// DRAMAFORGE SCOUT — Character Bible Section

import { characterBible } from "@/lib/mockData";
import type { Character } from "@/lib/mockData";
import { roleColors } from "@/lib/roles";

interface CharacterBibleProps {
  storyId: string;
  onContinue: () => void;
}

const ROLE_COLORS = roleColors();

export default function CharacterBible({ storyId, onContinue }: CharacterBibleProps) {
  const characters: Character[] = characterBible[storyId] || characterBible["story-001"];

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "#0A0E1A" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="impact-badge text-sm mb-4 inline-block">Step 5 — Character Bible</span>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "white", letterSpacing: "0.05em" }}>
            MEET THE <span style={{ color: "#FFD700" }}>CAST</span>
          </h2>
          <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif" }}>
            All characters are fictional. No real usernames, real faces, or real people.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {characters.map((char) => (
            <div
              key={char.role}
              className="manga-panel rounded-lg overflow-hidden"
              style={{ background: `${ROLE_COLORS[char.role]}08` }}
            >
              <div className="flex gap-4 p-5">
                {/* Character image */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-32 rounded overflow-hidden" style={{ border: `2px solid ${ROLE_COLORS[char.role]}40` }}>
                    <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover object-top" />
                  </div>
                  <div className="mt-2 text-center">
                    <span
                      className="text-[10px] px-2 py-1 uppercase tracking-wider"
                      style={{
                        fontFamily: "'Bebas Neue', Impact, sans-serif",
                        background: `${ROLE_COLORS[char.role]}20`,
                        border: `1px solid ${ROLE_COLORS[char.role]}50`,
                        color: ROLE_COLORS[char.role],
                        clipPath: "polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)",
                        display: "inline-block",
                      }}
                    >
                      {char.role}
                    </span>
                  </div>
                </div>

                {/* Character info */}
                <div className="flex-1 min-w-0">
                  <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.2rem", letterSpacing: "0.05em", color: "white" }}>
                    {char.name}
                  </h3>

                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: ROLE_COLORS[char.role], fontFamily: "'Bebas Neue', Impact, sans-serif" }}>Personality</div>
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "Noto Sans, sans-serif" }}>{char.personality}</p>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: ROLE_COLORS[char.role], fontFamily: "'Bebas Neue', Impact, sans-serif" }}>Voice Style</div>
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "Noto Sans, sans-serif" }}>{char.voiceStyle}</p>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: ROLE_COLORS[char.role], fontFamily: "'Bebas Neue', Impact, sans-serif" }}>Position</div>
                      <p className="text-xs leading-relaxed italic" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif" }}>"{char.argumentPosition}"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={onContinue}
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
            ▶ PLAY THE CLIP →
          </button>
        </div>
      </div>
    </div>
  );
}
