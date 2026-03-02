import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './features/canvas/Canvas';
import { TitleBar } from './components/TitleBar';
import { SettingsDialog } from './components/SettingsDialog';
import { ProjectManager } from './features/project/ProjectManager';
import { useThemeStore } from './stores/themeStore';
import { useProjectStore } from './stores/projectStore';

function App() {
  const { theme } = useThemeStore();
  const [showSettings, setShowSettings] = useState(false);

  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const closeProject = useProjectStore((state) => state.closeProject);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex flex-col bg-bg-dark">
        <TitleBar
          onSettingsClick={() => setShowSettings(true)}
          showBackButton={!!currentProjectId}
          onBackClick={closeProject}
        />

        <main className="flex-1 relative">
          {currentProjectId ? <Canvas /> : <ProjectManager />}
        </main>

        <SettingsDialog
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
