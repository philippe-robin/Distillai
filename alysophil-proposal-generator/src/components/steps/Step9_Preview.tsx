import { useState } from 'react';
import { useProposalStore } from '../../lib/proposal-store';
import { useTranslation } from '../../lib/useTranslation';
import { generateProposal } from '../../lib/pptx-generator';

export function Step9Preview() {
  const { t } = useTranslation();
  const data = useProposalStore((s) => s.data);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const totalWeeks = data.workPackages.reduce((sum, wp) => sum + wp.durationWeeks, 0) + data.planning.vacationWeeks;
  const totalHT = totalWeeks * 5 * data.budget.fteCount * data.budget.dailyRate;

  const handleExport = async () => {
    setGenerating(true);
    setError('');
    try {
      await generateProposal(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-alysophil-dark mb-6">{t('steps.preview')}</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-alysophil-dark text-white rounded-lg p-4">
          <p className="text-xs uppercase opacity-70">{t('client.name')}</p>
          <p className="text-lg font-bold">{data.client.name || '---'}</p>
        </div>
        <div className="bg-alysophil-dark text-white rounded-lg p-4">
          <p className="text-xs uppercase opacity-70">{t('client.reference')}</p>
          <p className="text-lg font-bold">{data.client.reference || '---'}</p>
        </div>
        <div className="bg-alysophil-dark text-white rounded-lg p-4">
          <p className="text-xs uppercase opacity-70">{t('planning.totalWeeks')}</p>
          <p className="text-lg font-bold">{totalWeeks} {t('planning.weeksLabel')}</p>
        </div>
        <div className="bg-alysophil-yellow text-alysophil-dark rounded-lg p-4">
          <p className="text-xs uppercase opacity-70">{t('budget.totalHT')}</p>
          <p className="text-lg font-bold">{totalHT.toLocaleString()}{t('budget.currency')}</p>
        </div>
      </div>

      {/* Sections summary */}
      <div className="space-y-4 mb-8">
        <Section title={t('preview.contextSection')} complete={!!data.context}>
          <p className="text-sm text-gray-600 line-clamp-3">{data.context || t('preview.notFilled')}</p>
        </Section>

        <Section title={t('preview.specsSection')} complete={data.techSpecs.length > 0}>
          <p className="text-sm text-gray-600">
            {data.techSpecs.length} {t('preview.specsCount')}
            {data.techSpecs.filter(s => s.feasibility === 'green').length > 0 &&
              ` (${data.techSpecs.filter(s => s.feasibility === 'green').length} ${t('techSpecs.feasible')})`}
          </p>
        </Section>

        <Section title={t('preview.wpSection')} complete={data.workPackages.length > 0}>
          {data.workPackages.map((wp, i) => (
            <p key={wp.id} className="text-sm text-gray-600">
              WP{i + 1}: {wp.title} ({wp.durationWeeks} {t('studyContent.weeks')})
            </p>
          ))}
        </Section>

        <Section title={t('preview.teamSection')} complete={data.team.length > 0}>
          {data.team.map((m, i) => (
            <p key={i} className="text-sm text-gray-600">{m.role}: {m.name}</p>
          ))}
        </Section>
      </div>

      {/* Export button */}
      <div className="text-center">
        <button
          onClick={handleExport}
          disabled={generating || !data.client.name}
          className="px-8 py-3 bg-alysophil-yellow text-alysophil-dark font-bold text-lg rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          {generating ? t('preview.generating') : t('preview.exportPPTX')}
        </button>
        {!data.client.name && (
          <p className="text-sm text-red-500 mt-2">{t('preview.clientRequired')}</p>
        )}
        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}

function Section({ title, complete, children }: { title: string; complete: boolean; children: React.ReactNode }) {
  return (
    <div className={`p-4 rounded-lg border ${complete ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${complete ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'}`}>
          {complete ? '\u2713' : '!'}
        </span>
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      {children}
    </div>
  );
}
