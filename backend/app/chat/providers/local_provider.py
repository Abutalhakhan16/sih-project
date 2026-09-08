"""
LocalRuleEngineProvider for Co-opServe AI Assistant.
Provides deterministic, production-grade bilingual NLP (English, Hindi, Hinglish),
intent extraction, emergency detection, context tracking, and real database tool dispatch.
"""
import re
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.entities import User
from backend.app.chat.providers.base import BaseAIProvider
from backend.app.chat.tools import (
    tool_list_services,
    tool_find_best_worker,
    tool_get_active_booking,
    tool_get_customer_bookings,
    tool_create_booking_from_chat,
    tool_get_worker_data,
    tool_get_worker_pending_jobs,
    tool_update_worker_availability,
    tool_get_admin_demand_analytics,
    tool_get_faq_answer,
)

# Service category keywords map
SERVICE_KEYWORDS = {
    "Plumber": [
        "plumb", "pipe", "leak", "tap", "faucet", "drain", "water", "sink", "flush", "sewer",
        "नल", "पाइप", "प्लंबर", "लीक", "टपक", "पानी"
    ],
    "Electrician": [
        "electr", "wire", "switch", "short circuit", "spark", "current", "fuse", "mcb", "light", "fan", "shock",
        "बिजली", "तार", "शॉर्ट सर्किट", "इलेक्ट्रीशियन", "करंट", "स्पार्क", "पंखा"
    ],
    "Cleaner": [
        "clean", "sweep", "mop", "dust", "maid", "housekeeping", "deep clean", "bathroom cleaning",
        "सफाई", "क्लीनर", "झाड़ू", "पोंछा", "धुलाई"
    ],
    "Carpenter": [
        "carpent", "wood", "door", "furniture", "table", "chair", "hinge", "lock", "cabinet",
        "बढ़ई", "लकड़ी", "दरवाजा", "फर्नीचर", "कारपेंटर"
    ],
    "Appliance Technician": [
        "ac", "air condition", "fridge", "refrigerator", "washing machine", "microwave", "heater", "geyser", "cooler",
        "एसी", "फ्रिज", "गीजर", "कूलर", "वाशिंग मशीन"
    ],
    "Painter": [
        "paint", "whitewash", "color", "wall", "putty",
        "पेंट", "पुट्टी", "रंगाई", "पुताई"
    ]
}

# Emergency triggers
EMERGENCY_TRIGGERS = [
    "emergency", "urgent", "immediately", "short circuit", "spark", "fire", "shock", "current",
    "pipe burst", "flooding", "water leaking badly", "danger", "hazard",
    "आपातकालीन", "तुरंत", "शॉर्ट सर्किट", "आग", "पानी भर गया", "खतरा", "बिजली का करंट"
]


def detect_language(text: str, default_lang: str = "en") -> str:
    """Detects if message is in Hindi (Devanagari script or common romanized Hindi)."""
    # Devanagari unicode range: \u0900-\u097F
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"
    
    # Common Hinglish terms
    hinglish_words = ["chahiye", "kahan", "hai", "karo", "mera", "meri", "ghar", "paani", "kaise", "kitna", "madad"]
    text_lower = text.lower()
    if any(w in text_lower for w in hinglish_words):
        return "hi"
        
    return default_lang or "en"


def classify_service(text: str) -> Optional[str]:
    """Identifies the service category from natural language description."""
    text_lower = text.lower()
    for svc, keywords in SERVICE_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return svc
    return None


def is_emergency_request(text: str) -> bool:
    """Checks for emergency situations."""
    text_lower = text.lower()
    return any(trig in text_lower for trig in EMERGENCY_TRIGGERS)


