import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tmdb, getImageUrl } from '../lib/tmdb';
import { auth, db, doc, getDoc, setDoc, deleteDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from '../lib/firebase';
import { ArrowLeft, Bookmark, BookmarkCheck, Star } from 'lucide-react';

type CastMember = { id: number; name: string; character: string; profile_path: string | null };
type VideoItem = { type: string; site: string; key: string };

export default function MediaDetail() {
  const { type, id } = useParams<{ type: 'movie' | 'tv'; id: string }>();
  const navigate = useNavigate();
  const [media, setMedia] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await tmdb.getDetails(type!, id!);
        setMedia(data);
        if (currentUser) {
          const wSnap = await getDoc(doc(db, 'users', currentUser.uid, 'watchlist', `${type}-${id}`));
          setInWatchlist(wSnap.exists());
          const rQuery = query(collection(db, 'reviews'), where('userId', '==', currentUser.uid), where('mediaId', '==', Number(id)), where('mediaType', '==', type));
          const rSnap = await getDocs(rQuery);
          if (!rSnap.empty) {
            const rev = { id: rSnap.docs[0].id, ...rSnap.docs[0].data() };
            setExistingReview(rev);
            setUserRating((rev as any).rating);
            setComment((rev as any).comment);
          }
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [type, id]);

  const toggleWatchlist = async () => {
    if (!currentUser || !media) return;
    const ref = doc(db, 'users', currentUser.uid, 'watchlist', `${type}-${id}`);
    if (inWatchlist) { await deleteDoc(ref); setInWatchlist(false); }
    else { await setDoc(ref, { mediaId: Number(id), mediaType: type, title: media.title || media.name, posterPath: media.poster_path, addedAt: new Date().toISOString() }); setInWatchlist(true); }
  };

  const submitReview = async () => {
    if (!currentUser || !media || !userRating) return;
    setSubmitting(true);
    try {
      const reviewData = {
        userId: currentUser.uid,
        mediaId: Number(id),
        mediaType: type,
        mediaTitle: media.title || media.name,
        mediaPosterPath: media.poster_path,
        rating: userRating,
        comment,
        createdAt: serverTimestamp()
      };
      if (existingReview) {
        await setDoc(doc(db, 'reviews', existingReview.id), reviewData);
      } else {
        await addDoc(collection(db, 'reviews'), reviewData);
      }
      alert('Review enregistrée !');
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-amber-500 text-4xl animate-spin">◎</div></div>;
  if (!media) return <div className="p-8 text-center">Media non trouvé</div>;

  const trailer = media.videos?.results?.find((v: VideoItem) => v.type === 'Trailer' && v.site === 'YouTube');
  const cast = media.credits?.cast?.slice(0, 10) || [];

  return (
    <div className="min-h-screen">
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img src={getImageUrl(media.backdrop_path || media.poster_path, 'original')} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 bg-zinc-900/80 rounded-xl hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="px-4 md:px-8 py-6 -mt-16 relative space-y-8">
        <div className="flex gap-4">
          <img src={getImageUrl(media.poster_path)} alt={media.title || media.name} className="w-28 md:w-40 rounded-2xl border-2 border-zinc-800 flex-shrink-0" />
          <div className="flex-1 pt-4">
            <h1 className="text-2xl md:text-3xl font-bold">{media.title || media.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-zinc-400">
              <span>{media.release_date?.slice(0, 4) || media.first_air_date?.slice(0, 4)}</span>
              {media.vote_average > 0 && (
                <span className="flex items-center gap-1"><Star size={14} className="text-amber-500" />{media.vote_average.toFixed(1)}</span>
              )}
              {media.runtime && <span>{media.runtime} min</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {media.genres?.map((g: any) => (
                <span key={g.id} className="px-3 py-1 bg-zinc-800 rounded-full text-xs">{g.name}</span>
              ))}
            </div>
            <button onClick={toggleWatchlist} className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${inWatchlist ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
              {inWatchlist ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              {inWatchlist ? 'Dans la watchlist' : 'Ajouter à la watchlist'}
            </button>
          </div>
        </div>

        {media.overview && <p className="text-zinc-300 leading-relaxed">{media.overview}</p>}

        {trailer && (
          <div>
            <h2 className="text-xl font-bold mb-4">🎬 Bande-annonce</h2>
            <div className="aspect-video rounded-2xl overflow-hidden">
              <iframe src={`https://www.youtube.com/embed/${trailer.key}`} className="w-full h-full" allowFullScreen />
            </div>
          </div>
        )}

        {cast.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">🎭 Casting</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {cast.map((actor: CastMember) => (
                <div key={actor.id} className="flex-shrink-0 w-20 text-center">
                  <img src={getImageUrl(actor.profile_path)} alt={actor.name} className="w-20 h-20 rounded-full object-cover border-2 border-zinc-800 mb-2" />
                  <p className="text-xs font-medium truncate">{actor.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{actor.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">⭐ Ta review</h2>
          <div className="flex gap-2 mb-4">
            {[1,2,3,4,5].map(star => (
              <button key={star} onClick={() => setUserRating(star)} className="transition-transform hover:scale-110">
                <Star size={28} className={star <= userRating ? 'text-amber-500 fill-amber-500' : 'text-zinc-600'} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Ton avis sur ce film/série..."
            rows={3}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none transition-colors"
          />
          <button
            onClick={submitReview}
            disabled={!userRating || submitting}
            className="mt-4 w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold rounded-xl transition-colors"
          >
            {submitting ? 'Envoi...' : existingReview ? 'Modifier la review' : 'Publier la review'}
          </button>
        </div>
      </div>
    </div>
  );
}
