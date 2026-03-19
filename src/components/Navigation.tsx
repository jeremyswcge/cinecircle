import { Home, Rss, MessageCircle, Bot, User, LogOut, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import Logo from './Logo';
import { cn } from '../lib/utils';

const links = [
  { icon: Home,          label: 'Accueil',       path: '/' },
  { icon: Rss,           label: 'Derniers avis',  path: '/feed' },
  { icon: Users,         label: 'Membres',        path: '/members' },
  { icon: MessageCircle, label: 'Chats',          path: '/chats' },
  { icon: Bot,           label: 'CineBuddy',      path: '/cinebuddy' },
  { icon: User,          label: 'Profil',         path: '/profile' },
];

export default function Navigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto md:w-64 md:h-screen bg-zinc-900/80 backdrop-blur-md border-t md:border-t-0 md:border-r border-zinc-800 z-50">
      <div className="flex md:flex-col items-center md:items-start justify-around md:justify-start h-16 md:h-full md:py-8 px-4 md:px-6 gap-y-2">
        <div className="hidden md:flex items-center w-full mb-8">
          <Link to="/"><div className="flex items-center gap-3"><Logo /></div></Link>
        </div>
        {links.map(({ icon: Icon, label, path }) => (
          <Link key={path} to={path} className={cn("flex flex-col md:flex-row items-center md:justify-start w-12 h-12 md:w-full md:h-12 md:px-4 rounded-xl transition-all duration-200 gap-3", currentPath === path ? "text-amber-500 bg-amber-500/10" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")} title={label}>
            <Icon size={24} />
            <span className="hidden md:block font-medium">{label}</span>
          </Link>
        ))}
        <button onClick={() => signOut(auth)} className="md:mt-auto flex flex-col md:flex-row items-center md:justify-start w-12 h-12 md:w-full md:h-12 md:px-4 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 gap-3" title="Déconnexion">
          <LogOut size={24} />
          <span className="hidden md:block font-medium">Déconnexion</span>
        </button>
      </div>
    </nav>
  );
}