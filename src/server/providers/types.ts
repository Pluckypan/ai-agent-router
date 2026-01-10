import type { Model, Provider } from '@/db/schema';

export interface GatewayRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: any;
}

export interface GatewayResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

export interface ProviderAdapter {
  forwardRequest(model: Model & { provider: Provider }, request: GatewayRequest): Promise<GatewayResponse>;
  listModels(provider: Provider): Promise<Array<{ id: string; name: string }>>;
}
