import { useState } from 'react';
import { useProposalStore } from '../../lib/proposal-store';
import { useTranslation } from '../../lib/useTranslation';

export function Step3TechSpecs() {
  const { t } = useTranslation();
  const specs = useProposalStore((s) => s.data.techSpecs);
  const addTechSpec = useProposalStore((s) => s.addTechSpec);
  const removeTechSpec = useProposalStore((s) => s.removeTechSpec);
  const updateTechSpec = useProposalStore((s) => s.updateTechSpec);
  const addTechSpecWithData = useProposalStore((s) => s.addTechSpecWithData);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const feasibilityColors = {
    green: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700' },
    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700' },
    red: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700' },
  };

  const handleBulkAdd = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines) {
      addTechSpecWithData({ text: line, included: true, feasibility: 'green' });
    }
    setBulkText('');
    setShowBulk(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-alysophil-dark mb-2">{t('steps.techSpecs')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('techSpecs.description')}</p>

      <div className="space-y-3">
        {specs.map((spec) => {
          const colors = feasibilityColors[spec.feasibility];
          return (
            <div
              key={spec.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${colors.border} ${colors.bg}`}
            >
              <input
                type="checkbox"
                checked={spec.included}
                onChange={(e) => updateTechSpec(spec.id, { included: e.target.checked })}
                className="w-5 h-5 accent-alysophil-yellow"
              />
              <input
                type="text"
                value={spec.text}
                onChange={(e) => updateTechSpec(spec.id, { text: e.target.value })}
                className="flex-1 bg-transparent border-none outline-none text-sm"
                placeholder={t('techSpecs.specPlaceholder')}
              />
              <select
                value={spec.feasibility}
                onChange={(e) => updateTechSpec(spec.id, { feasibility: e.target.value as 'green' | 'yellow' | 'red' })}
                className={`text-xs px-2 py-1 rounded border ${colors.text} bg-white`}
              >
                <option value="green">{t('techSpecs.feasible')}</option>
                <option value="yellow">{t('techSpecs.conditional')}</option>
                <option value="red">{t('techSpecs.notFeasible')}</option>
              </select>
              <button
                onClick={() => removeTechSpec(spec.id)}
                className="text-red-400 hover:text-red-600 text-lg"
                title={t('common.delete')}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={addTechSpec}
          className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-alysophil-yellow hover:text-alysophil-dark transition-colors"
        >
          + {t('techSpecs.addSpec')}
        </button>
        <button
          onClick={() => setShowBulk(!showBulk)}
          className="px-4 py-2 bg-alysophil-dark text-white rounded-lg hover:bg-alysophil-dark/80 transition-colors text-sm"
        >
          📋 {t('techSpecs.bulkAdd')}
        </button>
      </div>

      {/* Bulk paste area */}
      {showBulk && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 mb-2 font-semibold">{t('techSpecs.bulkHint')}</p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={6}
            placeholder={t('techSpecs.bulkPlaceholder')}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm resize-y"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setBulkText(''); setShowBulk(false); }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleBulkAdd}
              disabled={!bulkText.trim()}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
            >
              {t('techSpecs.bulkAdd')} ({bulkText.split('\n').filter(l => l.trim()).length} specs)
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-semibold text-gray-600 mb-2">{t('techSpecs.legend')}</p>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-400 rounded" /> {t('techSpecs.feasible')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-400 rounded" /> {t('techSpecs.conditional')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-400 rounded" /> {t('techSpecs.notFeasible')}
          </span>
        </div>
      </div>
    </div>
  );
}
