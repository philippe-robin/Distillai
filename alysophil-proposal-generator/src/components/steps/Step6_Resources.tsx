import { useProposalStore } from '../../lib/proposal-store';
import { useTranslation } from '../../lib/useTranslation';

export function Step6Resources() {
  const { t } = useTranslation();
  const team = useProposalStore((s) => s.data.team);
  const deliverables = useProposalStore((s) => s.data.deliverables);
  const addTeamMember = useProposalStore((s) => s.addTeamMember);
  const removeTeamMember = useProposalStore((s) => s.removeTeamMember);
  const setTeam = useProposalStore((s) => s.setTeam);
  const setDeliverables = useProposalStore((s) => s.setDeliverables);

  const updateMember = (index: number, field: string, value: string) => {
    const newTeam = [...team];
    newTeam[index] = { ...newTeam[index], [field]: value };
    setTeam(newTeam);
  };

  const updateDeliverable = (index: number, field: string, value: string) => {
    const newDeliverables = [...deliverables];
    newDeliverables[index] = { ...newDeliverables[index], [field]: value };
    setDeliverables(newDeliverables);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-alysophil-dark mb-6">{t('steps.resources')}</h2>

      {/* Team */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">{t('resources.teamTitle')}</h3>
        <div className="space-y-3">
          {team.map((member, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={member.role}
                onChange={(e) => updateMember(index, 'role', e.target.value)}
                placeholder={t('resources.rolePlaceholder')}
                className="w-48 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm"
              />
              <input
                type="text"
                value={member.name}
                onChange={(e) => updateMember(index, 'name', e.target.value)}
                placeholder={t('resources.namePlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm"
              />
              <input
                type="text"
                value={member.contact}
                onChange={(e) => updateMember(index, 'contact', e.target.value)}
                placeholder={t('resources.contactPlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm"
              />
              {team.length > 1 && (
                <button
                  onClick={() => removeTeamMember(index)}
                  className="text-red-400 hover:text-red-600"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addTeamMember}
          className="mt-3 text-sm text-alysophil-dark hover:text-alysophil-yellow"
        >
          + {t('resources.addMember')}
        </button>
      </div>

      {/* Deliverables */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">{t('resources.deliverablesTitle')}</h3>
        <div className="space-y-3">
          {deliverables.map((d, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={d.title}
                onChange={(e) => updateDeliverable(index, 'title', e.target.value)}
                placeholder={t('resources.deliverableTitlePlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm"
              />
              <input
                type="text"
                value={d.format}
                onChange={(e) => updateDeliverable(index, 'format', e.target.value)}
                placeholder={t('resources.formatPlaceholder')}
                className="w-48 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm"
              />
              {deliverables.length > 1 && (
                <button
                  onClick={() => setDeliverables(deliverables.filter((_, i) => i !== index))}
                  className="text-red-400 hover:text-red-600"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => setDeliverables([...deliverables, { title: '', format: '' }])}
          className="mt-3 text-sm text-alysophil-dark hover:text-alysophil-yellow"
        >
          + {t('resources.addDeliverable')}
        </button>
      </div>
    </div>
  );
}
