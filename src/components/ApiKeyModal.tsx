import { useState } from 'react';
import { Key, Loader2, ExternalLink } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { validateApiKey } from '../utils/gemini.ts';

export function ApiKeyModal() {
  const { setApiKey } = useAppStore();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = input.trim();
    if (!key) {
      setError('Please enter an API key');
      return;
    }

    setValidating(true);
    setError('');

    const valid = await validateApiKey(key);
    if (valid) {
      setApiKey(key);
    } else {
      setError('Invalid API key. Please check and try again.');
    }
    setValidating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#58a6ff]/10 rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 text-[#58a6ff]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#e6edf3]">API Key Required</h2>
            <p className="text-sm text-[#8b949e]">Enter your Google Gemini API key</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition-colors text-sm"
            autoFocus
          />

          {error && (
            <p className="mt-2 text-sm text-[#f85149]">{error}</p>
          )}

          <button
            type="submit"
            disabled={validating}
            className="mt-4 w-full py-3 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#238636]/50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {validating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating...
              </>
            ) : (
              'Connect'
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#30363d]">
          <p className="text-xs text-[#8b949e] leading-relaxed">
            Get a free API key from{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#58a6ff] hover:underline inline-flex items-center gap-1"
            >
              Google AI Studio <ExternalLink className="w-3 h-3" />
            </a>
            . Your key is stored locally in your browser and never sent to our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
