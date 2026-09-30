import React from 'react';
import type { User } from '../types';
import { ShieldCheck, LogOut, Activity, UserCircle } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  method: 'saw' | 'moora';
  setMethod: (m: 'saw' | 'moora') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, method, setMethod }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white font-black text-xl shadow-xs">
              U
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                  SPK Stunting Balita
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  UNY
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Sistem Pendukung Keputusan Triase Intervensi Gizi
              </p>
            </div>
          </div>

          {/* Center: Method Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setMethod('saw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                method === 'saw'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>SAW</span>
            </button>
            <button
              onClick={() => setMethod('moora')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                method === 'moora'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>MOORA</span>
            </button>
          </div>

          {/* Right: User Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-xs font-bold text-slate-900">{user.name}</span>
                {user.is_superadmin ? (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md">
                    <ShieldCheck className="w-3 h-3 text-amber-700" />
                    SUPERADMIN
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    USER BIASA
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-mono block">
                {user.email}
              </span>
            </div>

            <div className="md:hidden">
              <UserCircle className="w-7 h-7 text-slate-600" />
            </div>

            <button
              onClick={onLogout}
              title="Logout"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
