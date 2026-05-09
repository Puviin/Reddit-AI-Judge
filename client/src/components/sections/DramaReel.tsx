// DRAMAFORGE SCOUT — Drama Reel Section
// Generates manga-style video scenes with ElevenLabs voice narration
// Uses fal.ai for video + ElevenLabs for audio, falls back to animated cards

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import type { Story } from "@/lib/mockData";

interface DramaReelProps {
  story: Story;
  theme: string;
  onContinue: () => void;
}

interface ReelScene {
  id: string;
  title: string;
  narration: string;
  speakerRole: string;
  speaker: string;
  prompt: string;
  bgColor: string;
  accentColor: string;
}

// Build manga-style video prompts per scene
function buildScenes(story: Story): ReelScene[] {
  return [
    {
      id: "intro",
      title: "THE INCIDENT",
      narration: `The case of ${story.title}. A story that divided the internet.`,
      speakerRole: "Narrator",
      speaker: "Narrator",
      prompt: `Anime manga style, dramatic establishing shot, dark courtroom with golden light rays, speed lines, bold text overlay "THE INCIDENT", cinematic composition, high contrast black and gold`,
      bgColor: "#0A0E1A",
      accentColor: "#FFD700",
    },
    {
      id: "setup",
      title: "WHAT HAPPENED",
      narration: story.summary,
      speakerRole: "Narrator",
      speaker: "Narrator",
      prompt: `Anime manga style, split panel comic layout showing conflict scene, ${story.conflict}, dramatic lighting, speed lines, emotional expressions, bold black outlines, cinematic`,
      bgColor: "#0d0a1a",
      accentColor: "#FF6B35",
    },
    {
      id: "plaintiff",
      title: "THE COMPLAINT",
      narration: `${story.plaintiff.split(" (")[0]} says: ${story.keyEvidence[0]}`,
      speakerRole: "Plaintiff",
      speaker: story.plaintiff.split(" (")[0],
      prompt: `Anime manga style, passionate young woman in red blazer pointing dramatically, evidence folder in hand, speed lines behind her, red and gold color scheme, bold manga panel borders, intense expression`,
      bgColor: "#1a0a0a",
      accentColor: "#FF1744",
    },
    {
      id: "defendant",
      title: "THE DEFENSE",
      narration: `${story.defendant.split(" (")[0]} responds: ${story.keyEvidence[story.keyEvidence.length - 1]}`,
      speakerRole: "Defendant",
      speaker: story.defendant.split(" (")[0],
      prompt: `Anime manga style, nervous young man with hands raised defensively, sweat drops, blue lighting, manga panel with impact lines, desperate expression, dark navy background`,
      bgColor: "#0a0a1a",
      accentColor: "#4A90D9",
    },
    {
      id: "comments",
      title: "THE INTERNET REACTS",
      narration: story.topFunnySafeComments[0],
      speakerRole: "Witness",
      speaker: "The Internet",
      prompt: `Anime manga style, crowd of reaction faces, speech bubbles everywhere, chaotic energy, green and gold accents, multiple manga panels showing shocked and laughing expressions, internet meme energy`,
      bgColor: "#0a1a0a",
      accentColor: "#2ECC71",
    },
    {
      id: "verdict-tease",
      title: "COURT IS CALLED",
      narration: `The case has been accepted. ${story.title} is now before the court. Who is wrong?`,
      speakerRole: "Judge",
      speaker: "Judge Harrow",
      prompt: `Anime manga style, imposing judge with white wig and golden gavel raised high, dramatic light beam from above, golden scales of justice, bold "COURT IN SESSION" text, epic composition, black and gold`,
      bgColor: "#1a0a00",
      accentColor: "#FFD700",
    },
  ];
}

type SceneMedia = {
  videoUrl: string | null;
  audioUrl: string | null;
  status: "pending" | "loading" | "ready" | "error";
};

