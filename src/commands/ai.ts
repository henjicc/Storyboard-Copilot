import { invoke } from '@tauri-apps/api/core';

export interface GenerateRequest {
  prompt: string;
  model: string;
  size: string;
  aspect_ratio: string;
  reference_images?: string[];
}

export async function setApiKey(provider: string, apiKey: string): Promise<void> {
  return await invoke('set_api_key', { provider, apiKey });
}

export async function generateImage(request: GenerateRequest): Promise<string> {
  return await invoke('generate_image', { request });
}

export async function listModels(): Promise<string[]> {
  return await invoke('list_models');
}
