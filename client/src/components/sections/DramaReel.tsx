// DRAMAFORGE SCOUT — Drama Reel Section
// Full-screen manga motion comic video player
// Per-scene progress bar with job polling

import { useState, useRef, useEffect, useCallback } from "react";
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
  accentColor: string;
}

function buildScenes(story: Story): ReelScene[] {
  return [
    {
      id: "intro",
      title: "THE INCIDENT",
      narration: `The case of "${story.title}". A story that divided the internet.`,
      speakerRole: "Narrator",
      speaker: "Narrator",
      prompt: `Dramatic establishing shot, dark courtroom with golden light rays, speed lines radiating outward, bold text overlay "THE INCIDENT", cinematic black and gold composition, high contrast`,
      accentColor: "#FFD700",
    },
    {
      id: "setup",
      title: "WHAT HAPPENED",
      narration: story.summary,
      speakerRole: "Narrator",
      speaker: "Narrator",
      prompt: `Split panel comic layout, dramatic conflict scene, two characters facing off, speed lines, emotional expressions, bold black outlines, cinematic lighting`,
      accentColor: "#FF6B35",
    },
    {
      id: "plaintiff",
      title: "THE COMPLAINT",
      narration: `${story.plaintiff.split(" (")[0]} says: "${story.keyEvidence[0]}"`,
      speakerRole: "Plaintiff",
      speaker: story.plaintiff.split(" (")[0],
      prompt: `Passionate young woman in red blazer pointing dramatically at camera, speed lines behind her, red and gold color scheme, intense righteous expression, close-up shot`,
      accentColor: "#FF1744",
    },
    {
      id: "defendant",
      title: "THE DEFENSE",
      narration: `${story.defendant.split(" (")[0]} responds: "${story.keyEvidence[story.keyEvidence.length - 1]}"`,
      speakerRole: "Defendant",
      speaker: story.defendant.split(" (")[0],
      prompt: `Nervous young man with hands raised defensively, blue dramatic lighting, sweat drops, manga impact lines, desperate wide-eyed expression, dark navy background`,
      accentColor: "#4A90D9",
    },
    {
      id: "comments",
      title: "THE INTERNET REACTS",
      narration: story.topFunnySafeComments[0],
      speakerRole: "Witness",
      speaker: "The Internet",
      prompt: `Crowd of shocked and laughing reaction faces, speech bubbles everywhere, chaotic energy, green and gold accents, multiple panels, internet meme energy, vibrant`,
      accentColor: "#2ECC71",
    },
    {
      id: "verdict-tease",
      title: "COURT IS CALLED",
      narration: `The case has been accepted. ${story.title} is now before the court. Who is truly wrong?`,
      speakerRole: "Judge",
      speaker: "Judge Harrow",
      prompt: `Imposing judge with white wig and golden gavel raised high, dramatic light beam from above, golden scales of justice, bold "COURT IN SESSION" text, epic black and gold composition`,
      accentColor: "#FFD700",
    },
  ];
}

type SceneMedia = {
  videoUrl: string | null;
  audioUrl: string | null;
  mediaType?: "video" | "image";
  videoReady: boolean;
  audioReady: boolean;
};

type GenStatus = "queued" | "generating" | "done" | "error";

type AppState = "idle" | "generating" | "loading" | "ready";

const ROLE_COLORS: Record<string, string> = {
  Narrator: "#FFD700",
  Plaintiff: "#FF1744",
  Defendant: "#4A90D9",
  Witness: "#2ECC71",
  Judge: "#FFD700",
};

// No longer needed — mediaType comes from API
// function isImageUrl(url: string): boolean {
//   return /\.(jpe?g|png|webp|gif|avif)(?:[?#].*)?$/i.test(url);
// }

const STATUS_ICONS: Record<GenStatus, string> = {
  queued: "○",
  generating: "◌",
  done: "✓",
  error: "✗",
};

