import React, { useEffect, useState } from 'react';
import { auth, db, collection, query, orderBy, limit, onSnapshot, doc, getDoc, addDoc, serverTimestamp, updateDoc } from '../lib/firebase';
import { getImageUrl } from '../lib/tmdb';
import { Heart, MessageCircle, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type Review = {
  id: string;
  userId: string;
  mediaId: number;
  mediaType: string;
  mediaTitle: string;
  mediaPosterPath: string;
  rating: number;
  comment: string;
  createdAt: any;
  userProfile?: any;
  likes?: string[];
};

export default function Feed() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const q = query(
      collection(db, 'reviews'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const reviewsData = await Promise.all(
        snap.docs.map(async (d) => {
          const review = { id: d.id, ...d.data() } as Review;
          try {
            const userSnap = await getDoc(doc(db, 'users', review.userId));
            review.userProfile = userSnap.exists() ? userSnap.data() : null;
          } catch {}
          return review;
        })
      );
      setReviews(reviewsData);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleLike = async (reviewId: string, currentLikes: string[] = []) => {
    if (!currentUser) return;
    const reviewRef = doc(db, 'reviews', reviewId);
    const isLiked = currentLikes.includes(currentUser.uid);
    await updateDoc(reviewRef, {
      likes: isLiked 
        ? currentLikes.filter(id => id !== currentUser.uid)
        : [...currentLikes, currentUser.uid]
    });
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-amber-500 text-4xl animate-spin">◎</div></div>;

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📰 Feed</h1>
      {reviews.length === 0 ? (
        <div className="text-center text-zinc-500 py-20">
          <p>Aucune review pour l'instant.</p>
          <p className="text-sm mt-2">Sois le premier à partager une recommandation !</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map(review => (
            <div key={review.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex gap-4 p-4">
                <img 
                  src={getImageUrl(review.mediaPosterPath, 'w500')} 
                  alt={review.mediaTitle}
                  className="w-16 h-24 object-cover rounded-xl flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {review.userProfile?.photoURL ? (
                        <img src={review.userProfile.photoURL} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-zinc-950">
                          {(review.userProfile?.username?.[0] || '?').toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-sm">{review.userProfile?.username || 'Utilisateur'}</span>
                    </div>
                    <span className="text-zinc-500 text-xs flex-shrink-0">
                      {review.createdAt?.toDate ? formatDistanceToNow(review.createdAt.toDate(), { addSuffix: true, locale: fr }) : ''}
                    </span>
                  </div>
                  <h3 className="font-bold text-base mb-1 truncate">{review.mediaTitle}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} size={14} className={star <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-zinc-600'} />
                    ))}
                  </div>
                  {review.comment && <p className="text-zinc-300 text-sm line-clamp-3">{review.comment}</p>}
                </div>
              </div>
              <div className="border-t border-zinc-800 px-4 py-3 flex items-center gap-4">
                <button 
                  onClick={() => handleLike(review.id, review.likes)}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    review.likes?.includes(currentUser?.uid || '') 
                      ? 'text-red-400' : 'text-zinc-400 hover:text-red-400'
                  }`}
                >
                  <Heart size={16} className={review.likes?.includes(currentUser?.uid || '') ? 'fill-red-400' : ''} />
                  {review.likes?.length || 0}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
