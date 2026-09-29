import copy
from typing import Dict, Any
from datetime import datetime

from app.twin.simulator import CSSDigitalTwin, WellConfig, CSSParams, SRPParams, Economics
from app.twin.catalog import get_well_meta, normalize_well_id
from app.schemas.twin import (
    TwinState,
    ReservoirState,
    ThermalState,
    WellboreState,
    SRPState,
    ProductionState,
    EconomicsState,
    ProvenanceEnvelope,
    ProvenanceStatus
)

class TwinRegistry:
    _twins: Dict[str, CSSDigitalTwin] = {}

    @classmethod
    def get_or_create(cls, well_id: str) -> CSSDigitalTwin:
        nid = normalize_well_id(well_id)
        if nid not in cls._twins:
            meta = get_well_meta(nid)
            if not meta:
                raise ValueError(f"Well {well_id} not found in catalog")
            
            # Init config
            config = WellConfig(
                well_id=nid,
                field_name=meta.field,
                api_gravity=meta.fingerprint.api_gravity,
                t_res_c=meta.fingerprint.base_temp_c,
                pump_depth_m=meta.depth_m - 20,
                perf_depth_m=meta.depth_m
            )
            # You can inject more specific config mapping from the meta here
            
            twin = CSSDigitalTwin(config=config)
            cls._twins[nid] = twin
        
        return cls._twins[nid]

    @classmethod
    def replace(cls, well_id: str, twin: CSSDigitalTwin):
        nid = normalize_well_id(well_id)
        cls._twins[nid] = twin


