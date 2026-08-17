// DRAMAFORGE SCOUT — Courtroom Clip Player
// Full-screen video player with load-gating
// Video is FRONT AND CENTER — no character images blocking it

import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { clipScenes } from "@/lib/mockData";

interface ClipPlayerProps {
  storyId: string;
  onFinish: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  Plaintiff: "#FF1744",
  Defendant: "#4A90D9",
  Judge: "#FFD700",
  Witness: "#2ECC71",
  Narrator: "rgba(255,255,255,0.7)",
};

// Manga-style video prompts per role
const ROLE_PROMPTS: Record<string, string> = {
  Plaintiff: "Anime manga style, passionate young woman in red blazer pointing dramatically at camera, courtroom background, speed lines, intense righteous expression, red and white color scheme, close-up shot",
  Defendant: "Anime manga style, nervous young man with hands raised defensively, blue dramatic lighting, sweat drops, manga impact lines, desperate wide-eyed expression",
  Judge: "Anime manga style, imposing judge with white wig raising golden gavel, dramatic light beam from above, golden scales of justice, black and gold composition, epic wide shot",
  Witness: "Anime manga style, excited eccentric woman with wild grey hair gesturing enthusiastically, courtroom background, green accents, speech bubbles",
  Narrator: "Anime manga style, dramatic courtroom establishing shot, golden light rays, dark atmosphere, speed lines, cinematic wide angle composition",
};

type SceneMedia = {
  videoUrl: string | null;
  audioUrl: string | null;
  mediaType?: "video" | "image";
  videoReady: boolean;
  audioReady: boolean;
};

type LoadState = "idle" | "generating" | "loading" | "ready";

