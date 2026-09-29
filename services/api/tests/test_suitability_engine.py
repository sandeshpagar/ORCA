"""
Unit Tests for Standalone Activity Suitability & Risk Engine (Phase 3)
Verifies mathematical reproducibility, threshold evaluations, and the mandate
that 'safe' / 'absolutely safe' claims are NEVER emitted.
"""

import pytest
from app.agents.suitability_risk_engine import evaluate_activity_suitability


def test_zero_unsafe_terminology_emitted():
    """MANDATE: Never emit 'safe' or 'absolutely safe' in output strings."""
    # Test across multiple activities and calm conditions
    for activity in ["beach_visit", "boating", "sightseeing", "water_recreation", "trawler_venture"]:
        result = evaluate_activity_suitability(
            activity=activity,
            weather={"wind_speed_kmh": 10.0, "weather_description": "Clear sky", "temperature_c": 28.0},
            ocean={"wave_height_m": 0.8, "wave_period_s": 8.0},
        )
        
        # Check summary, explanation, reasons, factors
        full_text = " ".join([
            result["summary"],
            result["explanation"],
            " ".join(result["reasons"]),
            " ".join(f["reason"] for f in result["factors"]),
        ]).lower()

        assert "absolutely safe" not in full_text, f"Forbidden phrase 'absolutely safe' found for {activity}"
        assert "is safe" not in full_text, f"Forbidden phrase 'is safe' found for {activity}"


def test_mathematical_reproducibility():
    """Input reproducibility: exact same inputs must produce exact same score and factors every time."""
    params = {
        "activity": "boating",
        "weather": {"wind_speed_kmh": 22.0, "weather_description": "Partly cloudy"},
        "ocean": {"wave_height_m": 1.9, "wave_period_s": 7.5},
        "gis": {"has_restricted_hazard": True},
    }

    first_run = evaluate_activity_suitability(**params)
    for _ in range(10):
        subsequent_run = evaluate_activity_suitability(**params)
        assert subsequent_run["score"] == first_run["score"]
        assert subsequent_run["suitability"] == first_run["suitability"]
        assert len(subsequent_run["factors"]) == len(first_run["factors"])
        assert subsequent_run["best_time_window"] == first_run["best_time_window"]


def test_wave_height_threshold_critical_penalty():
    """Boating with wave height >= 2.5m must trigger critical penalty and UNSUITABLE/LOW rating."""
    result = evaluate_activity_suitability(
        activity="boating",
        weather={"wind_speed_kmh": 15.0, "weather_description": "Clear"},
        ocean={"wave_height_m": 2.8, "wave_period_s": 9.0},
    )

    assert result["suitability"] in ["UNSUITABLE", "LOW"]
    assert result["score"] <= 45
    critical_factors = [f for f in result["factors"] if f["impact"] == "critical"]
    assert len(critical_factors) >= 1
    assert "2.8m" in critical_factors[0]["value"]


def test_gale_wind_critical_penalty():
    """Wind speed >= 45 km/h must trigger critical atmospheric penalty and warnings."""
    result = evaluate_activity_suitability(
        activity="beach_visit",
        weather={"wind_speed_kmh": 50.0, "weather_description": "Strong breeze"},
        ocean={"wave_height_m": 1.2},
    )

    assert result["score"] <= 50
    assert any("High wind warning" in w for w in result["warnings"])
    assert any(f["factor"] == "Sustained Wind Speed" and f["impact"] == "critical" for f in result["factors"])


def test_severe_thunderstorm_evacuation():
    """Thunderstorm/squall must result in immediate evacuation warning and critical convection factor."""
    result = evaluate_activity_suitability(
        activity="beach_visit",
        weather={"wind_speed_kmh": 18.0, "weather_description": "Severe Thunderstorm with squalls"},
        ocean={"wave_height_m": 1.0},
    )

    assert any("Lightning" in w for w in result["warnings"])
    assert any(f["factor"] == "Atmospheric Convection" and f["impact"] == "critical" for f in result["factors"])


def test_sightseeing_ignores_minor_ocean_swell():
    """Sightseeing is coastal/onshore; normal wave chop (1.5m) should not penalize score."""
    result = evaluate_activity_suitability(
        activity="sightseeing",
        weather={"wind_speed_kmh": 12.0, "weather_description": "Sunny"},
        ocean={"wave_height_m": 1.8},
    )

    assert result["suitability"] == "HIGH"
    assert result["score"] >= 80


