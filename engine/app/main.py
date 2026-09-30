from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import CalculationRequest, CalculationResponse
from app.registry import SCORING_METHODS, get_scoring_method

app = FastAPI(
    title="SPK Stunting Balita - Calculation Engine",
    description="Engine kalkulasi Multi-Criteria Decision Making (MCDM) untuk penentuan prioritas intervensi gizi balita.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "SPK Stunting Balita - Calculation Engine",
        "status": "online",
        "supported_methods": list(SCORING_METHODS.keys())
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/methods")
def list_methods():
    return {
        "methods": [
            {
                "name": "saw",
                "label": "Simple Additive Weighting (SAW)",
                "description": "Perhitungan penjumlahan terbobot dengan normalisasi skala benefit/cost."
            },
            {
                "name": "moora",
                "label": "Multi-Objective Optimization on the basis of Ratio Analysis (MOORA)",
                "description": "Perhitungan sistem rasio dengan normalisasi akar kuadrat."
            }
        ]
    }

@app.post("/calculate", response_model=CalculationResponse)
def calculate(req: CalculationRequest):
    try:
        method_func = get_scoring_method(req.method)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not req.alternatives:
        raise HTTPException(status_code=400, detail="Daftar alternatif tidak boleh kosong.")
    if not req.criteria:
        raise HTTPException(status_code=400, detail="Daftar kriteria tidak boleh kosong.")

    results, norm_matrix, weighted_matrix = method_func(req.alternatives, req.criteria)

    return CalculationResponse(
        method=req.method.lower(),
        results=results,
        normalized_matrix=norm_matrix,
        weighted_matrix=weighted_matrix
    )
