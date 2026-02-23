import { useProposalStore } from '../../lib/proposal-store';
import { useTranslation } from '../../lib/useTranslation';

export function Step8Budget() {
  const { t } = useTranslation();
  const budget = useProposalStore((s) => s.data.budget);
  const workPackages = useProposalStore((s) => s.data.workPackages);
  const planning = useProposalStore((s) => s.data.planning);
  const setBudget = useProposalStore((s) => s.setBudget);

  const totalWeeks = workPackages.reduce((sum, wp) => sum + wp.durationWeeks, 0) + planning.vacationWeeks;
  const totalHT = totalWeeks * 5 * budget.fteCount * budget.dailyRate;
  const vat = totalHT * (budget.vatRate / 100);
  const totalTTC = totalHT + vat;

  return (
    <div>
      <h2 className="text-2xl font-bold text-alysophil-dark mb-6">{t('steps.budget')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="text-sm font-semibold text-gray-700">{t('budget.dailyRate')}</label>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              min={0}
              value={budget.dailyRate}
              onChange={(e) => setBudget({ dailyRate: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none"
            />
            <span className="text-sm text-gray-500">{t('budget.perDayFTE')}</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">{t('budget.fteCount')}</label>
          <input
            type="number"
            min={1}
            max={10}
            value={budget.fteCount}
            onChange={(e) => setBudget({ fteCount: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">{t('budget.vatRate')}</label>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              min={0}
              max={100}
              value={budget.vatRate}
              onChange={(e) => setBudget({ vatRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>
      </div>

      {/* Calculation breakdown */}
      <div className="bg-gray-50 rounded-lg p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">{t('budget.calculation')}</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <p>{t('budget.basedOn')} {totalWeeks} {t('budget.weeksOfWork')}</p>
          <p>{t('budget.resourcesAllocated')} {budget.fteCount} FTE</p>
          <p>{t('budget.dailyCost')} {budget.dailyRate.toLocaleString()}{t('budget.currency')}</p>
          <p className="font-bold text-base mt-2">
            {totalWeeks} x 5 x {budget.fteCount} x {budget.dailyRate.toLocaleString()} = {totalHT.toLocaleString()}{t('budget.currencyHT')}
          </p>
        </div>
      </div>

      {/* Summary table */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-alysophil-dark text-white">
              <th className="text-left px-4 py-2 text-sm">{t('budget.subject')}</th>
              <th className="text-right px-4 py-2 text-sm">{t('budget.unitPrice')}</th>
              <th className="text-right px-4 py-2 text-sm">{t('budget.qty')}</th>
              <th className="text-right px-4 py-2 text-sm">{t('budget.total')}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="px-4 py-3 text-sm">{t('budget.proposalSubject')}</td>
              <td className="px-4 py-3 text-sm text-right">{totalHT.toLocaleString()}{t('budget.currency')}</td>
              <td className="px-4 py-3 text-sm text-right">1</td>
              <td className="px-4 py-3 text-sm text-right font-semibold">{totalHT.toLocaleString()}{t('budget.currency')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 w-64 ml-auto overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full">
          <tbody>
            <tr className="border-b">
              <td className="px-4 py-2 text-sm font-semibold">{t('budget.totalHT')}</td>
              <td className="px-4 py-2 text-sm text-right">{totalHT.toLocaleString()}{t('budget.currency')}</td>
            </tr>
            <tr className="border-b">
              <td className="px-4 py-2 text-sm">{t('budget.vat')} {budget.vatRate}%</td>
              <td className="px-4 py-2 text-sm text-right">{vat.toLocaleString()}{t('budget.currency')}</td>
            </tr>
            <tr className="bg-alysophil-yellow/20">
              <td className="px-4 py-2 text-sm font-bold">{t('budget.totalTTC')}</td>
              <td className="px-4 py-2 text-sm text-right font-bold">{totalTTC.toLocaleString()}{t('budget.currency')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment terms */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <p className="font-semibold mb-1">{t('budget.paymentTerms')}</p>
        <p>{t('budget.payment1')}</p>
        <p>{t('budget.payment2')}</p>
        <p className="mt-1 text-xs">{t('budget.paymentDelay')}</p>
      </div>
    </div>
  );
}
