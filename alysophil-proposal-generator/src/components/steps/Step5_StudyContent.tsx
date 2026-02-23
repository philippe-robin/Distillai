import { useState } from 'react';
import { useProposalStore } from '../../lib/proposal-store';
import { useTranslation } from '../../lib/useTranslation';
import { AIAssistant } from '../ai/AIAssistant';

export function Step5StudyContent() {
  const { t } = useTranslation();
  const workPackages = useProposalStore((s) => s.data.workPackages);
  const addWorkPackage = useProposalStore((s) => s.addWorkPackage);
  const removeWorkPackage = useProposalStore((s) => s.removeWorkPackage);
  const updateWorkPackage = useProposalStore((s) => s.updateWorkPackage);
  const [showAI, setShowAI] = useState(false);
  const [aiWpId, setAiWpId] = useState('');

  const handleAIResult = (text: string) => {
    if (aiWpId) {
      updateWorkPackage(aiWpId, { description: text });
    }
    setShowAI(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-alysophil-dark mb-2">{t('steps.studyContent')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('studyContent.description')}</p>

      <div className="space-y-6">
        {workPackages.map((wp, index) => (
          <div key={wp.id} className="border border-gray-200 rounded-lg p-5 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-alysophil-dark">
                WP{index + 1}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setAiWpId(wp.id); setShowAI(true); }}
                  className="text-xs px-2 py-1 bg-alysophil-dark text-white rounded hover:bg-alysophil-dark/80 transition-colors"
                >
                  AI Assist
                </button>
                {workPackages.length > 1 && (
                  <button
                    onClick={() => removeWorkPackage(wp.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">{t('studyContent.wpTitle')}</label>
                <input
                  type="text"
                  value={wp.title}
                  onChange={(e) => updateWorkPackage(wp.id, { title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">{t('studyContent.duration')}</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={wp.durationWeeks}
                    onChange={(e) => updateWorkPackage(wp.id, { durationWeeks: parseInt(e.target.value) || 1 })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm"
                  />
                  <span className="text-sm text-gray-500">{t('studyContent.weeks')}</span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-gray-600">{t('studyContent.objective')}</label>
              <input
                type="text"
                value={wp.objective}
                onChange={(e) => updateWorkPackage(wp.id, { objective: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm mt-1"
              />
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-gray-600">{t('studyContent.wpDescription')}</label>
              <textarea
                value={wp.description}
                onChange={(e) => updateWorkPackage(wp.id, { description: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm mt-1 resize-y"
              />
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-gray-600">{t('studyContent.deliverables')}</label>
              {wp.deliverables.map((d, di) => (
                <div key={di} className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={d}
                    onChange={(e) => {
                      const newDeliverables = [...wp.deliverables];
                      newDeliverables[di] = e.target.value;
                      updateWorkPackage(wp.id, { deliverables: newDeliverables });
                    }}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm"
                  />
                  <button
                    onClick={() => {
                      const newDeliverables = wp.deliverables.filter((_, i) => i !== di);
                      updateWorkPackage(wp.id, { deliverables: newDeliverables });
                    }}
                    className="text-red-400 hover:text-red-600"
                  >
                    x
                  </button>
                </div>
              ))}
              <button
                onClick={() => updateWorkPackage(wp.id, { deliverables: [...wp.deliverables, ''] })}
                className="mt-2 text-sm text-alysophil-dark hover:text-alysophil-yellow"
              >
                + {t('studyContent.addDeliverable')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addWorkPackage}
        className="mt-4 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-alysophil-yellow hover:text-alysophil-dark transition-colors w-full"
      >
        + {t('studyContent.addWP')}
      </button>

      {showAI && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <AIAssistant
              initialContext={`Write the detailed description for Work Package "${workPackages.find(w => w.id === aiWpId)?.title}". Objective: ${workPackages.find(w => w.id === aiWpId)?.objective}`}
              onInsert={handleAIResult}
              onClose={() => setShowAI(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
