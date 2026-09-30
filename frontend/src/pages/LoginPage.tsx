import React, { useState } from 'react';
import { api } from '../services/api';
import type { User } from '../types';
import { ShieldCheck, AlertCircle, Lock, Mail, ArrowRight, GraduationCap } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Periksa domain email saat pengguna mengetik
  const getDomainWarning = () => {
    if (!email || !email.includes('@')) return null;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    if (domain !== 'uny.ac.id' && domain !== 'student.uny.ac.id') {
      return `Domain "@${domain}" tidak diizinkan. Gunakan email @uny.ac.id atau @student.uny.ac.id.`;
    }
    return null;
  };

  const domainWarning = getDomainWarning();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (domainWarning) {
      setError(domainWarning);
      return;
    }

    setLoading(true);
    try {
      const data = await api.login(email, password);
      onLoginSuccess(data.user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Terjadi kesalahan saat masuk.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillSuperadmin = () => {
    setEmail('raffaelvincent.2024@student.uny.ac.id');
    setPassword('password123');
    setError(null);
  };

  const fillStaff = () => {
    setEmail('admin.gizi@uny.ac.id');
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-800 text-white flex items-center justify-center font-black text-3xl shadow-lg ring-4 ring-blue-100">
            U
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
            SPK Prioritas Intervensi Gizi
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Universitas Negeri Yogyakarta
          </p>
        </div>

        {/* Domain Restriction Notice */}
        <div className="mt-4 mx-4 sm:mx-0 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-3">
          <GraduationCap className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <span className="font-bold">Akses Terbatas:</span> Hanya akun resmi civitas UNY berakhiran{' '}
            <span className="font-mono font-bold bg-blue-100 px-1 py-0.5 rounded text-blue-800">@uny.ac.id</span> atau{' '}
            <span className="font-mono font-bold bg-blue-100 px-1 py-0.5 rounded text-blue-800">@student.uny.ac.id</span>{' '}
            yang dapat mengakses sistem ini.
          </div>
        </div>

      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200 sm:px-10">
          
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Email Resmi UNY
              </label>
              <div className="mt-1 relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@student.uny.ac.id"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
                />
              </div>
              {domainWarning && (
                <p className="mt-1.5 text-xs text-amber-600 font-medium">
                  ⚠️ {domainWarning}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1 relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || Boolean(domainWarning)}
              className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Memverifikasi Akun...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Preset Login Helper for Testing / Demo */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Akses Cepat (Demo Presets)
            </span>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={fillSuperadmin}
                className="w-full text-left p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 transition flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span className="text-xs font-bold text-amber-900">Login sebagai Superadmin</span>
                  </div>
                  <span className="text-[11px] text-amber-700 font-mono block">
                    raffaelvincent.2024@student.uny.ac.id
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  Isi Otomatis
                </span>
              </button>

              <button
                type="button"
                onClick={fillStaff}
                className="w-full text-left p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 transition flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-blue-900 block">Login sebagai Admin Gizi</span>
                  <span className="text-[11px] text-blue-700 font-mono block">
                    admin.gizi@uny.ac.id
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded">
                  Isi Otomatis
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
