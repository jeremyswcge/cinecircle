import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Members from './pages/Members';
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

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-amber-500">Chargement...</div>;

  return (
    <Router>
      <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans pb-20 md:pb-0 md:pl-64">
        {user && hasProfile && <ErrorBoundary><Navigation /></ErrorBoundary>}
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          ) : !hasProfile ? (
            <>
              <Route path="/setup" element={<SetupProfile onComplete={() => setHasProfile(true)} />} />
              <Route path="*" element={<Navigate to="/setup" />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Home />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/members" element={<Members />} />
              <Route path="/chats" element={<GlobalChat />} />
              <Route path="/cinebuddy" element={<AIChat />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:uid" element={<Profile />} />
              <Route path="/media/:type/:id" element={<MediaDetail />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}