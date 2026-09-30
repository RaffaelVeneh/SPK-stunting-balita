from typing import Callable, Dict, List, Tuple
from app.schemas import Criterion, Alternative, AlternativeRanking
from app.methods.saw import compute_saw
from app.methods.moora import compute_moora

ScoringFunc = Callable[
    [List[Alternative], List[Criterion]],
    Tuple[List[AlternativeRanking], Dict[str, Dict[str, float]], Dict[str, Dict[str, float]]]
]

SCORING_METHODS: Dict[str, ScoringFunc] = {
    "saw": compute_saw,
    "moora": compute_moora,
}

def register_scoring_method(name: str, func: ScoringFunc):
    """Mendaftarkan metode scoring baru secara dinamis."""
    SCORING_METHODS[name.lower()] = func

def get_scoring_method(name: str) -> ScoringFunc:
    """Mengambil fungsi scoring berdasarkan nama metode."""
    func = SCORING_METHODS.get(name.lower())
    if not func:
        available = ", ".join(SCORING_METHODS.keys())
        raise ValueError(f"Metode '{name}' tidak ditemukan. Metode yang tersedia: {available}")
    return func
