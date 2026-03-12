import React from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../lib/tmdb';

interface MediaCardProps {
  key?: React.Key;
  id: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv';
  rating?: number;
}

export default function MediaCard({ id, title, posterPath, type, rating }: MediaCardProps) {
  return (
    <Link to={`/media/${type}/${id}`} className="group relative flex-shrink-0 w-[140px] sm:w-[160px] md:w-[200px] flex flex-col gap-2 transition-transform hover:scale-105">
      <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-amber-500/50 transition-colors">
        <img 
          src={getImageUrl(posterPath)} 
          alt={title} 
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="px-1">
        <h3 className="text-sm md:text-base font-semibold text-zinc-100 truncate">{title}</h3>
        {rating !== undefined && rating > 0 ? (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-amber-500 text-xs">★</span>
            <span className="text-zinc-400 text-xs">{rating.toFixed(1)}</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
