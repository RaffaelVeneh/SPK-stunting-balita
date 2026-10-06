import React, { useMemo } from 'react';
import type { AhpMatrixResponse, Criterion } from '../types';
import { Tally } from './papan';

/* ============================================================================
   PANEL BUKTI PERHITUNGAN
   Seluruh isi panel ini datang dari GET /api/spk/ahp/matrix. Tidak ada angka
   yang ditulis tangan di sini: tier, matriks, 21 perbandingan, lambda_max, CI,
   RI, CR, dan sebaran fuzzy semuanya hasil perhitungan server yang sama dengan
   yang dipakai memberi peringkat pada tabel triase.
   ========================================================================== */

const Judul: React.FC<{ children: React.ReactNode; ket?: string }> = ({ children, ket }) => (
  <div className="border-b border-rambut px-4 py-3 sm:px-5">
    <h3 className="font-display text-[15px] font-bold text-tinta-900">{children}</h3>
    {ket && <p className="mt-1 max-w-[68ch] text-xs leading-relaxed text-tinta-500">{ket}</p>}
  </div>
);

const fmt = (v: number, d = 4) => v.toFixed(d);

export const ProofPanel: React.FC<{
  ahp: AhpMatrixResponse | null;
  criteria: Criterion[];
}> = ({ ahp, criteria }) => {
  const detail = useMemo(() => {
    const raw = (ahp as unknown as { kriteria_detail?: Array<Record<string, string>> })
      ?.kriteria_detail;
    return raw ?? [];
  }, [ahp]);

  // Acuan lebar batang sebaran: sebaran terbesar di antara kriteria, supaya
  // kriteria bersebaran kecil tetap terbaca berbeda dari yang besar.
  const acuanSebaran = useMemo(() => {
    const tfnSemua = (ahp?.ahp_result?.tfn ?? {}) as unknown as Record<string, number[]>;
    const lebar = Object.values(tfnSemua).map((t) => (t ? t[2] - t[0] : 0));
    return lebar.length ? Math.max(...lebar) : 0.3;
  }, [ahp]);

  if (!ahp) {
    return (
      <div className="bg-kertas-50 px-5 py-10 text-center text-sm text-tinta-500">
        Memuat bukti perhitungan&hellip;
      </div>
    );
  }

  const r = ahp.ahp_result;
  const kode = ahp.criteria;
  const tier = ahp.tier ?? {};
  const audit = ahp.jejak_audit ?? [];
  const bobotCrisp = r.weights;
  const bobotFuzzy = r.weights_fuzzy ?? r.weights;

  // Tangga tier: kelompokkan kriteria menurut tingkatnya.
  const tangga = useMemo(() => {
    const peta = new Map<number, string[]>();
    kode.forEach((k) => {
      const t = tier[k];
      if (t == null) return;
      if (!peta.has(t)) peta.set(t, []);
      peta.get(t)!.push(k);
    });
    return [...peta.entries()].sort((a, b) => a[0] - b[0]);
  }, [kode, tier]);

  const jumlahKolom = kode.map((_, j) => ahp.matrix.reduce((s, baris) => s + baris[j], 0));

  return (
    <div className="space-y-px bg-rambut">
      {/* ---------------------------------------------------------------- */}
      {/* 1. TANGGA TIER                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="anim anim-masuk bg-kertas-50" style={{ '--tunda': '0ms' } as React.CSSProperties}>
        <Judul ket="Urutan ini adalah HASIL perhitungan bobot, bukan penyebabnya. Matriks perbandingan di bawah adalah masukan penilaian pakar gizi, dan urutan ini keluar darinya. Dasar tiap penempatan disertakan sebagai alasan mengapa perbandingan pakar bernilai demikian, dengan rujukan Perpres No. 72 Tahun 2021 Pasal 1 dan bukti kuantitatif.">
          Urutan kepentingan hasil perhitungan
        </Judul>
        <div className="divide-y divide-rambut">
          {tangga.map(([t, anggota]) => (
            <div key={t} className="flex gap-4 px-4 py-3 sm:px-5">
              <div className="flex w-16 shrink-0 flex-col items-start">
                <span className="font-display text-2xl font-bold leading-none text-papan-700">
                  {t}
                </span>
                <span className="mt-1 text-xs font-bold uppercase tracking-wider text-tinta-400">
                  Tingkat
                </span>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {anggota.map((k) => {
                  const info = detail.find((d) => d.code === k);
                  return (
                    <div key={k}>
                      <p className="text-xs font-bold text-tinta-900">
                        <span className="text-papan-600">{k}</span>
                        {info ? ` — ${info.name ?? ''}` : ''}
                        {info?.jalur ? (
                          <span className="ml-2 font-semibold text-tinta-400">
                            {info.jalur}
                          </span>
                        ) : null}
                      </p>
                      {info?.dasar && (
                        <p className="mt-0.5 max-w-[72ch] text-xs leading-relaxed text-tinta-500">
                          {info.dasar}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 2. MATRIKS PERBANDINGAN BERPASANGAN                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="anim anim-masuk bg-kertas-50" style={{ '--tunda': '70ms' } as React.CSSProperties}>
        <Judul ket="Setiap sel adalah penilaian pakar atas pertanyaan &ldquo;berapa kali lebih penting&rdquo;. Nilai di bawah diagonal selalu kebalikan dari nilai di atasnya, sehingga a(i,j) x a(j,i) = 1. Seluruh 21 perbandingan uniknya dapat diperiksa pada tabel di bawah.">
          Matriks perbandingan berpasangan 7&times;7
        </Judul>
        <p className="border-b border-rambut px-4 py-2.5 text-xs leading-relaxed text-tinta-500 sm:px-5">
          Jumlah tiap kolom &mdash; angka inilah yang dipakai menormalkan matriks:{' '}
          {kode.map((k, j) => (
            <span key={k} className="mr-3 inline-block">
              <span className="font-bold text-tinta-900">{k}</span>{' '}
              <span className="tnum">{fmt(jumlahKolom[j], 4)}</span>
            </span>
          ))}
        </p>        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-rambut">
                <th className="px-3 py-2 text-left font-bold text-tinta-500">Kriteria</th>
                {kode.map((k) => (
                  <th key={k} className="px-3 py-2 text-right font-bold text-tinta-700">
                    {k}
                  </th>
                ))}
                <th className="border-l border-rambut px-3 py-2 text-right font-bold text-tinta-500">
                  Jumlah baris
                </th>
              </tr>
            </thead>
            <tbody>
              {ahp.matrix.map((baris, i) => (
                <tr key={kode[i]} className="border-b border-rambut last:border-0">
                  <th className="px-3 py-1.5 text-left font-bold text-papan-700">{kode[i]}</th>
                  {baris.map((v, j) => (
                    <td
                      key={j}
                      className={`tnum px-3 py-1.5 text-right ${
                        i === j ? 'font-bold text-tinta-400' : 'text-tinta-900'
                      }`}
                    >
                      {v >= 1 ? v.toFixed(0) : fmt(v)}
                    </td>
                  ))}
                  <td className="tnum border-l border-rambut px-3 py-1.5 text-right font-semibold text-tinta-500">
                    {fmt(baris.reduce((a, b) => a + b, 0), 4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 3. JEJAK AUDIT 21 PERBANDINGAN                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="anim anim-masuk bg-kertas-50" style={{ '--tunda': '140ms' } as React.CSSProperties}>
        <Judul ket="Tujuh kriteria menghasilkan dua puluh satu perbandingan unik. Inilah seluruhnya, lengkap dengan alasan tiap angka. Siapa pun dapat memeriksa ulang matriks di atas dari tabel ini.">
          Jejak audit {audit.length} perbandingan
        </Judul>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-rambut">
                <th className="px-3 py-2 text-left font-bold text-tinta-500">Pasangan</th>
                <th className="px-3 py-2 text-left font-bold text-tinta-500">Tingkat</th>
                <th className="px-3 py-2 text-right font-bold text-tinta-500">Beda</th>
                <th className="px-3 py-2 text-right font-bold text-tinta-500">Nilai Saaty</th>
                <th className="px-3 py-2 text-left font-bold text-tinta-500">Label linguistik</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.pasangan} className="border-b border-rambut last:border-0">
                  <td className="px-3 py-1.5 font-bold text-tinta-900">{a.pasangan}</td>
                  <td className="tnum px-3 py-1.5 text-tinta-500">
                    {a.tier_i} vs {a.tier_j}
                  </td>
                  <td className="tnum px-3 py-1.5 text-right text-tinta-500">{a.beda_tier}</td>
                  <td className="tnum px-3 py-1.5 text-right font-bold text-papan-700">
                    {a.nilai_saaty >= 1 ? a.nilai_saaty.toFixed(0) : fmt(a.nilai_saaty)}
                  </td>
                  <td className="px-3 py-1.5 text-tinta-700">
                    {a.label}
                    <span className="ml-2 text-tinta-400">{a.arah}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 4. UJI KONSISTENSI                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="anim anim-masuk bg-kertas-50" style={{ '--tunda': '210ms' } as React.CSSProperties}>
        <Judul ket={r.catatan_konsistensi}>Uji konsistensi Saaty</Judul>
        <div className="grid gap-px bg-rambut sm:grid-cols-4">
          {[
            { label: 'lambda maks', rumus: 'λmaks', nilai: fmt(r.lambda_max) },
            { label: 'Indeks konsistensi', rumus: '(λmaks − n) / (n − 1)', nilai: fmt(r.consistency_index) },
            { label: 'Indeks acak (n=7)', rumus: 'tabel Saaty', nilai: fmt(r.random_index, 2) },
            { label: 'Rasio konsistensi', rumus: 'CI / RI', nilai: fmt(r.consistency_ratio) },
          ].map((m) => (
            <div key={m.label} className="bg-kertas-50 px-4 py-3 sm:px-5">
              <p className="text-xs font-bold uppercase tracking-wider text-tinta-400">
                {m.label}
              </p>
              <p className="tnum mt-1 text-2xl font-bold leading-none text-tinta-900">
                {m.nilai}
              </p>
              <p className="mt-1.5 text-xs text-tinta-500">{m.rumus}</p>
            </div>
          ))}
        </div>
        <div
          className={`flex items-center gap-3 border-t border-rambut px-4 py-3 sm:px-5 ${
            r.is_valid ? 'text-pigmen-hijau' : 'text-pigmen-merah'
          }`}
        >
          <span aria-hidden className="h-[2px] w-10" style={{ backgroundColor: 'currentColor' }} />
          <p className="text-xs font-bold">
            {r.is_valid ? 'Konsisten' : 'Tidak konsisten'}
            <span className="ml-2 font-semibold text-tinta-500">
              syarat CR &lt; 0,10 &mdash; tercapai {fmt(r.consistency_ratio)}
            </span>
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 5. BOBOT: CRISP, FUZZY, DAN SEBARANNYA                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="anim anim-masuk bg-kertas-50" style={{ '--tunda': '280ms' } as React.CSSProperties}>
        <Judul ket="Bobot dihitung dua kali sebagai pembanding. AHP tegas memakai nilai modal matriks; Fuzzy AHP memodelkan tiap perbandingan sebagai bilangan fuzzy segitiga lalu di-defuzzifikasi. Bobot fuzzy yang dipakai sistem, karena ketidakpastian pertimbangan dimodelkan alih-alih disembunyikan.">
          Bobot hasil perhitungan
        </Judul>
        <p className="border-b border-rambut px-4 py-2.5 text-xs leading-relaxed text-tinta-500 sm:px-5">
          Jumlah tiap kolom &mdash; angka inilah yang dipakai menormalkan matriks:{' '}
          {kode.map((k, j) => (
            <span key={k} className="mr-3 inline-block">
              <span className="font-bold text-tinta-900">{k}</span>{' '}
              <span className="tnum">{fmt(jumlahKolom[j], 4)}</span>
            </span>
          ))}
        </p>        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-rambut">
                <th className="px-3 py-2 text-left font-bold text-tinta-500">Kriteria</th>
                <th className="px-3 py-2 text-right font-bold text-tinta-500">AHP tegas</th>
                <th className="px-3 py-2 text-right font-bold text-tinta-500">Fuzzy AHP</th>
                <th className="px-3 py-2 text-right font-bold text-tinta-500">l</th>
                <th className="px-3 py-2 text-right font-bold text-tinta-500">m</th>
                <th className="px-3 py-2 text-right font-bold text-tinta-500">u</th>
                <th className="px-3 py-2 text-left font-bold text-tinta-500">Sebaran</th>
              </tr>
            </thead>
            <tbody>
              {kode.map((k) => {
                const tfn = r.tfn?.[k] as unknown as number[] | undefined;
                const lebar = tfn ? tfn[2] - tfn[0] : 0;
                // Lebar terbesar dijadikan acuan panjang batang.
                const acuan = acuanSebaran;
                return (
                  <tr key={k} className="border-b border-rambut last:border-0">
                    <td className="px-3 py-1.5 font-bold text-papan-700">{k}</td>
                    <td className="tnum px-3 py-1.5 text-right text-tinta-500">
                      {(bobotCrisp[k] * 100).toFixed(2)}%
                    </td>
                    <td className="tnum px-3 py-1.5 text-right font-bold text-tinta-900">
                      {(bobotFuzzy[k] * 100).toFixed(2)}%
                    </td>
                    <td className="tnum px-3 py-1.5 text-right text-tinta-400">
                      {tfn ? fmt(tfn[0]) : '—'}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right text-tinta-500">
                      {tfn ? fmt(tfn[1]) : '—'}
                    </td>
                    <td className="tnum px-3 py-1.5 text-right text-tinta-400">
                      {tfn ? fmt(tfn[2]) : '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      <span
                        className="inline-block h-[3px] bg-papan-400 align-middle"
                        style={{ width: `${Math.min(100, (lebar / acuan) * 100)}%` }}
                        title={`Sebaran ketidakpastian ${fmt(lebar)}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 6. SELARAS DENGAN TABEL TRIASE                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="anim anim-masuk bg-papan-800 px-4 py-4 text-kapur-100 sm:px-5" style={{ '--tunda': '350ms' } as React.CSSProperties}>
        <p className="max-w-[76ch] text-xs leading-relaxed">
          Bobot di atas <strong className="font-bold text-kapur-50">terkunci</strong>. Tidak ada
          kontrol di antarmuka mana pun yang dapat mengubahnya, menonaktifkan kriteria, atau
          meredistribusi bobotnya — peringkat pada tabel triase selalu berasal dari satu
          perhitungan yang sama seperti yang ditampilkan di halaman ini.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {criteria.map((c) => (
            <span key={c.code} className="inline-flex items-center gap-2 text-xs text-kapur-200">
              <span className="text-kapur-50">
                <Tally skor={Math.max(1, Math.round(c.weight * 20))} ukuran="sm" />
              </span>
              {c.code}
              <span className="tnum font-bold text-kapur-50">{(c.weight * 100).toFixed(2)}%</span>
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-kapur-300">
          Goresan menunjukkan besar bobot: satu goresan per lima persen.
        </p>
      </section>
    </div>
  );
};
