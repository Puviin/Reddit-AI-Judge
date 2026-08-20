// Media playback helpers.
// Autoplay rejections (browser policy) and interrupted plays are expected and
// ignored; anything else is a real failure and must not disappear silently.

const EXPECTED_PLAY_ERRORS = new Set(["NotAllowedError", "AbortError"]);

export function playMedia(el: HTMLMediaElement, label: string): void {
  el.play().catch((err: unknown) => {
    const name = err instanceof DOMException ? err.name : "";
    if (EXPECTED_PLAY_ERRORS.has(name)) return;
    console.error(`[Media] Failed to play ${label} (${el.currentSrc || el.src}):`, err);
  });
}
