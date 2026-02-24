import { useState, useRef, useEffect } from 'react';
import { Send, Image, Loader2, X, Trash2, Sparkles } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { generateModel } from '../utils/gemini.ts';
import type { ChatMessage } from '../types/index.ts';

export function ChatPanel() {
  const {
    apiKey,
    messages,
    addMessage,
    clearMessages,
    modelCode,
    setModelCode,
    pushModelHistory,
    isGenerating,
    setIsGenerating,
    setGenerationProgress,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      // Extract base64 data (remove data:image/xxx;base64, prefix)
      setImageBase64(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text && !imageBase64) return;
    if (isGenerating) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      imageUrl: imagePreview || undefined,
    };
    addMessage(userMsg);
    setInput('');

    // Build conversation history for context
    const history = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    setIsGenerating(true);
    setGenerationProgress('Generating...');

    try {
      const result = await generateModel(
        apiKey,
        text,
        modelCode,
        imageBase64,
        history
      );

      // If we got code, update the model
      if (result.code) {
        if (modelCode) {
          pushModelHistory(modelCode);
        }
        setModelCode(result.code);
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.text,
        timestamp: Date.now(),
        modelUpdate: !!result.code,
      };
      addMessage(assistantMsg);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: Date.now(),
      };
      addMessage(errorMsg);
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
      clearImage();
    }
  };

  return (
    <div className="w-[380px] bg-[#161b22] border-l border-[#30363d] flex flex-col shrink-0">
      {/* Header */}
      <div className="h-10 border-b border-[#30363d] flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#58a6ff]" />
          <span className="text-xs font-medium text-[#e6edf3]">AI Assistant</span>
          <span className="text-[10px] text-[#8b949e] bg-[#0d1117] px-1.5 py-0.5 rounded">Gemini 3.1 Pro</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="p-1 text-[#8b949e] hover:text-[#f85149] transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-8 h-8 text-[#30363d] mx-auto mb-3" />
            <p className="text-sm text-[#8b949e] mb-1">Describe what you want to create</p>
            <p className="text-xs text-[#484f58]">e.g. "Create a chess piece — a knight"</p>

            <div className="mt-6 space-y-2">
              {[
                'Create a low-poly tree',
                'Make a coffee mug with a handle',
                'Build a simple rocket ship',
                'Design a gear with 12 teeth',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="block w-full text-left text-xs text-[#8b949e] hover:text-[#e6edf3] bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] rounded-lg px-3 py-2 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isGenerating && (
          <div className="flex items-center gap-2 text-xs text-[#8b949e] py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#58a6ff]" />
            <span>Generating model...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="mx-3 mb-2 relative inline-block">
          <img
            src={imagePreview}
            alt="Upload preview"
            className="h-16 rounded-md border border-[#30363d] object-cover"
          />
          <button
            onClick={clearImage}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#f85149] rounded-full flex items-center justify-center"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#30363d]">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg transition-colors shrink-0"
            title="Upload reference image"
          >
            <Image className="w-4 h-4" />
          </button>

          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Describe your 3D model..."
              rows={1}
              className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] resize-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isGenerating || (!input.trim() && !imageBase64)}
            className="p-2 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#238636]/30 text-white rounded-lg transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-[#1f6feb] text-white'
            : isSystem
            ? 'bg-[#f8514922] border border-[#f8514944] text-[#f85149]'
            : 'bg-[#21262d] text-[#e6edf3] border border-[#30363d]'
        }`}
      >
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Reference"
            className="max-h-32 rounded mb-2 object-cover"
          />
        )}
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.modelUpdate && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-[#3fb950]">
            <Sparkles className="w-3 h-3" />
            Model updated
          </span>
        )}
      </div>
    </div>
  );
}
