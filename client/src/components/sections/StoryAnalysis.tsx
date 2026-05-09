// DRAMAFORGE SCOUT — Story Analysis Section

import type { Story } from "@/lib/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface StoryAnalysisProps {
  story: Story;
  onContinue: () => void;
}

export default function StoryAnalysis({ story, onContinue }: StoryAnalysisProps) {
  const pieData = [
    { name: `${story.plaintiff.split(" (")[0]} is Wrong`, value: story.verdictDistribution.guilty, color: "#FF1744" },
    { name: "Both Wrong", value: story.verdictDistribution.bothWrong, color: "#FFD700" },
    { name: `${story.defendant.split(" (")[0]} is Right`, value: story.verdictDistribution.notGuilty, color: "#4A90D9" },
  ];

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "#0A0E1A" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <span className="impact-badge text-sm mb-4 inline-block">Step 3 — Case Analysis</span>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "white", letterSpacing: "0.05em" }}>
            CASE FILE: <span style={{ color: "#FF1744" }}>{story.title.toUpperCase()}</span>
          </h2>
          <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>
            Source: {story.source} · Community: r/{story.community}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Summary */}
            <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>📋 Case Summary</div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Noto Sans, sans-serif" }}>{story.summary}</p>
            </div>

            {/* VS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="manga-panel rounded-lg p-4" style={{ background: "rgba(255,23,68,0.06)" }}>
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "#FF1744", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>⚔️ Plaintiff</div>
                <div className="text-sm font-bold" style={{ color: "white", fontFamily: "Noto Sans, sans-serif" }}>{story.plaintiff}</div>
                <div className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif" }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,23,68,0.6)" }}>Conflict</div>
                  {story.conflict}
                </div>
              </div>
              <div className="manga-panel rounded-lg p-4" style={{ background: "rgba(74,144,217,0.06)" }}>
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "#4A90D9", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>🛡️ Defendant</div>
                <div className="text-sm font-bold" style={{ color: "white", fontFamily: "Noto Sans, sans-serif" }}>{story.defendant}</div>
                <div className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif" }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(74,144,217,0.6)" }}>Position</div>
                  Claims the situation was a misunderstanding or unavoidable circumstance.
                </div>
              </div>
            </div>

            {/* Key Evidence */}
            <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>🔍 Key Evidence</div>
              <div className="space-y-2">
                {story.keyEvidence.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm" style={{ fontFamily: "Noto Sans, sans-serif" }}>
                    <span className="flex-shrink-0 w-5 h-5 rounded text-center text-[10px] font-bold flex items-center justify-center" style={{ background: "#FF1744", color: "white", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.7)" }}>{ev}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Funny comments */}
            <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#2ECC71", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>💬 Top Safe Comments</div>
              <div className="space-y-2">
                {story.topFunnySafeComments.map((c, i) => (
                  <div key={i} className="p-3 rounded text-xs italic" style={{ background: "rgba(46,204,113,0.06)", border: "1px solid rgba(46,204,113,0.15)", color: "rgba(255,255,255,0.65)", fontFamily: "Noto Sans, sans-serif" }}>
                    "{c}"
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[10px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "Noto Sans, sans-serif" }}>
                🚫 {story.filteredCommentCount} comments filtered for safety and demo suitability
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Verdict distribution */}
            <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>📊 Verdict Distribution</div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
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
              <div className="space-y-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs" style={{ fontFamily: "Noto Sans, sans-serif" }}>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="flex-1" style={{ color: "rgba(255,255,255,0.6)" }}>{d.name}</span>
                    <span style={{ color: d.color, fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scores */}
            <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>📈 Case Scores</div>
              <div className="space-y-3">
                {[
                  { label: "Safety", value: story.safetyScore, color: "#2ECC71" },
                  { label: "Humor", value: story.humorScore, color: "#FF6B35" },
                  { label: "Clarity", value: story.conflictClarity, color: "#FFD700" },
                  { label: "Quality", value: story.commentQuality, color: "#4A90D9" },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between text-[10px] mb-1" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                      <span style={{ color: "rgba(255,255,255,0.5)" }}>{m.label}</span>
                      <span style={{ color: m.color }}>{m.value}</span>
                    </div>
                    <div className="score-bar">
                      <div className="score-bar-fill" style={{ width: `${m.value}%`, background: m.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue */}
            <button
              onClick={onContinue}
              className="w-full py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: "1rem",
                letterSpacing: "0.2em",
                background: "#FF1744",
                color: "white",
                clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                boxShadow: "0 0 20px rgba(255,23,68,0.4)",
              }}
            >
              CHOOSE THEME →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
