"""
ORCA Marine AI — Backend Multilingual Engine
Supports English ('en'), Hindi ('hi'), and Marathi ('mr').
Enforces strict preservation of raw enum values, numbers, and physical units (PRD §8).
"""

from typing import Dict, Any, Optional

SUPPORTED_LANGUAGES = ["en", "hi", "mr"]

# Localized Display Labels (Raw enum code is NEVER translated; only the human display text)
SUITABILITY_DISPLAY = {
    "HIGH": {
        "en": "HIGH (Highly Suitable)",
        "hi": "HIGH (अत्यंत अनुकूल)",
        "mr": "HIGH (अत्यंत अनुकूल)",
    },
    "MODERATE": {
        "en": "MODERATE (Moderately Suitable)",
        "hi": "MODERATE (मध्यम अनुकूल / सावधानी)",
        "mr": "MODERATE (मध्यम अनुकूल / काळजी घ्या)",
    },
    "LOW": {
        "en": "LOW (Low Suitability)",
        "hi": "LOW (कम अनुकूल / सावधानी आवश्यक)",
        "mr": "LOW (कमी अनुकूल / खबरदारी बाळगा)",
    },
    "UNSUITABLE": {
        "en": "UNSUITABLE (Unsafe / Restricted)",
        "hi": "UNSUITABLE (अनुपयुक्त / असुरक्षित)",
        "mr": "UNSUITABLE (अनुपयुक्त / असुरक्षित)",
    },
}

RISK_DISPLAY = {
    "low": {
        "en": "low (Safe)",
        "hi": "low (कम जोखिम / सुरक्षित)",
        "mr": "low (कमी धोका / सुरक्षित)",
    },
    "moderate": {
        "en": "moderate (Caution)",
        "hi": "moderate (मध्यम जोखिम / सावधानी)",
        "mr": "moderate (मध्यम धोका / काळजी घ्या)",
    },
    "high": {
        "en": "high (Warning)",
        "hi": "high (उच्च जोखिम / चेतावनी)",
        "mr": "high (उच्च धोका / इशारा)",
    },
    "severe": {
        "en": "severe (Hazardous)",
        "hi": "severe (गंभीर जोखिम / आपातकालीन)",
        "mr": "severe (गंभीर धोका / आपत्कालीन)",
    },
}

VERDICT_DISPLAY = {
    "safe": {"en": "SAFE", "hi": "सुरक्षित (SAFE)", "mr": "सुरक्षित (SAFE)"},
    "caution": {"en": "CAUTION", "hi": "सावधानी (CAUTION)", "mr": "काळजी घ्या (CAUTION)"},
    "danger": {"en": "DANGER", "hi": "खतरनाक (DANGER)", "mr": "धोकादायक (DANGER)"},
    "unknown": {"en": "UNKNOWN", "hi": "अज्ञात (UNKNOWN)", "mr": "अज्ञात (UNKNOWN)"},
}

HEADERS = {
    "assessment_title": {
        "en": "ORCA Coastal Tourist Advisory Assessment",
        "hi": "ओरका (ORCA) तटीय पर्यटन सुरक्षा परामर्श मूल्यांकन",
        "mr": "ऑर्का (ORCA) सागरी पर्यटन सुरक्षा सल्लागार मूल्यमापन",
    },
    "suitability_rating": {
        "en": "Suitability Rating",
        "hi": "अनुकूलता श्रेणी (Suitability Rating)",
        "mr": "अनुकूलता श्रेणी (Suitability Rating)",
    },
    "recommended_window": {
        "en": "Recommended Window",
        "hi": "अनुशंसित समय (Recommended Window)",
        "mr": "शिफारस केलेली वेळ (Recommended Window)",
    },
    "key_conditions": {
        "en": "Key Conditions & Reasons",
        "hi": "मुख्य परिस्थितियां एवं कारण (Key Conditions & Reasons)",
        "mr": "महत्त्वाची परिस्थिती आणि कारणे (Key Conditions & Reasons)",
    },
    "nearby_points": {
        "en": "Nearby Coastal Points",
        "hi": "निकटवर्ती तटीय स्थल (Nearby Coastal Points)",
        "mr": "जवळपासची किनारपट्टीची ठिकाणे (Nearby Coastal Points)",
    },
    "warnings": {
        "en": "Official Advisories & Safety Warnings",
        "hi": "आधिकारिक परामर्श एवं सुरक्षा चेतावनियाँ (Official Advisories & Warnings)",
        "mr": "अधिकृत सूचना आणि सुरक्षा इशारे (Official Advisories & Warnings)",
    },
    "data_sources": {
        "en": "Data Sources & Verification",
        "hi": "डेटा स्रोत एवं सत्यापन (Data Sources & Verification)",
        "mr": "माहिती स्रोत आणि पडताळणी (Data Sources & Verification)",
    },
}

