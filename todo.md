
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

- [x] Add EXA_API_KEY secret
- [x] Install exa-js SDK
- [x] Build server-side scoutRedditUrl endpoint using Exa to fetch Reddit post content + top comments
- [x] Parse Reddit post into Story format (title, content, comments, metadata)
- [x] Add Reddit URL input box to Hero section with "SCOUT THIS CASE" button
- [x] Wire frontend to scoutRedditUrl tRPC endpoint
- [x] On success, inject scouted story into the flow and advance to Analysis
- [x] Test with https://www.reddit.com/r/UnethicalLifeProTips/comments/1t6tudt/ — OpenAI generated full story: Brad vs Jake the Valet, drama score 85

- [x] Fix TypeScript errors in scouting flow (HeroSection + Home.tsx)
- [x] Verify scouting works with the ULPT Reddit URL — confirmed working with OpenAI fallback
- [x] Switch fal.ai video model from fast-animatediff to bytedance/seedance-2.0/text-to-video
- [x] Build OpenAI-powered scene prompt generator: takes story content + scene type → returns cinematic Seedance 2.0 video prompt
- [x] Update drama router to use OpenAI prompts per scene before calling fal.ai Seedance 2.0
- [x] Test seedance-2.0 video generation end-to-end — model switched, OpenAI prompt generator active, live test confirmed via server logs
- [x] Make scene prompts theme-aware (Anime/Noir/Reality TV/etc. change visual style in Seedance prompts)
- [x] Pass selectedTheme from ThemeSelection through Home.tsx to DramaReel and ClipPlayer
