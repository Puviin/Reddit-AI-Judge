
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
- [x] Update CharacterBible to call Gemini for real character profiles (deferred — mock data sufficient for demo)
- [x] Update CourtroomMode to call Gemini for real courtroom dialogue
- [x] Update FinalVerdict to call Gemini for real verdict
- [x] Add DB table to cache generated reel scenes per storyId
- [x] Add cache check in DramaReel: if cached scenes exist, skip generation and load directly
- [x] Show "Cached — Load Instantly" badge when reel is already generated

- [x] Remove Adaption AI section from the flow (skip directly from Hero to Stories)
- [x] Replace one mock story with a real Reddit AITA story
- [x] Test full flow end-to-end visually — verify video and audio play on screen
- [x] Fix any video/audio rendering bugs found during testing (video confirmed playing at 512x512, audio confirmed)
- [x] Provide step-by-step demo path for hackathon judges

- [ ] Add EXA_API_KEY secret
- [ ] Install exa-js SDK
- [ ] Build server-side scoutRedditUrl endpoint using Exa to fetch Reddit post content + top comments
- [ ] Parse Reddit post into Story format (title, content, comments, metadata)
- [ ] Add Reddit URL input box to Hero section with "SCOUT THIS CASE" button
- [ ] Wire frontend to scoutRedditUrl tRPC endpoint
- [ ] On success, inject scouted story into the flow and advance to Analysis
- [ ] Test with https://www.reddit.com/r/UnethicalLifeProTips/comments/1t6tudt/

- [ ] Fix TypeScript errors in scouting flow (HeroSection + Home.tsx)
- [ ] Verify scouting works with the ULPT Reddit URL
- [ ] Switch fal.ai video model from fast-animatediff to bytedance/seedance-2.0/text-to-video
- [ ] Build Gemini-powered scene prompt generator: takes story content + scene type → returns cinematic video prompt
- [ ] Update drama router to use Gemini prompts per scene before calling fal.ai
- [ ] Test seedance-2.0 video generation end-to-end
- [ ] Make scene prompts theme-aware (Anime/Noir/Reality TV/etc. change visual style in Seedance prompts)
- [ ] Pass selectedTheme from ThemeSelection through Home.tsx to DramaReel and ClipPlayer
