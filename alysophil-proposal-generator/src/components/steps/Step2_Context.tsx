import { useState } from 'react';
import { useProposalStore } from '../../lib/proposal-store';
import { useTranslation } from '../../lib/useTranslation';
import { AIAssistant } from '../ai/AIAssistant';

export function Step2Context() {
  const { t } = useTranslation();
  const context = useProposalStore((s) => s.data.context);
  const need = useProposalStore((s) => s.data.need);
  const setContext = useProposalStore((s) => s.setContext);
  const setNeed = useProposalStore((s) => s.setNeed);
  const clientName = useProposalStore((s) => s.data.client.name);
  const [showAI, setShowAI] = useState(false);
  const [aiTarget, setAiTarget] = useState<'context' | 'need'>('context');

  const handleAIResult = (text: string) => {
    if (aiTarget === 'context') setContext(text);
    else setNeed(text);
    setShowAI(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-alysophil-dark mb-6">{t('steps.context')}</h2>

      <div className="space-y-6">
        {/* Context */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-semibold text-gray-700">
              {t('context.contextLabel')} *
            </label>
            <button
              onClick={() => { setAiTarget('context'); setShowAI(true); }}
              className="text-sm px-3 py-1 bg-alysophil-dark text-white rounded-lg hover:bg-alysophil-dark/80 transition-colors flex items-center gap-1"
            >
              <span>AI</span>
              <span className="text-alysophil-yellow">Assist</span>
            </button>
          </div>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={8}
            placeholder={t('context.contextPlaceholder')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none resize-y"
          />
          <p className="text-xs text-gray-400 mt-1">{t('context.contextHint')}</p>
        </div>

        {/* Need */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-semibold text-gray-700">
              {t('context.needLabel')} *
            </label>
            <button
              onClick={() => { setAiTarget('need'); setShowAI(true); }}
              className="text-sm px-3 py-1 bg-alysophil-dark text-white rounded-lg hover:bg-alysophil-dark/80 transition-colors flex items-center gap-1"
            >
              <span>AI</span>
              <span className="text-alysophil-yellow">Assist</span>
            </button>
          </div>
          <textarea
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            rows={4}
            placeholder={t('context.needPlaceholder')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none resize-y"
          />
        </div>
      </div>

      {/* AI Assistant Panel */}
      {showAI && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <AIAssistant
              initialContext={
                aiTarget === 'context'
                  ? `${t('context.aiContextPrompt')} ${clientName}. ${t('context.aiCurrentText')}: ${context || '(empty)'}`
                  : `${t('context.aiNeedPrompt')} ${clientName}. ${t('context.aiCurrentText')}: ${need || '(empty)'}`
              }
              onInsert={handleAIResult}
              onClose={() => setShowAI(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
