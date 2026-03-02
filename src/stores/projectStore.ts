import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Viewport } from '@xyflow/react';
import type { CanvasNode, CanvasEdge } from './canvasStore';
import { projectStorage } from './storage/projectStorage';

const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
}

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;

  createProject: (name: string) => string;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  openProject: (id: string) => void;
  closeProject: () => void;
  getCurrentProject: () => Project | null;
  saveCurrentProject: (nodes: CanvasNode[], edges: CanvasEdge[], viewport?: Viewport) => void;
  saveCurrentProjectViewport: (viewport: Viewport) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,

      createProject: (name) => {
        const id = uuidv4();
        const now = Date.now();
        const newProject: Project = {
          id,
          name,
          createdAt: now,
          updatedAt: now,
          nodes: [],
          edges: [],
          viewport: DEFAULT_VIEWPORT,
        };
        set((state) => ({
          projects: [...state.projects, newProject],
          currentProjectId: id,
        }));
        return id;
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        }));
      },

      renameProject: (id, name) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p
          ),
        }));
      },

      openProject: (id) => {
        set({ currentProjectId: id });
      },

      closeProject: () => {
        set({ currentProjectId: null });
      },

      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects.find((p) => p.id === currentProjectId) || null;
      },

      saveCurrentProject: (nodes, edges, viewport) => {
        const { currentProjectId } = get();
        if (!currentProjectId) return;

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === currentProjectId
              ? {
                  ...p,
                  nodes,
                  edges,
                  viewport: viewport ?? p.viewport ?? DEFAULT_VIEWPORT,
                  updatedAt: Date.now(),
                }
              : p
          ),
        }));
      },

      saveCurrentProjectViewport: (viewport) => {
        const { currentProjectId } = get();
        if (!currentProjectId) return;

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === currentProjectId
              ? {
                  ...p,
                  viewport,
                  updatedAt: Date.now(),
                }
              : p
          ),
        }));
      },
    }),
    {
      name: 'storyboard-projects',
      version: 3,
      storage: createJSONStorage(() => projectStorage),
      migrate: (persistedState) => {
        const state = persistedState as Partial<ProjectState> | undefined;
        return {
          ...(state as ProjectState),
          currentProjectId: null,
          projects: (state?.projects ?? []).map((project) => ({
            ...project,
            viewport: project.viewport ?? DEFAULT_VIEWPORT,
          })),
        } as ProjectState;
      },
      partialize: (state) => ({
        projects: state.projects,
      }),
    }
  )
);