export default function DramaReel({ story, theme, onContinue }: DramaReelProps) {
  const scenes = buildScenes(story);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [sceneMedia, setSceneMedia] = useState<Record<string, SceneMedia>>({});
  const [currentScene, setCurrentScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const generateReel = trpc.drama.generateDramaReel.useMutation({
    onSuccess: (data) => {
      const mediaMap: Record<string, SceneMedia> = {};
      data.scenes.forEach((s) => {
        mediaMap[s.sceneId] = {
          videoUrl: s.videoUrl,
          audioUrl: s.audioUrl,
          status: s.videoUrl || s.audioUrl ? "ready" : "error",
        };
      });
      setSceneMedia(mediaMap);
      setGenerated(true);
      setGenerating(false);
    },
    onError: (err) => {
      console.error("Drama reel generation failed:", err);
      setGenerating(false);
      // Still mark as "generated" so we can show animated fallback
      setGenerated(true);
    },
  });

  const handleGenerate = () => {
    setGenerating(true);
    generateReel.mutate({
      storyId: story.id,
      storyTitle: story.title,
      scenes: scenes.map((s) => ({
        id: s.id,
        prompt: s.prompt,
        narration: s.narration,
        speakerRole: s.speakerRole,
      })),
    });
  };

  // Auto-advance scenes when playing
  useEffect(() => {
    if (!playing) return;
    const scene = scenes[currentScene];
    const media = sceneMedia[scene.id];

    // If we have audio, let it drive the timing
    if (media?.audioUrl && audioRef.current) {
      audioRef.current.src = media.audioUrl;
      audioRef.current.play().catch(() => {});
      const handleEnded = () => {
        if (currentScene < scenes.length - 1) {
          setCurrentScene((c) => c + 1);
        } else {
          setPlaying(false);
        }
      };
      audioRef.current.addEventListener("ended", handleEnded, { once: true });
      return () => audioRef.current?.removeEventListener("ended", handleEnded);
    } else {
      // Fallback: 5 second per scene
      const t = setTimeout(() => {
        if (currentScene < scenes.length - 1) {
          setCurrentScene((c) => c + 1);
        } else {
          setPlaying(false);
        }
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [playing, currentScene, sceneMedia]);

  const scene = scenes[currentScene];
  const media = sceneMedia[scene.id];
  const roleColors: Record<string, string> = {
    Narrator: "#FFD700",
    Plaintiff: "#FF1744",
    Defendant: "#4A90D9",
    Witness: "#2ECC71",
    Judge: "#FFD700",
  };
  const roleColor = roleColors[scene.speakerRole] || "#FFD700";

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "#0A0E1A" }}>
      <audio ref={audioRef} style={{ display: "none" }} />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="impact-badge text-sm mb-4 inline-block">Step 6 — Drama Reel</span>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "white", letterSpacing: "0.05em" }}>
            THE <span style={{ color: "#FF1744" }}>DRAMA</span> REEL
          </h2>
          <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Noto Sans, sans-serif" }}>
            AI-generated manga motion comic with voice narration. Each scene is a unique video clip.
          </p>
        </div>

        {/* Main player */}
        <div className="manga-panel rounded-lg overflow-hidden mb-6" style={{ background: "#050810", minHeight: "480px", position: "relative" }}>

          {/* Video / animated card */}
          <div
            className="relative"
            style={{ minHeight: "400px", background: scene.bgColor, overflow: "hidden" }}
            key={`${scene.id}-${currentScene}`}
          >
            {/* Speed lines bg */}
            <div className="absolute inset-0 speed-lines opacity-20 pointer-events-none" />

            {/* Video if available */}
            {media?.videoUrl ? (
              <video
                ref={videoRef}
                key={media.videoUrl}
                src={media.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-70"
              />
            ) : null}

            {/* Overlay content */}
            <div className="relative z-10 flex flex-col justify-end h-full p-8" style={{ minHeight: "400px" }}>
              {/* Scene title */}
              <div className="mb-4 animate-slide-right">
                <div
                  style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    fontSize: "clamp(2rem, 5vw, 3.5rem)",
                    letterSpacing: "0.1em",
                    color: scene.accentColor,
                    textShadow: `0 0 30px ${scene.accentColor}80`,
                    lineHeight: 1,
                  }}
                >
                  {scene.title}
                </div>
              </div>

              {/* Speaker tag */}
              <div className="mb-3 animate-slide-right" style={{ animationDelay: "0.1s" }}>
                <span
                  className="text-xs px-3 py-1 uppercase tracking-wider"
                  style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    background: `${roleColor}25`,
                    border: `1px solid ${roleColor}60`,
                    color: roleColor,
                    clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)",
                  }}
                >
                  {scene.speaker} · {scene.speakerRole}
                </span>
              </div>

              {/* Narration */}
              <div
                className="animate-slide-right p-4 rounded"
                style={{
                  animationDelay: "0.2s",
                  background: "rgba(0,0,0,0.7)",
                  backdropFilter: "blur(8px)",
                  border: `1px solid ${roleColor}30`,
                  maxWidth: "600px",
                }}
              >
                <p style={{
                  fontFamily: "Noto Sans, sans-serif",
                  fontSize: "1rem",
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.92)",
                  fontStyle: scene.speakerRole !== "Narrator" ? "italic" : "normal",
                }}>
                  {scene.speakerRole !== "Narrator" ? `"${scene.narration}"` : scene.narration}
                </p>
              </div>

              {/* API badges */}
              <div className="mt-4 flex gap-2 flex-wrap animate-fade-in" style={{ animationDelay: "0.4s" }}>
                {media?.videoUrl && (
                  <span className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(255,107,53,0.15)", border: "1px solid rgba(255,107,53,0.3)", color: "rgba(255,107,53,0.8)", fontFamily: "Noto Sans, sans-serif" }}>
                    🎬 fal.ai Video
                  </span>
                )}
                {media?.audioUrl && (
                  <span className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(46,204,113,0.15)", border: "1px solid rgba(46,204,113,0.3)", color: "rgba(46,204,113,0.8)", fontFamily: "Noto Sans, sans-serif" }}>
                    🔊 ElevenLabs Voice
                  </span>
                )}
                {generating && (
                  <span className="text-[10px] px-2 py-1 rounded animate-pulse" style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", color: "rgba(255,215,0,0.7)", fontFamily: "Noto Sans, sans-serif" }}>
                    ⚡ Generating...
                  </span>
                )}
              </div>
            </div>

            {/* Scene progress bar when playing */}
            {playing && !media?.audioUrl && (
              <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div
                  className="h-full"
                  style={{
                    width: "100%",
                    background: `linear-gradient(90deg, ${roleColor}, ${scene.accentColor})`,
                    animation: "sceneProgress 5s linear forwards",
                  }}
                />
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="flex items-center gap-4 p-4" style={{ background: "rgba(0,0,0,0.5)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Restart */}
            <button
              onClick={() => { setPlaying(false); setCurrentScene(0); }}
              className="p-2 rounded transition-colors hover:bg-white/10 text-sm"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              ⟲
            </button>

            {/* Play/Pause */}
            <button
              onClick={() => setPlaying((p) => !p)}
              className="px-6 py-2 font-bold uppercase tracking-wider transition-all hover:scale-105"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                background: playing ? "rgba(255,215,0,0.2)" : "#FF1744",
                color: playing ? "#FFD700" : "white",
                border: playing ? "1px solid rgba(255,215,0,0.4)" : "none",
                clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)",
              }}
            >
              {playing ? "⏸ PAUSE" : "▶ PLAY REEL"}
            </button>

            {/* Scene dots */}
            <div className="flex items-center gap-2">
              {scenes.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => { setPlaying(false); setCurrentScene(i); }}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    background: i === currentScene ? "#FF1744" : i < currentScene ? "#FFD700" : "rgba(255,255,255,0.2)",
                    transform: i === currentScene ? "scale(1.5)" : "scale(1)",
                  }}
                />
              ))}
            </div>

            <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
              {currentScene + 1} / {scenes.length}
            </span>
          </div>
        </div>

        {/* Generate button or continue */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {!generated ? (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-10 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: "1rem",
                letterSpacing: "0.2em",
                background: generating ? "rgba(255,107,53,0.3)" : "#FF6B35",
                color: "white",
                clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                boxShadow: generating ? "none" : "0 0 20px rgba(255,107,53,0.4)",
              }}
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin inline-block">⚡</span>
                  GENERATING SCENES... ({Math.round(generateReel.isPending ? 50 : 100)}%)
                </span>
              ) : (
                "🎬 GENERATE DRAMA REEL (fal.ai + ElevenLabs)"
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(46,204,113,0.8)", fontFamily: "Noto Sans, sans-serif" }}>
              ✅ Reel generated — {Object.values(sceneMedia).filter(m => m.videoUrl).length}/{scenes.length} video scenes
            </div>
          )}

          <button
            onClick={onContinue}
            className="px-10 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
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
            ▶ PLAY COURTROOM CLIP →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sceneProgress {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>
    </div>
  );
}
