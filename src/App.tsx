import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { invoke } from '@tauri-apps/api/core';
import { Canvas } from './features/canvas/Canvas';
import { TitleBar } from './components/TitleBar';
import { SettingsDialog } from './components/SettingsDialog';
import { UpdateAvailableDialog, type UpdateIgnoreMode } from './components/UpdateAvailableDialog';
import { GlobalErrorDialog } from './components/GlobalErrorDialog';
import { ProjectManager } from './features/project/ProjectManager';
import { useThemeStore } from './stores/themeStore';
import { useProjectStore } from './stores/projectStore';
import { useSettingsStore } from './stores/settingsStore';
import {
  checkForUpdate,
  isUpdateVersionSuppressed,
  suppressUpdateVersion,
} from './features/update/application/checkForUpdate';
import {
  subscribeOpenGlobalErrorDialog,
  type GlobalErrorDialogDetail,
} from './features/app/errorDialogEvents';
import {
  subscribeOpenSettingsDialog,
  type SettingsCategory,
} from './features/settings/settingsEvents';

function toRgbCssValue(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return '59 130 246';
  }
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function App() {
  const { theme } = useThemeStore();
  const uiRadiusPreset = useSettingsStore((state) => state.uiRadiusPreset);
  const themeTonePreset = useSettingsStore((state) => state.themeTonePreset);
  const accentColor = useSettingsStore((state) => state.accentColor);
  const autoCheckAppUpdateOnLaunch = useSettingsStore((state) => state.autoCheckAppUpdateOnLaunch);
  const enableUpdateDialog = useSettingsStore((state) => state.enableUpdateDialog);
  const setEnableUpdateDialog = useSettingsStore((state) => state.setEnableUpdateDialog);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialCategory, setSettingsInitialCategory] = useState<SettingsCategory>('general');
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [globalError, setGlobalError] = useState<GlobalErrorDialogDetail | null>(null);

  const isHydrated = useProjectStore((state) => state.isHydrated);
  const hydrate = useProjectStore((state) => state.hydrate);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const closeProject = useProjectStore((state) => state.closeProject);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.uiRadius = uiRadiusPreset;
  }, [uiRadiusPreset]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.themeTone = themeTonePreset;
  }, [themeTonePreset]);

  useEffect(() => {
    const root = document.documentElement;
    const isMac =
      typeof navigator !== 'undefined'
      && /(Mac|iPhone|iPad|iPod)/i.test(`${navigator.platform} ${navigator.userAgent}`);
    root.dataset.platform = isMac ? 'macos' : 'default';
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const normalized = accentColor.startsWith('#') ? accentColor : `#${accentColor}`;
    root.style.setProperty('--accent', normalized);
    root.style.setProperty('--accent-rgb', toRgbCssValue(normalized));
  }, [accentColor]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const unsubscribe = subscribeOpenGlobalErrorDialog((detail) => {
      setGlobalError(detail);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeOpenSettingsDialog(({ category }) => {
      setSettingsInitialCategory(category ?? 'general');
      setShowSettings(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof window.setTimeout> | null = null;

    const notifyFrontendReady = async (attempt = 1) => {
      if (cancelled) {
        return;
      }

      try {
        await invoke('frontend_ready');
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (attempt === 1 || attempt % 10 === 0) {
          console.warn('failed to notify frontend readiness', error);
        }

        const retryDelayMs = Math.min(500, 80 * attempt);
        retryTimer = window.setTimeout(() => {
          void notifyFrontendReady(attempt + 1);
        }, retryDelayMs);
      }
    };

    requestAnimationFrame(() => {
      void notifyFrontendReady();
    });

    return () => {
      cancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    let cancelled = false;
    const runUpdateCheck = async () => {
      if (!autoCheckAppUpdateOnLaunch) {
        return;
      }
      const result = await checkForUpdate();
      if (!cancelled && result.hasUpdate && result.latestVersion && enableUpdateDialog) {
        if (isUpdateVersionSuppressed(result.latestVersion)) {
          return;
        }
        setLatestVersion(result.latestVersion ?? '');
        setCurrentVersion(result.currentVersion ?? '');
        setShowUpdateDialog(true);
      }
    };

    void runUpdateCheck();
    return () => {
      cancelled = true;
    };
  }, [isHydrated, autoCheckAppUpdateOnLaunch, enableUpdateDialog]);

  const handleManualCheckUpdate = async (): Promise<'has-update' | 'up-to-date' | 'failed'> => {
    const result = await checkForUpdate();
    if (!result.hasUpdate) {
      return result.error ? 'failed' : 'up-to-date';
    }

    setLatestVersion(result.latestVersion ?? '');
    setCurrentVersion(result.currentVersion ?? '');

    if (enableUpdateDialog) {
      setShowUpdateDialog(true);
    }

    return 'has-update';
  };

  const handleApplyIgnore = (mode: UpdateIgnoreMode) => {
    if (mode === 'forever-all') {
      setEnableUpdateDialog(false);
      return;
    }

    if (!latestVersion) {
      return;
    }

    suppressUpdateVersion(latestVersion, mode === 'today-version' ? 'today' : 'forever');
  };

  if (!isHydrated) {
    return (
      <ReactFlowProvider>
        <div className="w-full h-full bg-bg-dark" />
      </ReactFlowProvider>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex flex-col bg-bg-dark">
        <TitleBar
          onSettingsClick={() => {
            setSettingsInitialCategory('general');
            setShowSettings(true);
          }}
          showBackButton={!!currentProjectId}
          onBackClick={closeProject}
        />

        <main className="flex-1 relative">
          {currentProjectId ? <Canvas /> : <ProjectManager />}
        </main>

        <SettingsDialog
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          initialCategory={settingsInitialCategory}
          onCheckUpdate={handleManualCheckUpdate}
        />
        <UpdateAvailableDialog
          isOpen={showUpdateDialog}
          onClose={() => setShowUpdateDialog(false)}
          latestVersion={latestVersion}
          currentVersion={currentVersion}
          onApplyIgnore={handleApplyIgnore}
        />
        <GlobalErrorDialog
          isOpen={Boolean(globalError)}
          title={globalError?.title ?? ''}
          message={globalError?.message ?? ''}
          details={globalError?.details}
          copyText={globalError?.copyText}
          onClose={() => setGlobalError(null)}
        />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
