import { T as GPTTokenizer } from '@/tokenizers/gp-tokenizer-9KQssiTx.js';

/**
 * Estimates token count for a given text.
 * Uses the extracted Janitor tokenizer (cl100k_base compatible).
 */
export function estimateTokens(text) {
    if (!text) return 0;
    try {
        return GPTTokenizer.countTokens(text);
    } catch (e) {
        console.warn("Tokenizer error, falling back to heuristic:", e);
        return Math.ceil(text.length / 3);
    }
}