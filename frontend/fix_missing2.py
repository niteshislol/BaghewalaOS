import os
from pathlib import Path

base = Path(r"c:\Users\nites\Downloads\SIH26120\BaghewalaOS\frontend\src")

def write_dummy_tsx(path_str):
    p = base / path_str
    p.parent.mkdir(parents=True, exist_ok=True)
    name = p.stem
    p.write_text(f"""import React from 'react';
export const {name} = () => <div>{name} placeholder</div>;
export default {name};
""")

def write_dummy_ts(path_str, exports=None):
    p = base / path_str
    p.parent.mkdir(parents=True, exist_ok=True)
    if exports:
        p.write_text(exports)
    else:
        p.write_text(f"export const {p.stem} = () => ({{}});")

# Components
write_dummy_tsx("components/srp/SrpMlConditionCard.tsx")
write_dummy_tsx("components/css/CssMlPredictionCard.tsx")
write_dummy_tsx("components/AnimatedNumber.tsx")

# Stores
write_dummy_ts("stores/useAlertStore.ts", "export const useAlertStore = () => ({ alerts: [] });")
write_dummy_ts("stores/useWorkOrderStore.ts", "export const useWorkOrderStore = () => ({ workOrders: [] });")
write_dummy_ts("stores/useUIStore.ts", "export const useUIStore = () => ({});")

print("Created all remaining missing dummy files!")
