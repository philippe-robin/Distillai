interface StepWizardProps {
  steps: string[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

export function StepWizard({ steps, currentStep, onStepClick }: StepWizardProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((label, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <button
            key={index}
            onClick={() => onStepClick(index)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
              isActive
                ? 'bg-alysophil-yellow text-alysophil-dark font-semibold shadow-sm'
                : isCompleted
                  ? 'bg-alysophil-dark/10 text-alysophil-dark hover:bg-alysophil-dark/20'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isActive
                  ? 'bg-alysophil-dark text-white'
                  : isCompleted
                    ? 'bg-alysophil-dark/60 text-white'
                    : 'bg-gray-300 text-white'
              }`}
            >
              {isCompleted ? '\u2713' : index + 1}
            </span>
            <span className="hidden md:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
