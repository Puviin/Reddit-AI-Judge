// DRAMAFORGE SCOUT — Drama Reel Section
// Full-screen manga motion comic video player
// Waits for ALL video + audio assets to load before enabling play

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
      prompt: `Anime manga style, dramatic establishing shot, dark courtroom with golden light rays, speed lines radiating outward, bold text overlay "THE INCIDENT", cinematic black and gold composition, high contrast`,
      accentColor: "#FFD700",
    },
    {
      id: "setup",
      title: "WHAT HAPPENED",
      narration: story.summary,
      speakerRole: "Narrator",
      speaker: "Narrator",
      prompt: `Anime manga style, split panel comic layout, dramatic conflict scene, two characters facing off, speed lines, emotional expressions, bold black outlines, cinematic lighting`,
      accentColor: "#FF6B35",
    },
    {
      id: "plaintiff",
      title: "THE COMPLAINT",
      narration: `${story.plaintiff.split(" (")[0]} says: "${story.keyEvidence[0]}"`,
      speakerRole: "Plaintiff",
      speaker: story.plaintiff.split(" (")[0],
      prompt: `Anime manga style, passionate young woman in red blazer pointing dramatically at camera, speed lines behind her, red and gold color scheme, bold manga panel borders, intense righteous expression, close-up shot`,
      accentColor: "#FF1744",
    },
    {
      id: "defendant",
      title: "THE DEFENSE",
      narration: `${story.defendant.split(" (")[0]} responds: "${story.keyEvidence[story.keyEvidence.length - 1]}"`,
      speakerRole: "Defendant",
      speaker: story.defendant.split(" (")[0],
      prompt: `Anime manga style, nervous young man with hands raised defensively, blue dramatic lighting, sweat drops, manga impact lines, desperate wide-eyed expression, dark navy background`,
      accentColor: "#4A90D9",
    },
    {
      id: "comments",
      title: "THE INTERNET REACTS",
      narration: story.topFunnySafeComments[0],
      speakerRole: "Witness",
      speaker: "The Internet",
      prompt: `Anime manga style, crowd of shocked and laughing reaction faces, speech bubbles everywhere, chaotic energy, green and gold accents, multiple manga panels, internet meme energy, vibrant`,
      accentColor: "#2ECC71",
    },
    {
      id: "verdict-tease",
      title: "COURT IS CALLED",
      narration: `The case has been accepted. ${story.title} is now before the court. Who is truly wrong?`,
      speakerRole: "Judge",
      speaker: "Judge Harrow",
      prompt: `Anime manga style, imposing judge with white wig and golden gavel raised high, dramatic light beam from above, golden scales of justice, bold "COURT IN SESSION" text, epic black and gold composition`,
      accentColor: "#FFD700",
    },
  ];
}

type SceneMedia = {
  videoUrl: string | null;
  audioUrl: string | null;
  videoReady: boolean;
  audioReady: boolean;
};

type LoadState = "idle" | "generating" | "loading" | "ready" | "error";

