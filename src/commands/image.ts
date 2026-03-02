import { invoke } from '@tauri-apps/api/core';

export async function splitImage(
  imageBase64: string,
  rows: number,
  cols: number
): Promise<string[]> {
  return await invoke('split_image', {
    imageBase64,
    rows,
    cols,
  });
}

export async function saveImage(
  imageBase64: string,
  filePath: string
): Promise<void> {
  return await invoke('save_image', {
    imageBase64,
    filePath,
  });
}

export async function loadImage(filePath: string): Promise<string> {
  return await invoke('load_image', {
    filePath,
  });
}
