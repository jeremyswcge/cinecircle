import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, db, collection, getDocs, doc, getDoc, updateDoc } from '../lib/firebase';
import { motion } from 'framer-motion';
import { Users, UserCheck, UserPlus } from 'lucide-react';

export default function Members() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myFollowing, setMyFollowing] = useState<string[]>([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, 'users'));
      const all = snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter((u: any) => u.uid !== currentUser?.uid);
      setMembers(all);
      if (currentUser) {
        const mySnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (mySnap.exists()) setMyFollowing(mySnap.data().following || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleFollow = async (targetUid: string) => {
    if (!currentUser) return;
    const myRef = doc(db, 'users', currentUser.uid);
    const targetRef = doc(db, 'users', targetUid);
    const [mySnap, targetSnap] = await Promise.all([getDoc(myRef), getDoc(targetRef)]);
    if (!mySnap.exists() || !targetSnap.exists()) return;
    const myFollowingList: string[] = mySnap.data().following || [];
    const targetFollowers: string[] = targetSnap.data().followers || [];
    const isNow = myFollowing.includes(targetUid);
    if (isNow) {
      await Promise.all([
        updateDoc(myRef, { following: myFollowingList.filter(id => id !== targetUid) }),
        updateDoc(targetRef, { followers: targetFollowers.filter(id => id !== currentUser.uid) }),
      ]);
      setMyFollowing(prev => prev.filter(id => id !== targetUid));
    } else {
      await Promise.all([
        updateDoc(myRef, { following: [...myFollowingList, targetUid] }),
        updateDoc(targetRef, { followers: [...targetFollowers, currentUser.uid] }),
      ]);
      setMyFollowing(prev => [...prev, targetUid]);
    }
    setMembers(prev => prev.map(m => {
      if (m.uid !== targetUid) return m;
      const followers: string[] = m.followers || [];
      return { ...m, followers: !isNow ? [...followers, currentUser.uid] : followers.filter((id: string) => id !== currentUser.uid) };
    }));
  };

  if (loading) return <div className="flex justify-center py-20 text-amber-500">Chargement...</div>;

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users size={22} className="text-amber-500" />
        <h1 className="text-2xl font-bold">Membres</h1>
        <span className="text-zinc-500 text-sm ml-auto">{members.length} membre{members.length > 1 ? 's' : ''}</span>
      </div>
      {members.length === 0 && <p className="text-center text-zinc-500 py-12">Aucun autre membre pour l'instant.</p>}
      <div className="space-y-3">
        {members.map((member, i) => {
          const isFollowing = myFollowing.includes(member.uid);
          return (
            <motion.div key={member.uid} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors">
              <Link to={`/profile/${member.uid}`} className="flex-shrink-0">
                {member.photoURL ? (
                  <img src={member.photoURL} alt="" className="w-12 h-12 rounded-full border-2 border-zinc-700 hover:border-amber-500 transition-colors" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-lg font-bold text-zinc-950">{(member.username?.[0] || '?').toUpperCase()}</div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${member.uid}`} className="font-bold hover:text-amber-400 transition-colors truncate block">{member.username || 'Utilisateur'}</Link>
                {member.bio && <p className="text-zinc-500 text-xs truncate mt-0.5">{member.bio}</p>}
                <div className="flex gap-3 text-xs text-zinc-500 mt-1">
                  <span><strong className="text-zinc-300">{(member.followers || []).length}</strong> abonnés</span>
                  <span><strong className="text-zinc-300">{(member.following || []).length}</strong> abonnements</span>
                </div>
              </div>
              {currentUser && (
                <button onClick={() => handleFollow(member.uid)} className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${isFollowing ? 'bg-zinc-800 text-zinc-300 hover:bg-red-500/20 hover:text-red-400' : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'}`}>
                  {isFollowing ? <><UserCheck size={13} /> Abonné·e</> : <><UserPlus size={13} /> Suivre</>}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}