export default function ClipPlayer({ storyId, onFinish }: ClipPlayerProps) {
  const scenes = clipScenes[storyId] || clipScenes["story-001"];
  const [currentScene, setCurrentScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sceneMedia, setSceneMedia] = useState<Record<string, SceneMedia>>({});
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadProgress, setLoadProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [genPercent, setGenPercent] = useState(0);

  const startJob = trpc.drama.startReelJob.useMutation({
    onSuccess: (data) => {
      setJobId(data.jobId);
    },
    onError: () => {
      setLoadState("ready");
    },
  });

  const jobProgress = trpc.drama.getJobProgress.useQuery(
    { jobId: jobId! },
    {
      enabled: !!jobId && loadState === "generating",
      refetchInterval: 1500,
    }
  );

  useEffect(() => {
    const data = jobProgress.data;
    if (!data) return;
    setGenPercent(data.percent);

    data.scenes.forEach(s => {
      if (s.status === "done" && (s.videoUrl || s.audioUrl)) {
        setSceneMedia(prev => ({
          ...prev,
          [s.id]: {
            videoUrl: s.videoUrl,
            audioUrl: s.audioUrl,
            mediaType: s.mediaType,
            videoReady: !s.videoUrl,
            audioReady: !s.audioUrl,
          },
        }));
      }
    });

    if (data.status === "done") {
      setLoadState("loading");
    }
  }, [jobProgress.data]);

  const markVideoReady = useCallback((id: string) => {
    setSceneMedia((prev) => ({ ...prev, [id]: { ...prev[id], videoReady: true } }));
  }, []);

  const markAudioReady = useCallback((id: string) => {
    setSceneMedia((prev) => ({ ...prev, [id]: { ...prev[id], audioReady: true } }));
  }, []);

  // Track overall load progress
  useEffect(() => {
    if (loadState !== "loading") return;
    const total = scenes.length * 2;
    const ready = Object.values(sceneMedia).reduce(
      (acc, m) => acc + (m.videoReady ? 1 : 0) + (m.audioReady ? 1 : 0), 0
    );
    const pct = Math.round((ready / total) * 100);
    setLoadProgress(pct);
    if (pct >= 100) setLoadState("ready");
  }, [sceneMedia, loadState, scenes.length]);

  // Preload all assets
  useEffect(() => {
    if (loadState !== "loading") return;
    scenes.forEach((scene) => {
      const key = `clip-${scene.id}`;
      const media = sceneMedia[key];
      if (!media) return;
      if (media.videoUrl && !media.videoReady) {
        const vid = document.createElement("video");
        vid.preload = "auto";
        vid.src = media.videoUrl;
        vid.addEventListener("canplaythrough", () => markVideoReady(key), { once: true });
        vid.addEventListener("error", () => markVideoReady(key), { once: true });
        vid.load();
      }
      if (media.audioUrl && !media.audioReady) {
        const aud = document.createElement("audio");
        aud.preload = "auto";
        aud.src = media.audioUrl;
        aud.addEventListener("canplaythrough", () => markAudioReady(key), { once: true });
        aud.addEventListener("error", () => markAudioReady(key), { once: true });
        aud.load();
      }
    });
  }, [loadState, sceneMedia]);

  // Scene playback
  useEffect(() => {
    if (!playing) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const scene = scenes[currentScene];
    const key = `clip-${scene.id}`;
    const media = sceneMedia[key];

    // Sync video element
    if (videoRef.current) {
      if (media?.videoUrl) {
        videoRef.current.src = media.videoUrl;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.src = "";
      }
    }

    // Audio drives timing when available
    if (audioRef.current && media?.audioUrl) {
      audioRef.current.src = media.audioUrl;
      audioRef.current.play().catch(() => {});
      const onEnded = () => {
        if (currentScene < scenes.length - 1) {
          setCurrentScene((c) => c + 1);
        } else {
          setPlaying(false);
          setFinished(true);
        }
      };
      audioRef.current.addEventListener("ended", onEnded, { once: true });
      return () => audioRef.current?.removeEventListener("ended", onEnded);
    }

    // Fallback: duration-based
    timerRef.current = setTimeout(() => {
      if (currentScene < scenes.length - 1) {
        setCurrentScene((c) => c + 1);
      } else {
        setPlaying(false);
        setFinished(true);
      }
    }, scene.duration * 1000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, currentScene, sceneMedia]);

  const handleSceneClick = (idx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    if (videoRef.current) videoRef.current.pause();
    setPlaying(false);
    setCurrentScene(idx);
    setFinished(false);
  };

  const handleGenerate = () => {
    setLoadState("generating");
    startJob.mutate({
      storyId,
      storyTitle: `Courtroom Clip - ${storyId}`,
      storyContext: {
        summary: "Courtroom animatic playback",
        plaintiff: "Plaintiff",
        defendant: "Defendant",
      },
      themeId: "anime-battle",
      scenes: scenes.map((s) => ({
        id: `clip-${s.id}`,
        title: s.speakerRole,
        prompt: ROLE_PROMPTS[s.speakerRole] || ROLE_PROMPTS.Narrator,
        narration: s.narration,
        speakerRole: s.speakerRole,
      })),
    });
  };

  const scene = scenes[currentScene];
  const sceneKey = `clip-${scene.id}`;
  const media = sceneMedia[sceneKey];
  const roleColor = ROLE_COLORS[scene.speakerRole] || "white";

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <audio ref={audioRef} style={{ display: "none" }} />

      {/* ── FULL-SCREEN VIDEO STAGE ── */}
      <div
        className="relative w-full"
        style={{ aspectRatio: "16/9", maxHeight: "80vh", background: "#000", overflow: "hidden" }}
      >
        {/* ── VIDEO / IMAGE — FRONT AND CENTER, FULL BLEED ── */}
        {media?.videoUrl ? (
          media.mediaType === "image" ? (
            <img
              key={`${sceneKey}-${media.videoUrl}`}
              src={media.videoUrl}
              alt={scene.speakerRole}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 1 }}
            />
          ) : (
            <video
              ref={videoRef}
              key={`${sceneKey}-${media.videoUrl}`}
              src={media.videoUrl}
              autoPlay={playing}
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 1 }}
            />
          )
        ) : (
          /* Animated fallback — speed lines + radial glow */
          <div
            className="absolute inset-0"
            key={`fallback-${currentScene}`}
            style={{
              zIndex: 1,
              background: `
                radial-gradient(ellipse 60% 60% at 50% 50%, ${roleColor}18 0%, transparent 70%),
                radial-gradient(ellipse 100% 100% at 50% 50%, #050810 60%, #0A0E1A 100%)
              `,
            }}
          >
            {/* Animated speed lines */}
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i / 24) * 360;
                const rad = (angle * Math.PI) / 180;
                const x2 = 400 + Math.cos(rad) * 600;
                const y2 = 225 + Math.sin(rad) * 600;
                return (
                  <line
                    key={i}
                    x1="400" y1="225"
                    x2={x2} y2={y2}
                    stroke={roleColor}
                    strokeWidth={i % 3 === 0 ? "2" : "0.8"}
                    strokeOpacity={i % 3 === 0 ? "0.6" : "0.3"}
                  />
                );
              })}
            </svg>
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 2,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.8) 100%)",
          }}
        />

        {/* Scene title — top left */}
        <div className="absolute top-5 left-6" style={{ zIndex: 3 }} key={`title-${currentScene}`}>
          <div
            className="animate-slide-right"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: "clamp(1.8rem, 4.5vw, 3.5rem)",
              letterSpacing: "0.1em",
              color: scene.accentColor,
              textShadow: `0 0 30px ${scene.accentColor}90, 0 2px 10px rgba(0,0,0,0.9)`,
              lineHeight: 1,
            }}
          >
            {scene.title}
          </div>
          <div className="mt-1.5">
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
        </div>

        {/* Scene counter — top right */}
        <div className="absolute top-5 right-6" style={{ zIndex: 3 }}>
          <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>
            {currentScene + 1} / {scenes.length}
          </span>
        </div>

        {/* Subtitle — bottom center, cinema style */}
        <div
          className="absolute bottom-0 left-0 right-0 px-6 pb-5"
          style={{ zIndex: 3 }}
          key={`sub-${currentScene}`}
        >
          <div
            className="animate-slide-up mx-auto max-w-3xl text-center px-5 py-3 rounded"
            style={{
              background: "rgba(0,0,0,0.78)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${roleColor}25`,
            }}
          >
            <p style={{
              fontFamily: "Noto Sans, sans-serif",
              fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.95)",
              fontStyle: scene.speakerRole !== "Narrator" ? "italic" : "normal",
            }}>
              {scene.speakerRole !== "Narrator" ? `"${scene.narration}"` : scene.narration}
            </p>
          </div>
        </div>

        {/* API badges — bottom right */}
        <div className="absolute bottom-20 right-5 flex flex-col gap-1 items-end" style={{ zIndex: 3 }}>
          {media?.videoUrl && (
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(255,107,53,0.2)", border: "1px solid rgba(255,107,53,0.4)", color: "rgba(255,107,53,0.9)", fontFamily: "Noto Sans, sans-serif" }}>
              🎬 fal.ai
            </span>
          )}
          {media?.audioUrl && (
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(46,204,113,0.2)", border: "1px solid rgba(46,204,113,0.4)", color: "rgba(46,204,113,0.9)", fontFamily: "Noto Sans, sans-serif" }}>
              🔊 ElevenLabs
            </span>
          )}
        </div>

        {/* ── LOADING OVERLAY — blocks play until all assets ready ── */}
        {loadState === "loading" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ zIndex: 10, background: "rgba(5,8,16,0.93)", backdropFilter: "blur(6px)" }}
          >
            <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(1.2rem, 3vw, 2rem)", letterSpacing: "0.2em", color: "#FFD700", marginBottom: "1.5rem" }}>
              ⚡ LOADING ASSETS
            </div>
            <div className="w-72 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${loadProgress}%`, background: "linear-gradient(90deg, #FF1744, #FFD700)" }}
              />
            </div>
            <div className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>
              {loadProgress}% — {scenes.length} video + audio scenes
            </div>
            <div className="mt-1.5 text-xs" style={{ color: "rgba(255,255,255,0.22)", fontFamily: "Noto Sans, sans-serif" }}>
              Playback unlocks when all assets are ready
            </div>
          </div>
        )}

        {/* ── GENERATING OVERLAY ── */}
        {loadState === "generating" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ zIndex: 10, background: "rgba(5,8,16,0.93)" }}
          >
            <div className="animate-pulse" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(1.5rem, 4vw, 2.5rem)", letterSpacing: "0.2em", color: "#FF6B35", marginBottom: "1rem" }}>
              ⚡ GENERATING SCENES
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem" }}>
              fal.ai video + ElevenLabs voice for {scenes.length} scenes...
            </div>
            <div className="mt-5 flex gap-2">
              {scenes.map((_, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ background: "#FF6B35", animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CONTROLS BAR ── */}
      <div className="px-4 py-4" style={{ background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4 flex-wrap">

            {/* Generate AI Video button */}
            {loadState === "idle" && (
              <button
                onClick={handleGenerate}
                className="px-5 py-2 font-bold uppercase tracking-wider transition-all hover:scale-105"
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: "0.85rem",
                  letterSpacing: "0.15em",
                  background: "#FF6B35",
                  color: "white",
                  clipPath: "polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%)",
                  boxShadow: "0 0 16px rgba(255,107,53,0.35)",
                }}
              >
                🎬 GENERATE AI VIDEO + VOICE
              </button>
            )}

            {/* Loading indicator */}
            {loadState === "loading" && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full animate-spin border-2 border-transparent" style={{ borderTopColor: "#FFD700" }} />
                <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.8rem", color: "rgba(255,215,0,0.7)" }}>
                  Loading {loadProgress}%...
                </span>
              </div>
            )}

            {/* Play / Pause */}
            {(loadState === "ready" || loadState === "idle") && (
              <>
                <button
                  onClick={() => {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    if (!playing && audioRef.current) { audioRef.current.src = ""; }
                    if (finished) { setFinished(false); setCurrentScene(0); }
                    setPlaying((p) => !p);
                  }}
                  className="px-8 py-2.5 font-bold uppercase tracking-wider transition-all hover:scale-105"
                  style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    fontSize: "1rem",
                    letterSpacing: "0.2em",
                    background: playing ? "rgba(255,215,0,0.15)" : "#FF1744",
                    color: playing ? "#FFD700" : "white",
                    border: playing ? "1px solid rgba(255,215,0,0.4)" : "none",
                    clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
                    boxShadow: playing ? "none" : "0 0 20px rgba(255,23,68,0.4)",
                  }}
                >
                  {playing ? "⏸ PAUSE" : finished ? "↺ REPLAY" : "▶ PLAY CLIP"}
                </button>

                <button
                  onClick={() => {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
                    if (videoRef.current) videoRef.current.pause();
                    setPlaying(false);
                    setCurrentScene(0);
                    setFinished(false);
                  }}
                  className="p-2.5 rounded transition-colors hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  title="Restart"
                >
                  ⟲
                </button>
              </>
            )}

            <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}>
              STEP 7 — COURTROOM CLIP
            </span>
          </div>

          {/* Scene thumbnail strip */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scenes.map((s, i) => {
              const key = `clip-${s.id}`;
              const m = sceneMedia[key];
              const isActive = i === currentScene;
              const rc = ROLE_COLORS[s.speakerRole] || "white";
              return (
                <button
                  key={s.id}
                  onClick={() => handleSceneClick(i)}
                  className="flex-shrink-0 rounded overflow-hidden transition-all hover:scale-105"
                  style={{
                    width: "110px",
                    border: `2px solid ${isActive ? rc : "rgba(255,255,255,0.07)"}`,
                    background: isActive ? `${rc}12` : "rgba(255,255,255,0.02)",
                    boxShadow: isActive ? `0 0 10px ${rc}40` : "none",
                  }}
                >
                  {/* Thumbnail */}
                  <div className="relative" style={{ height: "55px", background: "#0a0a14", overflow: "hidden" }}>
                    {m?.videoUrl ? (
                      <video
                        src={m.videoUrl}
                        muted playsInline
                        className="w-full h-full object-cover"
                        style={{ opacity: 0.65 }}
                      />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{
                          background: `radial-gradient(ellipse at center, ${rc}20, #0a0a14)`,
                        }}
                      />
                    )}
                    <div
                      className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                      style={{ background: isActive ? "#FF1744" : "rgba(0,0,0,0.65)", color: "white", fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                    >
                      {i + 1}
                    </div>
                    {m?.videoReady && m?.audioReady && (
                      <div className="absolute top-1 right-1 text-[8px]" style={{ color: "#2ECC71" }}>✓</div>
                    )}
                  </div>
                  <div className="px-1.5 py-1">
                    <div
                      className="text-[9px] uppercase truncate"
                      style={{
                        fontFamily: "'Bebas Neue', Impact, sans-serif",
                        color: isActive ? rc : "rgba(255,255,255,0.35)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {s.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ENTER COURTROOM BUTTON ── */}
      <div className="flex justify-center py-8 px-4" style={{ background: "#0A0E1A" }}>
        <button
          onClick={onFinish}
          className="px-14 py-3.5 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: "1.1rem",
            letterSpacing: "0.2em",
            background: finished ? "#FF1744" : "rgba(255,23,68,0.25)",
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
  );
}
