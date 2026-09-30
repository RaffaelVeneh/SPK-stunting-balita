import numpy as np
from typing import Dict, List, Tuple
from app.schemas import Criterion, Alternative, AlternativeRanking, PriorityLevel, CriterionType

def determine_priority_level_moora(score: float, min_score: float, max_score: float) -> PriorityLevel:
    """
    Menentukan tingkat prioritas intervensi gizi untuk skor MOORA.
    Skor MOORA bergantung pada jumlah alternatif (akar kuadrat pembagi),
    sehingga tingkat prioritas dinormalisasi secara relatif atau berdasar kuantil.
    """
    if max_score == min_score:
        return PriorityLevel.SEDANG
    
    # Skala relatif 0 - 1
    rel_score = (score - min_score) / (max_score - min_score)
    if rel_score >= 0.75:
        return PriorityLevel.SANGAT_TINGGI
    elif rel_score >= 0.50:
        return PriorityLevel.TINGGI
    elif rel_score >= 0.25:
        return PriorityLevel.SEDANG
    else:
        return PriorityLevel.RENDAH

def compute_moora(
    alternatives: List[Alternative],
    criteria: List[Criterion]
) -> Tuple[List[AlternativeRanking], Dict[str, Dict[str, float]], Dict[str, Dict[str, float]]]:
    """
    Menghitung ranking alternatif menggunakan metode MOORA (Multi-Objective Optimization on the basis of Ratio Analysis).
    
    Langkah:
    1. Membentuk matriks keputusan X.
    2. Menghitung penyebut akar kuadrat jumlah kuadrat kolom: sqrt(sum(x_kj^2)).
    3. Normalisasi matriks rasio: r_ij = x_ij / sqrt(sum(x_kj^2)).
    4. Mengalikan bobot kriteria: v_ij = w_j * r_ij.
    5. Menghitung nilai optimasi: y_i = sum(benefit) - sum(cost).
    6. Perangkingan dari nilai y_i tertinggi ke terendah.
    """
    if not alternatives:
        return [], {}, {}

    crit_codes = [c.code for c in criteria]
    weights = np.array([c.weight for c in criteria], dtype=float)

    if weights.sum() > 0:
        weights = weights / weights.sum()

    matrix = np.array([[alt.values.get(c, 0.0) for c in crit_codes] for alt in alternatives], dtype=float)
    m, n = matrix.shape

    # Pembagi rasio: akar jumlah kuadrat per kolom
    denominators = np.sqrt((matrix ** 2).sum(axis=0))
    denominators = np.where(denominators == 0, 1.0, denominators)

    # Normalisasi matriks R
    norm_matrix = matrix / denominators

    # Matriks terbobot V
    weighted_matrix = norm_matrix * weights

    # Hitung nilai optimasi y_i (benefit - cost)
    is_benefit = np.array([c.criterion_type == CriterionType.BENEFIT for c in criteria], dtype=bool)
    benefit_sum = np.where(is_benefit, weighted_matrix, 0.0).sum(axis=1)
    cost_sum = np.where(~is_benefit, weighted_matrix, 0.0).sum(axis=1)
    final_scores = benefit_sum - cost_sum

    min_s = float(final_scores.min())
    max_s = float(final_scores.max())

    norm_dict: Dict[str, Dict[str, float]] = {}
    weighted_dict: Dict[str, Dict[str, float]] = {}

    for i, alt in enumerate(alternatives):
        norm_dict[alt.id] = {crit_codes[j]: round(float(norm_matrix[i, j]), 4) for j in range(n)}
        weighted_dict[alt.id] = {crit_codes[j]: round(float(weighted_matrix[i, j]), 4) for j in range(n)}

    ranked_indices = np.argsort(-final_scores)
    results: List[AlternativeRanking] = []

    for rank, idx in enumerate(ranked_indices, start=1):
        alt = alternatives[idx]
        score = float(final_scores[idx])
        results.append(
            AlternativeRanking(
                id=alt.id,
                name=alt.name,
                score=round(score, 4),
                rank=rank,
                priority_level=determine_priority_level_moora(score, min_s, max_s),
                details={
                    "method": "MOORA",
                    "benefit_score": round(float(benefit_sum[idx]), 4),
                    "cost_score": round(float(cost_sum[idx]), 4)
                }
            )
        )

    return results, norm_dict, weighted_dict