export default function DramaReel({ story, theme, onContinue }: DramaReelProps) {
  const scenes = buildScenes(story);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [sceneMedia, setSceneMedia] = useState<Record<string, SceneMedia>>({});
  const [currentScene, setCurrentScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateReel = trpc.drama.generateDramaReel.useMutation({
    onSuccess: (data) => {
      const map: Record<string, SceneMedia> = {};
      data.scenes.forEach((s) => {
        map[s.sceneId] = {
          videoUrl: s.videoUrl,
          audioUrl: s.audioUrl,
          videoReady: !s.videoUrl, // if no video, mark ready immediately
          audioReady: !s.audioUrl,
        };
      });
      setSceneMedia(map);
      setLoadState("loading");
    },
    onError: () => {
      // Still allow playing with animated fallback
      setLoadState("ready");
      setAllReady(true);
    },
  });

  // Track load progress
  useEffect(() => {
    if (loadState !== "loading") return;
    const total = scenes.length * 2; // video + audio per scene
    const ready = Object.values(sceneMedia).reduce((acc, m) => {
      return acc + (m.videoReady ? 1 : 0) + (m.audioReady ? 1 : 0);
    }, 0);
    const pct = Math.round((ready / total) * 100);
    setLoadProgress(pct);
    if (pct >= 100) {
      setLoadState("ready");
      setAllReady(true);
    }
  }, [sceneMedia, loadState]);

  const markVideoReady = useCallback((sceneId: string) => {
    setSceneMedia((prev) => ({
      ...prev,
      [sceneId]: { ...prev[sceneId], videoReady: true },
    }));
  }, []);

  const markAudioReady = useCallback((sceneId: string) => {
    setSceneMedia((prev) => ({
      ...prev,
      [sceneId]: { ...prev[sceneId], audioReady: true },
    }));
  }, []);

  // Preload all assets when sceneMedia is set
  useEffect(() => {
    if (loadState !== "loading") return;
    scenes.forEach((scene) => {
      const media = sceneMedia[scene.id];
      if (!media) return;

      if (media.videoUrl && !media.videoReady) {
        const vid = document.createElement("video");
        vid.preload = "auto";
        vid.src = media.videoUrl;
        vid.addEventListener("canplaythrough", () => markVideoReady(scene.id), { once: true });
        vid.addEventListener("error", () => markVideoReady(scene.id), { once: true }); // mark ready on error too
        vid.load();
      }

      if (media.audioUrl && !media.audioReady) {
        const aud = document.createElement("audio");
        aud.preload = "auto";
        aud.src = media.audioUrl;
        aud.addEventListener("canplaythrough", () => markAudioReady(scene.id), { once: true });
        aud.addEventListener("error", () => markAudioReady(scene.id), { once: true });
        aud.load();
      }
    });
  }, [loadState, sceneMedia]);

  // Scene auto-advance
  useEffect(() => {
    if (!playing) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const scene = scenes[currentScene];
    const media = sceneMedia[scene.id];

    // Sync video
    if (videoRef.current) {
      if (media?.videoUrl) {
        videoRef.current.src = media.videoUrl;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.src = "";
      }
    }

    // Sync audio — audio drives the timing when available
    if (audioRef.current && media?.audioUrl) {
      audioRef.current.src = media.audioUrl;
      audioRef.current.play().catch(() => {});
      const onEnded = () => {
        if (currentScene < scenes.length - 1) {
          setCurrentScene((c) => c + 1);
        } else {
          setPlaying(false);
        }
      };
      audioRef.current.addEventListener("ended", onEnded, { once: true });
      return () => audioRef.current?.removeEventListener("ended", onEnded);
    }

    // Fallback: 6s per scene
    timerRef.current = setTimeout(() => {
      if (currentScene < scenes.length - 1) {
        setCurrentScene((c) => c + 1);
      } else {
        setPlaying(false);
      }
    }, 6000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, currentScene]);

  const handleGenerate = () => {
    setLoadState("generating");
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

  const handleSceneClick = (idx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    if (videoRef.current) { videoRef.current.pause(); }
    setPlaying(false);
    setCurrentScene(idx);
  };

  const scene = scenes[currentScene];
  const media = sceneMedia[scene.id];
  const roleColors: Record<string, string> = {
    Narrator: "#FFD700", Plaintiff: "#FF1744", Defendant: "#4A90D9", Witness: "#2ECC71", Judge: "#FFD700",
  };
  const roleColor = roleColors[scene.speakerRole] || "#FFD700";

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <audio ref={audioRef} style={{ display: "none" }} />

      {/* ── FULL-SCREEN VIDEO STAGE ── */}
      <div className="relative w-full" style={{ aspectRatio: "16/9", maxHeight: "80vh", background: "#000", overflow: "hidden" }}>

        {/* Video — full bleed, front and center */}
        {media?.videoUrl ? (
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
        ) : (
          /* Animated fallback background when no video */
          <div
            className="absolute inset-0 speed-lines"
            style={{
              zIndex: 1,
              background: `radial-gradient(ellipse at center, ${roleColor}15 0%, #050810 70%)`,
            }}
          />
        )}

        {/* Dark gradient overlay — bottom third for subtitle readability */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 2,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)",
          }}
        />

        {/* Scene title — top left */}
        <div className="absolute top-6 left-6" style={{ zIndex: 3 }} key={`title-${currentScene}`}>
          <div
            className="animate-slide-right"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: "clamp(1.5rem, 4vw, 3rem)",
              letterSpacing: "0.12em",
              color: scene.accentColor,
              textShadow: `0 0 30px ${scene.accentColor}90, 0 2px 8px rgba(0,0,0,0.8)`,
              lineHeight: 1,
            }}
          >
            {scene.title}
          </div>
          <div className="mt-1">
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
        <div className="absolute top-6 right-6" style={{ zIndex: 3 }}>
          <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>
            {currentScene + 1} / {scenes.length}
          </span>
        </div>

        {/* Subtitle / narration — bottom center */}
        <div
          className="absolute bottom-0 left-0 right-0 px-8 pb-6"
          style={{ zIndex: 3 }}
          key={`sub-${currentScene}`}
        >
          <div
            className="animate-slide-up mx-auto max-w-3xl text-center p-4 rounded"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(8px)",
              border: `1px solid ${roleColor}30`,
            }}
          >
            <p style={{
              fontFamily: "Noto Sans, sans-serif",
              fontSize: "clamp(0.9rem, 2vw, 1.15rem)",
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.95)",
              fontStyle: scene.speakerRole !== "Narrator" ? "italic" : "normal",
            }}>
              {scene.speakerRole !== "Narrator" ? `"${scene.narration}"` : scene.narration}
            </p>
          </div>
        </div>

        {/* API badges — bottom right */}
        <div className="absolute bottom-24 right-6 flex flex-col gap-1 items-end" style={{ zIndex: 3 }}>
          {media?.videoUrl && (
            <span className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(255,107,53,0.2)", border: "1px solid rgba(255,107,53,0.4)", color: "rgba(255,107,53,0.9)", fontFamily: "Noto Sans, sans-serif" }}>
              🎬 fal.ai
            </span>
          )}
          {media?.audioUrl && (
            <span className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(46,204,113,0.2)", border: "1px solid rgba(46,204,113,0.4)", color: "rgba(46,204,113,0.9)", fontFamily: "Noto Sans, sans-serif" }}>
              🔊 ElevenLabs
            </span>
          )}
        </div>

        {/* Loading overlay — shown while assets are loading */}
        {loadState === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 10, background: "rgba(5,8,16,0.92)", backdropFilter: "blur(4px)" }}>
            <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.5rem", letterSpacing: "0.2em", color: "#FFD700", marginBottom: "1.5rem" }}>
              ⚡ LOADING ASSETS...
            </div>
            {/* Progress bar */}
            <div className="w-64 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${loadProgress}%`, background: "linear-gradient(90deg, #FF1744, #FFD700)" }}
              />
            </div>
            <div className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif" }}>
              {loadProgress}% — video + audio for {scenes.length} scenes
            </div>
            <div className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "Noto Sans, sans-serif" }}>
              Playback will begin automatically when ready
            </div>
          </div>
        )}

        {/* Generating overlay */}
        {loadState === "generating" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 10, background: "rgba(5,8,16,0.92)" }}>
            <div className="animate-pulse" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "2rem", letterSpacing: "0.2em", color: "#FF6B35", marginBottom: "1rem" }}>
              ⚡ GENERATING SCENES
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem" }}>
              fal.ai video + ElevenLabs voice for {scenes.length} scenes...
            </div>
            <div className="mt-4 flex gap-2">
              {scenes.map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#FF6B35", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CONTROLS BAR ── */}
      <div className="px-4 py-4" style={{ background: "#0A0E1A", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">

            {/* Generate button — shown before generating */}
            {loadState === "idle" && (
              <button
                onClick={handleGenerate}
                className="px-6 py-2.5 font-bold uppercase tracking-wider transition-all hover:scale-105"
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: "0.9rem",
                  letterSpacing: "0.15em",
                  background: "#FF6B35",
                  color: "white",
                  clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
                  boxShadow: "0 0 20px rgba(255,107,53,0.4)",
                }}
              >
                🎬 GENERATE AI VIDEO + VOICE
              </button>
            )}

            {/* Play/Pause — only when ready */}
            {(loadState === "ready" || loadState === "idle") && (
              <>
                <button
                  onClick={() => {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    if (audioRef.current && !playing) { audioRef.current.src = ""; }
                    setPlaying((p) => !p);
                  }}
                  className="px-8 py-2.5 font-bold uppercase tracking-wider transition-all hover:scale-105"
                  style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    fontSize: "1rem",
                    letterSpacing: "0.2em",
                    background: playing ? "rgba(255,215,0,0.2)" : "#FF1744",
                    color: playing ? "#FFD700" : "white",
                    border: playing ? "1px solid rgba(255,215,0,0.4)" : "none",
                    clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
                    boxShadow: playing ? "none" : "0 0 20px rgba(255,23,68,0.4)",
                  }}
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
                >
                  ⟲
                </button>
              </>
            )}

            {/* Loading state indicator */}
            {loadState === "loading" && (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full animate-spin border-2 border-transparent" style={{ borderTopColor: "#FFD700" }} />
                <span style={{ fontFamily: "Noto Sans, sans-serif", fontSize: "0.85rem", color: "rgba(255,215,0,0.7)" }}>
                  Loading {loadProgress}%...
                </span>
              </div>
            )}

            <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}>
              STEP 6 — DRAMA REEL
            </span>
          </div>

          {/* Scene strip */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scenes.map((s, i) => {
              const m = sceneMedia[s.id];
              const isActive = i === currentScene;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSceneClick(i)}
                  className="flex-shrink-0 rounded overflow-hidden transition-all hover:scale-105"
                  style={{
                    width: "120px",
                    border: `2px solid ${isActive ? roleColors[s.speakerRole] || "#FFD700" : "rgba(255,255,255,0.08)"}`,
                    background: isActive ? "rgba(255,23,68,0.1)" : "rgba(255,255,255,0.03)",
                    boxShadow: isActive ? `0 0 12px ${roleColors[s.speakerRole] || "#FFD700"}50` : "none",
                  }}
                >
                  {/* Thumbnail — video frame or colored block */}
                  <div className="relative" style={{ height: "60px", background: "#0a0a14", overflow: "hidden" }}>
                    {m?.videoUrl ? (
                      <video
                        src={m.videoUrl}
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        style={{ opacity: 0.7 }}
                      />
                    ) : (
                      <div
                        className="w-full h-full speed-lines"
                        style={{ background: `radial-gradient(ellipse at center, ${roleColors[s.speakerRole] || "#FFD700"}20, #0a0a14)` }}
                      />
                    )}
                    {/* Scene number badge */}
                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{ background: isActive ? "#FF1744" : "rgba(0,0,0,0.6)", color: "white", fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
                      {i + 1}
                    </div>
                    {/* Ready indicator */}
                    {m?.videoReady && m?.audioReady && (
                      <div className="absolute top-1 right-1 text-[8px]" style={{ color: "#2ECC71" }}>✓</div>
                    )}
                  </div>
                  <div className="px-1.5 py-1">
                    <div className="text-[9px] uppercase truncate" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: isActive ? roleColors[s.speakerRole] || "#FFD700" : "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>
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
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: "1.1rem",
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
  );
}
