
- [x] Fix video not rendering — video element was hidden behind character image overlay, needs to be full-screen foreground
- [x] Make video full-screen center stage (not a background layer behind character images)
- [x] Gate playback: show loading screen until ALL video + audio assets are fully loaded (canplaythrough events)
- [x] Remove character image carousel layout — replace with full-bleed video + subtitle overlay

- [x] Test full reel generation end-to-end via server API
- [x] Add per-scene progress bar with scene name, status (queued/generating/done/error), and estimated time
- [x] Stream scene-by-scene progress back to frontend (server-sent events or polling)
- [x] Show video thumbnail preview as each scene completes

- [x] Add Gemini API key as secret (GEMINI_API_KEY)
- [x] Build server-side Gemini router: analyzeStory, generateCharacterBible, generateCourtroomDialogue, generateVerdict
- [x] Update StoryAnalysis to call Gemini for real analysis (drama score, sentiment, key evidence)
- [ ] Update CharacterBible to call Gemini for real character profiles (deferred)
- [x] Update CourtroomMode to call Gemini for real courtroom dialogue
- [x] Update FinalVerdict to call Gemini for real verdict
- [x] Add DB table to cache generated reel scenes per storyId
- [x] Add cache check in DramaReel: if cached scenes exist, skip generation and load directly
- [x] Show "Cached — Load Instantly" badge when reel is already generated
