"""Adapter for WagheraOS's trained SRP surrogate."""
from __future__ import annotations
from functools import lru_cache
from pathlib import Path
from typing import Any
import joblib
import numpy as np
ARTIFACT = Path(__file__).resolve().parent / "artifacts" / "srp_performance_model.joblib"
@lru_cache(maxsize=1)
def _load() -> dict[str, Any]:
    return joblib.load(ARTIFACT)
def predict_srp(*, srp_state: Any, parameters: dict[str, Any], css: Any, wellbore: Any) -> dict[str, Any]:
    bundle = _load()
    features = {
        "SPM": float(getattr(srp_state, "spm", parameters.get("spm", 6.0))),
        "stroke_length_m": float(parameters.get("stroke_length", 2.5)),
        "pump_depth_m": 680.0,
        "fluid_level_m": float(getattr(wellbore, "fluid_level_m", 500.0)),
        "viscosity_cp": float(getattr(css, "viscosity_cp", 500.0)),
        "fluid_density_kg_m3": 930.0,
        "water_cut": 0.12,
        "pump_fillage_pct": float(getattr(srp_state, "fillage", 0.8)) * 100.0,
        "reservoir_pressure_pa": float(getattr(css, "pressure_bar", 11.0)) * 100000.0,
        "plunger_diameter_m": 1.75 * 0.0254,
        "rod_diameter_m": 0.875 * 0.0254,
        "rod_length_m": 680.0,
    }
    x = np.array([[features[f] for f in bundle["feature_names"]]], dtype=float)
    xs = bundle["scaler"].transform(x)
    predictions = {target: float(bundle["sklearn_models"][target].predict(xs)[0]) for target in bundle["target_names"]}
    return {
        "status": "loaded",
        "model_version": bundle["metadata"].get("model_version", "1.0.0"),
        "algorithm": bundle["metadata"].get("algorithm", "GradientBoostingRegressor"),
        "training_data_source": bundle["metadata"].get("training_data_source", "synthetic_physics"),
        "predictions": predictions,
        "uncertainty": {k: {"residual_std": float(v), "unit": "model target unit"} for k, v in bundle["val_residual_std"].items()},
        "provenance": "MODEL_PREDICTION",
        "model_alignment": "cross_check_only__trained_on_source_repo_synthetic_physics_not_Baghewala_field_data",
        "important_caveat": bundle["metadata"].get("important_caveat", "Physics surrogate; requires field calibration."),
        "input_features": features,
    }
def metrics() -> dict[str, Any]:
    bundle = _load()
    return {
        "status": "loaded",
        "model_version": bundle["metadata"].get("model_version"),
        "algorithm": bundle["metadata"].get("algorithm"),
        "training_data_source": bundle["metadata"].get("training_data_source"),
        "targets": bundle["target_names"],
        "validation_residual_std": bundle["val_residual_std"],
        "metadata": bundle["metadata"],
        "provenance": "MODEL_PREDICTION",
        "model_alignment": "cross_check_only__trained_on_source_repo_synthetic_physics_not_Baghewala_field_data",
    }
