import { Box, Grid3x3, FlaskConical, Play, BarChart3 } from "lucide-react";
import clsx from "clsx";
import { useWorkflowStore, type StepIndex } from "@/stores/workflowStore";

const stepIcons = [Box, Grid3x3, FlaskConical, Play, BarChart3];

export function WorkflowStepper() {
  const { currentStep, stepLabels, setStep, isStepComplete, isStepAccessible } =
    useWorkflowStore();

  return (
    <nav className="border-b border-border p-3">
      <div className="flex flex-col gap-1">
        {stepLabels.map((label, index) => {
          const Icon = stepIcons[index]!;
          const step = index as StepIndex;
          const isActive = currentStep === step;
          const isComplete = isStepComplete(step);
          const isAccessible = isStepAccessible(step);

          return (
            <button
              key={index}
              onClick={() => setStep(step)}
              disabled={!isAccessible}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150",
                isActive
                  ? "bg-accent/15 text-accent"
                  : isComplete
                    ? "text-success hover:bg-bg-tertiary"
                    : isAccessible
                      ? "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                      : "cursor-not-allowed text-text-secondary/40",
              )}
            >
              {/* Step indicator */}
              <div
                className={clsx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isActive
                    ? "border-accent bg-accent/20"
                    : isComplete
                      ? "border-success bg-success/20"
                      : "border-border bg-bg-primary",
                )}
              >
                {isComplete && !isActive ? (
                  <svg
                    className="h-3.5 w-3.5 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <Icon size={14} />
                )}
              </div>

              {/* Label */}
              <span className="font-medium">{label}</span>

              {/* Step number */}
              <span
                className={clsx(
                  "ml-auto text-xs",
                  isActive ? "text-accent/70" : "text-text-secondary/40",
                )}
              >
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
