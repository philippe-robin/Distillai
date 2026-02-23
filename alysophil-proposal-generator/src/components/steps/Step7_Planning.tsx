import { useProposalStore } from '../../lib/proposal-store';
import { useTranslation } from '../../lib/useTranslation';

export function Step7Planning() {
  const { t } = useTranslation();
  const planning = useProposalStore((s) => s.data.planning);
  const workPackages = useProposalStore((s) => s.data.workPackages);
  const setPlanning = useProposalStore((s) => s.setPlanning);

  const totalWpWeeks = workPackages.reduce((sum, wp) => sum + wp.durationWeeks, 0);
  const totalWithVacation = totalWpWeeks + planning.vacationWeeks;

  // Gantt preview
  const maxWeeks = Math.max(totalWithVacation, 1);

  return (
    <div>
      <h2 className="text-2xl font-bold text-alysophil-dark mb-6">{t('steps.planning')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="text-sm font-semibold text-gray-700">{t('planning.startDate')}</label>
          <input
            type="date"
            value={planning.startDate}
            onChange={(e) => setPlanning({ startDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">{t('planning.vacationWeeks')}</label>
          <input
            type="number"
            min={0}
            max={12}
            value={planning.vacationWeeks}
            onChange={(e) => setPlanning({ vacationWeeks: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">{t('planning.totalWeeks')}</label>
          <div className="mt-1 px-3 py-2 bg-alysophil-yellow/20 rounded-lg text-lg font-bold text-alysophil-dark">
            {totalWithVacation} {t('planning.weeksLabel')}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {totalWpWeeks} {t('planning.workWeeks')} + {planning.vacationWeeks} {t('planning.vacationLabel')}
          </p>
        </div>
      </div>

      {/* Gantt Preview */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">{t('planning.ganttPreview')}</h3>

        {/* Week headers */}
        <div className="flex gap-0.5 mb-2">
          <div className="w-40 text-xs text-gray-400 flex-shrink-0" />
          {Array.from({ length: maxWeeks }, (_, i) => (
            <div key={i} className="flex-1 text-center text-xs text-gray-400 min-w-[24px]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* WP bars */}
        {(() => {
          let startWeek = 0;
          return workPackages.map((wp, index) => {
            const bar = (
              <div key={wp.id} className="flex items-center gap-0.5 mb-1">
                <div className="w-40 text-xs text-gray-600 truncate flex-shrink-0 font-medium">
                  WP{index + 1}: {wp.title}
                </div>
                {Array.from({ length: maxWeeks }, (_, i) => {
                  const isActive = i >= startWeek && i < startWeek + wp.durationWeeks;
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-6 rounded-sm min-w-[24px] ${
                        isActive ? 'bg-alysophil-yellow' : 'bg-gray-200'
                      }`}
                    />
                  );
                })}
              </div>
            );
            startWeek += wp.durationWeeks;
            return bar;
          });
        })()}

        {/* Vacation bar */}
        {planning.vacationWeeks > 0 && (
          <div className="flex items-center gap-0.5 mb-1">
            <div className="w-40 text-xs text-gray-400 flex-shrink-0 italic">
              {t('planning.vacation')}
            </div>
            {Array.from({ length: maxWeeks }, (_, i) => {
              const isVacation = i >= totalWpWeeks && i < totalWithVacation;
              return (
                <div
                  key={i}
                  className={`flex-1 h-6 rounded-sm min-w-[24px] ${
                    isVacation ? 'bg-gray-400' : 'bg-gray-200'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
