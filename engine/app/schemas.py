from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class CriterionType(str, Enum):
    BENEFIT = "benefit"
    COST = "cost"

class PriorityLevel(str, Enum):
    SANGAT_TINGGI = "Sangat Tinggi"
    TINGGI = "Tinggi"
    SEDANG = "Sedang"
    RENDAH = "Rendah"

class Criterion(BaseModel):
    code: str = Field(..., description="Kode kriteria, misal C1, C2")
    name: str = Field(..., description="Nama kriteria")
    weight: float = Field(..., description="Bobot kriteria (antara 0 dan 1, total sum = 1)")
    criterion_type: CriterionType = Field(default=CriterionType.BENEFIT, description="Tipe kriteria: benefit atau cost")

class Alternative(BaseModel):
    id: str = Field(..., description="ID balita atau alternatif")
    name: str = Field(..., description="Nama atau kode balita (di-mask)")
    values: Dict[str, float] = Field(..., description="Nilai kriteria, key: kode kriteria (C1-C7), val: skor (1-5)")

class CalculationRequest(BaseModel):
    method: str = Field("saw", description="Metode kalkulasi: 'saw' atau 'moora'")
    criteria: List[Criterion] = Field(..., description="Daftar kriteria dan bobotnya")
    alternatives: List[Alternative] = Field(..., description="Daftar alternatif balita yang dinilai")

class AlternativeRanking(BaseModel):
    id: str
    name: str
    score: float
    rank: int
    priority_level: PriorityLevel
    details: Optional[Dict[str, Any]] = None

class CalculationResponse(BaseModel):
    method: str
    results: List[AlternativeRanking]
    normalized_matrix: Optional[Dict[str, Dict[str, float]]] = None
    weighted_matrix: Optional[Dict[str, Dict[str, float]]] = None
