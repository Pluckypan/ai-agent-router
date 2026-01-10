import type { ProviderAdapter } from './types';
import { OpenAIAdapter } from './openai';
import { AnthropicAdapter } from './anthropic';
import { GeminiAdapter } from './gemini';

export function getProviderAdapter(protocol: string): ProviderAdapter {
  switch (protocol) {
    case 'openai':
      return new OpenAIAdapter();
    case 'anthropic':
      return new AnthropicAdapter();
    case 'gemini':
      return new GeminiAdapter();
    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
}

export { OpenAIAdapter, AnthropicAdapter, GeminiAdapter };
export type { ProviderAdapter } from './types';
