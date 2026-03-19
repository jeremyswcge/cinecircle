import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { auth, db, doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot, deleteDoc, updateDoc, serverTimestamp } from '../lib/firebase';
import { tmdb, getImageUrl } from '../lib/tmdb';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2, Check, Film, Tv, Search, Trash2, Star, BarChart2, Eye, TrendingUp } from 'lucide-react';

type TabType = 'reviews' | 'watchlist' | 'top-films' | 'top-series';

const getTime = (date: any) => {
  if (!date) return 0;
  if (typeof date.toMillis === 'function') return date.toMillis();
  if (date instanceof Date) return date.getTime();
  if (date.seconds) return date.seconds * 1000;
  return new Date(date).getTime() || 0;
};

const timeAgo = (date: any) => {
  const ms = Date.now() - getTime(date);
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
};

function ProfileStats({ reviews, watchlist, top10 }: { reviews: any[], watchlist: any[], top10: any[] }) {
  const moviesWatched = reviews.filter(r => r.mediaType === 'movie').length;
  const seriesWatched = reviews.filter(r => r.mediaType === 'tv').length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '—';
  const genreCount: Record<string, number> = {};
  reviews.forEach(r => {
    (r.genres || []).forEach((g: any) => {
      const name = typeof g === 'string' ? g : g.name;
      if (name) genreCount[name] = (genreCount[name] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxGenreCount = topGenres[0]?.[1] || 1;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={16} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Statistiques</h2>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-zinc-800/60 rounded-2xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><Film size={13} className="text-amber-500" /><span className="text-xs text-zinc-400">Films</span></div>
          <p className="text-2xl font-bold text-white">{moviesWatched}</p>
          <p className="text-[10px] text-zinc-500">vus</p>
        </div>
        <div className="bg-zinc-800/60 rounded-2xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><Tv size={13} className="text-amber-500" /><span className="text-xs text-zinc-400">Séries</span></div>
          <p className="text-2xl font-bold text-white">{seriesWatched}</p>
          <p className="text-[10px] text-zinc-500">vues</p>
        </div>
        <div className="bg-zinc-800/60 rounded-2xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><Star size={13} className="text-amber-500" /><span className="text-xs text-zinc-400">Moyenne</span></div>
          <p className="text-2xl font-bold text-white">{avgRating}</p>
          <p className="text-[10px] text-zinc-500">/ 5</p>
        </div>
      </div>
      {topGenres.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3"><TrendingUp size={13} className="text-zinc-400" /><p className="text-xs text-zinc-400 uppercase tracking-wider">Genres favoris</p></div>
          <div className="space-y-2">
            {topGenres.map(([genre, count]) => (
              <div key={genre}>
                <div className="flex justify-between text-xs mb-1"><span className="text-zinc-300">{genre}</span><span className="text-zinc-500">{count}</span></div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(count / maxGenreCount) * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {reviews.length === 0 && <p className="text-center text-zinc-500 text-xs py-2">Aucune review pour l'instant</p>}
    </motion.div>
  );
}

function Top10Section({ items, isOwnProfile, mediaTypeLabel, mediaType, isEditing, setIsEditing, draggedItem, setDraggedItem, onAddClick, onRemove, onDragReorder }: { items: any[]; isOwnProfile: boolean; mediaTypeLabel: string; mediaType: 'movie' | 'tv'; isEditing: boolean; setIsEditing: (v: boolean) => void; draggedItem: any; setDraggedItem: (v: any) => void; onAddClick: (type: 'movie' | 'tv') => void; onRemove: (mediaId: number, mType: string) => void; onDragReorder: (fromRank: number, toRank: number, mType: string) => void; }) {
  const sorted = [...items].sort((a, b) => a.rank - b.rank);
  const slots = Array.from({ length: 10 }, (_, i) => sorted.find(it => it.rank === i + 1) || null);
  return (
    <div>
      {isOwnProfile && (
        <div className="flex justify-end mb-3">
          <button onClick={() => isEditing ? setIsEditing(false) : onAddClick(mediaType)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isEditing ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300' : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'}`}>
            {isEditing ? <><Check size={14} /> Terminer</> : <><Search size={14} /> Ajouter</>}
          </button>
        </div>
      )}
      {items.length === 0 && !isOwnProfile && <p className="text-center text-zinc-500 py-8 text-sm">Aucun {mediaTypeLabel.toLowerCase()} dans ce top.</p>}
      <div className="space-y-2">
        {slots.map((item, idx) => {
          const rank = idx + 1;
          if (!item) {
            if (!isOwnProfile) return null;
            return (
              <motion.button key={`empty-${rank}`} onClick={() => onAddClick(mediaType)} whileHover={{ scale: 1.01 }} className="w-full flex items-center gap-3 bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-3 hover:border-amber-500/40 transition-colors group">
                <span className="text-2xl font-black text-zinc-700 w-8 text-center">{rank}</span>
                <div className="w-10 h-14 bg-zinc-800 rounded-xl flex items-center justify-center"><span className="text-zinc-600 text-lg">+</span></div>
                <span className="text-zinc-600 text-sm group-hover:text-zinc-400 transition-colors">Ajouter un {mediaTypeLabel.toLowerCase()}</span>
              </motion.button>
            );
          }
          return (
            <motion.div key={`${item.mediaId}-${item.mediaType}`} layout draggable={isEditing && isOwnProfile} onDragStart={() => setDraggedItem({ rank: item.rank, type: item.mediaType })} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (draggedItem && draggedItem.type === item.mediaType) onDragReorder(draggedItem.rank, item.rank, item.mediaType); }} className={`flex items-center gap-3 bg-zinc-900 border rounded-2xl p-3 transition-colors ${isEditing ? 'border-amber-500/30 cursor-grab active:cursor-grabbing' : 'border-zinc-800'}`}>
              <span className={`text-2xl font-black w-8 text-center ${rank <= 3 ? 'text-amber-500' : 'text-zinc-600'}`}>{rank}</span>
              {item.posterPath ? <img src={getImageUrl(item.posterPath, 'w92')} alt={item.title} className="w-10 h-14 object-cover rounded-xl flex-shrink-0" /> : <div className="w-10 h-14 bg-zinc-800 rounded-xl flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <Link to={`/media/${item.mediaType}/${item.mediaId}`} className="font-bold text-sm hover:text-amber-400 transition-colors truncate block">{item.title || 'Sans titre'}</Link>
                <p className="text-xs text-zinc-500">{item.mediaType === 'movie' ? 'Film' : 'Série'}</p>
              </div>
              {isEditing && isOwnProfile && <button onClick={() => onRemove(item.mediaId, item.mediaType)} className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors text-zinc-500 flex-shrink-0"><Trash2 size={14} /></button>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function Profile() {
  const { uid } = useParams();
  const targetUid = uid || auth.currentUser?.uid;
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [top10, setTop10] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('reviews');
  const [isEditingTop10, setIsEditingTop10] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ rank: number; type: string } | null>(null);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTarget, setSearchTarget] = useState<{ rank: number; type: 'movie' | 'tv' } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [editReviewText, setEditReviewText] = useState('');
  const [editReviewRating, setEditReviewRating] = useState(5);
  const isOwnProfile = auth.currentUser?.uid === targetUid;
  const top10Movies = top10.filter(i => i.mediaType === 'movie');
  const top10TV = top10.filter(i => i.mediaType === 'tv');

  useEffect(() => {
    if (!targetUid) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, 'users', targetUid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setBioText(data.bio || '');
        if (auth.currentUser && !isOwnProfile) setIsFollowing((data.followers || []).includes(auth.currentUser.uid));
      }
      setLoading(false);
    };
    fetchProfile();
    const unsubReviews = onSnapshot(query(collection(db, 'reviews'), where('userId', '==', targetUid)), async (snap) => {
      const enriched = await Promise.all(snap.docs.map(async (d) => {
        const r = { id: d.id, ...d.data() };
        try { const media = await tmdb.getDetails((r as any).mediaType, (r as any).mediaId); return { ...r, title: media.title || media.name, posterPath: media.poster_path, genres: media.genres }; }
        catch { return r; }
      }));
      setReviews(enriched.sort((a: any, b: any) => getTime(b.createdAt) - getTime(a.createdAt)));
    });
    const unsubTop10 = onSnapshot(doc(db, 'top10', targetUid), async (snap) => {
      if (!snap.exists()) return;
      const items: any[] = snap.data().items || [];
      const enriched = await Promise.all(items.map(async (item) => {
        try { const media = await tmdb.getDetails(item.mediaType, item.mediaId); return { ...item, title: media.title || media.name, posterPath: media.poster_path }; }
        catch { return item; }
      }));
      setTop10(enriched.sort((a, b) => a.rank - b.rank));
    });
    const unsubWatchlist = onSnapshot(collection(db, `users/${targetUid}/watches`), async (snap) => {
      const items = await Promise.all(snap.docs.map(async (d) => {
        const data = { id: d.id, ...d.data() } as any;
        try { const media = await tmdb.getDetails(data.mediaType, data.mediaId); return { ...data, title: media.title || media.name, posterPath: media.poster_path }; }
        catch { return data; }
      }));
      setWatchlist(items.sort((a: any, b: any) => getTime(b.addedAt) - getTime(a.addedAt)));
    });
    return () => { unsubReviews(); unsubTop10(); unsubWatchlist(); };
  }, [targetUid]);

  useEffect(() => {
    if (!searchQuery.trim() || !searchTarget) { setSearchResults([]); return; }
    const delayFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = searchTarget.type === 'movie' ? await tmdb.searchMovies(searchQuery) : await tmdb.searchTV(searchQuery);
        setSearchResults(results.results || []);
      } catch { setSearchResults([]); } finally { setIsSearching(false); }
    }, 400);
    return () => clearTimeout(delayFn);
  }, [searchQuery, searchTarget]);

  const handleSaveBio = async () => {
    if (!auth.currentUser || !isOwnProfile) return;
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { bio: bioText });
    setProfile((p: any) => ({ ...p, bio: bioText }));
    setIsEditingBio(false);
  };

  const handleFollow = async () => {
    if (!auth.currentUser || isOwnProfile) return;
    const myUid = auth.currentUser.uid;
    const targetRef = doc(db, 'users', targetUid!);
    const myRef = doc(db, 'users', myUid);
    const targetSnap = await getDoc(targetRef);
    const mySnap = await getDoc(myRef);
    if (!targetSnap.exists() || !mySnap.exists()) return;
    const targetFollowers: string[] = targetSnap.data().followers || [];
    const myFollowing: string[] = mySnap.data().following || [];
    if (isFollowing) {
      await updateDoc(targetRef, { followers: targetFollowers.filter(id => id !== myUid) });
      await updateDoc(myRef, { following: myFollowing.filter(id => id !== targetUid) });
      setIsFollowing(false);
    } else {
      await updateDoc(targetRef, { followers: [...targetFollowers, myUid] });
      await updateDoc(myRef, { following: [...myFollowing, targetUid] });
      setIsFollowing(true);
    }
  };

  const openSearchModal = (type: 'movie' | 'tv') => {
    const existing = type === 'movie' ? top10Movies : top10TV;
    const nextRank = existing.length < 10 ? existing.length + 1 : 10;
    setSearchTarget({ rank: nextRank, type });
    setSearchQuery('');
    setSearchResults([]);
    setSearchModalOpen(true);
  };

  const handleAddToTop10 = async (mediaId: number) => {
    if (!auth.currentUser || !searchTarget) return;
    const docRef = doc(db, 'top10', auth.currentUser.uid);
    const docSnap = await getDoc(docRef);
    let items: any[] = docSnap.exists() ? (docSnap.data().items || []) : [];
    items = items.filter(i => !(i.mediaId === mediaId && i.mediaType === searchTarget.type));
    items = items.filter(i => !(i.rank === searchTarget.rank && i.mediaType === searchTarget.type));
    items.push({ mediaId, mediaType: searchTarget.type, rank: searchTarget.rank, addedAt: serverTimestamp() });
    await setDoc(docRef, { items }, { merge: true });
    setSearchModalOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveFromTop10 = async (mediaId: number, mType: string) => {
    if (!auth.currentUser) return;
    const docRef = doc(db, 'top10', auth.currentUser.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    let items: any[] = docSnap.data().items || [];
    items = items.filter(i => !(i.mediaId === mediaId && i.mediaType === mType));
    await setDoc(docRef, { items }, { merge: true });
  };

  const handleDragReorder = async (fromRank: number, toRank: number, mType: string) => {
    if (!auth.currentUser) return;
    const docRef = doc(db, 'top10', auth.currentUser.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    let items: any[] = docSnap.data().items || [];
    items = items.map(i => {
      if (i.mediaType !== mType) return i;
      if (i.rank === fromRank) return { ...i, rank: toRank };
      if (fromRank < toRank && i.rank > fromRank && i.rank <= toRank) return { ...i, rank: i.rank - 1 };
      if (fromRank > toRank && i.rank < fromRank && i.rank >= toRank) return { ...i, rank: i.rank + 1 };
      return i;
    });
    await setDoc(docRef, { items }, { merge: true });
    setDraggedItem(null);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, 'reviews', reviewId));
  };

  const handleSaveReview = async () => {
    if (!auth.currentUser || !editingReview) return;
    await updateDoc(doc(db, 'reviews', editingReview.id), { text: editReviewText, rating: editReviewRating, updatedAt: serverTimestamp() });
    setEditingReview(null);
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'reviews', label: 'Reviews', count: reviews.length },
    { id: 'watchlist', label: 'Watchlist', count: watchlist.length },
    { id: 'top-films', label: 'Top Films', count: top10Movies.length },
    { id: 'top-series', label: 'Top Séries', count: top10TV.length },
  ];

  if (loading) return <div className="flex justify-center py-20 text-amber-500">Chargement du profil...</div>;
  if (!profile) return <div className="text-center py-20">Utilisateur introuvable</div>;

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 p-0.5">
              <img alt="" className="w-full h-full rounded-full object-cover border-2 border-zinc-900" src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.username}&background=27272a&color=f59e0b`} />
            </div>
            {isOwnProfile && <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center"><Eye size={12} className="text-zinc-950" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold truncate">{profile.username}</h1>
                <div className="flex gap-4 text-sm text-zinc-400 mt-1">
                  <span><strong className="text-white">{(profile.followers || []).length}</strong> abonnés</span>
                  <span><strong className="text-white">{(profile.following || []).length}</strong> abonnements</span>
                </div>
              </div>
              {isOwnProfile ? (
                <button onClick={() => setIsEditingBio(true)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors flex-shrink-0"><Edit2 size={18} className="text-zinc-400" /></button>
              ) : (
                <button onClick={handleFollow} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0 ${isFollowing ? 'bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-300' : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'}`}>{isFollowing ? 'Abonné·e' : 'Suivre'}</button>
              )}
            </div>
            <div className="mt-3">
              {isEditingBio ? (
                <div className="flex gap-2">
                  <input type="text" value={bioText} onChange={e => setBioText(e.target.value)} maxLength={120} placeholder="Ta bio (120 caractères max)" className="flex-1 bg-zinc-800 rounded-xl px-3 py-2 text-sm outline-none border border-zinc-700 focus:border-amber-500 transition-colors" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveBio(); if (e.key === 'Escape') setIsEditingBio(false); }} />
                  <button onClick={handleSaveBio} className="p-2 bg-amber-500 hover:bg-amber-400 rounded-xl text-zinc-950 transition-colors"><Check size={16} /></button>
                  <button onClick={() => setIsEditingBio(false)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"><X size={16} /></button>
                </div>
              ) : (
                <p className={`text-sm ${profile.bio ? 'text-zinc-300' : 'text-zinc-600 italic'} ${isOwnProfile ? 'cursor-pointer hover:text-zinc-200 transition-colors' : ''}`} onClick={() => isOwnProfile && setIsEditingBio(true)}>{profile.bio || (isOwnProfile ? 'Ajouter une bio...' : '')}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Film size={12} className="text-amber-500" /><span><strong className="text-white">{reviews.filter(r => r.mediaType === 'movie').length}</strong> films</span></div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Tv size={12} className="text-amber-500" /><span><strong className="text-white">{reviews.filter(r => r.mediaType === 'tv').length}</strong> séries</span></div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Star size={12} className="text-amber-500" /><span><strong className="text-white">{reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '—'}</strong> moy.</span></div>
        </div>
      </motion.div>
      <ProfileStats reviews={reviews} watchlist={watchlist} top10={top10} />
      <div className="grid grid-cols-4 gap-1.5 mb-5">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-2 px-1 rounded-xl text-xs font-medium transition-colors text-center ${activeTab === tab.id ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
            {tab.label}{tab.count !== undefined && tab.count > 0 && <span className={`ml-1 text-[10px] ${activeTab === tab.id ? 'opacity-70' : 'text-zinc-500'}`}>({tab.count})</span>}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {activeTab === 'reviews' && (
          <motion.div key="reviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {reviews.length === 0 && <p className="text-center text-zinc-500 py-8 text-sm">Aucune review pour l'instant.</p>}
            {reviews.map(review => (
              <div key={review.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-amber-500/30 transition-colors">
                <div className="flex gap-3">
                  {review.posterPath && <img src={getImageUrl(review.posterPath, 'w92')} alt="" className="w-12 h-16 object-cover rounded-xl flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/media/${review.mediaType}/${review.mediaId}`} className="font-bold text-sm hover:text-amber-400 transition-colors truncate">{review.title || 'Sans titre'}</Link>
                      {isOwnProfile && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingReview(review); setEditReviewText(review.text || ''); setEditReviewRating(review.rating || 5); }} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-zinc-300"><Edit2 size={12} /></button>
                          <button onClick={() => handleDeleteReview(review.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-zinc-500 hover:text-red-400"><Trash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-0.5 my-1">{[1,2,3,4,5].map(s => <Star key={s} size={11} className={s <= (review.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-zinc-700'} />)}</div>
                    {review.text && <p className="text-xs text-zinc-400 line-clamp-2">{review.text}</p>}
                    <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(review.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
        {activeTab === 'watchlist' && (
          <motion.div key="watchlist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {watchlist.length === 0 && <p className="text-center text-zinc-500 py-8 text-sm">La watchlist est vide.</p>}
            <div className="grid grid-cols-3 gap-3">
              {watchlist.map(item => (
                <Link key={item.id} to={`/media/${item.mediaType}/${item.mediaId}`} className="group relative">
                  <div className="aspect-[2/3] bg-zinc-800 rounded-xl overflow-hidden">
                    {item.posterPath ? <img src={getImageUrl(item.posterPath, 'w185')} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center">{item.mediaType === 'tv' ? <Tv size={24} className="text-zinc-600" /> : <Film size={24} className="text-zinc-600" />}</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-end p-2"><p className="text-xs font-medium text-white line-clamp-2">{item.title}</p></div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
        {activeTab === 'top-films' && (
          <motion.div key="top-films" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-4"><Film size={16} className="text-amber-500" /><h3 className="font-semibold text-sm">Top 10 Films</h3><span className="text-xs text-zinc-500 ml-auto">{top10Movies.length}/10</span></div>
            <Top10Section items={top10Movies} isOwnProfile={isOwnProfile} mediaTypeLabel="Film" mediaType="movie" isEditing={isEditingTop10} setIsEditing={setIsEditingTop10} draggedItem={draggedItem} setDraggedItem={setDraggedItem} onAddClick={openSearchModal} onRemove={handleRemoveFromTop10} onDragReorder={handleDragReorder} />
          </motion.div>
        )}
        {activeTab === 'top-series' && (
          <motion.div key="top-series" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-4"><Tv size={16} className="text-amber-500" /><h3 className="font-semibold text-sm">Top 10 Séries</h3><span className="text-xs text-zinc-500 ml-auto">{top10TV.length}/10</span></div>
            <Top10Section items={top10TV} isOwnProfile={isOwnProfile} mediaTypeLabel="Série" mediaType="tv" isEditing={isEditingTop10} setIsEditing={setIsEditingTop10} draggedItem={draggedItem} setDraggedItem={setDraggedItem} onAddClick={openSearchModal} onRemove={handleRemoveFromTop10} onDragReorder={handleDragReorder} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {searchModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setSearchModalOpen(false); }}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">{searchTarget?.type === 'movie' ? <Film size={16} className="text-amber-500" /> : <Tv size={16} className="text-amber-500" />}<h3 className="font-bold">Ajouter {searchTarget?.type === 'movie' ? 'un film' : 'une série'} — #{searchTarget?.rank}</h3></div>
                <button onClick={() => setSearchModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"><X size={18} /></button>
              </div>
              <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" /><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={`Rechercher ${searchTarget?.type === 'movie' ? 'un film' : 'une série'}...`} className="w-full bg-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none border border-zinc-700 focus:border-amber-500 transition-colors" autoFocus /></div>
              <div className="overflow-y-auto flex-1 space-y-2">
                {isSearching && <p className="text-center text-zinc-500 text-sm py-4">Recherche...</p>}
                {!isSearching && searchResults.map(result => (
                  <button key={result.id} onClick={() => handleAddToTop10(result.id)} className="w-full flex items-center gap-3 hover:bg-zinc-800 rounded-2xl p-3 transition-colors text-left">
                    {result.poster_path ? <img src={getImageUrl(result.poster_path, 'w92')} alt="" className="w-10 h-14 object-cover rounded-xl flex-shrink-0" /> : <div className="w-10 h-14 bg-zinc-800 rounded-xl flex-shrink-0" />}
                    <div><p className="font-medium text-sm">{result.title || result.name}</p><p className="text-xs text-zinc-500">{(result.release_date || result.first_air_date || '').substring(0, 4)}</p></div>
                  </button>
                ))}
                {!isSearching && searchQuery && searchResults.length === 0 && <p className="text-center text-zinc-500 text-sm py-4">Aucun résultat</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {editingReview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setEditingReview(null); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 w-full max-w-md">
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold">Modifier la review</h3><button onClick={() => setEditingReview(null)} className="p-2 hover:bg-zinc-800 rounded-xl"><X size={18} /></button></div>
              <div className="flex gap-1 mb-3">{[1,2,3,4,5].map(s => <button key={s} onClick={() => setEditReviewRating(s)}><Star size={20} className={s <= editReviewRating ? 'text-amber-500 fill-amber-500' : 'text-zinc-600'} /></button>)}</div>
              <textarea value={editReviewText} onChange={e => setEditReviewText(e.target.value)} rows={4} placeholder="Ta review..." className="w-full bg-zinc-800 rounded-xl px-3 py-2 text-sm outline-none border border-zinc-700 focus:border-amber-500 resize-none mb-3" />
              <button onClick={handleSaveReview} className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl py-2.5 text-sm font-semibold transition-colors">Enregistrer</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}