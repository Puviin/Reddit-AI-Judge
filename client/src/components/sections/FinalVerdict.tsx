// DRAMAFORGE SCOUT — Final Verdict Section

import { useState, useEffect } from "react";
import { verdicts } from "@/lib/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface FinalVerdictProps {
  storyId: string;
  onReplay: () => void;
  onReset: () => void;
}

export default function FinalVerdict({ storyId, onReplay, onReset }: FinalVerdictProps) {
  const verdict = verdicts[storyId] || verdicts["story-001"];
  const [revealed, setRevealed] = useState(false);
  const [gavelHit, setGavelHit] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setGavelHit(true), 400);
    const t2 = setTimeout(() => setRevealed(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const winnerColor = verdict.winner === "Plaintiff" ? "#FF1744" : verdict.winner === "Defendant" ? "#4A90D9" : "#FFD700";

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "#0A0E1A" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="impact-badge text-sm mb-4 inline-block">Step 8 — Final Verdict</span>

          {/* Gavel animation */}
          <div className={`text-6xl mb-4 ${gavelHit ? "animate-gavel" : "opacity-0"}`}>🔨</div>

          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(2.5rem, 6vw, 5rem)", color: "white", letterSpacing: "0.05em" }}>
            THE COURT <span style={{ color: "#FFD700" }}>RULES</span>
          </h2>
        </div>

        {revealed && (
          <div className="space-y-6 animate-fade-in">
            {/* Verdict stamp */}
            <div className="flex justify-center mb-8">
              <div className="text-center">
                <div
                  className="verdict-stamp inline-block"
                  style={{ color: winnerColor, borderColor: winnerColor, textShadow: `0 0 20px ${winnerColor}80`, boxShadow: `0 0 30px ${winnerColor}40` }}
                >
                  {verdict.winner === "Plaintiff" ? "DEFENDANT GUILTY" :
                   verdict.winner === "Defendant" ? "NOT GUILTY" :
                   "BOTH WRONG"}
                </div>
                <div className="mt-3" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.1rem", letterSpacing: "0.2em", color: winnerColor }}>
                  {verdict.winner === "Plaintiff" ? "⚔️ PLAINTIFF WINS" :
                   verdict.winner === "Defendant" ? "🛡️ DEFENDANT WINS" :
                   "⚖️ MUTUAL FAULT"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Reasoning + Judge Quote */}
              <div className="space-y-5">
                {/* Reasoning */}
                <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                    📜 Court Reasoning
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Noto Sans, sans-serif" }}>
                    {verdict.reasoning}
                  </p>
                </div>

                {/* Funniest judge quote */}
                <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,215,0,0.06)" }}>
                  <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                    ⚖️ Funniest Judge Quote
                  </div>
                  <div className="flex gap-3">
                    <img
                      src="https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_judge-fkcYYmvfKxmx2rg4rZEzY9.webp"
                      alt="Judge"
                      className="w-12 h-12 rounded object-cover object-top flex-shrink-0"
                      style={{ border: "2px solid rgba(255,215,0,0.3)" }}
                    />
                    <p className="text-sm leading-relaxed italic" style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Noto Sans, sans-serif" }}>
                      "{verdict.funniestJudgeQuote}"
                    </p>
                  </div>
                </div>

                {/* Lesson */}
                <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(46,204,113,0.06)" }}>
                  <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#2ECC71", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                    📚 Lesson From This Case
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Noto Sans, sans-serif" }}>
                    {verdict.lessonFromCase}
                  </p>
                </div>
              </div>

              {/* Right: Verdict breakdown chart */}
              <div className="space-y-5">
                <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-xs uppercase tracking-widest mb-4" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                    📊 Public Verdict Breakdown
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={verdict.breakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="percentage"
                        >
                          {verdict.breakdown.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#111827", border: "1px solid rgba(255,215,0,0.3)", borderRadius: "4px", fontFamily: "Noto Sans, sans-serif", fontSize: "11px" }}
                          formatter={(value: number) => [`${value}%`, ""]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {verdict.breakdown.map((b) => (
                      <div key={b.label} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: b.color }} />
                        <div className="flex-1 score-bar">
                          <div className="score-bar-fill" style={{ width: `${b.percentage}%`, background: b.color }} />
                        </div>
                        <span className="text-xs w-28 text-right" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "Noto Sans, sans-serif" }}>{b.label}</span>
                        <span className="text-xs w-8 text-right" style={{ color: b.color, fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{b.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sponsor badges */}
                <div className="manga-panel rounded-lg p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                    Powered By
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "Adaption AI", desc: "Data pipeline & safety", color: "#FF6B35" },
                      { name: "Gemini", desc: "Story analysis & dialogue", color: "#4A90D9" },
                      { name: "ElevenLabs", desc: "Voice narration", color: "#2ECC71" },
                      { name: "Convex", desc: "Case persistence", color: "#FFD700" },
                    ].map((api) => (
                      <div key={api.name} className="p-2 rounded text-xs" style={{ background: `${api.color}10`, border: `1px solid ${api.color}30` }}>
                        <div style={{ color: api.color, fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.05em" }}>{api.name}</div>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>{api.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <button
                onClick={onReplay}
                className="px-8 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: "1rem",
                  letterSpacing: "0.15em",
                  background: "rgba(255,215,0,0.15)",
                  color: "#FFD700",
                  border: "1px solid rgba(255,215,0,0.4)",
                  clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
                }}
              >
                ▶ REPLAY CLIP
              </button>
              <button
                onClick={onReset}
                className="px-8 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: "1rem",
                  letterSpacing: "0.15em",
                  background: "#FF1744",
                  color: "white",
                  clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
                  boxShadow: "0 0 20px rgba(255,23,68,0.4)",
                }}
              >
                ⚡ NEW CASE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
