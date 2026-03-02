import type { StateStorage } from 'zustand/middleware';

import { clearProjectState, loadProjectState, saveProjectState } from '@/commands/projectState';

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export const projectStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return await loadProjectState();
    } catch {
      if (!hasLocalStorage()) {
        return null;
      }
      return window.localStorage.getItem(name);
    }
  },
  setItem: async (name, value) => {
    try {
      await saveProjectState(value);
      return;
    } catch {
      if (!hasLocalStorage()) {
        return;
      }
      window.localStorage.setItem(name, value);
    }
  },
  removeItem: async (name) => {
    try {
      await clearProjectState();
      return;
    } catch {
      if (!hasLocalStorage()) {
        return;
      }
      window.localStorage.removeItem(name);
    }
  },
};
