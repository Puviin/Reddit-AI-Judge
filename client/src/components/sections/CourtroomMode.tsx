// DRAMAFORGE SCOUT — Courtroom Mode (Gemini AI powered)

import { useState, useEffect } from "react";
import { courtroomDialogue, characterBible, stories } from "@/lib/mockData";
import { trpc } from "@/lib/trpc";
import { roleColors } from "@/lib/roles";

interface CourtroomModeProps {
  storyId: string;
  onContinue: () => void;
  aiAnalysis?: {
    keyEvidence: string[];
    verdictHint?: string;
  } | null;
}

const ROLE_COLORS = roleColors({ Narrator: "#FF6B35" });

const ROLE_ICONS: Record<string, string> = {
  Plaintiff: "⚔️",
  Defendant: "🛡️",
  Judge: "⚖️",
  Witness: "📋",
  Narrator: "📢",
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
  statement: "STATEMENT",
  objection: "OBJECTION!",
  evidence: "EVIDENCE PRESENTED",
  breakdown: "EMOTIONAL BREAKDOWN",
  revelation: "DRAMATIC REVELATION",
  verdict: "VERDICT",
};

interface GeminiExchange {
  id: number;
  speaker: string;
  type: string;
  text: string;
  reaction?: string;
}

export default function CourtroomMode({ storyId, onContinue, aiAnalysis }: CourtroomModeProps) {
  const mockDialogue = courtroomDialogue[storyId] || courtroomDialogue["story-001"];
  const chars = characterBible[storyId] || characterBible["story-001"];
  const story = stories.find(s => s.id === storyId) || stories[0];

  const [revealed, setRevealed] = useState(1);
  const [aiDialogue, setAiDialogue] = useState<GeminiExchange[] | null>(null);

  const dialogueMutation = trpc.gemini.generateCourtroomDialogue.useMutation({
    onSuccess: (data) => {
      setAiDialogue(data.exchanges);
      setRevealed(1);
    },
  });

  useEffect(() => {
    // Auto-generate AI courtroom dialogue
    dialogueMutation.mutate({
      title: story.title,
      summary: story.summary,
      plaintiff: story.plaintiff,
      defendant: story.defendant,
      keyEvidence: aiAnalysis?.keyEvidence ?? story.keyEvidence,
      verdictHint: aiAnalysis?.verdictHint,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // Build display dialogue — AI if available, else mock
  const displayDialogue: Array<{
    speaker: string;
    role: string;
    text: string;
    type: string;
    reaction?: string;
  }> = aiDialogue
    ? aiDialogue.map(ex => ({
        speaker: ex.speaker,
        role: ex.speaker,
        text: ex.text,
        type: ex.type,
        reaction: ex.reaction,
      }))
    : mockDialogue.map(d => ({ ...d, type: d.type, reaction: undefined }));

  const handleRevealNext = () => {
    if (revealed < displayDialogue.length) {
      setRevealed((r) => r + 1);
    }
  };

  const allRevealed = revealed >= displayDialogue.length;

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "#0A0E1A" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <span className="impact-badge text-sm mb-4 inline-block">Step 7 — Courtroom Trial</span>
          <div className="flex items-center gap-4 flex-wrap">
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "white", letterSpacing: "0.05em" }}>
              THE TRIAL <span style={{ color: "#FFD700" }}>BEGINS</span>
            </h2>
            {dialogueMutation.isPending && (
              <span className="text-xs px-2 py-1 rounded animate-pulse" style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}>
                ⚡ GEMINI WRITING DIALOGUE...
              </span>
            )}
            {aiDialogue && (
              <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(46,204,113,0.15)", color: "#2ECC71", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}>
                ✓ AI COURTROOM READY
              </span>
            )}
          </div>
          <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>
            Click to reveal each exchange — {displayDialogue.length} total exchanges
          </p>
        </div>

        {/* Characters row */}
        <div className="flex justify-center gap-6 mb-8 flex-wrap">
          {chars.map((char) => (
            <div key={char.role} className="text-center">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 mx-auto mb-1" style={{ borderColor: ROLE_COLORS[char.role] || "#FFD700" }}>
                <img src={CHAR_IMAGES[char.role] || CHAR_IMAGES.Judge} alt={char.role} className="w-full h-full object-cover" />
              </div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: ROLE_COLORS[char.role] || "#FFD700", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{char.role}</div>
              <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif" }}>{char.name}</div>
            </div>
          ))}
        </div>

        {/* Dialogue exchanges */}
        <div className="space-y-4 mb-8">
          {displayDialogue.slice(0, revealed).map((line, i) => {
            const color = ROLE_COLORS[line.role] || ROLE_COLORS[line.speaker] || "#FFD700";
            const icon = ROLE_ICONS[line.role] || ROLE_ICONS[line.speaker] || "💬";
            const typeLabel = TYPE_LABELS[line.type] || line.type?.toUpperCase() || "STATEMENT";
            const isObjType = line.type === "objection" || line.type === "breakdown" || line.type === "revelation";

            return (
              <div
                key={i}
                className="manga-panel rounded-lg p-4 animate-fade-in"
                style={{
                  background: `rgba(${color === "#FF1744" ? "255,23,68" : color === "#4A90D9" ? "74,144,217" : color === "#FFD700" ? "255,215,0" : "46,204,113"}, 0.05)`,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold uppercase" style={{ color, fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}>
                        {line.speaker}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                        background: isObjType ? `${color}33` : "rgba(255,255,255,0.05)",
                        color: isObjType ? color : "rgba(255,255,255,0.4)",
                        fontFamily: "'Bebas Neue', Impact, sans-serif",
                        letterSpacing: "0.05em",
                        border: isObjType ? `1px solid ${color}44` : "none",
                      }}>
                        {typeLabel}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "Noto Sans, sans-serif" }}>
                      {line.text}
                    </p>
                    {line.reaction && (
                      <p className="mt-2 text-xs italic" style={{ color: "#FFD700", fontFamily: "Noto Sans, sans-serif" }}>
                        {line.reaction}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          {!allRevealed ? (
            <button
              onClick={handleRevealNext}
              disabled={dialogueMutation.isPending}
              className="px-8 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105 disabled:opacity-50"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: "1rem",
                letterSpacing: "0.2em",
                background: "#FFD700",
                color: "#0A0E1A",
                clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
              }}
            >
              {dialogueMutation.isPending ? "GENERATING..." : `NEXT EXCHANGE (${revealed}/${displayDialogue.length}) →`}
            </button>
          ) : (
            <button
              onClick={onContinue}
              className="px-8 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
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
              DELIVER VERDICT →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
