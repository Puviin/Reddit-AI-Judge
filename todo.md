
- [x] Fix video not rendering — video element was hidden behind character image overlay, needs to be full-screen foreground
- [x] Make video full-screen center stage (not a background layer behind character images)
- [x] Gate playback: show loading screen until ALL video + audio assets are fully loaded (canplaythrough events)
- [x] Remove character image carousel layout — replace with full-bleed video + subtitle overlay

- [x] Test full reel generation end-to-end via server API
- [x] Add per-scene progress bar with scene name, status (queued/generating/done/error), and estimated time
- [x] Stream scene-by-scene progress back to frontend (server-sent events or polling)
- [x] Show video thumbnail preview as each scene completes