export default function DramaReel({ story, theme, onContinue }: DramaReelProps) {
  const scenes = buildScenes(story);
  const [appState, setAppState] = useState<AppState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [sceneGenStatus, setSceneGenStatus] = useState<Record<string, GenStatus>>({});
  const [sceneMedia, setSceneMedia] = useState<Record<string, SceneMedia>>({});
  const [currentScene, setCurrentScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [genPercent, setGenPercent] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check DB cache for previously generated reel
  const reelCache = trpc.drama.getReelCache.useQuery(
    { storyId: story.id },
    { enabled: !cacheLoaded }
  );

  useEffect(() => {
    if (!reelCache.data || cacheLoaded) return;
    const cached = reelCache.data;
    if (cached.scenes && cached.scenes.length > 0) {
      // Load cached media into state and jump straight to loading phase
      const mediaMap: Record<string, SceneMedia> = {};
      cached.scenes.forEach(s => {
        mediaMap[s.id] = {
          videoUrl: s.videoUrl,
          audioUrl: s.audioUrl,
          videoReady: !s.videoUrl,
          audioReady: !s.audioUrl,
        };
      });
      setSceneMedia(mediaMap);
      setSceneGenStatus(Object.fromEntries(cached.scenes.map(s => [s.id, "done" as GenStatus])));
      setGenPercent(100);
      setAppState("loading");
      setCacheLoaded(true);
    } else {
      setCacheLoaded(true);
    }
  }, [reelCache.data, cacheLoaded]);

  // Start job mutation
  const startJob = trpc.drama.startReelJob.useMutation({
    onSuccess: (data) => {
      setJobId(data.jobId);
      startTimeRef.current = Date.now();
      // Start elapsed timer
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    },
    onError: () => {
      setAppState("ready"); // fallback to mock
    },
  });

  // Poll job progress
  const jobProgress = trpc.drama.getJobProgress.useQuery(
    { jobId: jobId! },
    {
      enabled: !!jobId && appState === "generating",
      refetchInterval: 1500,
    }
  );

  // Process job progress updates
  useEffect(() => {
    const data = jobProgress.data;
    if (!data) return;

    // Update per-scene gen status
    const newStatus: Record<string, GenStatus> = {};
    data.scenes.forEach(s => { newStatus[s.id] = s.status as GenStatus; });
    setSceneGenStatus(newStatus);
    setGenPercent(data.percent);

    // As scenes complete, add their media
    data.scenes.forEach(s => {
      if (s.status === "done" && (s.videoUrl || s.audioUrl)) {
        setSceneMedia(prev => ({
          ...prev,
          [s.id]: {
            videoUrl: s.videoUrl,
            audioUrl: s.audioUrl,
            videoReady: !s.videoUrl,
            audioReady: !s.audioUrl,
          },
        }));
      }
    });

    // Job complete — move to loading phase
    if (data.status === "done") {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      setAppState("loading");
    }
  }, [jobProgress.data]);

  // Preload assets once in loading state
  const markVideoReady = useCallback((id: string) => {
    setSceneMedia(prev => ({ ...prev, [id]: { ...prev[id], videoReady: true } }));
  }, []);
  const markAudioReady = useCallback((id: string) => {
    setSceneMedia(prev => ({ ...prev, [id]: { ...prev[id], audioReady: true } }));
  }, []);

  useEffect(() => {
    if (appState !== "loading") return;
    scenes.forEach(scene => {
      const media = sceneMedia[scene.id];
      if (!media) return;
      if (media.videoUrl && !media.videoReady) {
        const el = document.createElement("video");
        el.preload = "auto";
        el.src = media.videoUrl;
        el.addEventListener("canplaythrough", () => markVideoReady(scene.id), { once: true });
        el.addEventListener("error", () => markVideoReady(scene.id), { once: true });
        el.load();
      }
      if (media.audioUrl && !media.audioReady) {
        const el = document.createElement("audio");
        el.preload = "auto";
        el.src = media.audioUrl;
        el.addEventListener("canplaythrough", () => markAudioReady(scene.id), { once: true });
        el.addEventListener("error", () => markAudioReady(scene.id), { once: true });
        el.load();
      }
    });
  }, [appState, sceneMedia]);

  // Track asset load progress
  useEffect(() => {
    if (appState !== "loading") return;
    const total = scenes.length * 2;
    const ready = Object.values(sceneMedia).reduce(
      (acc, m) => acc + (m.videoReady ? 1 : 0) + (m.audioReady ? 1 : 0), 0
    );
    const pct = Math.round((ready / total) * 100);
    setLoadProgress(pct);
    if (pct >= 100) setAppState("ready");
  }, [sceneMedia, appState]);

  // Scene playback
  useEffect(() => {
    if (!playing) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const scene = scenes[currentScene];
    const media = sceneMedia[scene.id];

    if (videoRef.current) {
      if (media?.videoUrl) {
        videoRef.current.src = media.videoUrl;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.src = "";
      }
    }

    if (audioRef.current && media?.audioUrl) {
      audioRef.current.src = media.audioUrl;
      audioRef.current.play().catch(() => {});
      const onEnded = () => {
        if (currentScene < scenes.length - 1) setCurrentScene(c => c + 1);
        else setPlaying(false);
      };
      audioRef.current.addEventListener("ended", onEnded, { once: true });
      return () => audioRef.current?.removeEventListener("ended", onEnded);
    }

    timerRef.current = setTimeout(() => {
      if (currentScene < scenes.length - 1) setCurrentScene(c => c + 1);
      else setPlaying(false);
    }, 6000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, currentScene]);

  const handleGenerate = () => {
    setAppState("generating");
    setSceneGenStatus(Object.fromEntries(scenes.map(s => [s.id, "queued" as GenStatus])));
    startJob.mutate({
      storyId: story.id,
      storyTitle: story.title,
      storyContext: {
        summary: story.summary,
        plaintiff: story.plaintiff,
        defendant: story.defendant,
      },
      themeId: theme || "anime-battle",
      scenes: scenes.map(s => ({
        id: s.id,
        title: s.title,
        prompt: s.prompt,
        narration: s.narration,
        speakerRole: s.speakerRole,
      })),
    });
  };

  const handleSceneClick = (idx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    if (videoRef.current) videoRef.current.pause();
    setPlaying(false);
    setCurrentScene(idx);
  };

  const scene = scenes[currentScene];
  const media = sceneMedia[scene.id];
  const roleColor = ROLE_COLORS[scene.speakerRole] || "#FFD700";

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const estimatedTotal = scenes.length * 12; // ~12s per scene
  const estimatedRemaining = Math.max(0, estimatedTotal - elapsedSec);

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <audio ref={audioRef} style={{ display: "none" }} />

      {/* ── FULL-SCREEN VIDEO STAGE ── */}
      <div className="relative w-full" style={{ aspectRatio: "16/9", maxHeight: "80vh", background: "#000", overflow: "hidden" }}>

        {/* Video / Image — full bleed */}
        {media?.videoUrl ? (
          media.mediaType === "image" ? (
            <img
              key={`${scene.id}-${media.videoUrl}`}
              src={media.videoUrl}
              alt={scene.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 1 }}
            />
          ) : (
            <video
              ref={videoRef}
              key={`${scene.id}-${media.videoUrl}`}
              src={media.videoUrl}
              autoPlay={playing}
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 1 }}
            />
          )
        ) : (
          <div className="absolute inset-0" style={{ zIndex: 1, background: `radial-gradient(ellipse at center, ${roleColor}18 0%, #050810 70%)` }}>
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i / 24) * 360;
                const rad = (angle * Math.PI) / 180;
                return <line key={i} x1="400" y1="225" x2={400 + Math.cos(rad) * 600} y2={225 + Math.sin(rad) * 600} stroke={roleColor} strokeWidth={i % 3 === 0 ? "2" : "0.8"} strokeOpacity={i % 3 === 0 ? "0.6" : "0.3"} />;
              })}
            </svg>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ zIndex: 2, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%)" }} />

        {/* Scene title */}
        <div className="absolute top-5 left-6" style={{ zIndex: 3 }} key={`title-${currentScene}`}>
          <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(1.8rem, 4.5vw, 3.5rem)", letterSpacing: "0.1em", color: scene.accentColor, textShadow: `0 0 30px ${scene.accentColor}90, 0 2px 10px rgba(0,0,0,0.9)`, lineHeight: 1 }}>
            {scene.title}
          </div>
          <div className="mt-1.5">
            <span className="text-xs px-3 py-1 uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", background: `${roleColor}25`, border: `1px solid ${roleColor}60`, color: roleColor, clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)" }}>
              {scene.speaker} · {scene.speakerRole}
            </span>
          </div>
        </div>

        {/* Scene counter */}
        <div className="absolute top-5 right-6" style={{ zIndex: 3 }}>
          <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>
            {currentScene + 1} / {scenes.length}
          </span>
        </div>

        {/* Subtitle */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5" style={{ zIndex: 3 }} key={`sub-${currentScene}`}>
          <div className="mx-auto max-w-3xl text-center px-5 py-3 rounded" style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)", border: `1px solid ${roleColor}25` }}>
            <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "clamp(0.85rem, 2vw, 1.1rem)", lineHeight: 1.65, color: "rgba(255,255,255,0.95)", fontStyle: scene.speakerRole !== "Narrator" ? "italic" : "normal" }}>
              {scene.speakerRole !== "Narrator" ? `"${scene.narration}"` : scene.narration}
            </p>
          </div>
        </div>

        {/* API badges */}
        <div className="absolute bottom-20 right-5 flex flex-col gap-1 items-end" style={{ zIndex: 3 }}>
          {media?.videoUrl && <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(255,107,53,0.2)", border: "1px solid rgba(255,107,53,0.4)", color: "rgba(255,107,53,0.9)", fontFamily: "Noto Sans, sans-serif" }}>🎬 fal.ai</span>}
          {media?.audioUrl && <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(46,204,113,0.2)", border: "1px solid rgba(46,204,113,0.4)", color: "rgba(46,204,113,0.9)", fontFamily: "Noto Sans, sans-serif" }}>🔊 ElevenLabs</span>}
        </div>

        {/* ── GENERATION PROGRESS OVERLAY ── */}
        {appState === "generating" && (
          <div className="absolute inset-0 flex flex-col" style={{ zIndex: 10, background: "rgba(5,8,16,0.94)", backdropFilter: "blur(4px)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(1.2rem, 3vw, 2rem)", letterSpacing: "0.2em", color: "#FF6B35" }}>
                ⚡ GENERATING DRAMA REEL
              </div>
              <div className="text-right">
                <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "2rem", color: "#FFD700", lineHeight: 1 }}>
                  {genPercent}%
                </div>
                <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>
                  {formatTime(elapsedSec)} elapsed · ~{formatTime(estimatedRemaining)} left
                </div>
              </div>
            </div>

            {/* Overall progress bar */}
            <div className="px-8 mb-6">
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${genPercent}%`, background: "linear-gradient(90deg, #FF1744, #FF6B35, #FFD700)" }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>
                  fal.ai video + ElevenLabs voice
                </span>
                <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>
                  {scenes.filter(s => sceneGenStatus[s.id] === "done").length} / {scenes.length} scenes
                </span>
              </div>
            </div>

            {/* Per-scene status list */}
            <div className="flex-1 px-8 overflow-y-auto">
              <div className="grid gap-2">
                {scenes.map((s, i) => {
                  const status = sceneGenStatus[s.id] || "queued";
                  const rc = ROLE_COLORS[s.speakerRole] || "#FFD700";
                  const isActive = status === "generating";
                  const isDone = status === "done";
                  const isError = status === "error";

                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded px-4 py-2.5 transition-all duration-300"
                      style={{
                        background: isActive ? `${rc}12` : isDone ? "rgba(46,204,113,0.06)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isActive ? `${rc}40` : isDone ? "rgba(46,204,113,0.2)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      {/* Status icon */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                        style={{
                          background: isDone ? "rgba(46,204,113,0.2)" : isActive ? `${rc}25` : isError ? "rgba(255,23,68,0.2)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${isDone ? "rgba(46,204,113,0.5)" : isActive ? `${rc}60` : isError ? "rgba(255,23,68,0.4)" : "rgba(255,255,255,0.1)"}`,
                          color: isDone ? "#2ECC71" : isActive ? rc : isError ? "#FF1744" : "rgba(255,255,255,0.3)",
                          animation: isActive ? "spin 1.5s linear infinite" : "none",
                        }}
                      >
                        {STATUS_ICONS[status]}
                      </div>

                      {/* Scene info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "0.85rem", letterSpacing: "0.08em", color: isActive ? rc : isDone ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)" }}>
                            {i + 1}. {s.title}
                          </span>
                          <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.25)" }}>
                            {s.speakerRole}
                          </span>
                        </div>
                        {isActive && (
                          <div className="mt-0.5">
                            <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", width: "100%" }}>
                              <div className="h-full rounded-full animate-pulse" style={{ width: "60%", background: `linear-gradient(90deg, ${rc}, transparent)` }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Status badge */}
                      <div style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.65rem", color: isDone ? "#2ECC71" : isActive ? rc : isError ? "#FF1744" : "rgba(255,255,255,0.2)", letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0 }}>
                        {isDone ? "✓ DONE" : isActive ? "GENERATING..." : isError ? "ERROR" : "QUEUED"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer hint */}
            <div className="px-8 py-4 text-center">
              <p style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.2)" }}>
                Scenes generate one by one — playback starts automatically when all are ready
              </p>
            </div>
          </div>
        )}

        {/* ── ASSET LOADING OVERLAY ── */}
        {appState === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 10, background: "rgba(5,8,16,0.92)", backdropFilter: "blur(6px)" }}>
            <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(1.2rem, 3vw, 2rem)", letterSpacing: "0.2em", color: "#FFD700", marginBottom: "1.5rem" }}>
              ⚡ BUFFERING ASSETS
            </div>
            <div className="w-72 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${loadProgress}%`, background: "linear-gradient(90deg, #FF1744, #FFD700)" }} />
            </div>
            <div className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>
              {loadProgress}% — caching video + audio
            </div>
          </div>
        )}
      </div>

      {/* ── CONTROLS BAR ── */}
      <div className="px-4 py-4" style={{ background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4 flex-wrap">

            {appState === "idle" && (
              <>
                <button
                  onClick={handleGenerate}
                  className="px-6 py-2.5 font-bold uppercase tracking-wider transition-all hover:scale-105"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "0.9rem", letterSpacing: "0.15em", background: "#FF6B35", color: "white", clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)", boxShadow: "0 0 20px rgba(255,107,53,0.4)" }}
                >
                  🎬 GENERATE AI VIDEO + VOICE
                </button>
                {reelCache.isLoading && (
                  <span className="text-xs animate-pulse" style={{ color: "rgba(255,215,0,0.5)", fontFamily: "Noto Sans, sans-serif" }}>checking cache...</span>
                )}
              </>
            )}

            {/* Cache loaded badge */}
            {cacheLoaded && reelCache.data?.scenes?.length && appState !== "idle" && appState !== "generating" && (
              <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(46,204,113,0.15)", color: "#2ECC71", border: "1px solid rgba(46,204,113,0.3)", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.08em" }}>
                ⚡ CACHED — LOAD INSTANTLY
              </span>
            )}

            {appState === "generating" && (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full animate-spin border-2 border-transparent" style={{ borderTopColor: "#FF6B35" }} />
                <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "rgba(255,107,53,0.8)" }}>
                  Generating {genPercent}% — {scenes.filter(s => sceneGenStatus[s.id] === "done").length}/{scenes.length} scenes done
                </span>
              </div>
            )}

            {appState === "loading" && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full animate-spin border-2 border-transparent" style={{ borderTopColor: "#FFD700" }} />
                <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "rgba(255,215,0,0.7)" }}>
                  Buffering {loadProgress}%...
                </span>
              </div>
            )}

            {(appState === "ready" || appState === "idle") && (
              <>
                <button
                  onClick={() => {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    if (!playing && audioRef.current) audioRef.current.src = "";
                    setPlaying(p => !p);
                  }}
                  className="px-8 py-2.5 font-bold uppercase tracking-wider transition-all hover:scale-105"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1rem", letterSpacing: "0.2em", background: playing ? "rgba(255,215,0,0.15)" : "#FF1744", color: playing ? "#FFD700" : "white", border: playing ? "1px solid rgba(255,215,0,0.4)" : "none", clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)", boxShadow: playing ? "none" : "0 0 20px rgba(255,23,68,0.4)" }}
                >
                  {playing ? "⏸ PAUSE" : "▶ PLAY REEL"}
                </button>
                <button
                  onClick={() => {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
                    if (videoRef.current) videoRef.current.pause();
                    setPlaying(false);
                    setCurrentScene(0);
                  }}
                  className="p-2.5 rounded transition-colors hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  title="Restart"
                >⟲</button>
              </>
            )}

            <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}>
              STEP 6 — DRAMA REEL
            </span>
          </div>

          {/* Scene strip */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scenes.map((s, i) => {
              const m = sceneMedia[s.id];
              const genSt = sceneGenStatus[s.id];
              const isActive = i === currentScene;
              const rc = ROLE_COLORS[s.speakerRole] || "#FFD700";
              return (
                <button
                  key={s.id}
                  onClick={() => handleSceneClick(i)}
                  className="flex-shrink-0 rounded overflow-hidden transition-all hover:scale-105"
                  style={{ width: "110px", border: `2px solid ${isActive ? rc : "rgba(255,255,255,0.07)"}`, background: isActive ? `${rc}12` : "rgba(255,255,255,0.02)", boxShadow: isActive ? `0 0 10px ${rc}40` : "none" }}
                >
                  <div className="relative" style={{ height: "55px", background: "#0a0a14", overflow: "hidden" }}>
                    {m?.videoUrl ? (
                      m.mediaType === "image" ? (
                        <img src={m.videoUrl} alt={s.title} className="w-full h-full object-cover" style={{ opacity: 0.7 }} />
                      ) : (
                        <video src={m.videoUrl} muted playsInline className="w-full h-full object-cover" style={{ opacity: 0.7 }} />
                      )
                    ) : (
                      <div className="w-full h-full" style={{ background: `radial-gradient(ellipse at center, ${rc}20, #0a0a14)` }} />
                    )}
                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{ background: isActive ? "#FF1744" : "rgba(0,0,0,0.65)", color: "white", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                      {i + 1}
                    </div>
                    {genSt === "done" && (
                      <div className="absolute top-1 right-1 text-[8px]" style={{ color: "#2ECC71" }}>✓</div>
                    )}
                    {genSt === "generating" && (
                      <div className="absolute top-1 right-1 text-[8px] animate-pulse" style={{ color: rc }}>◌</div>
                    )}
                  </div>
                  <div className="px-1.5 py-1">
                    <div className="text-[9px] uppercase truncate" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: isActive ? rc : "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>
                      {s.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CONTINUE BUTTON ── */}
      <div className="flex justify-center py-8 px-4" style={{ background: "#0A0E1A" }}>
        <button
          onClick={onContinue}
          className="px-12 py-3 font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.1rem", letterSpacing: "0.2em", background: "#FF1744", color: "white", clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)", boxShadow: "0 0 20px rgba(255,23,68,0.4)" }}
        >
          ▶ PLAY COURTROOM CLIP →
        </button>
      </div>
    </div>
  );
}
