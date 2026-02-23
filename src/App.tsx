import { useRef } from 'react';
import * as THREE from 'three';
import { useAppStore } from './stores/useAppStore.ts';
import { ApiKeyModal } from './components/ApiKeyModal.tsx';
import { TopBar } from './components/TopBar.tsx';
import { ViewportWithRef } from './components/Viewport.tsx';
import { ChatPanel } from './components/ChatPanel.tsx';
import { exportTo3MF, exportToSTL } from './utils/export3mf.ts';

export default function App() {
  const { isAuthenticated, showChat } = useAppStore();
  const sceneRef = useRef<THREE.Scene | null>(null);

  const handleExport3MF = async () => {
    if (!sceneRef.current) return;
    try {
      await exportTo3MF(sceneRef.current, 'model.3mf');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleExportSTL = () => {
    if (!sceneRef.current) return;
    try {
      exportToSTL(sceneRef.current, 'model.stl');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (!isAuthenticated) {
    return <ApiKeyModal />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#0d1117]">
      <TopBar onExport3MF={handleExport3MF} onExportSTL={handleExportSTL} />
      <div className="flex-1 flex overflow-hidden">
        <ViewportWithRef sceneRef={sceneRef} />
        {showChat && <ChatPanel />}
      </div>
    </div>
  );
}
