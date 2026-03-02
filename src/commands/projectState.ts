import { invoke } from '@tauri-apps/api/core';

export async function saveProjectState(stateJson: string): Promise<void> {
  await invoke('save_project_state', { stateJson });
}

export async function loadProjectState(): Promise<string | null> {
  const result = await invoke<string | null>('load_project_state');
  return result ?? null;
}

export async function clearProjectState(): Promise<void> {
  await invoke('clear_project_state');
}
