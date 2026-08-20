// Shared per-scene media state for the reel players: keeps generated video/audio
// URLs, preloads them and reports overall buffering progress.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SceneMedia = {
  videoUrl: string | null;
  audioUrl: string | null;
  mediaType?: "video" | "image";
  videoReady: boolean;
  audioReady: boolean;
};

export type SceneMediaSource = {
  id: string;
  videoUrl: string | null;
  audioUrl: string | null;
  mediaType?: "video" | "image";
};

type ReadyFlag = "videoReady" | "audioReady";

function preloadElement(kind: "video" | "audio", src: string, onSettled: () => void) {
  const el = document.createElement(kind);
  el.preload = "auto";
  el.src = src;
  el.addEventListener("canplaythrough", onSettled, { once: true });
  el.addEventListener("error", onSettled, { once: true });
  el.load();
}

export function useSceneMedia({
  sceneIds,
  preloading,
}: {
  sceneIds: string[];
  preloading: boolean;
}) {
  const [sceneMedia, setSceneMedia] = useState<Record<string, SceneMedia>>({});
  const [loadProgress, setLoadProgress] = useState(0);
  const preloadedRef = useRef<Set<string>>(new Set());

  const sceneIdsKey = sceneIds.join("|");
  const sceneCount = sceneIds.length;

  const setMedia = useCallback((sources: SceneMediaSource[]) => {
    if (!sources.length) return;
    setSceneMedia(prev => {
      const next = { ...prev };
      let changed = false;
      for (const source of sources) {
        const current = prev[source.id];
        // Polling re-reports finished scenes; keep readiness for unchanged assets
        if (
          current &&
          current.videoUrl === source.videoUrl &&
          current.audioUrl === source.audioUrl &&
          current.mediaType === source.mediaType
        ) {
          continue;
        }
        next[source.id] = {
          videoUrl: source.videoUrl,
          audioUrl: source.audioUrl,
          mediaType: source.mediaType,
          videoReady: !source.videoUrl,
          audioReady: !source.audioUrl,
        };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  const markReady = useCallback((id: string, flag: ReadyFlag) => {
    setSceneMedia(prev => ({ ...prev, [id]: { ...prev[id], [flag]: true } }));
  }, []);

  const ids = useMemo(() => sceneIdsKey.split("|").filter(Boolean), [sceneIdsKey]);

  // Preload every scene's assets once they are known
  useEffect(() => {
    if (!preloading) return;
    for (const id of ids) {
      const media = sceneMedia[id];
      if (!media) continue;
      if (media.videoUrl && !media.videoReady && !preloadedRef.current.has(media.videoUrl)) {
        preloadedRef.current.add(media.videoUrl);
        preloadElement("video", media.videoUrl, () => markReady(id, "videoReady"));
      }
      if (media.audioUrl && !media.audioReady && !preloadedRef.current.has(media.audioUrl)) {
        preloadedRef.current.add(media.audioUrl);
        preloadElement("audio", media.audioUrl, () => markReady(id, "audioReady"));
      }
    }
  }, [preloading, sceneMedia, ids, markReady]);

  // Overall progress across video + audio of every scene
  useEffect(() => {
    if (!preloading) return;
    const total = sceneCount * 2;
    if (total === 0) return;
    const ready = Object.values(sceneMedia).reduce(
      (acc, m) => acc + (m.videoReady ? 1 : 0) + (m.audioReady ? 1 : 0),
      0
    );
    setLoadProgress(Math.round((ready / total) * 100));
  }, [sceneMedia, preloading, sceneCount]);

  return { sceneMedia, setMedia, loadProgress };
}
