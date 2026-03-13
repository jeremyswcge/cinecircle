import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { tmdb, getImageUrl } from '../lib/tmdb';
import { auth, db, doc, setDoc, deleteDoc, getDoc, collection, query, where, onSnapshot, serverTimestamp, addDoc } from '../lib/firebase';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Bookmark, BookmarkCheck, X, ListOrdered } from 'lucide-react';

export default function MediaDetail() {
  const { type, id } = useParams<{ type: 'movie' | 'tv', id: string }>();
  const [media, setMedia] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [myReview, setMyReview] = useState({ rating: 5, text: '' });
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showTop10Modal, setShowTop10Modal] = useState(false);
  const [currentTop10, setCurrentTop10] = useState<any[]>([]);

  useEffect(() => {
    if (!type || !id) return;

    const fetchMedia = async () => {
      try {
        const data = await tmdb.getDetails(type, id);
        setMedia(data);
      } catch (error) {
        console.error("Erreur TMDB:", error);
      }
    };

    const checkWatchlist = async () => {
      if (!auth.currentUser) return;
      const docRef = doc(db, `users/${auth.currentUser.uid}/watchlist/${id}`);
      const docSnap = await getDoc(docRef);
      setInWatchlist(docSnap.exists());
    };

    const unsubscribeReviews = onSnapshot(
      query(collection(db, 'reviews'), where('mediaId', '==', Number(id)), where('mediaType', '==', type)),
      (snapshot) => {
        const revs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setReviews(revs.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
      }
    );

    let unsubscribeTop10 = () => {};
    if (auth.currentUser) {
      unsubscribeTop10 = onSnapshot(doc(db, 'top10', auth.currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          setCurrentTop10(docSnap.data().items || []);
        }
      });
    }

    Promise.all([fetchMedia(), checkWatchlist()]).then(() => setLoading(false));
    return () => {
      unsubscribeReviews();
      unsubscribeTop10();
    };
  }, [type, id]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !myReview.text.trim()) return;

    try {
      await addDoc(collection(db, 'reviews'), {
        userId: auth.currentUser.uid,
        mediaId: Number(id),
        mediaType: type,
        rating: myReview.rating,
        text: myReview.text,
        createdAt: serverTimestamp()
      });
      setMyReview({ rating: 5, text: '' });
    } catch (error) {
      console.error("Erreur d'ajout de critique:", error);
    }
  };

  const addToTop10 = () => {
    if (!auth.currentUser) {
      alert("Veuillez vous connecter pour ajouter au Top 10.");
      return;
    }
    setShowTop10Modal(true);
  };

  const handleSelectTop10Rank = async (rank: number) => {
    if (!auth.currentUser || !media) return;
    const docRef = doc(db, 'top10', auth.currentUser.uid);

    const newItems = currentTop10.filter(item =>
      !(item.mediaId === Number(id) && item.mediaType === type) &&
      !(item.rank === rank && item.mediaType === type)
    );

    newItems.push({
      mediaId: Number(id),
      mediaType: type,
      rank,
      title: media.title || media.name,
      posterPath: media.poster_path
    });

    try {
      await setDoc(docRef, { userId: auth.currentUser.uid, items: newItems }, { merge: true });
      setShowTop10Modal(false);
    } catch (error) {
      console.error("Erreur Top 10:", error);
    }
  };

  const toggleWatchlist = async () => {
    if (!auth.currentUser || !media) return;
    
    const docRef = doc(db, `users/${auth.currentUser.uid}/watchlist/${id}`);
    
    try {
      if (inWatchlist) {
        await deleteDoc(docRef);
        setInWatchlist(false);
      } else {
        await setDoc(docRef, {
          mediaId: Number(id),
          mediaType: type,
          title: media.title || media.name,
          posterPath: media.poster_path,
          addedAt: serverTimestamp()
        });
        setInWatchlist(true);
      }
    } catch (error) {
      console.error("Erreur Watchlist:", error);
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-amber-500">Chargement...</div>;
  if (!media) return <div className="text-center py-20">Média introuvable</div>;

  const trailer = media.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 max-w-5xl mx-auto space-y-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800">
        <div className="absolute inset-0">
          <img 
            src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`} 
            alt="backdrop" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
        </div>
        
        <div className="relative p-6 md:p-12 flex flex-col md:flex-row gap-8 items-center md:items-start">
          <img 
            src={getImageUrl(media.poster_path)} 
            alt={media.title || media.name} 
            className="w-48 md:w-64 rounded-2xl shadow-2xl border border-zinc-800"
          />
          <div className="flex-1 space-y-4 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-white">{media.title || media.name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-mono text-zinc-400">
              <span className="flex items-center gap-1 text-amber-500"><Star size={16} /> {media.vote_average?.toFixed(1)}</span>
              <span>{media.release_date || media.first_air_date}</span>
              <span>{media.runtime ? `${media.runtime} min` : ''}</span>
            </div>
            <p className="text-zinc-300 text-lg leading-relaxed max-w-2xl">{media.overview}</p>
            
            <div className="pt-4 flex flex-wrap gap-4 justify-center md:justify-start">
              <button onClick={addToTop10} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-xl transition-colors">
                Ajouter au Top 10
              </button>
              <button 
                onClick={toggleWatchlist} 
                className={`px-6 py-3 flex items-center gap-2 font-bold rounded-xl transition-colors ${
                  inWatchlist 
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50 hover:bg-amber-500/30' 
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                }`}
              >
                {inWatchlist ? (
                  <><BookmarkCheck size={20} /> Dans ma Watchlist</>
                ) : (
                  <><Bookmark size={20} /> Ajouter à la Watchlist</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trailer */}
      {trailer && (
        <section>
          <h2 className="text-2xl font-semibold text-zinc-100 mb-6 border-l-4 border-amber-500 pl-2">Bande-annonce</h2>
          <div className="aspect-video w-full rounded-2xl overflow-hidden border border-zinc-800">
            <iframe 
              src={`https://www.youtube.com/embed/${trailer.key}`} 
              title="Trailer" 
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {/* Reviews Section */}
      <section className="grid md:grid-cols-2 gap-12">
        {/* Write Review */}
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100 mb-6 border-l-4 border-amber-500 pl-2">Laisser une critique</h2>
          <form onSubmit={submitReview} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Note (/10)</label>
              <input 
                type="range" 
                min="1" max="10" 
                value={myReview.rating} 
                onChange={(e) => setMyReview({ ...myReview, rating: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <div className="text-center text-2xl font-bold text-amber-500 mt-2">{myReview.rating}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Votre avis</label>
              <textarea 
                value={myReview.text}
                onChange={(e) => setMyReview({ ...myReview, text: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:outline-none focus:border-amber-500 min-h-[120px]"
                placeholder="Qu'avez-vous pensé de ce chef-d'œuvre ?"
                required
              />
            </div>
            <button type="submit" className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 font-bold rounded-xl transition-colors">
              Publier
            </button>
          </form>
        </div>

        {/* Read Reviews */}
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100 mb-6 border-l-4 border-amber-500 pl-2">Avis de la communauté</h2>
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-zinc-500 italic">Soyez le premier à donner votre avis !</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono text-zinc-400">Utilisateur anonyme</span>
                    <span className="flex items-center gap-1 text-amber-500 font-bold"><Star size={14} /> {review.rating}</span>
                  </div>
                  <p className="text-zinc-300">{review.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Top 10 Modal */}
      {showTop10Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ListOrdered className="text-amber-500" />
                Top 10 {type === 'movie' ? 'Films' : 'Séries'}
              </h3>
              <button onClick={() => setShowTop10Modal(false)} className="text-zinc-400 hover:text-white transition-colors p-2 rounded-full hover:bg-zinc-800">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto pr-2 space-y-2 [scrollbar-width:thin] scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {[...Array(10)].map((_, i) => {
                const rank = i + 1;
                const existing = currentTop10.find(item => item.rank === rank && item.mediaType === type);
                return (
                  <button
                    key={rank}
                    onClick={() => handleSelectTop10Rank(rank)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 hover:border-amber-500 hover:bg-amber-500/10 transition-all text-left group"
                  >
                    <span className="text-xl font-black text-amber-500 w-8 text-center group-hover:scale-110 transition-transform">{rank}</span>
                    {existing ? (
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-zinc-500 block">Remplacer</span>
                        <span className="text-zinc-300 truncate block font-medium">{existing.title}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-500 italic flex-1">Emplacement vide</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
