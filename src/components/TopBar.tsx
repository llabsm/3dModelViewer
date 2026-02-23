import { Box, Download, RotateCcw, Grid3x3, Axis3D, MessageSquare, LogOut } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';

interface TopBarProps {
  onExport3MF: () => void;
  onExportSTL: () => void;
}

export function TopBar({ onExport3MF, onExportSTL }: TopBarProps) {
  const {
    viewMode, setViewMode,
    showGrid, toggleGrid,
    showAxes, toggleAxes,
    autoRotate, toggleAutoRotate,
    showChat, toggleChat,
    modelCode,
    undoModel,
    modelHistory,
    setApiKey,
  } = useAppStore();

  return (
    <header className="h-12 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Box className="w-5 h-5 text-[#58a6ff]" />
        <span className="font-semibold text-sm text-[#e6edf3]">3D Model Viewer</span>
      </div>

      <div className="flex items-center gap-1">
        {/* View mode */}
        <div className="flex items-center bg-[#0d1117] rounded-md border border-[#30363d] mr-2">
          {(['solid', 'wireframe', 'points'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs capitalize transition-colors ${
                viewMode === mode
                  ? 'bg-[#30363d] text-[#e6edf3]'
                  : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Scene toggles */}
        <ToolButton icon={Grid3x3} active={showGrid} onClick={toggleGrid} title="Grid" />
        <ToolButton icon={Axis3D} active={showAxes} onClick={toggleAxes} title="Axes" />
        <ToolButton icon={RotateCcw} active={autoRotate} onClick={toggleAutoRotate} title="Auto Rotate" />

        <div className="w-px h-6 bg-[#30363d] mx-2" />

        {/* Undo */}
        <ToolButton
          icon={RotateCcw}
          active={false}
          onClick={undoModel}
          title="Undo"
          disabled={modelHistory.length === 0}
        />

        {/* Chat toggle */}
        <ToolButton icon={MessageSquare} active={showChat} onClick={toggleChat} title="Chat" />

        <div className="w-px h-6 bg-[#30363d] mx-2" />

        {/* Export */}
        {modelCode && (
          <div className="flex items-center gap-1">
            <button
              onClick={onExport3MF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#238636] hover:bg-[#2ea043] text-white rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              .3mf
            </button>
            <button
              onClick={onExportSTL}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#0d1117] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              .stl
            </button>
          </div>
        )}

        <div className="w-px h-6 bg-[#30363d] mx-2" />

        <button
          onClick={() => setApiKey('')}
          className="p-1.5 text-[#8b949e] hover:text-[#f85149] rounded transition-colors"
          title="Disconnect API Key"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

function ToolButton({
  icon: Icon,
  active,
  onClick,
  title,
  disabled = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        disabled
          ? 'text-[#484f58] cursor-not-allowed'
          : active
          ? 'bg-[#30363d] text-[#58a6ff]'
          : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
