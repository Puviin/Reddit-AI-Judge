// DRAMAFORGE SCOUT — AI Clip Player Section
// Courtroom animatic trailer with fal.ai video + ElevenLabs voice
// Auto-plays scene by scene, falls back to animated cards

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { clipScenes } from "@/lib/mockData";

interface ClipPlayerProps {
  storyId: string;
  onFinish: () => void;
}

const CHAR_IMAGES: Record<string, string> = {
  Plaintiff: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_plaintiff-cmbVj2wtDZwKYqA4tkwQ7K.webp",
  Defendant: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_defendant-bvyV8J4edbFiRJRXLKtG7c.webp",
  Judge: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_judge-fkcYYmvfKxmx2rg4rZEzY9.webp",
  Witness: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/char_witness-FJyE4XFzTg2HGnHbXpPxj4.webp",
  Narrator: "https://d2xsxph8kpxj0f.cloudfront.net/120778827/HeMC8gyCqYdJz7iYnAFd8U/hero_bg-mUp84k8qRsngJYjHVe4Cir.webp",
};

const ROLE_COLORS: Record<string, string> = {
  Plaintiff: "#FF1744",
  Defendant: "#4A90D9",
  Judge: "#FFD700",
  Witness: "#2ECC71",
  Narrator: "rgba(255,255,255,0.6)",
};

// Build courtroom video prompts
function buildVideoPrompts(scenes: { speakerRole: string }[]) {
  const prompts: Record<string, string> = {
    Plaintiff: "Anime manga style, passionate woman in red blazer pointing dramatically at camera, courtroom background, speed lines, intense expression, red and white color scheme",
    Defendant: "Anime manga style, nervous man with hands raised defensively, courtroom background, blue lighting, sweat drops, manga impact lines",
    Judge: "Anime manga style, imposing judge with white wig raising golden gavel, dramatic light beam, golden scales of justice, black and gold",
    Witness: "Anime manga style, excited eccentric woman with wild grey hair gesturing enthusiastically, courtroom background, green accents",
    Narrator: "Anime manga style, dramatic courtroom establishing shot, golden light rays, dark atmosphere, speed lines, cinematic composition",
  };
  return scenes.map((s) => prompts[s.speakerRole] || prompts.Narrator);
}

type SceneMedia = { videoUrl: string | null; audioUrl: string | null };

