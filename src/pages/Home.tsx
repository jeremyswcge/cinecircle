import React, { useEffect, useState } from 'react';
import { tmdb } from '../lib/tmdb';
import MediaCard from '../components/MediaCard';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

export default function Home() {
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [trendingTV, setTrendingTV] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [movies, tv, upFR, upCH] = await Promise.all([
          tmdb.getTrendingMovies(),
          tmdb.getTrendingTV(),
          tmdb.getUpcomingMovies('FR'),
          tmdb.getUpcomingMovies('CH')
        ]);
        
        const upcomingMap = new Map();
        (upFR.results || []).forEach((m: any) => upcomingMap.set(m.id, m));
        (upCH.results || []).forEach((m: any) => upcomingMap.set(m.id, m));
        
        setTrendingMovies(movies.results || []);
        setTrendingTV(tv.results || []);
        setUpcoming(Array.from(upcomingMap.values()));
      } catch (error) {
        console.error("Erreur de chargement TMDB:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const results = await tmdb.search(searchQuery);
          // Filter out people, keep only movie and tv
          const filteredResults = (results.results || []).filter(
            (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
          );
          setSearchResults(filteredResults);
        } catch (error) {
          console.error("Erreur de recherche TMDB:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (loading) return <div className="flex justify-center py-20 text-amber-500">Chargement des pépites...</div>;

  const sections = [
    { title: "Films Tendances", data: trendingMovies, type: 'movie' as const },
    { title: "Séries Tendances", data: trendingTV, type: 'tv' as const },
    { title: "Prochainement", data: upcoming, type: 'movie' as const },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 py-8"
    >
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">
          Découvrir
        </h1>
        <p className="text-zinc-400 text-lg mb-8">Les meilleures recommandations du moment.</p>
        
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-zinc-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors shadow-inner"
            placeholder="Rechercher un film ou une série..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {searchQuery.trim() ? (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 px-2 border-l-4 border-amber-500">
            Résultats pour "{searchQuery}"
          </h2>
          {isSearching ? (
            <div className="text-zinc-500 px-2">Recherche en cours...</div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 px-2">
              {searchResults.map((item) => (
                <MediaCard 
                  key={item.id}
                  id={item.id} 
                  title={item.title || item.name} 
                  posterPath={item.poster_path} 
                  type={item.media_type as 'movie' | 'tv'}
                  rating={item.vote_average}
                />
              ))}
            </div>
          ) : (
            <div className="text-zinc-500 px-2">Aucun résultat trouvé.</div>
          )}
        </section>
      ) : (
        sections.map((section, idx) => (
          section.data.length > 0 && (
            <section key={idx} className="space-y-4">
              <h2 className="text-2xl font-semibold text-zinc-100 px-2 border-l-4 border-amber-500">{section.title}</h2>
              <div className="flex overflow-x-auto gap-4 md:gap-6 pb-6 px-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {section.data.map((item) => (
                  <div key={item.id} className="snap-start">
                    <MediaCard 
                      id={item.id} 
                      title={item.title || item.name} 
                      posterPath={item.poster_path} 
                      type={section.type}
                      rating={item.vote_average}
                    />
                  </div>
                ))}
              </div>
            </section>
          )
        ))
      )}
    </motion.div>
  );
}
