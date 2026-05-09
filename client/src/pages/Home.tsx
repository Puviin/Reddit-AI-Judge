// DRAMAFORGE SCOUT — Home Page
// Design: Anime Legal Battle — Deep Navy + Electric Red + Gold
// All sections flow linearly like a manga story arc

import { useState } from "react";
import HeroSection from "@/components/sections/HeroSection";
import AdaptionPipeline from "@/components/sections/AdaptionPipeline";
import StorySelection from "@/components/sections/StorySelection";
import StoryAnalysis from "@/components/sections/StoryAnalysis";
import ThemeSelection from "@/components/sections/ThemeSelection";
import CharacterBible from "@/components/sections/CharacterBible";
import DramaReel from "@/components/sections/DramaReel";
import ClipPlayer from "@/components/sections/ClipPlayer";
import CourtroomMode from "@/components/sections/CourtroomMode";
import FinalVerdict from "@/components/sections/FinalVerdict";
import StepProgress from "@/components/StepProgress";
import { stories, themes } from "@/lib/mockData";
import type { Story } from "@/lib/mockData";

export type AppStep =
  | "hero"
  | "adaption"
  | "stories"
  | "analysis"
  | "theme"
  | "characters"
  | "drama-reel"
  | "clip"
  | "courtroom"
  | "verdict";

interface AiAnalysis {
  dramaScore: number;
  safetyRating: string;
  sentiment: { plaintiff: number; defendant: number; publicOpinion: number };
  keyEvidence: string[];
  dramaticSummary: string;
  verdictHint: string;
  tags: string[];
  funnyCommentHighlight: string;
}

const STEPS: { id: AppStep; label: string }[] = [
  { id: "hero", label: "Scout" },
  { id: "adaption", label: "Pipeline" },
  { id: "stories", label: "Cases" },
  { id: "analysis", label: "Analysis" },
  { id: "theme", label: "Theme" },
  { id: "characters", label: "Cast" },
  { id: "drama-reel", label: "Drama" },
  { id: "clip", label: "Clip" },
  { id: "courtroom", label: "Court" },
  { id: "verdict", label: "Verdict" },
];

export default function Home() {
  const [currentStep, setCurrentStep] = useState<AppStep>("hero");
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);

  const goTo = (step: AppStep) => {
    setCurrentStep(step);
    setTimeout(() => {
      document.getElementById("main-content")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleStorySelect = (story: Story) => {
    setSelectedStory(story);
    setAiAnalysis(null); // reset AI analysis for new story
    goTo("analysis");
  };

  const handleAnalysisContinue = (analysis?: AiAnalysis) => {
    if (analysis) setAiAnalysis(analysis);
    goTo("theme");
  };

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    goTo("characters");
  };

  const handleReset = () => {
    setSelectedStory(null);
    setSelectedTheme(null);
    setAiAnalysis(null);
    setCurrentStep("hero");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="min-h-screen" style={{ background: "#0A0E1A" }}>
      {/* Sticky progress stepper */}
      {currentStep !== "hero" && (
        <div className="sticky top-0 z-50" style={{ background: "rgba(10,14,26,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,215,0,0.15)" }}>
          <StepProgress steps={STEPS} currentStep={currentStep} onStepClick={(s) => {
            const clickIdx = STEPS.findIndex(st => st.id === s);
            if (clickIdx <= currentStepIndex) goTo(s);
          }} />
        </div>
      )}

      <div id="main-content">
        {currentStep === "hero" && (
          <HeroSection onStart={() => goTo("adaption")} />
        )}

        {currentStep === "adaption" && (
          <AdaptionPipeline onContinue={() => goTo("stories")} />
        )}

        {currentStep === "stories" && (
          <StorySelection
            stories={stories}
            onSelect={handleStorySelect}
          />
        )}

        {currentStep === "analysis" && selectedStory && (
          <StoryAnalysis
            story={selectedStory}
            onContinue={handleAnalysisContinue}
          />
        )}

        {currentStep === "theme" && (
          <ThemeSelection
            themes={themes}
            onSelect={handleThemeSelect}
          />
        )}

        {currentStep === "characters" && selectedStory && (
          <CharacterBible
            storyId={selectedStory.id}
            onContinue={() => goTo("drama-reel")}
          />
        )}

        {currentStep === "drama-reel" && selectedStory && (
          <DramaReel
            story={selectedStory}
            theme={selectedTheme || "anime-courtroom"}
            onContinue={() => goTo("clip")}
          />
        )}

        {currentStep === "clip" && selectedStory && (
          <ClipPlayer
            storyId={selectedStory.id}
            onFinish={() => goTo("courtroom")}
          />
        )}

        {currentStep === "courtroom" && selectedStory && (
          <CourtroomMode
            storyId={selectedStory.id}
            onContinue={() => goTo("verdict")}
            aiAnalysis={aiAnalysis}
          />
        )}

        {currentStep === "verdict" && selectedStory && (
          <FinalVerdict
            storyId={selectedStory.id}
            onReplay={() => goTo("clip")}
            onReset={handleReset}
            aiAnalysis={aiAnalysis}
          />
        )}
      </div>
    </div>
  );
}
