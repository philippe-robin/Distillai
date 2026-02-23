import { useState } from 'react';
import { useProposalStore } from '../../lib/proposal-store';
import { useTranslation } from '../../lib/useTranslation';
import { AIAssistant } from '../ai/AIAssistant';

type MethodField = 'predictionDescription' | 'generationDescription' | 'challengesDescription' | 'encouragingResearch' | 'position';

export function Step4Methodology() {
  const { t } = useTranslation();
  const methodology = useProposalStore((s) => s.data.methodology);
  const setMethodology = useProposalStore((s) => s.setMethodology);
  const [showAI, setShowAI] = useState(false);
  const [aiField, setAiField] = useState<MethodField>('predictionDescription');

  const fields: { key: MethodField; label: string; rows: number }[] = [
    { key: 'predictionDescription', label: t('methodology.prediction'), rows: 4 },
    { key: 'generationDescription', label: t('methodology.generation'), rows: 4 },
    { key: 'challengesDescription', label: t('methodology.challenges'), rows: 4 },
    { key: 'encouragingResearch', label: t('methodology.encouragingResearch'), rows: 4 },
    { key: 'position', label: t('methodology.position'), rows: 4 },
  ];

  const handleAIResult = (text: string) => {
    setMethodology({ [aiField]: text });
    setShowAI(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-alysophil-dark mb-2">{t('steps.methodology')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('methodology.description')}</p>

      <div className="space-y-5">
        {fields.map(({ key, label, rows }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-gray-700">{label}</label>
              <button
                onClick={() => { setAiField(key); setShowAI(true); }}
                className="text-xs px-2 py-1 bg-alysophil-dark text-white rounded hover:bg-alysophil-dark/80 transition-colors"
              >
                AI Assist
              </button>
            </div>
            <textarea
              value={methodology[key]}
              onChange={(e) => setMethodology({ [key]: e.target.value })}
              rows={rows}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none resize-y text-sm"
              placeholder={t('methodology.placeholder')}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">{t('methodology.hint')}</p>
      </div>

      {showAI && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <AIAssistant
              initialContext={`Write content for the "${fields.find(f => f.key === aiField)?.label}" section of an Alysophil proposal. Current text: ${methodology[aiField] || '(empty)'}`}
              onInsert={handleAIResult}
              onClose={() => setShowAI(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
