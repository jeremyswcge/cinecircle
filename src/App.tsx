import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, doc, getDoc } from './lib/firebase';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Feed from './pages/Feed';
import Login from './pages/Login';
import SetupProfile from './pages/SetupProfile';
import Profile from './pages/Profile';
import MediaDetail from './pages/MediaDetail';
import GlobalChat from './pages/GlobalChat';
import AIChat from './components/AIChat';
import Logo from './components/Logo';

import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        setHasProfile(userDoc.exists());
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-amber-500">Chargement...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans pb-20 md:pb-0 md:pl-64">
        {user && hasProfile && <ErrorBoundary><Navigation /></ErrorBoundary>}
        
        {user && hasProfile && (
          <header className="md:hidden sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
            <Link to="/">
              <Logo />
            </Link>
          </header>
        )}

        <main className="w-full max-w-7xl mx-auto p-4 md:p-8">
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to={hasProfile ? "/" : "/setup"} />} />
              <Route path="/setup" element={user && !hasProfile ? <SetupProfile onComplete={() => setHasProfile(true)} /> : <Navigate to="/" />} />
              
              {/* Protected Routes */}
              <Route path="/" element={user && hasProfile ? <Home /> : <Navigate to="/login" />} />
              <Route path="/feed" element={user && hasProfile ? <Feed /> : <Navigate to="/login" />} />
              <Route path="/profile/:uid?" element={user && hasProfile ? <Profile /> : <Navigate to="/login" />} />
              <Route path="/media/:type/:id" element={user && hasProfile ? <MediaDetail /> : <Navigate to="/login" />} />
              <Route path="/chats" element={user && hasProfile ? <GlobalChat /> : <Navigate to="/login" />} />
              <Route path="/cinebuddy" element={user && hasProfile ? <AIChat /> : <Navigate to="/login" />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </Router>
  );
}
