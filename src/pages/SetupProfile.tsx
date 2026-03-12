import React, { useState } from 'react';
import { auth, db, doc, setDoc, serverTimestamp } from '../lib/firebase';

export default function SetupProfile({ onComplete }: { onComplete: () => void }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !auth.currentUser) return;
    
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        username: username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
        displayName: auth.currentUser.displayName || username,
        photoURL: auth.currentUser.photoURL || '',
        createdAt: serverTimestamp()
      });
      onComplete();
    } catch (error) {
      console.error("Erreur lors de la création du profil:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2">Bienvenue !</h1>
        <p className="text-zinc-400 mb-8">Choisissez un nom d'utilisateur unique pour commencer.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Nom d'utilisateur</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="cinephile_du_75"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                required
                minLength={3}
                maxLength={20}
              />
            </div>
          </div>
          <button 
            type="submit"
            disabled={loading || username.length < 3}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-zinc-950 font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Création...' : 'Créer mon profil'}
          </button>
        </form>
      </div>
    </div>
  );
}
