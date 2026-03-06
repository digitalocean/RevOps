/**
 * AI client for Meridian backend.
 * Uses DigitalOcean Gradient AI (serverless inference) when GRADIENT_MODEL_ACCESS_KEY is set,
 * otherwise falls back to OpenAI when OPENAI_API_KEY is set.
 *
 * - Chat completions (e.g. extract work item from text): Gradient or OpenAI
 * - Speech-to-text (Whisper): OpenAI only (Gradient does not offer transcription)
 */

const GRADIENT_BASE_URL = 'https://inference.do-ai.run/v1';
const GRADIENT_DEFAULT_MODEL = 'gpt-4o'; // or e.g. llama3.3-70b-instruct

function getGradientKey() {
  return process.env.GRADIENT_MODEL_ACCESS_KEY || process.env.MODEL_ACCESS_KEY || '';
}

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || '';
}

/**
 * Returns an OpenAI-compatible client for chat completions.
 * Prefers DigitalOcean Gradient if GRADIENT_MODEL_ACCESS_KEY (or MODEL_ACCESS_KEY) is set,
 * otherwise uses OpenAI if OPENAI_API_KEY is set.
 * @returns {{ client: import('openai').OpenAI, provider: 'gradient'|'openai', model: string } | null}
 */
function getChatClient() {
  const gradientKey = getGradientKey();
  const openaiKey = getOpenAIKey();

  if (gradientKey && gradientKey.trim().length > 0) {
    const OpenAI = require('openai');
    return {
      client: new OpenAI({
        apiKey: gradientKey,
        baseURL: GRADIENT_BASE_URL,
      }),
      provider: 'gradient',
      model: process.env.GRADIENT_CHAT_MODEL || GRADIENT_DEFAULT_MODEL,
    };
  }

  if (openaiKey) {
    const OpenAI = require('openai');
    return {
      client: new OpenAI({ apiKey: openaiKey }),
      provider: 'openai',
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
    };
  }

  return null;
}

/**
 * Returns an OpenAI client for Whisper (speech-to-text). Only OpenAI is supported.
 * @returns {import('openai').OpenAI | null}
 */
function getTranscribeClient() {
  const openaiKey = getOpenAIKey();
  if (!openaiKey) return null;
  const OpenAI = require('openai');
  return new OpenAI({ apiKey: openaiKey });
}

/**
 * @param {object} opts
 * @param {Array<{ role: string; content: string }>} opts.messages
 * @param {string} [opts.model]
 * @param {object} [opts.response_format]
 * @returns {Promise<string>} Assistant message content
 */
async function chatCompletion({ messages, model, response_format }) {
  const config = getChatClient();
  if (!config) return null;

  const completion = await config.client.chat.completions.create({
    model: model || config.model,
    messages,
    response_format: response_format || undefined,
  });

  const content = completion.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : null;
}

module.exports = {
  getChatClient,
  getTranscribeClient,
  chatCompletion,
  getGradientKey,
  getOpenAIKey,
  GRADIENT_BASE_URL,
};
