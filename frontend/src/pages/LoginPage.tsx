import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Criterion, User } from '../types';
import { Tally } from '../components/papan';
import { AlertCircle, ArrowRight, GraduationCap, Lock, Mail } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

/**
 * Layar masuk adalah ambang menuju papan, jadi ia tidak hanya meminta kata
 * sandi: ia sudah memperagakan mekanisme produk — tujuh kriteria dengan bobot
 * terkunci hasil Fuzzy AHP, digambar sebagai batang yang lebarnya sebanding
 * dengan bobotnya. Angka bobotnya diambil dari API yang sama dengan yang
 * dipakai menghitung peringkat, bukan ditulis ulang di berkas ini.
 */
export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [criteria, setCriteria] = useState<Criterion[]>([]);

  useEffect(() => {
    let hidup = true;
    (async () => {
      const c = await api.getCriteria();
      if (hidup && c) setCriteria(c);
    })();
    return () => {
      hidup = false;
    };
  }, []);

  // Domain dibatasi; diperiksa saat pengguna mengetik, bukan setelah gagal.
  const domainWarning = (() => {
    if (!email || !email.includes('@')) return null;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    if (domain !== 'uny.ac.id' && domain !== 'student.uny.ac.id') {
      return `Domain "@${domain}" tidak diizinkan. Gunakan surel @uny.ac.id atau @student.uny.ac.id.`;
    }
    return null;
  })();

  const masuk = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (domainWarning) {
      setError(domainWarning);
      return;
    }
    setLoading(true);
    try {
      const data = await api.login(email.trim(), password);
      onLoginSuccess(data.user);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Tidak dapat masuk. Periksa surel dan kata sandi.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isiCepat = (surel: string) => {
    setEmail(surel);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="papan min-h-screen bg-papan-800 text-kapur-50 lg:grid lg:grid-cols-[1fr_470px]">
      {/* ---------------------------------------------------------------- */}
      {/* PERNYATAAN — mekanisme diperagakan, bukan diklaim                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col justify-between px-6 py-10 sm:px-12 sm:py-14">
        <div className="masuk">
          <h1 className="max-w-[16ch] font-display text-[40px] font-bold leading-[0.98] text-kapur-50 sm:text-[56px]">
            Tentukan balita mana yang didatangi lebih dulu.
          </h1>
          <p className="mt-6 max-w-[58ch] text-sm leading-relaxed text-kapur-200">
            Penapisan gizi rutin hanya menghasilkan label. Ketika puluhan balita berlabel sama,
            label itu tidak memberi urutan. Sistem ini menghitung urutannya dari tujuh kriteria
            berbobot &mdash; dan menampilkan seluruh perhitungannya, sehingga setiap peringkat
            dapat ditelusuri sampai ke matriks perbandingannya.
          </p>
        </div>

        {/* Pita bobot: bukti pertama bahwa bobotnya nyata dan terkunci. */}
        <div className="masuk masuk--2 mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rambut-papan pb-2">
            <h2 className="font-display text-[13px] font-bold text-kapur-100">
              Tujuh kriteria, bobot terkunci
            </h2>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-kapur-300">
              Fuzzy AHP &middot; CR 0,0079
            </span>
          </div>

          {criteria.length === 0 ? (
            <p className="py-5 text-xs text-kapur-300">Memuat bobot dari server&hellip;</p>
          ) : (
            <ul className="mt-4 grid gap-x-10 gap-y-3.5 sm:grid-cols-2">
              {criteria.map((c) => (
                <li key={c.code} className="flex items-center gap-3">
                  <span className="w-7 shrink-0 font-display text-[13px] font-bold text-kapur-100">
                    {c.code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs leading-snug text-kapur-200" title={c.name}>
                      {c.name}
                    </span>
                    <span
                      aria-hidden
                      className="mt-1.5 block h-[3px] bg-kapur-100"
                      style={{ width: `${Math.min(100, c.weight * 260)}%` }}
                    />
                  </span>
                  <span className="tnum w-14 shrink-0 text-right text-[12px] font-bold text-kapur-50">
                    {(c.weight * 100).toFixed(2)}%
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-kapur-300">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            Bobot ini tidak dapat diubah, dinonaktifkan, maupun diredistribusi dari antarmuka.
            Peringkat selalu berasal dari satu perhitungan yang sama.
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* FORMULIR — kontrol web standar, bukan kostum dunia                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="masuk masuk--1 flex items-center bg-kertas-100 px-6 py-10 text-tinta-900 sm:px-12">
        <div className="w-full max-w-[390px]">
          <h2 className="font-display text-2xl font-bold">Masuk</h2>
          <p className="mt-1 text-xs leading-relaxed text-tinta-500">
            Terbatas untuk surel <span className="font-semibold text-tinta-700">@uny.ac.id</span>{' '}
            dan <span className="font-semibold text-tinta-700">@student.uny.ac.id</span>.
          </p>

          <form onSubmit={masuk} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-tinta-400"
              >
                Surel
              </label>
              <div className="relative mt-1.5">
                <Mail
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-400"
                  strokeWidth={1.75}
                />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@student.uny.ac.id"
                  className="w-full rounded border border-rambut bg-kertas-50 py-2.5 pl-9 pr-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-tinta-400"
              >
                Kata sandi
              </label>
              <div className="relative mt-1.5">
                <Lock
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-400"
                  strokeWidth={1.75}
                />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border border-rambut bg-kertas-50 py-2.5 pl-9 pr-3 text-sm"
                />
              </div>
            </div>

            {(error || domainWarning) && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                <span>{error ?? domainWarning}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-papan-700 px-4 py-2.5 text-sm font-bold text-kapur-50 transition-colors hover:bg-papan-600 disabled:cursor-not-allowed disabled:bg-kertas-400"
            >
              {loading ? 'Memeriksa…' : 'Masuk ke papan'}
              {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2} />}
            </button>
          </form>

          <div className="mt-7 border-t border-rambut pt-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-tinta-500">
              <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.75} />
              Akun superadmin &mdash; klik untuk mengisi
            </p>
            <ul className="mt-2 space-y-1">
              {[
                'raffaelvincent.2024@student.uny.ac.id',
                'muhammadfaizulhaq.2024@student.uny.ac.id',
                'galantonalatif.2024@student.uny.ac.id',
              ].map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => isiCepat(s)}
                    className="text-xs text-tinta-500 underline decoration-papan-300 underline-offset-[3px] transition-colors hover:text-papan-700"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 flex items-center gap-2 text-xs text-tinta-500">
            <span aria-hidden className="text-tinta-400">
              <Tally skor={3} ukuran="sm" />
            </span>
            Skala 1&ndash;5 digambar sebagai goresan tally di seluruh aplikasi.
          </p>

          <p className="mt-4 border-t border-rambut pt-4 text-xs leading-relaxed text-tinta-500">
            Departemen Pendidikan Teknik Elektronika dan Informatika, Fakultas Teknik,
            Universitas Negeri Yogyakarta.
          </p>
        </div>
      </div>
    </div>
  );
};
