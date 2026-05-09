// DRAMAFORGE SCOUT — Step Progress Bar
// Anime Legal Battle style — gold/red progress indicators

import type { AppStep } from "@/pages/Home";

interface Step {
  id: AppStep;
  label: string;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: AppStep;
  onStepClick: (step: AppStep) => void;
}

export default function StepProgress({ steps, currentStep, onStepClick }: StepProgressProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="container py-3">
      <div className="flex items-center justify-between gap-1 overflow-x-auto">
        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isActive = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => onStepClick(step.id)}
                disabled={isPending}
                className="flex flex-col items-center gap-1 flex-shrink-0 group disabled:cursor-not-allowed"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? "step-active text-white scale-110"
                      : isDone
                      ? "step-done text-[#0A0E1A]"
                      : "step-pending text-white/40"
                  }`}
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                >
                  {isDone ? "✓" : idx + 1}
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors ${
                    isActive ? "text-[#FF1744]" : isDone ? "text-[#FFD700]" : "text-white/30"
                  }`}
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: "0.1em" }}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="flex-1 h-px mx-1 transition-all duration-500" style={{
                  background: isDone
                    ? "linear-gradient(90deg, #FFD700, #FF1744)"
                    : "rgba(255,255,255,0.1)"
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
