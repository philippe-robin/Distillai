import { useProposalStore } from '../../lib/proposal-store';
import { useTranslation } from '../../lib/useTranslation';

interface AISettingsProps {
  onClose: () => void;
}

export function AISettings({ onClose }: AISettingsProps) {
  const { t } = useTranslation();
  const ai = useProposalStore((s) => s.data.ai);
  const setAIConfig = useProposalStore((s) => s.setAIConfig);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-alysophil-dark">{t('settings.title')}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
      </div>

      {/* Mode selector */}
      <div className="mb-6">
        <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('settings.mode')}</label>
        <div className="flex gap-3">
          <button
            onClick={() => setAIConfig({ mode: 'clipboard' })}
            className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
              ai.mode === 'clipboard' ? 'border-alysophil-yellow bg-alysophil-yellow/10' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="font-semibold text-sm">{t('settings.clipboardMode')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('settings.clipboardDesc')}</p>
          </button>
          <button
            onClick={() => setAIConfig({ mode: 'api' })}
            className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
              ai.mode === 'api' ? 'border-alysophil-yellow bg-alysophil-yellow/10' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="font-semibold text-sm">{t('settings.apiMode')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('settings.apiDesc')}</p>
          </button>
        </div>
      </div>

      {/* API Key */}
      {ai.mode === 'api' && (
        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-700 mb-1 block">{t('settings.apiKey')}</label>
          <input
            type="password"
            value={ai.apiKey}
            onChange={(e) => setAIConfig({ apiKey: e.target.value })}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">{t('settings.apiKeyHint')}</p>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full px-4 py-2 bg-alysophil-dark text-white rounded-lg hover:bg-alysophil-dark/80 transition-colors"
      >
        {t('common.confirm')}
      </button>
    </div>
  );
}
