import { NextRequest, NextResponse } from 'next/server';
import { runSpkCalculation, Alternative, Criterion } from '@/lib/algorithms';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method = 'saw', alternatives, criteria } = body as {
      method?: 'saw' | 'moora';
      alternatives?: Alternative[];
      criteria?: Criterion[];
    };

    if (!alternatives || !Array.isArray(alternatives) || alternatives.length === 0) {
      return NextResponse.json(
        { error: 'Daftar alternatif balita tidak boleh kosong' },
        { status: 400 }
      );
    }

    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      return NextResponse.json(
        { error: 'Daftar kriteria tidak boleh kosong' },
        { status: 400 }
      );
    }

    // Opsi: Jika URL ENGINE_API_URL didefinisikan, kita bisa memanggil FastAPI engine
    const engineUrl = process.env.ENGINE_API_URL;
    if (engineUrl) {
      try {
        const response = await fetch(`${engineUrl}/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, alternatives, criteria }),
        });
        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (engineError) {
        console.warn('FastAPI Engine tidak merespon, beralih ke kalkulasi lokal internal:', engineError);
      }
    }

    // Jalankan kalkulasi internal secara fallback
    const result = runSpkCalculation(method, alternatives, criteria);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API calculate error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memproses kalkulasi SPK' },
      { status: 500 }
    );
  }
}
