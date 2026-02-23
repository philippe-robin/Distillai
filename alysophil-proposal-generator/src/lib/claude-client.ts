import type { AISkill, Language, AIMessage } from './types';
import { buildPrompt } from './skills';

interface ClaudeResponse {
  content: string;
  error?: string;
}

// Direct API mode
export async function callClaude(
  apiKey: string,
  skill: AISkill,
  userMessage: string,
  language: Language,
  conversationHistory: AIMessage[] = []
): Promise<ClaudeResponse> {
  // Call Anthropic API directly via fetch (no SDK needed for browser)
  // Use claude-sonnet-4-5-20250929 model
  // Include system prompt from skill
  // Include conversation history
  // Return response or error

  const systemPrompt = buildPrompt(skill, '', language);

  const messages = [
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage }
  ];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { content: '', error: error.error?.message || 'API error' };
    }

    const data = await response.json();
    return { content: data.content[0]?.text || '' };
  } catch (err) {
    return { content: '', error: (err as Error).message };
  }
}

// Clipboard mode - generate prompt for user to paste into Claude.ai
export function generateClipboardPrompt(
  skill: AISkill,
  userMessage: string,
  language: Language,
  conversationHistory: AIMessage[] = []
): string {
  const fullPrompt = buildPrompt(skill, userMessage, language);

  let prompt = fullPrompt;
  if (conversationHistory.length > 0) {
    prompt += '\n\n--- Previous conversation ---\n';
    for (const msg of conversationHistory) {
      prompt += `\n${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    }
    prompt += '\n--- New request ---\n' + userMessage;
  }

  return prompt;
}
