import { env } from '../../config/env.js';
import { logError } from '../../utils/logger.js';
import { normalizeParsedResult } from './normalize.js';

const SYSTEM_PROMPT = `You extract payment collection requests for an Indian small-business WhatsApp tool.
Return ONLY compact JSON with keys:
amount (number, INR rupees), description (string), customerPhone (E.164 like +91XXXXXXXXXX or null), customerName (string or "").
Do not invent amounts. If unclear, use null amount.
Never include secrets, API keys, or commentary.`;

/**
 * Optional OpenAI-compatible chat completion parser.
 * Receives only the user message — never env secrets.
 */
export async function parseWithLlm(text) {
  const original = String(text || '').trim();
  if (!original) {
    return normalizeParsedResult(
      { amount: null, description: '', customerPhone: null, customerName: '' },
      original,
      'llm',
    );
  }

  if (!env.parser.llmApiKey || !env.parser.llmBaseUrl) {
    throw new Error('LLM parser is not configured');
  }

  const url = `${env.parser.llmBaseUrl.replace(/\/$/, '')}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.parser.llmApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.parser.llmModel,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: original },
      ],
    }),
  });

  if (!response.ok) {
    logError('LLM parser request failed', { status: response.status });
    throw new Error('LLM parser request failed');
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('LLM parser returned invalid JSON');
  }

  // Strip any unexpected keys before validation.
  return normalizeParsedResult(
    {
      amount: parsed.amount,
      description: parsed.description,
      customerPhone: parsed.customerPhone,
      customerName: parsed.customerName,
    },
    original,
    'llm',
  );
}
