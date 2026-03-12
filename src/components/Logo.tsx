import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className, showText = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img src="/logo.svg" alt="CineCircle Logo" className="w-10 h-10 flex-shrink-0" />
      
      {showText && (
        <div className="text-2xl font-black tracking-tight relative">
          <span 
            className="text-white relative z-10"
            style={{ textShadow: '-1.5px 0px 0px #00f0ff, 1.5px 0px 0px #ff003c' }}
          >
            Cine
          </span>
          <span 
            className="text-amber-500 relative z-10"
            style={{ textShadow: '-1.5px 0px 0px #00f0ff, 1.5px 0px 0px #ff003c' }}
          >
            Circle
          </span>
        </div>
      )}
    </div>
  );
}
