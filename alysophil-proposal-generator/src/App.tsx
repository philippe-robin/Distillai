import { useState } from 'react';
import { useProposalStore } from './lib/proposal-store';
import { useTranslation } from './lib/useTranslation';
import { StepWizard } from './components/StepWizard';
import { LanguageSelector } from './components/LanguageSelector';
import { Step1ClientInfo } from './components/steps/Step1_ClientInfo';
import { Step2Context } from './components/steps/Step2_Context';
import { Step3TechSpecs } from './components/steps/Step3_TechSpecs';
import { Step4Methodology } from './components/steps/Step4_Methodology';
import { Step6Resources } from './components/steps/Step6_Resources';
import { Step7Planning } from './components/steps/Step7_Planning';
import { Step8Budget } from './components/steps/Step8_Budget';
import { Step9Preview } from './components/steps/Step9_Preview';
import { AISettings } from './components/ai/AISettings';

const STEPS = [
  'clientInfo',
  'context',
  'techSpecs',
  'studyContent',
  'resources',
  'planning',
  'budget',
  'preview',
] as const;

const STEP_COMPONENTS = [
  Step1ClientInfo,
  Step2Context,
  Step3TechSpecs,
  Step4Methodology,
  Step6Resources,
  Step7Planning,
  Step8Budget,
  Step9Preview,
];

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const { t } = useTranslation();
  const language = useProposalStore((s) => s.data.language);

  const StepComponent = STEP_COMPONENTS[currentStep];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-alysophil-dark text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-alysophil-yellow rounded-sm flex items-center justify-center font-bold text-alysophil-dark text-sm">
              A
            </div>
            <h1 className="text-lg font-bold">
              {t('app.title')}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded transition-colors"
              title={t('settings.title')}
            >
              {language === 'fr' ? 'Paramètres IA' : 'AI Settings'}
            </button>
          </div>
        </div>
      </header>

      {/* AI Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <AISettings onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Step Wizard Navigation */}
        <StepWizard
          steps={STEPS.map((key) => t(`steps.${key}`))}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />

        {/* Step Content */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <StepComponent />
        </div>

        {/* Navigation Buttons */}
        <div className="mt-4 flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('common.previous')}
          </button>
          <button
            onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
            disabled={currentStep === STEPS.length - 1}
            className="px-6 py-2 bg-alysophil-yellow text-alysophil-dark font-semibold rounded-lg hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('common.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
