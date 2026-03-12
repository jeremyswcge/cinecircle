import React, { useEffect, useState } from 'react';
import { tmdb } from '../lib/tmdb';
import MediaCard from '../components/MediaCard';
import { auth, db, doc, getDoc } from '../lib/firebase';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

type MediaItem = {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
  media_type?: 'movie' | 'tv';
};

export default function Home() {
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [upcoming, setUpcoming] = useState<MediaItem[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) setProfile(snap.data());
        }
        const [trendingMovies, trendingTV, upcomingData] = await Promise.all([
          tmdb.getTrendingMovies(),
          tmdb.getTrendingTV(),
          tmdb.getUpcomingMovies('FR')
        ]);
        const combined = [
          ...trendingMovies.results.slice(0, 10).map((m: MediaItem) => ({ ...m, media_type: 'movie' as const })),
          ...trendingTV.results.slice(0, 10).map((m: MediaItem) => ({ ...m, media_type: 'tv' as const }))
        ].sort(() => Math.random() - 0.5);
        setTrending(combined);
        setUpcoming(upcomingData.results?.slice(0, 10) || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-amber-500 text-4xl animate-spin">◎</div></div>;

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 space-y-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="md:hidden">
            <Logo />
          </div>
          {profile && (
            <div>
              <p className="text-zinc-400 text-sm">Bonjour,</p>
              <h1 className="text-xl font-bold">{profile.displayName || profile.username}</h1>
            </div>
          )}
        </div>
        <Link to="/profile" className="flex items-center gap-2">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-amber-500" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-zinc-950 font-bold">
              {(profile?.username?.[0] || '?').toUpperCase()}
            </div>
          )}
        </Link>
      </header>

      <section>
        <h2 className="text-2xl font-bold mb-4">🔥 Tendances</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {trending.map(item => (
            <MediaCard
              key={`${item.media_type}-${item.id}`}
              id={item.id}
              title={item.title || item.name || ''}
              posterPath={item.poster_path}
              type={item.media_type!}
              rating={item.vote_average}
            />
          ))}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">🎬 Prochainement</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {upcoming.map(item => (
              <MediaCard
                key={item.id}
                id={item.id}
                title={item.title || ''}
                posterPath={item.poster_path}
                type="movie"
                rating={item.vote_average}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
