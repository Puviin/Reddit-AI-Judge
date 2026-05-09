# Seedance 2.0 Prompting Strategy for DramaForge Scout

## API Endpoint
- Model ID: `bytedance/seedance-2.0/text-to-video`
- Fast tier: `bytedance/seedance-2.0/fast/text-to-video`
- Endpoint: `POST https://fal.run/bytedance/seedance-2.0/text-to-video`

## Input Schema
| Parameter | Type | Default | Notes |
|---|---|---|---|
| `prompt` | string | required | Scene + action + dialogue in quotes + audio cues + style |
| `resolution` | string | `"720p"` | `"480p"` or `"720p"` |
| `duration` | string | `"auto"` | `"auto"` or `"4"` through `"15"` |
| `aspect_ratio` | string | `"auto"` | `"16:9"` for cinematic, `"9:16"` for mobile |
| `generate_audio` | boolean | `true` | Native audio sync — KEEP TRUE for drama |
| `seed` | integer | random | For reproducibility |

## Output Schema
```json
{
  "video": {
    "url": "https://v3b.fal.media/files/...",
    "content_type": "video/mp4",
    "file_name": "video.mp4",
    "file_size": 4352150
  },
  "seed": 1094575694
}
```
Access: `result.data.video.url`

## Pricing
- 720p with audio: $0.3034/second
- Fast 720p: $0.2419/second
- 5-second clip = ~$1.52 standard, ~$1.21 fast

## The Four-Layer Prompt Structure (Seedance 1.5/2.0)
1. **Primary Action/Subject** — who, what, where
2. **Dialogue or Key Sound** — wrap speech in "double quotes" for lip-sync
3. **Environmental Audio Cues** — ambient sounds, foley, atmosphere
4. **Visual Style and Mood** — cinematic style, camera, tone

## DramaForge Scene Prompt Template
```
[SHOT STRUCTURE]: Montage, multi-shot anime courtroom drama, cinematic lighting, 
anime art style with bold outlines and vibrant colors, speed lines on impact moments, 
dramatic manga panel energy, 16:9

[SCENE]: [Character description] [action] [location]. [Dialogue in "quotes"]. 
[Reaction/consequence].

Shot 1: [specific shot description with camera angle]
Shot 2: [specific shot description]
...

[AUDIO]: [ambient sounds], [character sounds], [music cue], [impact SFX]

Total: [duration]s / [N] shots / 16:9
```

## Key Tips for DramaForge
- **Anime style**: Use "anime art style, bold black outlines, vibrant cel-shading, speed lines, manga panel composition, dramatic lighting"
- **Courtroom drama**: "marble floors, wooden benches, gavel impacts, dramatic overhead lighting, jury box reactions"
- **Dialogue lip-sync**: Put all spoken lines in "double quotes" — model generates matching lip movements
- **Multi-shot**: Always specify shot count and total duration upfront
- **Audio**: Describe gavel bangs, crowd gasps, dramatic music stings, paper rustling
- **Duration**: Use `"auto"` for story-driven scenes, or `"5"` to `"10"` for controlled clips
- **Aspect ratio**: `"16:9"` for cinematic drama reel

## Scene Types for DramaForge
1. **THE INCIDENT** — establishing shot of the drama moment (wide, chaotic energy)
2. **THE SETUP** — character introductions, conflict brewing (medium shots)
3. **THE CONFRONTATION** — heated argument, accusations (close-ups, speed lines)
4. **THE COMMENTS** — Reddit jury reactions (split screen energy, crowd shots)
5. **THE VERDICT PREVIEW** — dramatic courtroom reveal (gavel, judge close-up)
6. **THE AFTERMATH** — consequences, reactions (emotional close-ups)
