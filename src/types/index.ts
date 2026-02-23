export interface ModelData {
  id: string;
  name: string;
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  colors?: Float32Array;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  imageUrl?: string;
  modelUpdate?: boolean;
}

export interface EditorTool {
  id: string;
  name: string;
  icon: string;
  cursor?: string;
}

export type ViewMode = 'solid' | 'wireframe' | 'points';
export type EditorMode = 'view' | 'select' | 'move' | 'rotate' | 'scale';
