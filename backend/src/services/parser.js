/**
 * Payment request parser facade.
 * Default: deterministic rules. Optional LLM when PARSER_PROVIDER=llm.
 * LLM never receives Razorpay/JWT/DB secrets — only the message text.
 */

import { env } from '../config/env.js';
import { logError, logInfo } from '../utils/logger.js';
import { parseWithRules } from './parsers/rules.js';
import { parseWithLlm } from './parsers/llm.js';

export { normalizeParsedResult } from './parsers/normalize.js';

/**
 * @param {string} text
 * @returns {Promise<object>}
 */
export async function parsePaymentRequest(text) {
  const original = String(text || '').trim();
  const provider = (env.parser.provider || 'rules').toLowerCase();

  if (provider === 'llm') {
    try {
      return await parseWithLlm(original);
    } catch (error) {
      logError('LLM parser failed — falling back to rules', { message: error?.message });
      logInfo('Using rules parser fallback');
      return parseWithRules(original);
    }
  }

  return parseWithRules(original);
}
