import { useProposalStore } from '../../lib/proposal-store';
import { useTranslation } from '../../lib/useTranslation';

export function Step1ClientInfo() {
  const { t } = useTranslation();
  const client = useProposalStore((s) => s.data.client);
  const setClient = useProposalStore((s) => s.setClient);

  return (
    <div>
      <h2 className="text-2xl font-bold text-alysophil-dark mb-6">{t('steps.clientInfo')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t('client.name')} *
          </label>
          <input
            type="text"
            value={client.name}
            onChange={(e) => setClient({ ...client, name: e.target.value })}
            placeholder={t('client.namePlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t('client.reference')}
          </label>
          <input
            type="text"
            value={client.reference}
            onChange={(e) => setClient({ ...client, reference: e.target.value })}
            placeholder="PR2504-0001"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t('client.date')} *
          </label>
          <input
            type="date"
            value={client.date}
            onChange={(e) => setClient({ ...client, date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t('client.validity')}
          </label>
          <input
            type="date"
            value={client.validity}
            onChange={(e) => setClient({ ...client, validity: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="mt-6 p-4 bg-alysophil-yellow/10 border border-alysophil-yellow/30 rounded-lg">
        <p className="text-sm text-gray-600">
          {t('client.helpText')}
        </p>
      </div>
    </div>
  );
}
