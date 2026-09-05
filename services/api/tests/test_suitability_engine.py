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