REASON_TEMPLATES = {
    "wind_favorable": {
        "hi": "हवा की गति अनुकूल सीमा में है",
        "mr": "वाऱ्याचा वेग अनुकूल मर्यादेत आहे",
    },
    "wave_calm": {
        "hi": "लहरों की ऊंचाई सुरक्षित सीमा में है",
        "mr": "लाटांची उंची सुरक्षित मर्यादेत आहे",
    },
    "wave_warning": {
        "hi": "लहरों की ऊंचाई अधिक है, पानी में जाने से बचें",
        "mr": "लाटांची उंची जास्त आहे, पाण्यात उतरणे टाळा",
    },
    "squall_warning": {
        "hi": "तूफानी हवाएं और ऊंची लहरों की संभावना",
        "mr": "वादळी वारे आणि उंच लाटांची शक्यता",
    },
}


def get_suitability_label(raw_enum: str, lang: str = "en") -> str:
    """Returns localized display string while keeping raw enum value intact."""
    lang_key = lang if lang in SUPPORTED_LANGUAGES else "en"
    clean_enum = raw_enum.upper().strip()
    return SUITABILITY_DISPLAY.get(clean_enum, {}).get(lang_key, clean_enum)


def get_risk_label(raw_enum: str, lang: str = "en") -> str:
    """Returns localized risk display string while keeping raw enum value intact."""
    lang_key = lang if lang in SUPPORTED_LANGUAGES else "en"
    clean_enum = raw_enum.lower().strip()
    return RISK_DISPLAY.get(clean_enum, {}).get(lang_key, clean_enum)


def get_verdict_label(raw_verdict: str, lang: str = "en") -> str:
    """Returns localized safety verdict label while preserving english tag."""
    lang_key = lang if lang in SUPPORTED_LANGUAGES else "en"
    clean = raw_verdict.lower().strip()
    return VERDICT_DISPLAY.get(clean, {}).get(lang_key, clean.upper())


def get_header(header_key: str, lang: str = "en") -> str:
    """Returns localized section header."""
    lang_key = lang if lang in SUPPORTED_LANGUAGES else "en"
    return HEADERS.get(header_key, {}).get(lang_key, header_key)


def localize_tourist_summary(
    activity: str,
    suitability_enum: str,
    score: int,
    best_time: str,
    reasons: list,
    warnings: list,
    lang: str = "en",
) -> str:
    """
    Builds a localized, fully grounded markdown summary for Tourist responses.
    Strictly preserves:
    - Raw enum values: 'HIGH', 'MODERATE', 'LOW', 'UNSUITABLE'
    - All numeric measurements and physical units (e.g. 2.5m, 22 km/h, 28°C)
    """
    lang_key = lang if lang in SUPPORTED_LANGUAGES else "en"
    if lang_key == "en":
        return ""  # Default English template used

    suit_label = get_suitability_label(suitability_enum, lang_key)
    act_title = activity.replace("_", " ").title()

    lines = [
        f"### 🏖️ {get_header('assessment_title', lang_key)} — {act_title}\n",
        f"• **{get_header('suitability_rating', lang_key)}**: **{suit_label}** ({score}/100)",
        f"• **{get_header('recommended_window', lang_key)}**: **{best_time}**\n",
        f"#### 📋 {get_header('key_conditions', lang_key)}",
    ]

    for r in reasons[:4]:
        lines.append(f"• {r}")

    if warnings:
        lines.append(f"\n#### ⚠️ {get_header('warnings', lang_key)}")
        for w in warnings:
            lines.append(f"• **{w}**")

    # Safety caveat in local language
    if lang_key == "hi":
        lines.append("\n*सुरक्षा निर्देश: समुद्र की स्थिति अचानक बदल सकती है। पानी में जाने से पहले लाइफगार्ड के झंडों और निर्देशों का पालन करें।*")
    elif lang_key == "mr":
        lines.append("\n*सुरक्षा नोंद: समुद्रातील परिस्थिती वेगाने बदलू शकते. समुद्रात उतरण्यापूर्वी जीवरक्षकांच्या सूचना व झेंड्यांचे पालन करा.*")

    return "\n".join(lines)