class LocalRuleEngineProvider(BaseAIProvider):
    """Deterministic, production-ready rule engine for bilingual customer/worker/admin queries."""

    async def process_message(
        self,
        user: User,
        message: str,
        language: str,
        session_context: Dict[str, Any],
        db: AsyncSession,
        **kwargs: Any
    ) -> Dict[str, Any]:
        msg_clean = message.strip()
        msg_lower = msg_clean.lower()
        lang = detect_language(msg_clean, default_lang=language)
        is_hi = (lang == "hi")

        context = dict(session_context or {})
        lat = kwargs.get("latitude") or context.get("latitude") or 12.9716
        lng = kwargs.get("longitude") or context.get("longitude") or 77.5946
        user_address = kwargs.get("address") or context.get("address") or "MG Road, Bengaluru"

        # Initialize response defaults
        reply = ""
        intent = "GENERAL"
        action: Optional[Dict[str, Any]] = None
        suggested_actions: List[str] = []

        # =========================================================================
        # 1. ADMIN ROLE SPECIFIC INTENTS
        # =========================================================================
        if user.role == "admin":
            if any(w in msg_lower for w in ["demand", "zone", "area", "hotspot", "कहाँ मांग", "मांग"]):
                intent = "ADMIN_DEMAND_QUERY"
                analytics = await tool_get_admin_demand_analytics(db)
                highest_zone = analytics["highestDemandZone"]
                req_count = analytics["highestDemandRequests"]
                workers_count = analytics["highestDemandActiveWorkers"]

                if is_hi:
                    reply = (
                        f"📊 **मांग विश्लेषण**: सबसे अधिक मांग **{highest_zone}** में है, "
                        f"जहाँ कुल **{req_count}** सेवा अनुरोध और **{workers_count}** सक्रिय कामगार हैं।\n"
                        f"सिफारिश: आवश्यकतानुसार अन्य क्षेत्रों से अतिरिक्त कामगारों को यहाँ पुनः आवंटित करने पर विचार करें।"
                    )
                else:
                    reply = (
                        f"📊 **Demand Analysis**: **{highest_zone}** currently has the highest demand with "
                        f"**{req_count}** active service requests and **{workers_count}** available workers.\n"
                        f"Recommendation: Consider reallocating available service specialists to balance peak load."
                    )
                action = {"action_type": "admin_analytics", "data": analytics}
                suggested_actions = ["How many plumbers are available?", "How many jobs are pending?", "Which service is most requested?"]
                return self._format_res(reply, intent, lang, action, suggested_actions, context)

            if any(w in msg_lower for w in ["plumber", "available", "कितने प्लंबर", "उपलब्ध"]):
                intent = "ADMIN_SUPPLY_QUERY"
                analytics = await tool_get_admin_demand_analytics(db)
                avail_plumbers = analytics["availablePlumbers"]
                if is_hi:
                    reply = f"🔧 वर्तमान में **{avail_plumbers}** सत्यापित प्लंबर सेवा के लिए पूरी तरह उपलब्ध हैं।"
                else:
                    reply = f"🔧 There are currently **{avail_plumbers}** verified plumbers available on the platform."
                action = {"action_type": "admin_analytics", "data": analytics}
                suggested_actions = ["Which zone has the highest demand?", "How many jobs are pending?"]
                return self._format_res(reply, intent, lang, action, suggested_actions, context)

            if any(w in msg_lower for w in ["pending", "लंबित"]):
                intent = "ADMIN_PENDING_JOBS"
                analytics = await tool_get_admin_demand_analytics(db)
                pending = analytics["pendingJobs"]
                if is_hi:
                    reply = f"📋 सहकारी प्लेटफॉर्म पर वर्तमान में **{pending}** बुकिंग अनुरोध लंबित (Matching/Requested) अवस्था में हैं।"
                else:
                    reply = f"📋 Currently, there are **{pending}** pending booking requests awaiting assignment or acceptance."
                action = {"action_type": "admin_analytics", "data": analytics}
                suggested_actions = ["Which zone has the highest demand?", "Which service is most requested?"]
                return self._format_res(reply, intent, lang, action, suggested_actions, context)

            if any(w in msg_lower for w in ["service", "most requested", "सेवा"]):
                intent = "ADMIN_TOP_SERVICE"
                analytics = await tool_get_admin_demand_analytics(db)
                top_svc = analytics["mostRequestedService"]
                if is_hi:
                    reply = f"⭐ सहकारी मंच पर सबसे अधिक अनुरोधित सेवा **{top_svc}** है।"
                else:
                    reply = f"⭐ The most requested service on Co-opServe is currently **{top_svc}**."
                action = {"action_type": "admin_analytics", "data": analytics}
                suggested_actions = ["Which zone has the highest demand?", "How many plumbers are available?"]
                return self._format_res(reply, intent, lang, action, suggested_actions, context)

        # =========================================================================
        # 2. WORKER ROLE SPECIFIC INTENTS
        # =========================================================================
        if user.role == "worker":
            # Worker Pending Jobs
            if any(w in msg_lower for w in ["pending", "jobs", "next booking", "tasks", "काम", "लंबित"]):
                intent = "WORKER_PENDING_JOBS"
                pending_jobs = await tool_get_worker_pending_jobs(db, user)
                if not pending_jobs:
                    reply = (
                        "आपके पास अभी कोई लंबित कार्य नहीं है। नया कार्य आते ही आपको सूचित किया जाएगा।"
                        if is_hi else
                        "You currently have no pending job requests. You will be notified as soon as a nearby customer requests your service."
                    )
                else:
                    first = pending_jobs[0]
                    reply = (
                        f"📋 आपके पास **{len(pending_jobs)}** सक्रिय/लंबित कार्य हैं।\n"
                        f"अगला कार्य: **{first['service']}** (#{first['id']})\n"
                        f"ग्राहक: {first['customer']} | स्थान: {first['address']}\n"
                        f"आपकी अनुमानित कमाई: ₹{first['workerShare']} (75% सहकारी हिस्सा)"
                        if is_hi else
                        f"📋 You have **{len(pending_jobs)}** active job(s).\n"
                        f"Next booking: **{first['service']}** (#{first['id']})\n"
                        f"Customer: {first['customer']} | Address: {first['address']}\n"
                        f"Your payout: ₹{first['workerShare']} (75% cooperative share)"
                    )
                action = {"action_type": "worker_jobs", "data": {"jobs": pending_jobs}}
                suggested_actions = ["How much did I earn this week?", "Set me as available", "Show my ratings"]
                return self._format_res(reply, intent, lang, action, suggested_actions, context)

            # Worker Earnings
            if any(w in msg_lower for w in ["earn", "earning", "income", "payout", "kamai", "कमाई", "पैसे"]):
                intent = "WORKER_EARNINGS"
                w_data = await tool_get_worker_data(db, user)
                if not w_data:
                    reply = "कार्यकर्ता प्रोफ़ाइल नहीं मिली।" if is_hi else "Worker profile not found."
                else:
                    reply = (
                        f"💰 **आपकी सहकारी कमाई सारांश**:\n"
                        f"• कुल पूरी की गई नौकरियां: {w_data['completedJobs']}\n"
                        f"• कुल संचयी आय (75% हिस्सा): ₹{w_data['totalEarnings']}\n"
                        f"• औसत ग्राहक रेटिंग: ⭐ {w_data['rating']}\n"
                        f"• कल्याण निधि सुरक्षा: {w_data['insuranceStatus']}"
                        if is_hi else
                        f"💰 **Cooperative Earnings Summary**:\n"
                        f"• Completed Jobs: {w_data['completedJobs']}\n"
                        f"• Total Earnings (75% share): ₹{w_data['totalEarnings']}\n"
                        f"• Average Rating: ⭐ {w_data['rating']}\n"
                        f"• Welfare Protection: {w_data['insuranceStatus']}"
                    )
                action = {"action_type": "worker_stats", "data": w_data or {}}
                suggested_actions = ["Show my pending jobs", "Set me as available", "When does my certification expire?"]
                return self._format_res(reply, intent, lang, action, suggested_actions, context)

            # Worker Availability
            if any(w in msg_lower for w in ["available", "उपलब्ध", "online", "ऑन"]):
                intent = "WORKER_AVAILABILITY"
                res_status = await tool_update_worker_availability(db, user, "AVAILABLE")
                reply = (
                    "✅ आपकी उपलब्धता को **Available (उपलब्ध)** के रूप में सेट कर दिया गया है। आप अब नजदीकी ग्राहकों से सेवा अनुरोध प्राप्त कर सकते हैं।"
                    if is_hi else
                    "✅ Your status is now set to **Available**. You are eligible to receive immediate nearby customer dispatch requests."
                )
                suggested_actions = ["Show my pending jobs", "How much did I earn this week?"]
                return self._format_res(reply, intent, lang, None, suggested_actions, context)

            # Worker Certification / Welfare
            if any(w in msg_lower for w in ["certif", "expire", "welfare", "प्रमाणपत्र"]):
                intent = "WORKER_CERTIFICATION"
                w_data = await tool_get_worker_data(db, user)
                reply = (
                    f"📜 आपका प्रमाणपत्र: **{w_data.get('certification', 'सत्यापित')}**\nबीमा: {w_data.get('insuranceStatus', 'सक्रिय')}"
                    if is_hi else
                    f"📜 Your certification: **{w_data.get('certification', 'Verified')}**\nInsurance: {w_data.get('insuranceStatus', 'Active')}"
                )
                suggested_actions = ["Show my pending jobs", "How much did I earn this week?"]
                return self._format_res(reply, intent, lang, None, suggested_actions, context)

        # =========================================================================
        # 3. BOOKING CONFIRMATION VIA CHAT ("Yes", "Book Ramesh", "बुक करो")
        # =========================================================================
        confirm_words = ["yes", "book", "confirm", "haan", "sahi hai", "हाँ", "बुक", "कर दो", "बुक करो"]
        if any(cw in msg_lower for cw in confirm_words) and context.get("matched_worker_id"):
            worker_id = context["matched_worker_id"]
            svc_name = context.get("selected_service", "General Service")
            is_emerg = context.get("is_emergency", False)

            try:
                booking_res = await tool_create_booking_from_chat(
                    db=db,
                    user=user,
                    worker_id=worker_id,
                    service_name=svc_name,
                    address=user_address,
                    lat=lat,
                    lng=lng,
                    priority="Emergency" if is_emerg else "Standard",
                    eta_minutes=context.get("eta_minutes", 12)
                )
                # Clear pending match from context
                context.pop("matched_worker_id", None)
                context.pop("is_emergency", None)

                intent = "CREATE_BOOKING"
                if is_hi:
                    reply = (
                        f"🎉 **बुकिंग सफलतापूर्वक दर्ज हो गई है!** (बुकिंग #{booking_res['bookingId']})\n"
                        f"कामगार **{booking_res['workerName']}** को असाइन किया गया है।\n"
                        f"दूरी: {booking_res['distanceKm']} किमी | अनुमानित समय: {booking_res['etaMinutes']} मिनट।\n"
                        f"आप नीचे दिए गए बटन से अपने कामगार को सीधे मैप पर ट्रैक कर सकते हैं।"
                    )
                else:
                    reply = (
                        f"🎉 **Booking confirmed successfully!** (Booking #{booking_res['bookingId']})\n"
                        f"Worker **{booking_res['workerName']}** has been assigned.\n"
                        f"Distance: {booking_res['distanceKm']} km | Estimated Arrival: {booking_res['etaMinutes']} min.\n"
                        f"You can track the worker's live location on the map below."
                    )

                action = {
                    "action_type": "booking_confirmed",
                    "data": booking_res
                }
                suggested_actions = ["Track on Map", "What is the status of my booking?", "Payment Help"]
                return self._format_res(reply, intent, lang, action, suggested_actions, context)
            except Exception as exc:
                reply = (
                    f"बुकिंग बनाने में समस्या आई: {str(exc)}"
                    if is_hi else
                    f"Could not create booking: {str(exc)}"
                )
                return self._format_res(reply, "ERROR", lang, None, ["Find a Service"], context)

        # =========================================================================
        # 4. TRACKING ACTIVE BOOKING ("Where is my worker?", "Booking status")
        # =========================================================================
        if any(w in msg_lower for w in ["where is my worker", "status", "track", "worker kahan hai", "कहाँ है", "ट्रैक", "स्थिति", "मेरा कामगार"]):
            intent = "TRACK_BOOKING"
            active_booking = await tool_get_active_booking(db, user)
            if not active_booking:
                reply = (
                    "आपके पास वर्तमान में कोई सक्रिय बुकिंग नहीं है। क्या आप कोई नई सेवा बुक करना चाहते हैं?"
                    if is_hi else
                    "You currently have no active bookings in progress. Would you like to book a service today?"
                )
                suggested_actions = ["Find a Service", "Find a Worker", "My Bookings"]
                return self._format_res(reply, intent, lang, None, suggested_actions, context)

            if is_hi:
                reply = (
                    f"📍 **बुकिंग #{active_booking['id']}**\n"
                    f"• सेवा: {active_booking['service']}\n"
                    f"• कामगार: {active_booking['worker']}\n"
                    f"• स्थिति: **{active_booking['status']}**\n"
                    f"• दूरी: {active_booking['distanceKm']} किमी\n"
                    f"• अनुमानित आगमन: {active_booking['etaMinutes']} मिनट"
                )
            else:
                reply = (
                    f"📍 **Booking #{active_booking['id']}**\n"
                    f"• Service: {active_booking['service']}\n"
                    f"• Worker: {active_booking['worker']}\n"
                    f"• Status: **{active_booking['status']}**\n"
                    f"• Distance: {active_booking['distanceKm']} km\n"
                    f"• Estimated Arrival: {active_booking['etaMinutes']} min"
                )
            action = {"action_type": "booking_status", "data": active_booking}
            suggested_actions = ["Track on Map", "My Bookings", "Payment Help"]
            return self._format_res(reply, intent, lang, action, suggested_actions, context)

        # Customer Bookings History
        if any(w in msg_lower for w in ["my bookings", "meri bookings", "मेरी बुकिंग", "पिछली"]):
            intent = "MY_BOOKINGS"
            cust_bookings = await tool_get_customer_bookings(db, user)
            if not cust_bookings:
                reply = "आपकी कोई पिछली बुकिंग नहीं मिली।" if is_hi else "No previous bookings found."
            else:
                lines = [f"• #{b['id']}: {b['service']} ({b['status']}) - ₹{b['amount']}" for b in cust_bookings[:3]]
                reply = (
                    f"📋 **आपकी हालिया बुकिंग**:\n" + "\n".join(lines)
                    if is_hi else
                    f"📋 **Your Recent Bookings**:\n" + "\n".join(lines)
                )
            suggested_actions = ["Track Booking", "Find a Service"]
            return self._format_res(reply, intent, lang, None, suggested_actions, context)

        # =========================================================================
        # 5. EMERGENCY SERVICES DETECTION
        # =========================================================================
        emergency_detected = is_emergency_request(msg_clean)
        extracted_svc = classify_service(msg_clean) or context.get("selected_service") or "Electrical"

        if emergency_detected:
            intent = "EMERGENCY_SERVICE"
            context["is_emergency"] = True
            context["selected_service"] = extracted_svc

            # Run matching engine for closest available verified worker
            matches = await tool_find_best_worker(db, extracted_svc, lat, lng, radius_km=15.0)
            best_worker = matches.get("bestWorker")

            if best_worker:
                context["matched_worker_id"] = best_worker["id"]
                context["eta_minutes"] = best_worker["etaMinutes"]

                if is_hi:
                    reply = (
                        f"🚨 **आपातकालीन सेवा अनुरोध (उच्च प्राथमिकता)**\n"
                        f"⚠️ कृपया ध्यान दें: यदि आग, गैस रिसाव या जान का सीधा खतरा है, तो कृपया तुरंत स्थानीय आपातकालीन नंबर (112/101) पर कॉल करें।\n\n"
                        f"हमने आपकी सहायता के लिए निकटतम उपलब्ध सत्यापित पेशेवर को खोज लिया है:\n"
                        f"**{best_worker['name']}** ({extracted_svc})\n"
                        f"⭐ {best_worker['rating']} | 📍 {best_worker['distanceKm']} किमी | ⏱️ आगमन: {best_worker['etaMinutes']} मिनट\n\n"
                        f"क्या आप तुरंत **{best_worker['name']}** को बुक करना चाहते हैं?"
                    )
                else:
                    reply = (
                        f"🚨 **High-Priority Emergency Service Request**\n"
                        f"⚠️ Safety Note: If there is an immediate risk to life, fire, gas leak, or severe electrical hazard, please contact emergency municipal services (112/101) immediately.\n\n"
                        f"We located the closest verified cooperative specialist for rapid dispatch:\n"
                        f"**{best_worker['name']}** ({extracted_svc})\n"
                        f"⭐ {best_worker['rating']} | 📍 {best_worker['distanceKm']} km | ⏱️ ETA: {best_worker['etaMinutes']} mins\n\n"
                        f"Would you like to book **{best_worker['name']}** immediately?"
                    )

                action = {
                    "action_type": "emergency_alert",
                    "data": {
                        "priority": "HIGH PRIORITY",
                        "service": extracted_svc,
                        "worker": best_worker,
                        "explanation": matches.get("explanation", "Closest available emergency responder")
                    }
                }
                suggested_actions = [f"Book {best_worker['name']}", "Track Booking", "Cancel"]
                return self._format_res(reply, intent, lang, action, suggested_actions, context)
            else:
                if is_hi:
                    reply = (
                        "🚨 **आपातकालीन सेवा अनुरोध (उच्च प्राथमिकता)**\n"
                        "⚠️ यदि आग, गैस या बिजली का गंभीर खतरा है, तो कृपया तुरंत आपातकालीन नंबर (112) पर संपर्क करें।\n"
                        f"वर्तमान में 15 किमी के दायरे में कोई {extracted_svc} विशेषज्ञ तुरंत उपलब्ध नहीं है। हमारी टीम समन्वय कर रही है।"
                    )
                else:
                    reply = (
                        "🚨 **High-Priority Emergency Service Request**\n"
                        "⚠️ Safety Note: If there is immediate danger to life, fire, or severe electrical hazard, please call emergency services (112) right away.\n"
                        f"No {extracted_svc} specialists are immediately available in your direct radius. Dispatch is searching for an on-call responder."
                    )
                action = {
                    "action_type": "emergency_alert",
                    "data": {
                        "priority": "HIGH PRIORITY",
                        "service": extracted_svc,
                        "explanation": "High priority emergency dispatch"
                    }
                }
                return self._format_res(reply, intent, lang, action, ["Track Booking", "Cancel"], context)

        # =========================================================================
        # 6. SERVICE RECOMMENDATION & WORKER MATCHING
        # =========================================================================
        detected_service = classify_service(msg_clean)
        if detected_service or any(w in msg_lower for w in ["find a worker", "find a service", "need a", "चाहिए", "प्लंबर", "इलेक्ट्रीशियन", "सफाई"]):
            service_name = detected_service or context.get("selected_service") or "Plumbing"
            context["selected_service"] = service_name
            intent = "MATCH_WORKER"

            # Execute real matching engine
            matches = await tool_find_best_worker(db, service_name, lat, lng, radius_km=15.0)
            best_worker = matches.get("bestWorker")

            if best_worker:
                context["matched_worker_id"] = best_worker["id"]
                context["eta_minutes"] = best_worker["etaMinutes"]

                if is_hi:
                    reply = (
                        f"मैंने आपके पास **{matches.get('totalFound', 1)}** उपलब्ध सत्यापित {service_name} कामगार ढूंढे हैं।\n"
                        f"सबसे उपयुक्त कामगार: **{best_worker['name']}** ({best_worker['distanceKm']} किमी दूर, आगमन: {best_worker['etaMinutes']} मिनट)।\n"
                        f"दर: ₹{best_worker['hourlyRate']}/घंटा | रेटिंग: ⭐ {best_worker['rating']}\n\n"
                        f"क्या आप **{best_worker['name']}** को बुक करना चाहते हैं?"
                    )
                else:
                    reply = (
                        f"I found **{matches.get('totalFound', 1)}** verified {service_name} specialists near you.\n"
                        f"The best match is **{best_worker['name']}**, located **{best_worker['distanceKm']} km** away (ETA: {best_worker['etaMinutes']} mins).\n"
                        f"Rate: ₹{best_worker['hourlyRate']}/hr | Rating: ⭐ {best_worker['rating']}\n\n"
                        f"Would you like to book **{best_worker['name']}**?"
                    )

                action = {
                    "action_type": "worker_recommendation",
                    "data": {
                        "service": service_name,
                        "bestWorker": best_worker,
                        "rankedWorkers": matches.get("rankedWorkers", [])[:3],
                        "explanation": matches.get("explanation")
                    }
                }
                suggested_actions = [f"Book {best_worker['name']}", "Find an Electrician", "Track Booking"]
                return self._format_res(reply, intent, lang, action, suggested_actions, context)
            else:
                reply = (
                    f"क्षमा करें, वर्तमान में {service_name} के लिए कोई कार्यकर्ता उपलब्ध नहीं है। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
                    if is_hi else
                    f"Currently, there are no active {service_name} specialists available in your direct radius. Please check back shortly."
                )
                suggested_actions = ["Find an Electrician", "Track Booking", "Payment Help"]
                return self._format_res(reply, intent, lang, None, suggested_actions, context)

        # =========================================================================
        # 7. FAQ AND KNOWLEDGE BASE QUERIES
        # =========================================================================
        faq_matches = {
            "book": ["how do i book", "booking", "बुक कैसे करें", "बुकिंग"],
            "verification": ["verified", "verification", "सत्यापन", "सत्यापित"],
            "matching": ["matching", "how matching works", "कामगार कैसे चुनते हैं", "मैचिंग"],
            "cancellation": ["cancel", "रद्द", "रद्द कैसे करें"],
            "payment": ["pay", "payment", "fee", "भुगतान", "पैसे", "फीस", "75%"],
            "invoice": ["invoice", "रसीद", "बिल", "चालान"],
            "ratings": ["rating", "रेटिंग", "समीक्षा"],
            "about": ["what is coopserve", "about", "co-opserve क्या है"],
            "languages": ["language", "hindi", "english", "भाषाएं", "हिंदी"]
        }
        for topic, triggers in faq_matches.items():
            if any(trig in msg_lower for trig in triggers):
                intent = "FAQ_QUERY"
                reply = tool_get_faq_answer(topic, language=lang)
                suggested_actions = ["Find a Service", "Track Booking", "Emergency Service"]
                return self._format_res(reply, intent, lang, None, suggested_actions, context)

        # =========================================================================
        # 8. DEFAULT GREETING / FALLBACK
        # =========================================================================
        intent = "GREETING"
        if is_hi:
            reply = (
                "नमस्ते! मैं Co-opServe सेवा सहायक हूँ। मैं आपकी कैसे मदद कर सकता हूँ?\n"
                "• सेवा या कामगार खोजें (जैसे 'मुझे प्लंबर चाहिए')\n"
                "• अपनी बुकिंग ट्रैक करें ('मेरी बुकिंग कहाँ है?')\n"
                "• आपातकालीन सेवा ('बिजली में शॉर्ट सर्किट')\n"
                "• सहकारी नीतियों या भुगतान के बारे में पूछें।"
            )
        else:
            reply = (
                "Hello! I am your Co-opServe Service Assistant. How may I help you today?\n"
                "• Discover or book services (e.g., 'I need a plumber')\n"
                "• Track active bookings ('Where is my worker?')\n"
                "• Request urgent help ('There is an electrical short circuit')\n"
                "• Learn about cooperative transparent payments & verification."
            )

        suggested_actions = ["Find a Service", "Find a Worker", "Track Booking", "Emergency Service"]
        return self._format_res(reply, intent, lang, None, suggested_actions, context)

    def _format_res(
        self,
        reply: str,
        intent: str,
        language: str,
        action: Optional[Dict[str, Any]],
        suggested_actions: List[str],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        return {
            "reply": reply,
            "intent": intent,
            "language": language,
            "action": action,
            "suggested_actions": suggested_actions,
            "updated_context": context
        }
