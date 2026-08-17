// DRAMAFORGE SCOUT — Story Selection
// Manga panel grid with story cards

import { useState } from "react";
import type { Story } from "@/lib/mockData";
import { trpc } from "@/lib/trpc";

interface StorySelectionProps {
  stories: Story[];
  onSelect: (story: Story) => void;
}

const BADGE_COLORS: Record<string, string> = {
  "HOT CASE": "#FF1744",
  "SOLID DRAMA": "#FFD700",
  "SPICY PICK": "#FF6B35",
  "CROWD PLEASER": "#2ECC71",
};

export default function StorySelection({ stories, onSelect }: StorySelectionProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [customLink, setCustomLink] = useState("");
  const [isScouting, setIsScouting] = useState(false);
  const scoutMutation = trpc.scout.scoutUrl.useMutation();

  const handleCustomScout = async () => {
    if (!customLink.trim() || isScouting) return;
    setIsScouting(true);
    try {
      const res = await scoutMutation.mutateAsync({ url: customLink.trim() });
      if (res?.story) {
        onSelect(res.story);
      }
    } catch {
      onSelect(stories[0]);
    } finally {
      setIsScouting(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "#0A0E1A" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="impact-badge text-sm mb-4 inline-block">Step 2 — Case Selection</span>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "white", letterSpacing: "0.05em" }}>
            CHOOSE YOUR <span style={{ color: "#FFD700" }}>CASE</span>
          </h2>
          <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif" }}>
            Each case has been analyzed by our AI pipeline. Select one to proceed to trial.
          </p>
        </div>

        {/* Story cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {stories.map((story, idx) => (
            <div
              key={story.id}
              className="manga-panel rounded-lg overflow-hidden card-lift cursor-pointer"
              style={{
                background: hovered === story.id ? "rgba(255,215,0,0.06)" : "rgba(255,255,255,0.03)",
                animationDelay: `${idx * 0.1}s`,
              }}
              onMouseEnter={() => setHovered(story.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(story)}
            >
              {/* Card header */}
              <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className="text-xs px-2 py-1 rounded font-bold uppercase tracking-wider"
                    style={{
                      background: `${BADGE_COLORS[story.recommendationBadge]}22`,
                      border: `1px solid ${BADGE_COLORS[story.recommendationBadge]}55`,
                      color: BADGE_COLORS[story.recommendationBadge],
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {story.recommendationBadge}
                  </span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "Noto Sans, sans-serif" }}>
                    {story.source}
                  </span>
                </div>
                <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.3rem", letterSpacing: "0.05em", color: "white", lineHeight: 1.1 }}>
                  {story.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed line-clamp-3" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif" }}>
                  {story.summary}
                </p>
              </div>

              {/* Metrics */}
              <div className="p-4 space-y-2">
                {[
                  { label: "Safety", value: story.safetyScore, color: "#2ECC71" },
                  { label: "Humor", value: story.humorScore, color: "#FF6B35" },
                  { label: "Conflict Clarity", value: story.conflictClarity, color: "#FFD700" },
                  { label: "Comment Quality", value: story.commentQuality, color: "#4A90D9" },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-2">
                    <span className="text-[10px] w-24 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>{m.label}</span>
                    <div className="flex-1 score-bar">
                      <div className="score-bar-fill" style={{ width: `${m.value}%`, background: m.color }} />
                    </div>
                    <span className="text-[10px] w-6 text-right" style={{ color: m.color, fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{m.value}</span>
                  </div>
                ))}
              </div>

              {/* VS row */}
              <div className="px-4 pb-4 flex items-center gap-2">
                <div className="flex-1 p-2 rounded text-center text-xs" style={{ background: "rgba(255,23,68,0.1)", border: "1px solid rgba(255,23,68,0.2)" }}>
                  <div className="text-[10px] uppercase" style={{ color: "#FF1744", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>Plaintiff</div>
                  <div className="truncate" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Noto Sans, sans-serif" }}>{story.plaintiff.split(" (")[0]}</div>
                </div>
                <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700", fontSize: "1.2rem" }}>VS</div>
                <div className="flex-1 p-2 rounded text-center text-xs" style={{ background: "rgba(74,144,217,0.1)", border: "1px solid rgba(74,144,217,0.2)" }}>
                  <div className="text-[10px] uppercase" style={{ color: "#4A90D9", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>Defendant</div>
                  <div className="truncate" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Noto Sans, sans-serif" }}>{story.defendant.split(" (")[0]}</div>
                </div>
              </div>

              {/* Select button */}
              <div className="px-4 pb-4">
                <button
                  className="w-full py-2 text-sm uppercase tracking-widest transition-all duration-200"
                  style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    letterSpacing: "0.15em",
                    background: hovered === story.id ? "#FF1744" : "rgba(255,23,68,0.2)",
                    color: "white",
                    border: "1px solid rgba(255,23,68,0.4)",
                    clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
                  }}
                >
                  ⚡ SELECT THIS CASE
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Custom URL input */}
        <div className="manga-panel rounded-lg p-6 max-w-xl mx-auto" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
              🔗 Paste a live Reddit link
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customLink}
              onChange={(e) => setCustomLink(e.target.value)}
              placeholder="https://reddit.com/r/AmITheAsshole/..."
              className="flex-1 px-3 py-2 text-sm rounded outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)",
                fontFamily: "Noto Sans, sans-serif",
              }}
            />
            <button
              onClick={handleCustomScout}
              disabled={isScouting}
              className="px-4 py-2 text-xs uppercase tracking-wider"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                background: "rgba(255,215,0,0.15)",
                border: "1px solid rgba(255,215,0,0.3)",
                color: "#FFD700",
                clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)",
              }}
            >
              {isScouting ? "SCOUTING..." : "SCOUT"}
            </button>
          </div>
          <p className="mt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "Noto Sans, sans-serif" }}>
            Live Reddit scouting powered by OpenAI + Reddit JSON API
          </p>
        </div>
      </div>
    </div>
  );
}
