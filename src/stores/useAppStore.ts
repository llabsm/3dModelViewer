import { create } from 'zustand';
import type { ChatMessage, ViewMode, EditorMode } from '../types/index.ts';

interface AppState {
  // API Key
  apiKey: string;
  setApiKey: (key: string) => void;
  isAuthenticated: boolean;

  // Model state
  modelCode: string | null;
  setModelCode: (code: string | null) => void;
  modelVersion: number;
  modelHistory: string[];
  pushModelHistory: (code: string) => void;
  undoModel: () => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;

  // UI state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  showGrid: boolean;
  toggleGrid: () => void;
  showAxes: boolean;
  toggleAxes: () => void;
  showRuler: boolean;
  toggleRuler: () => void;
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;

  // Loading
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  generationProgress: string;
  setGenerationProgress: (msg: string) => void;

  // Panels
  showChat: boolean;
  toggleChat: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  apiKey: localStorage.getItem('gemini_api_key') || '',
  setApiKey: (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    set({ apiKey: key, isAuthenticated: key.length > 0 });
  },
  isAuthenticated: (localStorage.getItem('gemini_api_key') || '').length > 0,

  modelCode: null,
  setModelCode: (code: string | null) => set(s => ({ modelCode: code, modelVersion: s.modelVersion + 1 })),
  modelVersion: 0,
  modelHistory: [],
  pushModelHistory: (code: string) => set(s => ({ modelHistory: [...s.modelHistory, code] })),
  undoModel: () => {
    const { modelHistory } = get();
    if (modelHistory.length > 0) {
      const prev = modelHistory[modelHistory.length - 1];
      set(s => ({ modelCode: prev, modelHistory: modelHistory.slice(0, -1), modelVersion: s.modelVersion + 1 }));
    }
  },

  messages: [],
  addMessage: (msg: ChatMessage) => set(s => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [] }),

  viewMode: 'solid',
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  editorMode: 'view',
  setEditorMode: (mode: EditorMode) => set({ editorMode: mode }),
  showGrid: true,
  toggleGrid: () => set(s => ({ showGrid: !s.showGrid })),
  showAxes: true,
  toggleAxes: () => set(s => ({ showAxes: !s.showAxes })),
  showRuler: false,
  toggleRuler: () => set(s => ({ showRuler: !s.showRuler })),
  selectedObjectId: null,
  setSelectedObjectId: (id: string | null) => set({ selectedObjectId: id }),

  isGenerating: false,
  setIsGenerating: (v: boolean) => set({ isGenerating: v }),
  generationProgress: '',
  setGenerationProgress: (msg: string) => set({ generationProgress: msg }),

  showChat: true,
  toggleChat: () => set(s => ({ showChat: !s.showChat })),
}));
