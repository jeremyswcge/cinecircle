import React, { useState } from 'react';
import { auth, db, doc, setDoc } from '../lib/firebase';
import Logo from '../components/Logo';

export default function SetupProfile() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        username: username.trim(),
        bio: bio.trim(),
        photoURL: user.photoURL || '',
        displayName: user.displayName || username.trim(),
        createdAt: new Date().toISOString(),
        followers: [],
        following: []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="text-2xl font-bold text-center">Configure ton profil</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Nom d'utilisateur *</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="@cinephile"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Cinéphile passionné..."
              rows={3}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Enregistrement...' : 'Commencer'}
          </button>
        </form>
      </div>
    </div>
  );
}