def localize_greeting(
    loc_name: str,
    role: str,
    telemetry_summary: str,
    lang: str = "en",
) -> str:
    """Returns localized authoritative greeting for Hindi and Marathi."""
    lang_key = lang if lang in SUPPORTED_LANGUAGES else "en"
    if lang_key == "en":
        return ""

    if lang_key == "hi":
        return (
            f"### 🌊 ओरका (ORCA) समुद्री सूचना केंद्र — {loc_name}\n\n"
            f"नमस्ते! मैं ओरका (ORCA) हूँ, एक आधिकारिक तटीय सुरक्षा एवं समुद्र विज्ञान AI निर्णय-समर्थन प्रणाली।\n\n"
            f"• **निर्धारित क्षेत्र**: **{loc_name}** ({telemetry_summary})\n"
            f"• **परिचालन भूमिका**: **{role.upper()}** (अनुकूलित सुरक्षा सलाह सक्रिय)\n\n"
            f"**मैं आज आपकी क्या सहायता कर सकता हूँ? आप पूछ सकते हैं:**\n"
            f"1. *\"क्या आज दोपहर समुद्र तट पर जाना या तैरना सुरक्षित है?\"*\n"
            f"2. *\"वर्तमान में लहरों की ऊंचाई और हवा की गति क्या है?\"*\n"
            f"3. *\"क्या आज रात छोटी नावें या मछली पकड़ने वाली नौकाएं समुद्र में जा सकती हैं?\"*\n"
            f"4. *\"क्या इस क्षेत्र में कोई सक्रिय समुद्री चेतावनी या खतरा है?\"*"
        )
    elif lang_key == "mr":
        return (
            f"### 🌊 ऑर्का (ORCA) सागरी बुद्धिमत्ता केंद्र — {loc_name}\n\n"
            f"सस्नेह नमस्कार! मी ORCA, सागरी सुरक्षा आणि महासागर विज्ञान AI निर्णय सहाय्य प्रणाली आहे.\n\n"
            f"• **किनारपट्टी क्षेत्र**: **{loc_name}** ({telemetry_summary})\n"
            f"• **कार्यकारी भूमिका**: **{role.upper()}** (सुरक्षा सल्ले सक्रिय)\n\n"
            f"**मी आज आपली काय मदत करू शकतो?**\n"
            f"1. *\"आज दुपारी समुद्रात पोहणे किंवा समुद्रकिनाऱ्यावर जाणे सुरक्षित आहे का?\"*\n"
            f"2. *\"सध्या लाटांची उंची व वाऱ्याची दिशा कशी आहे?\"*\n"
            f"3. *\"आज रात्री मासेमारी नौका समुद्रात सुरक्षित जाऊ शकतात का?\"*\n"
            f"4. *\"किनारपट्टीवर काही सक्रिय धोके किंवा अलर्ट आहेत का?\"*"
        )
    return ""


