import pytest
from app.schemas import Criterion, Alternative, CriterionType, PriorityLevel
from app.methods.saw import compute_saw
from app.methods.moora import compute_moora

@pytest.fixture
def sample_criteria():
    return [
        Criterion(code="C1", name="Kondisi Gizi", weight=0.3440, criterion_type=CriterionType.BENEFIT),
        Criterion(code="C2", name="Riwayat Lahir", weight=0.0881, criterion_type=CriterionType.BENEFIT),
        Criterion(code="C3", name="Riwayat Infeksi", weight=0.2289, criterion_type=CriterionType.BENEFIT),
        Criterion(code="C4", name="Pola Makan", weight=0.1466, criterion_type=CriterionType.BENEFIT),
        Criterion(code="C5", name="Sanitasi", weight=0.0521, criterion_type=CriterionType.BENEFIT),
        Criterion(code="C6", name="Ekonomi", weight=0.0881, criterion_type=CriterionType.BENEFIT),
        Criterion(code="C7", name="Akses Layanan", weight=0.0521, criterion_type=CriterionType.BENEFIT),
    ]

@pytest.fixture
def sample_alternatives():
    # 5 balita sampel dengan variasi nilai kriteria (skala 1-5, makin tinggi makin berisiko)
    return [
        Alternative(
            id="B01",
            name="Balita A1 (Risiko Tinggi)",
            values={"C1": 5.0, "C2": 4.0, "C3": 5.0, "C4": 4.0, "C5": 3.0, "C6": 4.0, "C7": 3.0}
        ),
        Alternative(
            id="B02",
            name="Balita A2 (Risiko Rendah)",
            values={"C1": 1.0, "C2": 1.0, "C3": 1.0, "C4": 2.0, "C5": 1.0, "C6": 1.0, "C7": 1.0}
        ),
        Alternative(
            id="B03",
            name="Balita A3 (Risiko Sedang)",
            values={"C1": 3.0, "C2": 2.0, "C3": 3.0, "C4": 3.0, "C5": 2.0, "C6": 3.0, "C7": 2.0}
        ),
        Alternative(
            id="B04",
            name="Balita A4 (Risiko Sangat Kritis)",
            values={"C1": 5.0, "C2": 5.0, "C3": 5.0, "C4": 5.0, "C5": 4.0, "C6": 5.0, "C7": 4.0}
        ),
    ]

def test_saw_calculation(sample_criteria, sample_alternatives):
    results, norm_matrix, weighted_matrix = compute_saw(sample_alternatives, sample_criteria)
    
    assert len(results) == len(sample_alternatives)
    # Balita A4 (kritis) harus berada di peringkat 1
    assert results[0].id == "B04"
    assert results[0].rank == 1
    assert results[0].priority_level in [PriorityLevel.SANGAT_TINGGI, PriorityLevel.TINGGI]

    # Balita A2 (risiko rendah) harus berada di peringkat terakhir
    assert results[-1].id == "B02"
    assert results[-1].rank == 4
    assert results[-1].priority_level == PriorityLevel.RENDAH

    # Pastikan skor terurut menurun
    scores = [r.score for r in results]
    assert scores == sorted(scores, reverse=True)

def test_moora_calculation(sample_criteria, sample_alternatives):
    results, norm_matrix, weighted_matrix = compute_moora(sample_alternatives, sample_criteria)
    
    assert len(results) == len(sample_alternatives)
    # Balita A4 harus berada di peringkat 1
    assert results[0].id == "B04"
    assert results[0].rank == 1

    # Balita A2 harus peringkat terakhir
    assert results[-1].id == "B02"
    assert results[-1].rank == 4

    # Pastikan skor terurut menurun
    scores = [r.score for r in results]
    assert scores == sorted(scores, reverse=True)