export default function ClipPlayer({ storyId, onFinish }: ClipPlayerProps) {
  const scenes = clipScenes[storyId] || clipScenes["story-001"];
  const [currentScene, setCurrentScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [sceneMedia, setSceneMedia] = useState<Record<string, SceneMedia>>({});
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateReel = trpc.drama.generateDramaReel.useMutation({
    onSuccess: (data) => {
      const map: Record<string, SceneMedia> = {};
      data.scenes.forEach((s) => {
        map[s.sceneId] = { videoUrl: s.videoUrl, audioUrl: s.audioUrl };
      });
      setSceneMedia(map);
      setGenerated(true);
      setGenerating(false);
    },
    onError: () => {
      setGenerated(true);
      setGenerating(false);
    },
  });

  const handleGenerate = () => {
    setGenerating(true);
    const prompts = buildVideoPrompts(scenes);
    generateReel.mutate({
      storyId,
      storyTitle: storyId,
      scenes: scenes.map((s: { id: number; narration: string; speakerRole: string }, i: number) => ({
        id: `clip-${s.id}`,
        prompt: prompts[i],
        narration: s.narration,
        speakerRole: s.speakerRole,
      })),
    });
  };

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  };

  const advanceScene = (idx: number) => {
    clearTimers();
    if (idx >= scenes.length) {
      setPlaying(false);
      setFinished(true);
      return;
    }
    setCurrentScene(idx);
    setSceneProgress(0);
  };

  useEffect(() => {
    if (!playing) { clearTimers(); return; }

    const scene = scenes[currentScene];
    const media = sceneMedia[`clip-${scene.id}`];

    // If audio available, let it drive timing
    if (media?.audioUrl && audioRef.current) {
      audioRef.current.src = media.audioUrl;
      audioRef.current.play().catch(() => {});
      const onEnded = () => advanceScene(currentScene + 1);
      audioRef.current.addEventListener("ended", onEnded, { once: true });
      return () => audioRef.current?.removeEventListener("ended", onEnded);
    }

    // Fallback: duration-based
    const duration = scene.duration * 1000;
    const tickMs = 50;
    let elapsed = 0;
    progressRef.current = setInterval(() => {
      elapsed += tickMs;
      setSceneProgress(Math.min((elapsed / duration) * 100, 100));
    }, tickMs);
    timerRef.current = setTimeout(() => advanceScene(currentScene + 1), duration);

    return clearTimers;
  }, [playing, currentScene, sceneMedia]);

  const scene = scenes[currentScene];
  const media = sceneMedia[`clip-${scene.id}`];
  const charImg = CHAR_IMAGES[scene.speakerRole] || CHAR_IMAGES.Narrator;
  const roleColor = ROLE_COLORS[scene.speakerRole] || "white";

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "#0A0E1A" }}>
      <audio ref={audioRef} style={{ display: "none" }} />
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="impact-badge text-sm mb-4 inline-block">Step 7 — Courtroom Clip</span>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "white", letterSpacing: "0.05em" }}>
            THE <span style={{ color: "#FF1744" }}>CLIP</span>
          </h2>
        </div>

        {/* Main player */}
        <div className="manga-panel rounded-lg overflow-hidden mb-6" style={{ background: "#0a0a14", minHeight: "420px" }}>
          <div
            className="relative flex flex-col md:flex-row items-stretch"
            style={{ minHeight: "360px", background: scene.bgColor, overflow: "hidden" }}
            key={currentScene}
          >
            {/* Speed lines */}
            <div className="absolute inset-0 speed-lines opacity-30 pointer-events-none" />

            {/* Background video if available */}
            {media?.videoUrl && (
              <video
                ref={videoRef}
                key={media.videoUrl}
                src={media.videoUrl}
                autoPlay loop muted playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
            )}

            {/* Character image */}
            <div className="relative z-10 flex-shrink-0 flex items-end justify-center p-6 md:w-64">
              <img
                src={charImg}
                alt={scene.speakerRole}
                className="h-48 md:h-64 object-contain drop-shadow-2xl animate-slide-left"
                style={{ filter: `drop-shadow(0 0 20px ${roleColor}60)` }}
              />
            </div>

            {/* Scene content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center p-6 md:p-8">
              <div className="mb-4 animate-slide-right" style={{ animationDelay: "0.1s" }}>
                <span className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                  Scene {currentScene + 1} of {scenes.length}
                </span>
                <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: scene.accentColor, textShadow: `0 0 20px ${scene.accentColor}60` }}>
                  {scene.title}
                </div>
              </div>

              <div className="mb-4 animate-slide-right" style={{ animationDelay: "0.2s" }}>
                <span className="text-xs px-3 py-1 uppercase tracking-wider" style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  background: `${roleColor}20`,
                  border: `1px solid ${roleColor}50`,
                  color: roleColor,
                  clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)",
                }}>
                  {scene.speaker} · {scene.speakerRole}
                </span>
              </div>

              <div className="animate-slide-right" style={{ animationDelay: "0.3s" }}>
                <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "1.1rem", lineHeight: 1.7, color: "rgba(255,255,255,0.9)", fontStyle: scene.speakerRole !== "Narrator" ? "italic" : "normal" }}>
                  {scene.speakerRole !== "Narrator" ? `"${scene.narration}"` : scene.narration}
                </p>
              </div>

              <div className="mt-4 flex gap-2 animate-fade-in" style={{ animationDelay: "0.5s" }}>
                {media?.videoUrl ? (
                  <span className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(255,107,53,0.15)", border: "1px solid rgba(255,107,53,0.3)", color: "rgba(255,107,53,0.8)", fontFamily: "Noto Sans, sans-serif" }}>
                    🎬 fal.ai Video
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)", color: "rgba(255,215,0,0.6)", fontFamily: "Noto Sans, sans-serif" }}>
                    🔊 ElevenLabs Voice Ready · {scene.duration}s
                  </span>
                )}
                {media?.audioUrl && (
                  <span className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(46,204,113,0.15)", border: "1px solid rgba(46,204,113,0.3)", color: "rgba(46,204,113,0.8)", fontFamily: "Noto Sans, sans-serif" }}>
                    🔊 ElevenLabs Voice
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {playing && !media?.audioUrl && (
              <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full transition-none" style={{ width: `${sceneProgress}%`, background: `linear-gradient(90deg, ${roleColor}, ${scene.accentColor})` }} />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 p-4" style={{ background: "rgba(0,0,0,0.4)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <button onClick={() => { clearTimers(); setPlaying(false); setFinished(false); setCurrentScene(0); setSceneProgress(0); }} className="p-2 rounded transition-colors hover:bg-white/10" style={{ color: "rgba(255,255,255,0.5)" }}>⟲</button>
            <button
              onClick={() => {
                if (finished) { setFinished(false); setCurrentScene(0); setSceneProgress(0); }
                setPlaying((p) => !p);
              }}
              className="px-6 py-2 font-bold uppercase tracking-wider transition-all hover:scale-105"
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                background: playing ? "rgba(255,215,0,0.2)" : "#FF1744",
                color: playing ? "#FFD700" : "white",
                border: playing ? "1px solid rgba(255,215,0,0.4)" : "none",
                clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)",
              }}
            >
              {playing ? "⏸ PAUSE" : finished ? "↺ REPLAY" : "▶ PLAY"}
            </button>

            <div className="flex items-center gap-2 ml-2">
              {scenes.map((_, i) => (
                <button key={i} onClick={() => { clearTimers(); setPlaying(false); advanceScene(i); }} className="w-2 h-2 rounded-full transition-all" style={{ background: i === currentScene ? "#FF1744" : i < currentScene ? "#FFD700" : "rgba(255,255,255,0.2)", transform: i === currentScene ? "scale(1.4)" : "scale(1)" }} />
              ))}
            </div>

            {!generated && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="ml-auto px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 disabled:opacity-50"
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  background: "rgba(255,107,53,0.2)",
                  color: "#FF6B35",
                  border: "1px solid rgba(255,107,53,0.4)",
                  clipPath: "polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)",
                }}
              >
                {generating ? "⚡ Generating..." : "🎬 Generate AI Video"}
              </button>
            )}

            <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
              {currentScene + 1} / {scenes.length}
            </span>
          </div>
        </div>

        {/* Scene thumbnails */}
        <div className="grid grid-cols-6 gap-2 mb-8">
          {scenes.map((s, i) => (
            <button key={s.id} onClick={() => { clearTimers(); setPlaying(false); advanceScene(i); }} className="rounded p-2 text-center transition-all hover:scale-105" style={{ background: i === currentScene ? "rgba(255,23,68,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${i === currentScene ? "rgba(255,23,68,0.5)" : "rgba(255,255,255,0.08)"}` }}>
              <div className="text-[10px] uppercase" style={{ color: i === currentScene ? "#FF1744" : "rgba(255,255,255,0.4)", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                {s.title}
              </div>
              {sceneMedia[`clip-${s.id}`]?.videoUrl && <div className="text-[8px] mt-1" style={{ color: "rgba(255,107,53,0.6)" }}>🎬</div>}
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={onFinish}
            className="px-12 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: "1.1rem",
              letterSpacing: "0.2em",
              background: finished ? "#FF1744" : "rgba(255,23,68,0.3)",
              color: "white",
              clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
              boxShadow: finished ? "0 0 30px rgba(255,23,68,0.5)" : "none",
              border: finished ? "none" : "1px solid rgba(255,23,68,0.4)",
            }}
          >
            ⚖️ ENTER THE COURTROOM →
          </button>
        </div>
      </div>
    </div>
  );
}
