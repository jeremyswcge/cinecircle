import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db, doc, getDoc, onSnapshot } from './lib/firebase';
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import SetupProfile from './pages/SetupProfile';
import Home from './pages/Home';
import Profile from './pages/Profile';
import MediaDetail from './pages/MediaDetail';
import GlobalChat from './pages/GlobalChat';
import Feed from './pages/Feed';
import AIChat from './components/AIChat';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const profileRef = doc(db, 'users', u.uid);
        const snap = await getDoc(profileRef);
        setProfile(snap.exists() ? snap.data() : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cinema-doodle flex items-center justify-center">
        <div className="text-amber-500 text-4xl animate-spin">◎</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-cinema-doodle text-white">
        <ErrorBoundary>
          <Login />
        </ErrorBoundary>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-cinema-doodle text-white">
        <ErrorBoundary>
          <SetupProfile />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-doodle text-white">
      <Router>
        <ErrorBoundary>
          <Navigation />
          <main className="pb-20 md:pb-0 md:pl-64">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/media/:type/:id" element={<MediaDetail />} />
              <Route path="/chats" element={<GlobalChat />} />
              <Route path="/cinebuddy" element={<AIChat />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </ErrorBoundary>
      </Router>
    </div>
  );
}
