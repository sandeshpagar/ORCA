import pytest
from app.localization.i18n import (
    get_suitability_label,
    get_risk_label,
    get_verdict_label,
    localize_tourist_summary,
)
from app.graph.nodes.recommendation import format_tourist_response


def test_enum_invariants_preserved():
    """Verify that raw enum values are preserved in display strings across all languages."""
    for lang in ["en", "hi", "mr"]:
        for suit in ["HIGH", "MODERATE", "LOW", "UNSUITABLE"]:
            label = get_suitability_label(suit, lang)
            assert suit in label, f"Raw enum {suit} missing in {lang} label: {label}"

        for risk in ["low", "moderate", "high", "severe"]:
            label = get_risk_label(risk, lang)
            assert risk in label, f"Raw risk enum {risk} missing in {lang} label: {label}"

        for verdict in ["safe", "caution", "danger", "unknown"]:
            label = get_verdict_label(verdict, lang)
            assert verdict.upper() in label, f"Raw verdict enum {verdict} missing in {lang} label: {label}"


def test_marathi_tourist_synthesis():
    """Verify Marathi localization formats output with correct Marathi headers while keeping units and enums."""
    state = {
        "language": "mr",
        "role": "tourist",
        "activity_suitability": {
            "activity": "beach_visit",
            "suitability": "HIGH",
            "score": 85,
            "best_time_window": "06:00 – 10:30 IST",
            "reasons": ["लाटांची उंची 1.2m सुरक्षित मर्यादेत आहे", "वाऱ्याचा वेग 14 km/h अनुकूल आहे"],
        },
        "risk_result": {
            "level": "low",
            "score": 15,
            "warnings": [],
        },
        "sources": [],
    }

    response = format_tourist_response(state)
    assert "HIGH" in response
    assert "85/100" in response
    assert "06:00 – 10:30 IST" in response
    assert "ऑर्का (ORCA)" in response
    assert "1.2m" in response
    assert "14 km/h" in response


def test_hindi_tourist_synthesis():
    """Verify Hindi localization formats output with correct Hindi headers while keeping units and enums."""
    state = {
        "language": "hi",
        "role": "tourist",
        "activity_suitability": {
            "activity": "boating",
            "suitability": "MODERATE",
            "score": 65,
            "best_time_window": "07:00 – 11:00 IST",
            "reasons": ["सतह हवा 18 km/h मध्यम"],
        },
        "risk_result": {
            "level": "moderate",
            "score": 40,
            "warnings": ["अपराह्न में तेज हवा की संभावना"],
        },
        "sources": [],
    }

    response = format_tourist_response(state)
    assert "MODERATE" in response
    assert "65/100" in response
    assert "ओरका (ORCA)" in response
    assert "18 km/h" in response


def test_greeting_and_role_localization():
    """Verify localized greetings and role responses for Hindi and Marathi."""
    from app.graph.nodes.recommendation import format_greeting_response, format_role_response

    # Hindi greeting
    hi_greeting_state = {
        "language": "hi",
        "role": "tourist",
        "location": {"name": "Puri Beach"},
        "weather_result": {"temperature_c": 29.5, "wind_speed_kmh": 16.0},
        "ocean_result": {"wave_height_m": 1.4},
    }
    hi_greet = format_greeting_response(hi_greeting_state)
    assert "ओरका (ORCA)" in hi_greet
    assert "Puri Beach" in hi_greet
    assert "29.5°C" in hi_greet
    assert "TOURIST" in hi_greet
    assert "नमस्ते" in hi_greet
    # Ensure zero Marathi in Hindi greeting
    assert "मी ORCA" not in hi_greet
    assert "आहे" not in hi_greet

    # Hindi fisher role
    hi_fisher_state = {
        "language": "hi",
        "role": "fisher",
        "location": {"name": "Gujarat & Gulf of Kutch"},
        "weather_result": {"temperature_c": 26.2, "wind_speed_kmh": 12.4},
        "ocean_result": {"wave_height_m": 0.5},
    }
    hi_fisher = format_role_response(hi_fisher_state)
    assert "ओरका (ORCA)" in hi_fisher
    assert "SAFE" in hi_fisher
    assert "0.5m" in hi_fisher
    assert "12.4 km/h" in hi_fisher
    # Check standard Hindi terms
    assert "मछुआरा" in hi_fisher
    assert "लहरों की ऊंचाई" in hi_fisher
    assert "हवा की गति" in hi_fisher
    assert "यंत्रीकृत नौकाओं के लिए" in hi_fisher
    # Strict invariance: zero Marathi words in Hindi output
    assert "नौकांसाठी" not in hi_fisher
    assert "लाटांची" not in hi_fisher
    assert "वाऱ्याचा" not in hi_fisher
    assert "आहे" not in hi_fisher

    # Marathi fisher role
    mr_fisher_state = {
        "language": "mr",
        "role": "fisher",
        "location": {"name": "Gopalpur Coast"},
        "weather_result": {"temperature_c": 30.0, "wind_speed_kmh": 18.0},
        "ocean_result": {"wave_height_m": 1.5},
    }
    mr_fisher = format_role_response(mr_fisher_state)
    assert "ऑर्का (ORCA)" in mr_fisher
    assert "SAFE" in mr_fisher
    assert "1.5m" in mr_fisher
    assert "18.0 km/h" in mr_fisher
    assert "लाटांची उंची" in mr_fisher
    assert "वाऱ्याचा वेग" in mr_fisher
    assert "यांत्रिकी नौकांसाठी" in mr_fisher
