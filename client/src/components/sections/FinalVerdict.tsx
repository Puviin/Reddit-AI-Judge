// DRAMAFORGE SCOUT — Final Verdict Section (Gemini AI powered)

import { useState, useEffect } from "react";
import { verdicts, stories } from "@/lib/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { trpc } from "@/lib/trpc";

interface FinalVerdictProps {
  storyId: string;
  onReplay: () => void;
  onReset: () => void;
  aiAnalysis?: {
    keyEvidence: string[];
    dramaScore?: number;
  } | null;
}

interface GeminiVerdict {
  verdict: string;
  verdictFull: string;
  ruling: string;
  reasoning: string;
  sentencing: string;
  dissent: string;
  dramaRating: string;
  closingStatement: string;
}

const VERDICT_COLORS: Record<string, string> = {
  NTA: "#2ECC71",
  YTA: "#FF1744",
  ESH: "#FF6B35",
  NAH: "#4A90D9",
};

const VERDICT_LABELS: Record<string, string> = {
  NTA: "NOT THE ASSHOLE",
  YTA: "YOU'RE THE ASSHOLE",
  ESH: "EVERYONE SUCKS HERE",
  NAH: "NO ASSHOLES HERE",
};

export default function FinalVerdict({ storyId, onReplay, onReset, aiAnalysis }: FinalVerdictProps) {
  const mockVerdict = verdicts[storyId] || verdicts["story-001"];
  const story = stories.find(s => s.id === storyId) || stories[0];

  const [revealed, setRevealed] = useState(false);
  const [gavelHit, setGavelHit] = useState(false);
  const [aiVerdict, setAiVerdict] = useState<GeminiVerdict | null>(null);

  const verdictMutation = trpc.gemini.generateVerdict.useMutation({
    onSuccess: (data) => setAiVerdict(data),
  });

  useEffect(() => {
    const t1 = setTimeout(() => setGavelHit(true), 400);
    const t2 = setTimeout(() => setRevealed(true), 1200);

    // Generate AI verdict
    verdictMutation.mutate({
      title: story.title,
      summary: story.summary,
      plaintiff: story.plaintiff,
      defendant: story.defendant,
      keyEvidence: aiAnalysis?.keyEvidence ?? story.keyEvidence,
      dramaScore: aiAnalysis?.dramaScore ?? story.humorScore,
    });

    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // Display logic — use AI verdict if available
  const verdictCode = aiVerdict?.verdict ?? (mockVerdict.winner === "Plaintiff" ? "YTA" : mockVerdict.winner === "Defendant" ? "NTA" : "ESH");
  const verdictColor = VERDICT_COLORS[verdictCode] ?? "#FFD700";
  const verdictLabel = aiVerdict?.verdictFull ?? VERDICT_LABELS[verdictCode] ?? "VERDICT";
  const ruling = aiVerdict?.ruling ?? mockVerdict.reasoning;
  const reasoning = aiVerdict?.reasoning ?? mockVerdict.reasoning;
  const sentencing = aiVerdict?.sentencing ?? "Reflect on your actions.";
  const dissent = aiVerdict?.dissent;
  const dramaRating = aiVerdict?.dramaRating ?? "⭐⭐⭐";
  const closingStatement = aiVerdict?.closingStatement ?? mockVerdict.funniestJudgeQuote;

  const pieData = [
    { name: "Plaintiff Wrong", value: mockVerdict.breakdown[0]?.percentage ?? 45, color: "#FF1744" },
    { name: "Both Wrong", value: mockVerdict.breakdown[1]?.percentage ?? 30, color: "#FFD700" },
    { name: "Defendant Right", value: mockVerdict.breakdown[2]?.percentage ?? 25, color: "#4A90D9" },
  ];

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "#0A0E1A" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="impact-badge text-sm mb-4 inline-block">Step 8 — Final Verdict</span>

          <div className={`text-6xl mb-4 transition-all duration-500 ${gavelHit ? "scale-125" : "scale-0 opacity-0"}`}>🔨</div>

          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(2.5rem, 6vw, 5rem)", color: "white", letterSpacing: "0.05em" }}>
            THE COURT <span style={{ color: "#FFD700" }}>RULES</span>
          </h2>

          {verdictMutation.isPending && (
            <div className="mt-3 text-xs animate-pulse" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}>
              ⚡ JUDGE HARROW IS DELIBERATING...
            </div>
          )}
          {aiVerdict && (
            <div className="mt-3 text-xs" style={{ color: "#2ECC71", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}>
              ✓ AI VERDICT DELIVERED
            </div>
          )}
        </div>

        {revealed && (
          <div className="space-y-6 animate-fade-in">
            {/* Verdict stamp */}
            <div className="flex justify-center mb-8">
              <div className="text-center">
                <div
                  className="verdict-stamp inline-block"
                  style={{ color: verdictColor, borderColor: verdictColor, textShadow: `0 0 20px ${verdictColor}80`, boxShadow: `0 0 30px ${verdictColor}40` }}
                >
                  {verdictCode}
                </div>
                <div className="mt-2" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.1rem", letterSpacing: "0.15em", color: verdictColor }}>
                  {verdictLabel}
                </div>
                <div className="mt-1 text-2xl">{dramaRating}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Ruling + Reasoning + Sentencing */}
              <div className="space-y-5">
                {/* Judge's ruling */}
                <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,215,0,0.06)", borderLeft: "3px solid rgba(255,215,0,0.4)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <img
                      src="https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_judge-fkcYYmvfKxmx2rg4rZEzY9.webp"
                      alt="Judge"
                      className="w-10 h-10 rounded-full object-cover object-top flex-shrink-0"
                      style={{ border: "2px solid rgba(255,215,0,0.4)" }}
                    />
                    <div className="text-xs uppercase tracking-widest" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                      ⚖️ Judge Harrow's Ruling
                      {aiVerdict && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(46,204,113,0.15)", color: "#2ECC71" }}>AI</span>}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed italic" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "Noto Sans, sans-serif" }}>
                    "{ruling}"
                  </p>
                </div>

                {/* Reasoning */}
                <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>📜 Court Reasoning</div>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Noto Sans, sans-serif" }}>
                    {reasoning}
                  </p>
                </div>

                {/* Sentencing */}
                {sentencing && (
                  <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,23,68,0.06)", borderLeft: "3px solid rgba(255,23,68,0.3)" }}>
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "#FF1744", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>⚡ Sentencing</div>
                    <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.9)", fontFamily: "Noto Sans, sans-serif" }}>{sentencing}</p>
                  </div>
                )}

                {/* Dissent */}
                {dissent && (
                  <div className="manga-panel rounded-lg p-4" style={{ background: "rgba(74,144,217,0.06)" }}>
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A90D9", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>📋 Minority Opinion</div>
                    <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif" }}>{dissent}</p>
                  </div>
                )}

                {/* Closing statement */}
                {closingStatement && (
                  <div className="manga-panel rounded-lg p-4" style={{ background: "rgba(46,204,113,0.06)" }}>
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "#2ECC71", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>🎭 Closing Statement</div>
                    <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Noto Sans, sans-serif" }}>"{closingStatement}"</p>
                  </div>
                )}
              </div>

              {/* Right: Pie chart + Sponsor badges */}
              <div className="space-y-5">
                <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-xs uppercase tracking-widest mb-4" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                    📊 Public Verdict Breakdown
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                          {pieData.map((entry, index) => (
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
                    {pieData.map((b) => (
                      <div key={b.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: b.color }} />
                        <div className="flex-1 score-bar">
                          <div className="score-bar-fill" style={{ width: `${b.value}%`, background: b.color }} />
                        </div>
                        <span className="text-xs w-28 text-right" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "Noto Sans, sans-serif" }}>{b.name}</span>
                        <span className="text-xs w-8 text-right" style={{ color: b.color, fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{b.value}%</span>
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
