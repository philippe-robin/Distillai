import { useState } from 'react';
import { useProposalStore } from '../../lib/proposal-store';
import { useTranslation } from '../../lib/useTranslation';
import { skills, getSkill } from '../../lib/skills';
import { callClaude, generateClipboardPrompt } from '../../lib/claude-client';
import type { AISkill, AIMessage } from '../../lib/types';

interface AIAssistantProps {
  initialContext: string;
  onInsert: (text: string) => void;
  onClose: () => void;
}

export function AIAssistant({ initialContext, onInsert, onClose }: AIAssistantProps) {
  const { t } = useTranslation();
  const language = useProposalStore((s) => s.data.language);
  const aiConfig = useProposalStore((s) => s.data.ai);
  const [selectedSkill, setSelectedSkill] = useState<AISkill>('scientific');
  const [userMessage, setUserMessage] = useState(initialContext);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [clipboardPrompt, setClipboardPrompt] = useState('');
  const [pastedResponse, setPastedResponse] = useState('');

  const isAPIMode = aiConfig.mode === 'api' && !!aiConfig.apiKey;
  const skill = getSkill(selectedSkill);

  const handleSend = async () => {
    if (!userMessage.trim()) return;

    if (isAPIMode) {
      setLoading(true);
      const newMessages: AIMessage[] = [...messages, { role: 'user', content: userMessage }];
      setMessages(newMessages);
      setUserMessage('');

      const result = await callClaude(aiConfig.apiKey, selectedSkill, userMessage, language, messages);
      if (result.error) {
        setMessages([...newMessages, { role: 'assistant', content: `Error: ${result.error}` }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: result.content }]);
      }
      setLoading(false);
    } else {
      // Clipboard mode
      const prompt = generateClipboardPrompt(selectedSkill, userMessage, language, messages);
      setClipboardPrompt(prompt);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(clipboardPrompt);
  };

  const handlePasteResponse = () => {
    if (pastedResponse.trim()) {
      setMessages([
        ...messages,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: pastedResponse },
      ]);
      setClipboardPrompt('');
      setPastedResponse('');
      setUserMessage('');
    }
  };

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-alysophil-dark flex items-center gap-2">
          <span className="text-2xl">AI</span>
          <span className="text-alysophil-yellow">Assistant</span>
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
      </div>

      {/* Skill selector */}
      <div className="flex gap-2 mb-4">
        {skills.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSkill(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              selectedSkill === s.id
                ? 'bg-alysophil-dark text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{s.icon}</span>
            <span>{s.name[language]}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-4">{skill.description[language]}</p>

      {/* Mode indicator */}
      <div className={`mb-4 px-3 py-1.5 rounded text-xs ${isAPIMode ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
        {isAPIMode ? t('ai.apiMode') : t('ai.clipboardMode')}
      </div>

      {/* Conversation */}
      {messages.length > 0 && (
        <div className="mb-4 max-h-60 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-lg">
          {messages.map((msg, i) => (
            <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-gray-600' : 'text-gray-800'}`}>
              <span className="font-semibold text-xs uppercase text-gray-400">
                {msg.role === 'user' ? 'You' : skill.name[language]}:
              </span>
              <p className="whitespace-pre-wrap mt-1">{msg.content}</p>
            </div>
          ))}
          {loading && <p className="text-sm text-gray-400 animate-pulse">{t('ai.thinking')}</p>}
        </div>
      )}

      {/* Clipboard prompt display */}
      {clipboardPrompt && !isAPIMode && (
        <div className="mb-4 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-blue-700">{t('ai.promptGenerated')}</p>
              <button
                onClick={handleCopyPrompt}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t('ai.copyPrompt')}
              </button>
            </div>
            <pre className="text-xs text-blue-600 max-h-32 overflow-y-auto whitespace-pre-wrap">{clipboardPrompt}</pre>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-1">{t('ai.pasteResponse')}</p>
            <textarea
              value={pastedResponse}
              onChange={(e) => setPastedResponse(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm resize-y"
              placeholder={t('ai.pasteHere')}
            />
            <button
              onClick={handlePasteResponse}
              disabled={!pastedResponse.trim()}
              className="mt-2 px-4 py-1.5 bg-alysophil-dark text-white rounded-lg text-sm hover:bg-alysophil-dark/80 disabled:opacity-40"
            >
              {t('ai.validateResponse')}
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          rows={3}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-alysophil-yellow focus:border-transparent outline-none text-sm resize-none"
          placeholder={t('ai.inputPlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !userMessage.trim()}
          className="px-4 py-2 bg-alysophil-yellow text-alysophil-dark font-semibold rounded-lg hover:bg-yellow-500 disabled:opacity-40 transition-colors self-end"
        >
          {t('ai.send')}
        </button>
      </div>

      {/* Insert button */}
      {lastAssistantMessage && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onInsert(lastAssistantMessage.content)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
          >
            {t('ai.insertInProposal')}
          </button>
        </div>
      )}
    </div>
  );
}