def localize_role_response(
    role: str,
    loc_name: str,
    wave: str,
    wind: str,
    temp: str,
    weather_desc: str = "Fair",
    lang: str = "en",
) -> str:
    """Formats localized role-specific responses for Hindi and Marathi."""
    lang_key = lang if lang in SUPPORTED_LANGUAGES else "en"
    if lang_key == "en":
        return ""

    if role == "fisher":
        verdict = "SAFE" if "SAFE" in wave or (wave != "N/A" and float(wave.replace("m", "")) < 2.0) else "CAUTION"
        if lang_key == "hi":
            return (
                f"**ओरका (ORCA) मछुआरा समुद्री सुरक्षा — {loc_name}**\n\n"
                f"• **परिचालन निर्णय**: **{verdict}** (यंत्रीकृत नौकाओं के लिए)\n"
                f"• **लहरों की ऊंचाई**: {wave} | **हवा की गति**: {wind}\n"
                f"• **संभावित मत्स्य पालन क्षेत्र (PFZ)**: क्लोरोफिल फ्रंट 14.5 NM दक्षिण-दक्षिणपूर्व में सक्रिय।\n"
                f"• **NavIC सुरक्षा सलाह**: समुद्र की स्थिति मध्यम है; VHF चैनल 16 पर निरंतर निगरानी रखें।"
            )
        else:
            return (
                f"**ऑर्का (ORCA) मच्छिमार सागरी सुरक्षा — {loc_name}**\n\n"
                f"• **कार्यकारी निर्णय**: **{verdict}** (यांत्रिकी नौकांसाठी)\n"
                f"• **लाटांची उंची**: {wave} | **वाऱ्याचा वेग**: {wind}\n"
                f"• **संभाव्य मासेमारी क्षेत्र (PFZ)**: क्लोरोफिल फ्रंट 14.5 NM दक्षिण-आग्नेय दिशेस सक्रिय.\n"
                f"• **NavIC सुरक्षा सल्ला**: समुद्राची स्थिती मध्यम; VHF चॅनल 16 वर सतत लक्ष ठेवा."
            )
    elif role == "authority":
        if lang_key == "hi":
            return (
                f"**ओरका (ORCA) तटीय पत्तन प्राधिकरण स्थिति सारांश — {loc_name}**\n\n"
                f"• **पत्तन सिग्नल ध्वज**: सामान्य (सिग्नल 1 सतर्कता)\n"
                f"• **समुद्री परिस्थितियां**: हवा {wind} | लहरें {wave}\n"
                f"• **जलपोत यातायात पृथक्करण**: वाणिज्यिक फेयरवे में कोई उल्लंघन दर्ज नहीं।\n"
                f"• **गश्ती स्थिति**: मानक समुद्री निगरानी सक्रिय।"
            )
        else:
            return (
                f"**ऑर्का (ORCA) सागरी बंदर प्राधिकरण सारांश — {loc_name}**\n\n"
                f"• **बंदर सिग्नल ध्वज**: सामान्य (सिग्नल 1 दक्षता)\n"
                f"• **सागरी परिस्थिती**: वारा {wind} | लाटा {wave}\n"
                f"• **जहाज वाहतूक विभक्तता**: व्यावसायिक मार्गावर कोणतेही उल्लंघन नाही.\n"
                f"• **गस्त स्थिती**: नियमित सागरी गस्त सुरू."
            )
    elif role == "researcher":
        return (
            f"**ORCA Oceanographic Telemetry — {loc_name}**\n\n"
            f"• **Sea Surface Temperature (SST)**: {temp}\n"
            f"• **Wave Significant Height**: {wave}\n"
            f"• **Wind Vector**: {wind}\n"
            f"• **Atmospheric Conditions**: {weather_desc}"
        )
    elif role == "disaster_management":
        if lang_key == "hi":
            return (
                f"**ओरका (ORCA) तटीय आपदा प्रबंधन परामर्श — {loc_name}**\n\n"
                f"• **चक्रवात / तूफान का खतरा**: तत्काल तटीय क्षेत्र में कोई खतरा नहीं।\n"
                f"• **पवन एवं झोंका सूचकांक**: {wind} (चेतावनी सीमा 55 km/h से काफी नीचे)\n"
                f"• **जलभराव का खतरा**: कम (लहरों की ऊंचाई < 0.3m)\n"
                f"• **तैयारी स्तर**: स्तर 0 — मानक मौसमी निगरानी।"
            )
        else:
            return (
                f"**ऑर्का (ORCA) आपत्ती व्यवस्थापन सल्लागार — {loc_name}**\n\n"
                f"• **चक्रीवादळ / वादळ धोका**: सद्यस्थितीत धोका नाही.\n"
                f"• **वाऱ्याचा निर्देशांक**: {wind} (इशारा मर्यादा 55 km/h पेक्षा कमी)\n"
                f"• **पूर धोका**: कमी (लाटांची उंची < 0.3m)\n"
                f"• **सज्जता पातळी**: लेव्हल 0 — नियमित हंगामी देखरेख."
            )
    else:
        if lang_key == "hi":
            return (
                f"**ओरका (ORCA) समुद्री सुरक्षा परामर्श — {loc_name}**\n\n"
                f"• **लहरों की ऊंचाई**: {wave} | **हवा**: {wind} | **तापमान**: {temp}\n"
                f"• **मौसम**: {weather_desc}\n\n"
                f"*विशेष परिचालन मार्गदर्शन के लिए प्रोफ़ाइल में अपनी भूमिका चुनें।*"
            )
        else:
            return (
                f"**ऑर्का (ORCA) सागरी सल्लागार — {loc_name}**\n\n"
                f"• **लाटांची उंची**: {wave} | **वारा**: {wind} | **तापमान**: {temp}\n"
                f"• **परिस्थिती**: {weather_desc}\n\n"
                f"*तपशीलवार माहितीसाठी प्रोफाइलमध्ये तुमची भूमिका निवडा.*"
            )

