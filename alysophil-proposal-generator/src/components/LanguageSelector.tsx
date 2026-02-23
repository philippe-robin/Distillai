import { useProposalStore } from '../lib/proposal-store';

export function LanguageSelector() {
  const language = useProposalStore((s) => s.data.language);
  const setLanguage = useProposalStore((s) => s.setLanguage);

  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
      <button
        onClick={() => setLanguage('fr')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          language === 'fr' ? 'bg-alysophil-yellow text-alysophil-dark font-semibold' : 'text-white hover:bg-white/10'
        }`}
      >
        FR
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          language === 'en' ? 'bg-alysophil-yellow text-alysophil-dark font-semibold' : 'text-white hover:bg-white/10'
        }`}
      >
        EN
      </button>
    </div>
  );
}
