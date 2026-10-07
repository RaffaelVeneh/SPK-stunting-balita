import { useState, useEffect } from 'react';
import { api } from './services/api';
import type { User } from './types';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage, type Seksi } from './pages/DashboardPage';
import type { PilihanEkspor } from './types';
import { LogOut, ShieldCheck, ClipboardList, Sigma, BookOpen, Download } from 'lucide-react';

/**
 * Rel fore-edge. Panjang tiap tab proporsional terhadap berapa banyak isi yang
 * ada di belakangnya — dipinjam dari tab rail buku manual, dan di sini ia
 * benar-benar berfungsi: seksi yang lebih tebal mendapat tab yang lebih panjang.
 */
const SEKSI: {
  id: Seksi;
  label: string;
  ket: string;
  panjang: number;
  Ikon: typeof ClipboardList;
}[] = [
  { id: 'triase', label: 'Triase Prioritas', ket: 'Daftar balita berperingkat', panjang: 5, Ikon: ClipboardList },
  { id: 'bukti', label: 'Bukti Perhitungan', ket: 'Tier, matriks, dan CR', panjang: 3, Ikon: Sigma },
  { id: 'panduan', label: 'Panduan Metodologi', ket: 'Alur, sub-kriteria, rumus', panjang: 4, Ikon: BookOpen },
];

export function App() {
  const [user, setUser] = useState<User | null>(() => api.getUser());
  const [seksi, setSeksi] = useState<Seksi>('triase');
  // Menu ekspor dari seksi yang sedang aktif. Berupa ARRAY, bukan fungsi — dan
  // itu menghilangkan satu jebakan: setState memperlakukan argumen berupa fungsi
  // sebagai updater lalu memanggilnya, sehingga handler tidak pernah tersimpan
  // dan tombolnya tidak muncul. Array tidak diperlakukan begitu.
  const [menuEkspor, setMenuEkspor] = useState<PilihanEkspor[] | null>(null);
  const [eksporTerbuka, setEksporTerbuka] = useState(false);

  useEffect(() => {
    const savedUser = api.getUser();
    if (savedUser) setUser(savedUser);
  }, []);

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />;
  }

  const seksiAktif = SEKSI.find((s) => s.id === seksi)!;

  return (
    <div className="min-h-screen flex bg-kertas-100">
      {/* ---------------------------------------------------------------- */}
      {/* REL FORE-EDGE                                                     */}
      {/* ------------------------------------------------------------------ */}
      <nav
        aria-label="Seksi aplikasi"
        className="papan sticky top-0 hidden h-screen w-[210px] shrink-0 flex-col bg-papan-800 text-kapur-50 md:flex"
      >
        <div className="border-b border-rambut-papan px-5 py-5">
          <p className="font-display text-[15px] font-bold leading-tight">
            SPK Prioritas
            <br />
            Intervensi Gizi
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-kapur-300">
            Universitas Negeri Yogyakarta
          </p>
        </div>

        {/* Tab: tingginya proporsional terhadap isi seksi. */}
        <div className="flex flex-1 flex-col">
          {SEKSI.map((s) => {
            const aktif = seksi === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeksi(s.id)}
                style={{ flexGrow: s.panjang, flexBasis: 0 }}
                aria-current={aktif ? 'page' : undefined}
                className={`group relative flex min-h-[92px] flex-col justify-center gap-1.5 border-b border-rambut-papan px-5 text-left transition-colors ${
                  aktif ? 'bg-papan-700' : 'hover:bg-papan-700/55'
                }`}
              >
                {/* Tab yang terbuka memanjang dan menjadi bidang. */}
                <span
                  aria-hidden
                  className={`absolute left-0 top-0 h-full w-[3px] transition-colors ${
                    aktif ? 'bg-kapur-100' : 'bg-transparent group-hover:bg-papan-500'
                  }`}
                />
                <s.Ikon
                  className={`h-4 w-4 ${aktif ? 'text-kapur-100' : 'text-kapur-300'}`}
                  strokeWidth={1.75}
                />
                <span
                  className={`font-display text-[13px] font-bold leading-tight ${
                    aktif ? 'text-kapur-50' : 'text-kapur-200'
                  }`}
                >
                  {s.label}
                </span>
                <span className="text-xs leading-tight text-kapur-300">{s.ket}</span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-rambut-papan px-5 py-4">
          <p className="truncate text-xs font-semibold text-kapur-100" title={user.name}>
            {user.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-kapur-300" title={user.email}>
            {user.email}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {user.is_superadmin && (
              <span className="inline-flex items-center gap-1 rounded border border-rambut-papan px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-kapur-200">
                <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                Superadmin
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-kapur-300 transition-colors hover:text-kapur-50"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
              Keluar
            </button>
          </div>
        </div>
      </nav>

      {/* ---------------------------------------------------------------- */}
      {/* KOLOM KERJA                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Pita kepala menamai seksi yang terbuka. */}
        <header className="papan sticky top-0 z-20 border-b border-rambut-papan bg-papan-700 text-kapur-50">
          <div className="flex h-[56px] items-center gap-4 px-4 sm:px-6">
            {/* Pemilih seksi untuk layar sempit. */}
            <select
              value={seksi}
              onChange={(e) => setSeksi(e.target.value as Seksi)}
              aria-label="Pilih seksi"
              className="rounded border border-rambut-papan bg-papan-800 px-2 py-1 text-xs font-semibold text-kapur-50 md:hidden"
            >
              {SEKSI.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <h1 className="hidden font-display text-[15px] font-bold md:block">
              {seksiAktif.label}
            </h1>
            <span className="hidden text-xs text-kapur-300 lg:inline">
              {seksiAktif.ket}
            </span>

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-kapur-300 sm:inline">
                Fuzzy AHP &rarr; MOORA
              </span>
              {menuEkspor && menuEkspor.length > 0 && (
                <div className="relative">
                  {eksporTerbuka && (
                    <div className="fixed inset-0 z-40" onClick={() => setEksporTerbuka(false)} />
                  )}
                  <button
                    type="button"
                    onClick={() => setEksporTerbuka((t) => !t)}
                    aria-expanded={eksporTerbuka}
                    aria-haspopup="menu"
                    className="relative z-50 inline-flex items-center gap-1.5 rounded border border-rambut-papan bg-papan-600 px-3 py-1.5 text-xs font-bold text-kapur-50 transition-colors hover:bg-papan-500"
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={2} />
                    Ekspor
                    <svg
                      width="9"
                      height="6"
                      viewBox="0 0 9 6"
                      aria-hidden
                      className={`transition-transform ${eksporTerbuka ? 'rotate-180' : ''}`}
                    >
                      <path d="M1 1 L4.5 4.5 L8 1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>

                  {eksporTerbuka && (
                    <div
                      role="menu"
                      aria-label="Pilih format ekspor"
                      className="absolute right-0 z-50 mt-1.5 w-[300px] border border-rambut bg-kertas-50"
                    >
                      {menuEkspor.map((p, i) => (
                        <button
                          key={p.label}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setEksporTerbuka(false);
                            p.jalankan();
                          }}
                          className={`block w-full px-3.5 py-2.5 text-left transition-colors hover:bg-kertas-200 ${
                            i > 0 ? 'border-t border-rambut' : ''
                          }`}
                        >
                          <span className="block text-xs font-bold text-tinta-900">{p.label}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-tinta-500">
                            {p.ket}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <DashboardPage user={user} seksi={seksi} onSiapEkspor={setMenuEkspor} />
        </main>
      </div>
    </div>
  );
}

export default App;