@pytest.mark.parametrize(
    "wave_m, expected_impact, expected_penalty",
    [
        (1.79, "favorable", 0),
        (1.80, "warning", 30),
        (2.49, "warning", 30),
        (2.50, "critical", 60),
    ],
)
def test_boating_wave_height_boundary_transitions(wave_m, expected_impact, expected_penalty):
    """Verify exact boundary threshold transitions at 1.8m and 2.5m for boating/craft."""
    result = evaluate_activity_suitability(
        activity="boating",
        weather={"wind_speed_kmh": 10.0, "weather_description": "Clear"},
        ocean={"wave_height_m": wave_m},
    )
    factor = next(f for f in result["factors"] if f["factor"] == "Significant Wave Height")
    assert factor["impact"] == expected_impact
    expected_score = 100 - expected_penalty
    assert result["score"] == expected_score


@pytest.mark.parametrize(
    "wind_kmh, expected_impact, expected_penalty",
    [
        (27.9, "favorable", 0),
        (28.0, "warning", 20),
        (44.9, "warning", 20),
        (45.0, "critical", 50),
    ],
)
def test_wind_speed_boundary_transitions(wind_kmh, expected_impact, expected_penalty):
    """Verify exact boundary threshold transitions at 28.0 km/h and 45.0 km/h."""
    result = evaluate_activity_suitability(
        activity="sightseeing",
        weather={"wind_speed_kmh": wind_kmh, "weather_description": "Clear"},
        ocean={"wave_height_m": 1.0},
    )
    factor = next(f for f in result["factors"] if f["factor"] == "Sustained Wind Speed")
    assert factor["impact"] == expected_impact
    expected_score = 100 - expected_penalty
    assert result["score"] == expected_score


def test_deterministic_role_responses_all_five_roles():
    """Verify deterministic formatting across all 5 operational roles satisfies PRD §8."""
    from app.graph.nodes.recommendation import format_role_response, format_tourist_response

    base_state = {
        "location": {"name": "Gopalpur Pier", "latitude": 19.26, "longitude": 84.91},
        "weather_result": {
            "temperature_c": 29.5,
            "wind_speed_kmh": 18.0,
            "weather_description": "Partly cloudy",
        },
        "ocean_result": {
            "wave_height_m": 1.4,
            "wave_period_s": 8.0,
        },
        "activity_suitability": {
            "activity": "beach_visit",
            "suitability": "HIGH",
            "score": 85,
            "best_time_window": "06:30 – 11:30 IST",
            "reasons": ["Calm conditions"],
        },
        "risk_result": {"warnings": []},
        "sources": [{"name": "Open-Meteo", "reliability": "LIVE", "timestamp": "2026-09-29T10:00:00Z"}],
    }

    # 1. Tourist
    tourist_state = {**base_state, "role": "tourist"}
    tourist_text = format_tourist_response(tourist_state)
    assert "ORCA Coastal Tourist Advisory" in tourist_text
    assert "85/100" in tourist_text
    assert "absolutely safe" not in tourist_text.lower()

    # 2. Fisher
    fisher_state = {**base_state, "role": "fisher"}
    fisher_text = format_role_response(fisher_state)
    assert "ORCA Fisherfolk Telemetry" in fisher_text
    assert "SAFE FOR MECHANISED CRAFT" in fisher_text

    # 3. Authority
    auth_state = {**base_state, "role": "authority"}
    auth_text = format_role_response(auth_state)
    assert "ORCA Coastal Authority Situation Summary" in auth_text
    assert "Signal 1 Vigilance" in auth_text

    # 4. Researcher
    res_state = {**base_state, "role": "researcher"}
    res_text = format_role_response(res_state)
    assert "ORCA Oceanographic Research Telemetry" in res_text
    assert "Sea Surface Temperature" in res_text

    # 5. Disaster Management
    dm_state = {**base_state, "role": "disaster_management"}
    dm_text = format_role_response(dm_state)
    assert "ORCA Coastal Disaster Management Advisory" in dm_text
    assert "Level 0" in dm_text

