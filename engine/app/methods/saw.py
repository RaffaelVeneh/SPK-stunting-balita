import numpy as np
from typing import Dict, List, Tuple
from app.schemas import Criterion, Alternative, AlternativeRanking, PriorityLevel, CriterionType

def determine_priority_level(score: float) -> PriorityLevel:
    """Menentukan tingkat prioritas intervensi gizi berdasarkan skor akhir."""
    if score >= 0.80:
        return PriorityLevel.SANGAT_TINGGI
    elif score >= 0.60:
        return PriorityLevel.TINGGI
    elif score >= 0.40:
        return PriorityLevel.SEDANG
    else:
        return PriorityLevel.RENDAH

def compute_saw(
    alternatives: List[Alternative],
    criteria: List[Criterion]
) -> Tuple[List[AlternativeRanking], Dict[str, Dict[str, float]], Dict[str, Dict[str, float]]]:
    """
    Menghitung ranking alternatif menggunakan metode SAW (Simple Additive Weighting).
    
    Langkah:
    1. Membentuk matriks keputusan X.
    2. Menghitung nilai maksimum & minimum tiap kriteria.
    3. Normalisasi matriks R:
       - Benefit: r_ij = x_ij / max(x_j)
       - Cost:    r_ij = min(x_j) / x_ij
    4. Menghitung nilai preferensi V_i = sum(w_j * r_ij)
    5. Perangkingan dari nilai V_i tertinggi ke terendah.
    """
    if not alternatives:
        return [], {}, {}

    crit_codes = [c.code for c in criteria]
    weights = np.array([c.weight for c in criteria], dtype=float)
    
    # Normalisasi bobot jika total bobot != 1.0
    if weights.sum() > 0:
        weights = weights / weights.sum()

    # Bentuk matriks keputusan (m alternatives x n criteria)
    matrix = np.array([[alt.values.get(c, 0.0) for c in crit_codes] for alt in alternatives], dtype=float)
    m, n = matrix.shape

    max_vals = matrix.max(axis=0)
    min_vals = matrix.min(axis=0)

    # Normalisasi matriks R
    norm_matrix = np.zeros_like(matrix)
    for j, c in enumerate(criteria):
        if c.criterion_type == CriterionType.BENEFIT:
            max_val = max_vals[j]
            norm_matrix[:, j] = matrix[:, j] / max_val if max_val > 0 else 0.0
        else:
            min_val = min_vals[j]
            norm_matrix[:, j] = np.where(matrix[:, j] > 0, min_val / matrix[:, j], 0.0)

    # Matriks terbobot V_ij = w_j * r_ij
    weighted_matrix = norm_matrix * weights

    # Hitung total preferensi V_i
    final_scores = weighted_matrix.sum(axis=1)

    # Format normalized dan weighted dictionary
    norm_dict: Dict[str, Dict[str, float]] = {}
    weighted_dict: Dict[str, Dict[str, float]] = {}
    
    for i, alt in enumerate(alternatives):
        norm_dict[alt.id] = {crit_codes[j]: round(float(norm_matrix[i, j]), 4) for j in range(n)}
        weighted_dict[alt.id] = {crit_codes[j]: round(float(weighted_matrix[i, j]), 4) for j in range(n)}

    # Ranking
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
                priority_level=determine_priority_level(score),
                details={"method": "SAW", "raw_score": score}
            )
        )

    return results, norm_dict, weighted_dict
