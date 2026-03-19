import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, db, collection, query, orderBy, limit, onSnapshot, doc, updateDoc, getDoc } from '../lib/firebase';
import { tmdb, getImageUrl } from '../lib/tmdb';
import { Heart, Star, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type Review = {
  id: string;
  userId: string;
  mediaId: number;
  mediaType: string;
  rating: number;
  comment: string;
  createdAt: any;
  userProfile?: any;
  likes?: string[];
  title?: string;
  posterPath?: string;
};

export default function Feed() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(30));
    const unsub = onSnapshot(q, async (snap) => {
      const reviewsData = await Promise.all(
        snap.docs.map(async (d) => {
          const review = { id: d.id, ...d.data() } as Review;
          try { const userSnap = await getDoc(doc(db, 'users', review.userId)); review.userProfile = userSnap.exists() ? userSnap.data() : null; } catch {}
          try { const media = await tmdb.getDetails(review.mediaType, review.mediaId); review.title = media.title || media.name; review.posterPath = media.poster_path; } catch {}
          return review;
        })
      );
      setReviews(reviewsData);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLike = async (reviewId: string, likes: string[] = []) => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const newLikes = likes.includes(uid) ? likes.filter(id => id !== uid) : [...likes, uid];
    await updateDoc(doc(db, 'reviews', reviewId), { likes: newLikes });
  };

  const getTime = (date: any) => {
    if (!date) return '';
    try {
      const d = typeof date.toDate === 'function' ? date.toDate() : new Date(date.seconds ? date.seconds * 1000 : date);
      return formatDistanceToNow(d, { addSuffix: true, locale: fr });
    } catch { return ''; }
  };

  if (loading) return <div className="flex justify-center py-20 text-amber-500">Chargement...</div>;

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle size={22} className="text-amber-500" />
        <h1 className="text-2xl font-bold">Derniers avis</h1>
      </div>
      {reviews.length === 0 && <p className="text-center text-zinc-500 py-12">Aucun avis pour l'instant.</p>}
      <div className="space-y-3">
        <AnimatePresence>
          {reviews.map((review) => (
            <motion.div key={review.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-500/20 transition-colors">
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <Link to={`/profile/${review.userId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  {review.userProfile?.photoURL ? (
                    <img src={review.userProfile.photoURL} alt="" className="w-7 h-7 rounded-full border border-zinc-700" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-zinc-950">{(review.userProfile?.username?.[0] || '?').toUpperCase()}</div>
                  )}
                  <span className="font-semibold text-sm">{review.userProfile?.username || 'Utilisateur'}</span>
                </Link>
                <span className="text-zinc-500 text-xs">{getTime(review.createdAt)}</span>
              </div>
              <Link to={`/media/${review.mediaType}/${review.mediaId}`} className="flex gap-3 px-4 pb-3 group">
                <div className="flex-shrink-0 w-14 h-20 bg-zinc-800 rounded-xl overflow-hidden">
                  {review.posterPath ? (
                    <img src={getImageUrl(review.posterPath, 'w92')} alt={review.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs text-center px-1">{review.title || '—'}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm mb-1 group-hover:text-amber-400 transition-colors truncate">{review.title || 'Titre inconnu'}</h3>
                  <div className="flex items-center gap-0.5 mb-2">
                    {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-zinc-700'} />)}
                    <span className="text-zinc-500 text-xs ml-1">{review.rating}/5</span>
                  </div>
                  {review.comment && <p className="text-zinc-400 text-xs line-clamp-2">{review.comment}</p>}
                </div>
              </Link>
              <div className="border-t border-zinc-800 px-4 py-2">
                <button onClick={(e) => { e.preventDefault(); handleLike(review.id, review.likes); }} className={`flex items-center gap-1.5 transition-colors ${review.likes?.includes(currentUser?.uid || '') ? 'text-red-400' : 'text-zinc-400 hover:text-red-400'}`}>
                  <Heart size={15} className={review.likes?.includes(currentUser?.uid || '') ? 'fill-red-400' : ''} />
                  <span className="text-xs">{review.likes?.length || 0}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}