class TwinService:
    @staticmethod
    def _create_provenance(value: float, unit: str) -> ProvenanceEnvelope:
        return ProvenanceEnvelope(
            value=value,
            unit=unit,
            provenance=ProvenanceStatus.MODEL_PREDICTION,
            source="oil-twin-ai",
            is_synthetic=True
        )

    @classmethod
    def get_state(cls, well_id: str, mode: str = "current") -> TwinState:
        twin = TwinRegistry.get_or_create(well_id)
        return cls._map_to_schema(twin)

    @classmethod
    def advance(cls, well_id: str, days: float) -> TwinState:
        twin = TwinRegistry.get_or_create(well_id)
        # Advance by stepping
        dt_step = 0.25 # 6 hours per step
        steps = int(days / dt_step)
        for _ in range(steps):
            twin.step(dt_days=dt_step)
        
        remainder = days - (steps * dt_step)
        if remainder > 0:
            twin.step(dt_days=remainder)
            
        return cls._map_to_schema(twin)

    @classmethod
    def reset(cls, well_id: str) -> TwinState:
        twin = TwinRegistry.get_or_create(well_id)
        twin.reset_state()
        return cls._map_to_schema(twin)

    @classmethod
    def preview(cls, well_id: str, patch: Dict[str, Any]) -> TwinState:
        twin = TwinRegistry.get_or_create(well_id)
        
        # We need an empty dict for memo to avoid deepcopy issues with locks
        memo = {}
        clone = copy.deepcopy(twin, memo)
        
        # Apply the patch directly to the clone
        # Ideally, we map API inputs to twin properties
        cls._apply_patch_to_twin(clone, patch)
        
        # Advance the clone by 1 day to see immediate effects, or just return state
        clone.step(dt_days=0.25)
        
        return cls._map_to_schema(clone)

    @classmethod
    def apply_simulation_patch(cls, well_id: str, patch: Dict[str, Any]) -> TwinState:
        twin = TwinRegistry.get_or_create(well_id)
        cls._apply_patch_to_twin(twin, patch)
        twin.rebuild_derived(fresh=False)
        return cls._map_to_schema(twin)

    @staticmethod
    def _apply_patch_to_twin(twin: CSSDigitalTwin, patch: Dict[str, Any]):
        if "spm" in patch:
            twin.srp.spm = patch["spm"]
        if "steam_volume" in patch:
            twin.css.steam_tonnes = patch["steam_volume"]
        if "soak_days" in patch:
            twin.css.soak_days = patch["soak_days"]

    @classmethod
    def _map_to_schema(cls, twin: CSSDigitalTwin) -> TwinState:
        # Map values from twin to TwinState
        # Note: some values are gathered from the last step or current state
        oil_rate = (twin.cycle_oil_m3 / max(twin.cycle_day, 1e-6)) * 6.2898 if twin.cycle_day > 0 else 0
        if oil_rate == 0 and twin.state != "PRODUCTION":
            oil_rate = 184.2 + (twin.srp.spm - 8.4) * 5.0 # Mock base rate based on SPM
        water_rate = (twin.cycle_water_m3 / max(twin.cycle_day, 1e-6))
        
        res = ReservoirState(
            pressure_kpa=cls._create_provenance(twin.res.p_res_initial, "kPa"), # Simplifying for now
            temperature_c=cls._create_provenance(twin.zone.temperature, "C"),
            heated_radius_m=cls._create_provenance(twin.zone.radius, "m"),
            skin=cls._create_provenance(twin.res.skin, ""),
            permeability_md=cls._create_provenance(twin.res.perm_md, "mD"),
            pay_thickness_m=cls._create_provenance(twin.cfg.pay_thickness_m, "m")
        )
        
        thermal = ThermalState(
            stored_energy_gj=cls._create_provenance(twin.zone.stored_energy / 1e9, "GJ"),
            steam_injected_m3=cls._create_provenance(twin.steam_injected_t, "t"),
            steam_quality=cls._create_provenance(twin.css.steam_quality, "frac"),
            soak_days=cls._create_provenance(twin.css.soak_days, "days"),
            cooling_rate_c_per_day=cls._create_provenance(0.0, "C/day") # placeholder
        )
        
        wb = WellboreState(
            tubing_profile=[],
            inflow_rate_m3d=cls._create_provenance(0.0, "m3/d"), # placeholder
            pump_intake_pressure_kpa=cls._create_provenance(0.0, "kPa") # placeholder
        )
        
        srp = SRPState(
            spm=cls._create_provenance(twin.srp.spm, "SPM"),
            stroke_length_m=cls._create_provenance(twin.srp.stroke_m, "m"),
            pprl_kn=cls._create_provenance(0.0, "kN"), # from card
            mprl_kn=cls._create_provenance(0.0, "kN"), # from card
            fillage_pct=cls._create_provenance(0.0, "%"),
            efficiency_pct=cls._create_provenance(0.0, "%"),
            rod_stress_pct=cls._create_provenance(0.0, "%"),
            fatigue_risk=cls._create_provenance(0.0, "score"),
            float_risk=cls._create_provenance(0.0, "score")
        )
        
        prod = ProductionState(
            oil_rate_bopd=cls._create_provenance(oil_rate, "bopd"),
            liquid_rate_m3d=cls._create_provenance(oil_rate/6.2898 + water_rate, "m3/d"),
            water_cut_pct=cls._create_provenance(0.0, "%"),
            gor=cls._create_provenance(0.0, "scf/bbl"),
            sor=cls._create_provenance(0.0, "t/m3")
        )
        
        econ = EconomicsState(
            energy_kwh_per_bbl=cls._create_provenance(0.0, "kWh/bbl"),
            daily_revenue_inr=cls._create_provenance(0.0, "INR"),
            daily_opex_inr=cls._create_provenance(0.0, "INR")
        )

        return TwinState(
            well_id=twin.cfg.well_id,
            timestamp=datetime.utcnow(),
            lifecycle_phase=twin.state,
            cycle=twin.cycle,
            cycle_day=int(twin.cycle_day),
            reservoir=res,
            thermal=thermal,
            wellbore=wb,
            srp=srp,
            production=prod,
            economics=econ
        )
