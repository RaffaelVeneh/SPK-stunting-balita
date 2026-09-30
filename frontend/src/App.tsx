import { useState, useEffect } from 'react';
import { api } from './services/api';
import type { User } from './types';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
  const [user, setUser] = useState<User | null>(() => api.getUser());
  const [method, setMethod] = useState<'saw' | 'moora'>('saw');

  useEffect(() => {
    const savedUser = api.getUser();
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Navbar
        user={user}
        onLogout={handleLogout}
        method={method}
        setMethod={setMethod}
      />
      <main className="flex-1">
        <DashboardPage method={method} />
      </main>
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        SPK Prioritas Intervensi Gizi Balita &copy; 2026 — Universitas Negeri Yogyakarta (UNY)
      </footer>
    </div>
  );
}

export default App;
