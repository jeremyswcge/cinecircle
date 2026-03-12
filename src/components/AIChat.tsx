import React, { useState, useRef, useEffect } from 'react';
import { getCineBuddySuggestions } from '../lib/gemini';
import { tmdb } from '../lib/tmdb';
import MediaCard from './MediaCard';
import { Send, Bot } from 'lucide-react';
import Logo from './Logo';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Array<{ title: string; type: string; reason: string; mediaId?: number; posterPath?: string | null }>;
};

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Bonjour ! Je suis CineBuddy 🎬 Dis-moi tes goûts ou demande-moi une recommandation !"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const result = await getCineBuddySuggestions(userMsg);
      if (!result) throw new Error('No response');
      
      let recs = result.recommendations || [];
      if (recs.length > 0) {
        recs = await Promise.all(recs.map(async (rec: any) => {
          try {
            const searchResult = rec.type === 'tv' 
              ? await tmdb.searchTV(rec.title)
              : await tmdb.searchMovies(rec.title);
            const first = searchResult.results?.[0];
            return { ...rec, mediaId: first?.id, posterPath: first?.poster_path };
          } catch {
            return rec;
          }
        }));
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.message,
        recommendations: recs.length > 0 ? recs : undefined
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Désolé, une erreur est survenue.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh-2rem)] max-w-2xl mx-auto px-4 md:px-0 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Bot size={28} className="text-amber-500" />
        <h1 className="text-2xl font-bold">CineBuddy</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' 
                ? 'bg-amber-500 text-zinc-950 rounded-tr-sm' 
                : 'bg-zinc-900 border border-zinc-800 rounded-tl-sm'
            }`}>
              <p className="text-sm leading-relaxed">{msg.content}</p>
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {msg.recommendations.map((rec, j) => (
                    rec.mediaId ? (
                      <div key={j} className="flex-shrink-0">
                        <MediaCard
                          id={rec.mediaId}
                          title={rec.title}
                          posterPath={rec.posterPath || null}
                          type={rec.type as 'movie' | 'tv'}
                        />
                        <p className="text-xs text-zinc-400 mt-1 max-w-[140px] line-clamp-2">{rec.reason}</p>
                      </div>
                    ) : (
                      <div key={j} className="flex-shrink-0 bg-zinc-800 rounded-xl p-3 w-32">
                        <p className="font-semibold text-sm">{rec.title}</p>
                        <p className="text-xs text-zinc-400 mt-1">{rec.reason}</p>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Recommande-moi un film d'action..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="w-12 h-12 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-2xl flex items-center justify-center transition-colors"
        >
          <Send size={18} className="text-zinc-950" />
        </button>
      </div>
    </div>
  );
}
