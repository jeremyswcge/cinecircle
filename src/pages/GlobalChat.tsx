import React, { useEffect, useState, useRef } from 'react';
import { auth, db, collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from '../lib/firebase';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  createdAt: any;
};

export default function GlobalChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const q = query(
      collection(db, 'chats', 'global', 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
    return unsub;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !currentUser || loading) return;
    const text = input.trim();
    setInput('');
    setLoading(true);
    try {
      let senderName = currentUser.displayName || 'Anonyme';
      let senderPhoto = currentUser.photoURL || '';
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          senderName = snap.data().username || senderName;
          senderPhoto = snap.data().photoURL || senderPhoto;
        }
      } catch {}
      await addDoc(collection(db, 'chats', 'global', 'messages'), {
        senderId: currentUser.uid,
        senderName,
        senderPhoto,
        text,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh-2rem)] max-w-2xl mx-auto px-4 md:px-0 py-6">
      <h1 className="text-2xl font-bold mb-6">💬 Chat Global</h1>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.senderId === currentUser?.uid ? 'flex-row-reverse' : 'flex-row'}`}>
            {msg.senderPhoto ? (
              <img src={msg.senderPhoto} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-zinc-950 flex-shrink-0">
                {(msg.senderName?.[0] || '?').toUpperCase()}
              </div>
            )}
            <div className={`max-w-[70%] ${
              msg.senderId === currentUser?.uid ? 'items-end' : 'items-start'
            } flex flex-col gap-1`}>
              {msg.senderId !== currentUser?.uid && (
                <span className="text-xs text-zinc-500">{msg.senderName}</span>
              )}
              <div className={`rounded-2xl px-4 py-2 text-sm ${
                msg.senderId === currentUser?.uid 
                  ? 'bg-amber-500 text-zinc-950 rounded-tr-sm' 
                  : 'bg-zinc-900 border border-zinc-800 rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
              {msg.createdAt?.toDate && (
                <span className="text-xs text-zinc-600">
                  {formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: fr })}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Envoie un message..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="w-12 h-12 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-2xl flex items-center justify-center transition-colors"
        >
          <Send size={18} className="text-zinc-950" />
        </button>
      </div>
    </div>
  );
}
