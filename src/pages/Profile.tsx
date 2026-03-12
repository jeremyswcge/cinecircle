import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { auth, db, doc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot, orderBy } from '../lib/firebase';
import { getImageUrl } from '../lib/tmdb';
import { Settings, UserPlus, UserMinus, Star, Bookmark } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type Tab = 'reviews' | 'watchlist' | 'top10';

export default function Profile() {
  const { userId } = useParams();
  const currentUser = auth.currentUser;
  const targetId = userId || currentUser?.uid;
  const isOwnProfile = !userId || userId === currentUser?.uid;
  
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [top10, setTop10] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('reviews');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!targetId) return;
      try {
        const snap = await getDoc(doc(db, 'users', targetId));
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setEditBio(data.bio || '');
          setEditUsername(data.username || '');
          if (!isOwnProfile && currentUser) {
            setIsFollowing(data.followers?.includes(currentUser.uid) || false);
          }
        }
        const rQuery = query(collection(db, 'reviews'), where('userId', '==', targetId), orderBy('createdAt', 'desc'));
        const rSnap = await getDocs(rQuery);
        setReviews(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const wSnap = await getDocs(collection(db, 'users', targetId, 'watchlist'));
        setWatchlist(wSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const t10Snap = await getDoc(doc(db, 'top10', targetId));
        if (t10Snap.exists()) setTop10(t10Snap.data().items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [targetId]);

  const saveProfile = async () => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      bio: editBio,
      username: editUsername,
      displayName: editUsername
    });
    setProfile((prev: any) => ({ ...prev, bio: editBio, username: editUsername }));
    setEditing(false);
  };

  const toggleFollow = async () => {
    if (!currentUser || !profile || isOwnProfile) return;
    const targetRef = doc(db, 'users', targetId!);
    const currentRef = doc(db, 'users', currentUser.uid);
    const targetSnap = await getDoc(targetRef);
    const currentSnap = await getDoc(currentRef);
    const targetData = targetSnap.data()!;
    const currentData = currentSnap.data()!;
    
    if (isFollowing) {
      await updateDoc(targetRef, { followers: targetData.followers.filter((id: string) => id !== currentUser.uid) });
      await updateDoc(currentRef, { following: currentData.following.filter((id: string) => id !== targetId) });
      setIsFollowing(false);
    } else {
      await updateDoc(targetRef, { followers: [...(targetData.followers || []), currentUser.uid] });
      await updateDoc(currentRef, { following: [...(currentData.following || []), targetId] });
      setIsFollowing(true);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-amber-500 text-4xl animate-spin">◎</div></div>;
  if (!profile) return <div className="p-8 text-center">Profil non trouvé</div>;

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 max-w-2xl mx-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-20 h-20 rounded-full border-2 border-amber-500" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-amber-500 flex items-center justify-center text-3xl font-bold text-zinc-950">
                {(profile.username?.[0] || '?').toUpperCase()}
              </div>
            )}
            <div>
              {editing ? (
                <input
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-lg font-bold w-full mb-1"
                />
              ) : (
                <h1 className="text-2xl font-bold">{profile.username}</h1>
              )}
              <div className="flex gap-4 text-sm text-zinc-400 mt-1">
                <span><strong className="text-white">{profile.followers?.length || 0}</strong> abonnés</span>
                <span><strong className="text-white">{profile.following?.length || 0}</strong> abonnements</span>
              </div>
            </div>
          </div>
          {isOwnProfile ? (
            <button onClick={() => editing ? saveProfile() : setEditing(true)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
              <Settings size={20} className="text-zinc-400" />
            </button>
          ) : (
            <button
              onClick={toggleFollow}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isFollowing ? 'bg-zinc-800 hover:bg-red-500/20 hover:text-red-400' : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
              }`}
            >
              {isFollowing ? <><UserMinus size={16} /> Suivi</> : <><UserPlus size={16} /> Suivre</>}
            </button>
          )}
        </div>
        {editing ? (
          <div className="mt-4">
            <textarea
              value={editBio}
              onChange={e => setEditBio(e.target.value)}
              placeholder="Ta bio..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm resize-none"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={saveProfile} className="px-4 py-2 bg-amber-500 text-zinc-950 rounded-xl text-sm font-medium">Sauvegarder</button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 bg-zinc-800 rounded-xl text-sm">Annuler</button>
            </div>
          </div>
        ) : profile.bio ? (
          <p className="mt-4 text-zinc-400 text-sm">{profile.bio}</p>
        ) : null}
      </div>

      <div className="flex gap-2 mb-6">
        {(['reviews', 'watchlist', 'top10'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {tab === 'reviews' ? `Reviews (${reviews.length})` : tab === 'watchlist' ? `Watchlist (${watchlist.length})` : 'Top 10'}
          </button>
        ))}
      </div>

      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">Aucune review pour l'instant</p>
          ) : reviews.map(review => (
            <Link key={review.id} to={`/media/${review.mediaType}/${review.mediaId}`} className="block bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-amber-500/30 transition-colors">
              <div className="flex gap-3">
                <img src={getImageUrl(review.mediaPosterPath)} alt="" className="w-12 h-16 object-cover rounded-xl flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold">{review.mediaTitle}</h3>
                  <div className="flex gap-0.5 my-1">
                    {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-zinc-600'} />)}
                  </div>
                  {review.comment && <p className="text-sm text-zinc-400 line-clamp-2">{review.comment}</p>}
                  {review.createdAt?.toDate && <p className="text-xs text-zinc-600 mt-1">{formatDistanceToNow(review.createdAt.toDate(), { addSuffix: true, locale: fr })}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'watchlist' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {watchlist.length === 0 ? (
            <p className="col-span-full text-center text-zinc-500 py-8">Watchlist vide</p>
          ) : watchlist.map(item => (
            <Link key={item.id} to={`/media/${item.mediaType}/${item.mediaId}`} className="group">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-amber-500/50 transition-colors">
                <img src={getImageUrl(item.posterPath)} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <p className="text-xs mt-1 truncate text-zinc-300">{item.title}</p>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'top10' && (
        <div>
          {isOwnProfile && (
            <p className="text-sm text-zinc-400 mb-4">Ton top 10 personnel (modifiable depuis la fiche d'un film)</p>
          )}
          {top10.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">Aucun top 10 pour l'instant</p>
          ) : (
            <div className="space-y-3">
              {top10.map((item: any, i: number) => (
                <Link key={i} to={`/media/${item.mediaType}/${item.mediaId}`} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 hover:border-amber-500/30 transition-colors">
                  <span className="text-3xl font-black text-amber-500/30 w-8">{i + 1}</span>
                  <img src={getImageUrl(item.posterPath)} alt="" className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-zinc-500">{item.mediaType === 'movie' ? 'Film' : 'Série'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
