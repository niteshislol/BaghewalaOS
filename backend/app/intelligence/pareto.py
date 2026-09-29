"""Pareto-efficient alternative selection from evaluated candidates."""

from __future__ import annotations

from app.schemas.prediction import PredictResponse


Candidate = tuple[object, PredictResponse, float]


def _objectives(pred: PredictResponse) -> tuple[float, float, float]:
    return (
        pred.predicted_oil_rate_bopd,
        -pred.predicted_sor,
        -pred.predicted_failure_probability,
    )


def _dominates(a: PredictResponse, b: PredictResponse) -> bool:
    oa, ob = _objectives(a), _objectives(b)
    better_or_equal = all(x >= y for x, y in zip(oa, ob))
    strictly_better = any(x > y for x, y in zip(oa, ob))
    return better_or_equal and strictly_better


def pareto_front(scored: list[Candidate]) -> list[Candidate]:
    front: list[Candidate] = []
    for i, candidate in enumerate(scored):
        dominated = any(
            i != j and _dominates(scored[j][1], candidate[1])
            for j in range(len(scored))
        )
        if not dominated:
            front.append(candidate)
    return front


def _candidate_key(candidate: Candidate) -> tuple[float, float, float]:
    pred = candidate[1]
    return (
        round(pred.predicted_oil_rate_bopd, 2),
        round(pred.predicted_sor, 3),
        round(pred.predicted_failure_probability, 4),
    )


def select_pareto_alternatives(scored: list[Candidate]) -> list[tuple[str, Candidate]]:
    """Return up to 3 diverse Pareto-style options for operator choice."""
    if not scored:
        return []

    front = pareto_front(scored)
    pool = front if len(front) >= 3 else sorted(scored, key=lambda x: x[2], reverse=True)[:15]

    picks_spec = [
        ("option_a_production", sorted(pool, key=lambda x: x[1].predicted_oil_rate_bopd, reverse=True)),
        ("option_b_efficiency", sorted(pool, key=lambda x: x[1].predicted_sor)),
        ("option_c_reliability", sorted(pool, key=lambda x: x[1].predicted_failure_probability)),
    ]

    seen_keys: set[tuple[float, float, float]] = set()
    result: list[tuple[str, Candidate]] = []

    for label, ranked in picks_spec:
        for candidate in ranked:
            key = _candidate_key(candidate)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            result.append((label, candidate))
            break

    if len(result) < 3:
        balanced = max(pool, key=lambda x: x[2])
        key = _candidate_key(balanced)
        if key not in seen_keys:
            result.append(("balanced", balanced))

    return result[:3]
