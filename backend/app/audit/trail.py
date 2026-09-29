"""
BaghewalaOS — SHA-256 Tamper-Evident Audit Trail
Every prediction, VFD dispatch, and autonomous action is logged with a cryptographic hash.
Adopted from SIH26120-Digital-Twin repo, extended with full SQLite persistence.
"""
from __future__ import annotations
import hashlib
import datetime
import json
import sqlite3
import os
from typing import Optional

# Setup SQLite Database
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "baghewala_audit.db")

def _get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def _init_db():
    with _get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                event_id TEXT PRIMARY KEY,
                sha256 TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                well_id TEXT NOT NULL,
                subsystem TEXT NOT NULL,
                severity TEXT NOT NULL,
                operator TEXT NOT NULL,
                data TEXT NOT NULL,
                ps_id TEXT NOT NULL,
                tamper_check TEXT NOT NULL
            )
        """)
        # Index for faster lookups
        conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_well_id ON audit_logs(well_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)")

_init_db()

def _sha256(payload: str) -> str:
    return hashlib.sha256(payload.encode()).hexdigest()[:24]

def log_event(
    event_type: str,         # TELEMETRY | VFD_DISPATCH | AUTONOMOUS_APPLY | ALERT | PREDICTION | CSS_OPTIMIZE
    well_id: str,
    subsystem: str,          # srp | css | reservoir | ai | audit
    severity: str,           # INFO | WARNING | CRITICAL
    data: dict,
    operator: str = "system"
) -> dict:
    """Create a tamper-evident audit log entry and persist it to SQLite."""
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    data_str = json.dumps(data, sort_keys=True)
    payload_str = f"{event_type}:{well_id}:{subsystem}:{severity}:{data_str}:{ts}"
    sha_hash = _sha256(payload_str)

    event_id = f"EVT-{sha_hash[:8].upper()}"
    
    entry = {
        "event_id": event_id,
        "sha256": sha_hash,
        "timestamp": ts,
        "event_type": event_type,
        "well_id": well_id,
        "subsystem": subsystem,
        "severity": severity,
        "operator": operator,
        "data": data,
        "ps_id": "SIH26120",
        "tamper_check": "VALID"
    }

    with _get_db() as conn:
        conn.execute(
            """INSERT INTO audit_logs (event_id, sha256, timestamp, event_type, well_id, subsystem, severity, operator, data, ps_id, tamper_check)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (event_id, sha_hash, ts, event_type, well_id, subsystem, severity, operator, data_str, "SIH26120", "VALID")
        )

    return entry

def verify_entry(entry: dict) -> bool:
    """Re-hash to verify integrity of a log entry."""
    payload_str = (
        f"{entry['event_type']}:{entry['well_id']}:{entry['subsystem']}:"
        f"{entry['severity']}:{json.dumps(entry['data'], sort_keys=True)}:{entry['timestamp']}"
    )
    return _sha256(payload_str) == entry["sha256"]

def get_logs(well_id: Optional[str] = None, limit: int = 50, severity: Optional[str] = None) -> list[dict]:
    query = "SELECT * FROM audit_logs WHERE 1=1"
    params = []
    
    if well_id:
        query += " AND well_id = ?"
        params.append(well_id)
    if severity:
        query += " AND severity = ?"
        params.append(severity)
        
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)
    
    with _get_db() as conn:
        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        
    logs = []
    for row in rows:
        log = dict(row)
        log['data'] = json.loads(log['data'])
        logs.append(log)
        
    return list(reversed(logs)) # Return chronologically

def dispatch_to_field(well_id: str, event_id: str, action: str, priority: str = "STANDARD") -> dict:
    """Log a field team dispatch with audit trail."""
    dispatch_data = {
        "action": action,
        "priority": priority,
        "status": "DISPATCHED_TO_FIELD_TEAMS",
        "dispatch_protocol": f"OIL_INDIA_{priority}_DISPATCH"
    }
    entry = log_event("VFD_DISPATCH", well_id, "operations", "INFO", dispatch_data)
    return {
        "dispatch_id": f"DISP-{entry['event_id']}",
        "event_id": event_id,
        "well_id": well_id,
        "status": "DISPATCHED_TO_FIELD_TEAMS",
        "action": action,
        "priority": priority,
        "sha256": entry["sha256"],
        "dispatched_at": entry["timestamp"]
    }
