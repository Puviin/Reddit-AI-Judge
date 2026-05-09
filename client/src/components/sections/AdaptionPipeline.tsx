// DRAMAFORGE SCOUT — Adaption AI Pipeline Section
// Shows raw messy data → cleaned structured data with animated pipeline

import { useState } from "react";
import { rawMessyData, stories } from "@/lib/mockData";

interface AdaptionPipelineProps {
  onContinue: () => void;
}

const story = stories[0]; // Use first story for demo

export default function AdaptionPipeline({ onContinue }: AdaptionPipelineProps) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  const runPipeline = () => {
    setRunning(true);
    setDone(false);
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 18 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => { setDone(true); setRunning(false); }, 300);
      }
      setProgress(Math.min(p, 100));
    }, 120);
  };

  const ar = story.adaptionResult;

  const metrics = [
    { label: "Safety Score", value: ar.safetyScore, color: "#2ECC71", icon: "🛡️" },
    { label: "Conflict Clarity", value: ar.conflictClarity, color: "#FFD700", icon: "⚔️" },
    { label: "Humor Potential", value: ar.humorPotential, color: "#FF6B35", icon: "😂" },
    { label: "Comment Quality", value: ar.commentQuality, color: "#4A90D9", icon: "💬" },
    { label: "Verdict Disagreement", value: ar.verdictDisagreement, color: "#FF1744", icon: "⚖️" },
  ];

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "#0A0E1A" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="gold-badge text-sm mb-4 inline-block">Step 1 — Data Pipeline</span>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "white", letterSpacing: "0.05em" }}>
            ADAPTION AI <span style={{ color: "#FF1744" }}>PIPELINE</span>
          </h2>
          <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif" }}>
            Raw internet chaos enters. Structured, safe, demo-ready drama exits. Watch the transformation.
          </p>
        </div>

        {/* Pipeline panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* LEFT: Raw data */}
          <div className="manga-panel rounded-lg p-5" style={{ background: "rgba(255,23,68,0.05)" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="impact-badge text-xs">RAW INPUT</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>Unfiltered · Unstructured · Uncertain</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {rawMessyData.map((comment) => (
                <div key={comment.id} className={`p-3 rounded text-xs ${comment.unsafe ? "opacity-40" : ""}`}
                  style={{ background: comment.unsafe ? "rgba(255,23,68,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${comment.unsafe ? "rgba(255,23,68,0.3)" : "rgba(255,255,255,0.08)"}`, fontFamily: "Noto Sans, sans-serif" }}>
                  <div className="flex items-start justify-between gap-2">
                    <span style={{ color: comment.unsafe ? "#FF1744" : "rgba(255,255,255,0.7)" }}>
                      {comment.unsafe ? "🚫 " : ""}{comment.text}
                    </span>
                    <span className="flex-shrink-0 text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {comment.unsafe ? "FILTERED" : `👍 ${comment.likes}`}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{comment.platform}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs" style={{ color: "rgba(255,23,68,0.7)", fontFamily: "Noto Sans, sans-serif" }}>
              ⚠️ {rawMessyData.filter(c => c.unsafe).length} comments flagged for safety review
            </div>
          </div>

          {/* RIGHT: Cleaned data */}
          <div className="manga-panel rounded-lg p-5 relative" style={{ background: done ? "rgba(255,215,0,0.05)" : "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="gold-badge text-xs">ADAPTION OUTPUT</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>Cleaned · Structured · Verified</span>
            </div>

            {!done && !running && (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="text-4xl">⚡</div>
                <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>
                  Click "Run Pipeline" to process the raw data
                </p>
              </div>
            )}

            {running && (
              <div className="flex flex-col items-center justify-center h-64 gap-6">
                <div className="text-3xl animate-spin">⚙️</div>
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-xs mb-2" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: "#FFD700" }}>
                    <span>PROCESSING...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="score-bar">
                    <div className="score-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="text-xs text-center" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>
                  Running safety pass · Extracting entities · Scoring metrics...
                </div>
              </div>
            )}

            {done && (
              <div className="space-y-3 animate-fade-in">
                {/* Safety pass */}
                <div className="flex items-center gap-3 p-3 rounded" style={{ background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.3)" }}>
                  <span className="text-lg">✅</span>
                  <div>
                    <div className="text-xs font-bold" style={{ color: "#2ECC71", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}>SAFETY PASS</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif" }}>Content cleared for demo use</div>
                  </div>
                  <span className="ml-auto gold-badge text-xs">RECOMMENDED</span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 gap-2">
                  {metrics.map((m) => (
                    <div key={m.label} className="flex items-center gap-3">
                      <span className="text-sm w-5">{m.icon}</span>
                      <span className="text-xs w-32 flex-shrink-0" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "Noto Sans, sans-serif" }}>{m.label}</span>
                      <div className="flex-1 score-bar">
                        <div className="score-bar-fill" style={{ width: `${m.value}%`, background: `linear-gradient(90deg, ${m.color}88, ${m.color})` }} />
                      </div>
                      <span className="text-xs w-8 text-right" style={{ color: m.color, fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{m.value}</span>
                    </div>
                  ))}
                </div>

                {/* Key entities */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-2 rounded text-xs" style={{ background: "rgba(255,23,68,0.1)", border: "1px solid rgba(255,23,68,0.2)" }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#FF1744", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>Plaintiff</div>
                    <div style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Noto Sans, sans-serif" }}>{ar.plaintiff}</div>
                  </div>
                  <div className="p-2 rounded text-xs" style={{ background: "rgba(74,144,217,0.1)", border: "1px solid rgba(74,144,217,0.2)" }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#4A90D9", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>Defendant</div>
                    <div style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Noto Sans, sans-serif" }}>{ar.defendant}</div>
                  </div>
                </div>

                {/* Filtered count */}
                <div className="text-xs p-2 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>
                  🚫 {ar.filteredUnsafeCount} comments filtered for safety and demo suitability
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline run button */}
        <div className="flex flex-col items-center gap-4">
          {!done && (
            <button
              onClick={runPipeline}
              disabled={running}
              className="px-10 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: "1.1rem",
                letterSpacing: "0.2em",
                background: running ? "rgba(255,23,68,0.5)" : "#FF1744",
                color: "white",
                clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                boxShadow: "0 0 20px rgba(255,23,68,0.4)",
              }}
            >
              {running ? "⚙️ RUNNING PIPELINE..." : "⚡ RUN ADAPTION PIPELINE"}
            </button>
          )}

          {done && (
            <div className="flex flex-col items-center gap-4 animate-slide-up">
              <div className="text-center">
                <div className="text-2xl mb-2">🎯</div>
                <p className="text-sm" style={{ color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}>
                  PIPELINE COMPLETE — CASE READY FOR TRIAL
                </p>
              </div>
              <button
                onClick={onContinue}
                className="px-10 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: "1.1rem",
                  letterSpacing: "0.2em",
                  background: "#FFD700",
                  color: "#0A0E1A",
                  clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                  boxShadow: "0 0 20px rgba(255,215,0,0.4)",
                }}
              >
                SELECT A CASE →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
