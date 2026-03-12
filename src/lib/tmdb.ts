const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

async function fetchTMDB(endpoint: string, params: Record<string, string> = {}) {
  if (!TMDB_API_KEY) {
    console.warn("TMDB API Key missing");
    return { results: [] };
  }
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'fr-FR',
    ...params,
  });
  
  const response = await fetch(`${BASE_URL}${endpoint}?${queryParams}`);
  if (!response.ok) throw new Error('TMDB API error');
  return response.json();
}

export const tmdb = {
  getTrendingMovies: () => fetchTMDB('/trending/movie/week'),
  getTrendingTV: () => fetchTMDB('/trending/tv/week'),
  getUpcomingMovies: (region: 'FR' | 'CH' = 'FR') => 
    fetchTMDB('/movie/upcoming', { region }),
  getDetails: (type: 'movie' | 'tv', id: string) => 
    fetchTMDB(`/${type}/${id}`, { append_to_response: 'videos,credits' }),
  search: (query: string) => 
    fetchTMDB('/search/multi', { query }),
  searchMovies: (query: string) => 
    fetchTMDB('/search/movie', { query }),
  searchTV: (query: string) => 
    fetchTMDB('/search/tv', { query }),
};

export const getImageUrl = (path: string | null, size: 'w500' | 'original' = 'w500') => {
  if (!path) return 'https://picsum.photos/seed/cinema/500/750';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};
