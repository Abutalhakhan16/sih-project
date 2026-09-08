import math
from typing import List, Dict, Any, Optional, Tuple

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in km."""
    R = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def estimate_eta_minutes(distance_km: float) -> int:
    """Estimates transit ETA in minutes based on distance."""
    return max(5, round(distance_km * 3.5 + 4))

def evaluate_worker_match(
    worker: Dict[str, Any],
    customer_lat: float,
    customer_lng: float,
    requested_service: str,
    lang: str = "en"
) -> Dict[str, Any]:
    """
    Evaluates worker compatibility, calculates distance, checks eligibility,
    and computes a fair cooperative match score (0-99).
    """
    w_lat = worker.get("lat") or worker.get("latitude") or 12.9716
    w_lng = worker.get("lng") or worker.get("longitude") or 77.5946
    distance_km = round(calculate_haversine_distance(customer_lat, customer_lng, w_lat, w_lng), 2)
    eta_minutes = estimate_eta_minutes(distance_km)

    w_service = (worker.get("service") or worker.get("primarySkill") or worker.get("primary_skill") or "").strip().lower()
    req_svc = requested_service.strip().lower()
    secondary_skills = [s.lower() for s in (worker.get("secondarySkills") or worker.get("secondary_skills") or [])]

    # Fuzzy and stemmed skill matching (e.g. Plumbing <-> Plumber, Electrical <-> Electrician)
    stem_w = w_service[:5] if len(w_service) >= 5 else w_service
    stem_r = req_svc[:5] if len(req_svc) >= 5 else req_svc
    skill_matches = (
        (w_service == req_svc)
        or (req_svc in w_service)
        or (w_service in req_svc)
        or (stem_w == stem_r and len(stem_w) >= 4)
        or any((req_svc in s or s in req_svc or s[:5] == stem_r) for s in secondary_skills)
    )

    verif_status = worker.get("verificationStatus") or worker.get("verification_status") or "VERIFIED"
    is_verified = (verif_status.upper() == "VERIFIED")

    status = (worker.get("currentStatus") or worker.get("availability_status") or worker.get("availability") or "AVAILABLE").upper()
    is_available = (status == "AVAILABLE")

    is_eligible = False
    disqualification_reason: Optional[str] = None

    if not skill_matches:
        disqualification_reason = (
            f"कौशल ({worker.get('service')}) अनुरोधित सेवा ({requested_service}) से मेल नहीं खाता"
            if lang == "hi"
            else f"Service skill ({worker.get('service')}) does not match requested ({requested_service})"
        )
    elif not is_verified:
        disqualification_reason = (
            "सहकारी संस्था द्वारा सत्यापन लंबित है"
            if lang == "hi"
            else "Worker is pending verification by the cooperative"
        )
    elif status == "BUSY":
        disqualification_reason = (
            "सेवा कर्मी वर्तमान में अन्य कार्य में व्यस्त है"
            if lang == "hi"
            else "Worker is currently busy on an active assignment"
        )
    elif status == "ON_JOB":
        disqualification_reason = (
            "सेवा कर्मी वर्तमान में किसी कार्य पर है"
            if lang == "hi"
            else "Worker is currently on an active job"
        )
    elif status == "ON_LEAVE":
        disqualification_reason = (
            "सेवा कर्मी निर्धारित अवकाश पर है"
            if lang == "hi"
            else "Worker is currently on scheduled leave"
        )
    elif status == "OFFLINE":
        disqualification_reason = (
            "सेवा कर्मी वर्तमान में ऑफ़लाइन है"
            if lang == "hi"
            else "Worker is currently offline"
        )
    else:
        is_eligible = True

    # Co-op Fair Match Score formula:
    # Skill Match (base 50) + Certification (10) + Proximity (up to 20) - Workload penalty + Rating (up to 15)
    workload = worker.get("workload") or 0
    rating = float(worker.get("rating") or 4.5)
    cert_count = len(worker.get("certifications") or [])

    cert_bonus = min(10, cert_count * 5)
    proximity_score = max(0.0, 20.0 - distance_km * 2.5)
    workload_penalty = min(15.0, workload * 3.0)
    rating_bonus = min(15.0, rating * 3.0)

    raw_score = 50 + cert_bonus + proximity_score - workload_penalty + rating_bonus
    match_score = max(55, min(99, round(raw_score)))

    res = dict(worker)
    res.update({
        "distance": distance_km,
        "distanceKm": distance_km,
        "etaMinutes": eta_minutes,
        "matchScore": match_score,
        "isEligible": is_eligible,
        "disqualificationReason": disqualification_reason,
    })
    return res

def find_smart_matches(
    workers: List[Dict[str, Any]],
    customer_lat: float,
    customer_lng: float,
    requested_service: str,
    lang: str = "en",
    radius_km: float = 30.0
) -> Dict[str, Any]:
    """
    Ranks workers by suitability:
    Skill match -> Eligible first -> Distance -> Workload tie-breaker -> Rating.
    """
    evaluated = [
        evaluate_worker_match(w, customer_lat, customer_lng, requested_service, lang)
        for w in workers
    ]

    # Filter to requested service
    req_svc = requested_service.strip().lower()
    service_workers = [
        w for w in evaluated
        if (w.get("service") or "").strip().lower() == req_svc
        or any(req_svc in s.lower() for s in (w.get("secondarySkills") or []))
    ]

    # Filter within radius
    in_radius = [w for w in service_workers if w["distanceKm"] <= radius_km]
    if not in_radius and service_workers:
        in_radius = service_workers  # Fallback if radius is tight

    eligible = [w for w in in_radius if w["isEligible"]]
    ineligible = [w for w in in_radius if not w["isEligible"]]

    # Rank eligible: distance, then workload tie-breaker if within 0.3km
    def sort_key(w):
        return (w["distanceKm"], w.get("workload", 0), -float(w.get("rating", 0)))

    eligible.sort(key=sort_key)
    ineligible.sort(key=lambda w: w["distanceKm"])

    best_worker = eligible[0] if eligible else None

    # Explanation generation
    explanation = ""
    if best_worker:
        closer_busy = next(
            (w for w in ineligible if w.get("distanceKm", 999) < best_worker["distanceKm"] and not w["isEligible"]),
            None
        )
        if closer_busy:
            if lang == "hi":
                explanation = (
                    f"सर्वश्रेष्ठ मिलान: {best_worker['name']} ({best_worker['distanceKm']} किमी दूर, उपलब्ध)। "
                    f"{closer_busy['name']} अधिक नजदीक ({closer_busy['distanceKm']} किमी) थे लेकिन व्यस्त/अनुपलब्ध हैं।"
                )
            else:
                explanation = (
                    f"Matched {best_worker['name']} ({best_worker['distanceKm']} km away, Available). "
                    f"{closer_busy['name']} was closer ({closer_busy['distanceKm']} km) but is currently unavailable."
                )
        else:
            if lang == "hi":
                explanation = (
                    f"सर्वश्रेष्ठ उपलब्ध सत्यापित {requested_service}: {best_worker['name']} "
                    f"({best_worker['distanceKm']} किमी दूर, अनुमानित आगमन ~{best_worker['etaMinutes']} मिनट)।"
                )
            else:
                explanation = (
                    f"Matched {best_worker['name']} as the nearest available verified {requested_service} "
                    f"({best_worker['distanceKm']} km away, ETA ~{best_worker['etaMinutes']} mins)."
                )
    elif ineligible:
        if lang == "hi":
            explanation = f"{requested_service} कौशल वाले {len(ineligible)} कर्मी मिले, परंतु कोई भी वर्तमान में उपलब्ध नहीं है।"
        else:
            explanation = f"Found {len(ineligible)} worker(s) with {requested_service} skills, but none are currently available."
    else:
        if lang == "hi":
            explanation = f'"{requested_service}" कौशल वाले कोई सेवा कर्मी उपलब्ध नहीं हैं।'
        else:
            explanation = f'No workers found matching the skill "{requested_service}".'

    return {
        "bestWorker": best_worker,
        "rankedWorkers": eligible + ineligible,
        "totalFound": len(eligible),
        "explanation": explanation
    }
