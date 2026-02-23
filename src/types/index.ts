export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  imageUrl?: string;
  modelUpdate?: boolean;
}

export type ViewMode = 'solid' | 'wireframe' | 'points';
export type EditorMode = 'view' | 'move' | 'rotate' | 'scale';
