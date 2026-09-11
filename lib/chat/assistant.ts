import { ChatMessage, ChatActionPayload, SendMessageOptions, ChatHistoryResponse } from '@/lib/api/chat'
import { initialWorkers, initialBookings, initialCoopStats, initialForecast, categories } from '@/lib/mock-data'
import { Worker, RankedWorker } from '@/lib/types'
import { calculateHaversineDistance, estimateEtaMinutes, DEFAULT_CUSTOMER_LOCATION } from '@/lib/geo'

const CHAT_HISTORY_STORAGE_KEY = 'coopserve_chat_history'

// Service keywords map supporting English, Hindi, and Hinglish
export const SERVICE_KEYWORDS: Record<string, string[]> = {
  Plumber: [
    'plumb', 'pipe', 'leak', 'tap', 'faucet', 'drain', 'water', 'sink', 'flush', 'sewer', 'tank', 'clog',
    'नल', 'पाइप', 'प्लंबर', 'लीक', 'टपक', 'पानी', 'सिंक', 'नाली', 'टैंक'
  ],
  Electrician: [
    'electr', 'wire', 'switch', 'short circuit', 'spark', 'current', 'fuse', 'mcb', 'light', 'fan', 'shock', 'power', 'bulb', 'plug',
    'बिजली', 'तार', 'शॉर्ट सर्किट', 'इलेक्ट्रीशियन', 'करंट', 'स्पार्क', 'पंखा', 'लाइट', 'फ्यूज', 'स्विच'
  ],
  'Home cleaning': [
    'clean', 'sweep', 'mop', 'dust', 'maid', 'housekeeping', 'deep clean', 'bathroom clean', 'kitchen clean',
    'सफाई', 'क्लीनर', 'झाड़ू', 'पोंछा', 'धुलाई', 'सफाईकर्मी'
  ],
  Carpenter: [
    'carpent', 'wood', 'door', 'furniture', 'table', 'chair', 'hinge', 'lock', 'cabinet', 'shelf', 'cupboard',
    'बढ़ई', 'लकड़ी', 'दरवाजा', 'फर्नीचर', 'कारपेंटर', 'मेज', 'कुर्सी', 'अलमारी'
  ],
  'Appliance repair': [
    'ac', 'air condition', 'fridge', 'refrigerator', 'washing machine', 'microwave', 'heater', 'geyser', 'cooler', 'oven',
    'एसी', 'फ्रिज', 'गीजर', 'कूलर', 'वाशिंग मशीन', 'ओवन'
  ],
  Painter: [
    'paint', 'whitewash', 'color', 'wall', 'putty', 'ceiling', 'primer',
    'पेंट', 'पुट्टी', 'रंगाई', 'पुताई', 'दीवार'
  ],
  'Pest control': [
    'pest', 'termite', 'cockroach', 'bug', 'ant', 'rodent', 'rat', 'mosquito',
    'कीड़े', 'दीमक', 'कॉकरोच', 'चूहा', 'मच्छर'
  ],
  Locksmith: [
    'lock', 'key', 'padlock', 'deadbolt', 'lost key', 'duplicate key',
    'ताला', 'चाबी', 'लॉक'
  ],
  Gardener: [
    'garden', 'lawn', 'plant', 'grass', 'tree', 'trim', 'soil',
    'माली', 'पौधे', 'बगीचा', 'घास'
  ],
  'Water purifier service': [
    'ro', 'purifier', 'filter', 'water filter', 'aquaguard', 'membrane',
    'वाटर प्यूरीफायर', 'फिल्टर', 'पानी का फिल्टर'
  ]
}

export const EMERGENCY_KEYWORDS = [
  'emergency', 'urgent', 'immediately', 'right now', 'short circuit', 'spark', 'fire', 'shock', 'current',
  'pipe burst', 'flooding', 'water leaking badly', 'danger', 'hazard', 'gas leak',
  'आपातकालीन', 'तुरंत', 'शॉर्ट सर्किट', 'आग', 'पानी भर गया', 'खतरा', 'बिजली का करंट', 'जल्दी'
]

export function detectIsHindi(text: string): boolean {
  if (/[\u0900-\u097F]/.test(text)) return true
  const hinglishWords = [
    'chahiye', 'kahan', 'hai', 'karo', 'mera', 'meri', 'mere', 'ghar', 'paani',
    'kaise', 'kitna', 'madad', 'bhai', 'namaste', 'batao', 'dikhao', 'karein'
  ]
  const lower = text.toLowerCase()
  return hinglishWords.some((w) => lower.includes(w))
}

export function detectService(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return service
    }
  }
  return null
}

export function detectEmergency(text: string): boolean {
  const lower = text.toLowerCase()
  return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw))
}

export function getStoredHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChatMessage[]
  } catch {
    return []
  }
}

export function saveStoredHistory(messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(messages))
  } catch {}
}

export function clearStoredHistory(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY)
  } catch {}
}

/**
 * Intelligent client-side assistant engine for bilingual responses,
 * worker recommendations, emergency dispatch, and tracking.
 */
export async function generateClientChatResponse(
  userText: string,
  options: SendMessageOptions = {}
): Promise<ChatMessage> {
  const isHindi = options.language === 'hi' || detectIsHindi(userText)
  const isEmergency = detectEmergency(userText)
  const matchedService = detectService(userText)
  const lower = userText.toLowerCase()
  const userLat = options.latitude || DEFAULT_CUSTOMER_LOCATION.lat
  const userLng = options.longitude || DEFAULT_CUSTOMER_LOCATION.lng

  // 1. EMERGENCY FLOW
  if (isEmergency) {
    const serviceName = matchedService || 'Plumber'
    const suitableWorkers = initialWorkers.filter(
      (w) =>
        (w.service.toLowerCase().includes(serviceName.toLowerCase()) ||
          w.primarySkill.toLowerCase().includes(serviceName.toLowerCase())) &&
        (w.availability === 'Available' || w.currentStatus === 'Available')
    )

    const chosenWorker = suitableWorkers[0] || initialWorkers[0]
    const distanceKm = calculateHaversineDistance(userLat, userLng, chosenWorker.lat, chosenWorker.lng)
    const eta = Math.max(8, estimateEtaMinutes(distanceKm))

    const message = isHindi
      ? `🚨 आपातकालीन अनुरोध पहचाना गया! हमने आपके निकटतम उपलब्ध ${serviceName} को प्राथमिकता दी है। कृपया मुख्य पानी/बिजली आपूर्ति तुरंत बंद करें यदि खतरा हो।`
      : `🚨 Emergency request detected! We have prioritized the nearest available verified ${serviceName}. Please turn off the main water valve / MCB power switch if safe to do so.`

    const action: ChatActionPayload = {
      action_type: 'emergency_alert',
      data: {
        worker_id: chosenWorker.id,
        worker_name: chosenWorker.name,
        service: serviceName,
        eta_minutes: eta,
        distance_km: distanceKm.toFixed(1),
        rate: chosenWorker.price,
        phone: chosenWorker.phone,
      },
    }

    return {
      sender: 'assistant',
      message,
      action,
      suggested_actions: isHindi
        ? [`तुरंत बुक करें (${chosenWorker.name})`, 'कॉल करें', 'सुरक्षा निर्देश']
        : [`Dispatch ${chosenWorker.name} (₹${chosenWorker.price})`, 'Call Worker', 'Safety Checklist'],
      timestamp: new Date().toISOString(),
    }
  }

  // 2. BOOKING TRACKING / STATUS FLOW
  if (
    lower.includes('track') ||
    lower.includes('status') ||
    lower.includes('booking') ||
    lower.includes('kahan hai') ||
    lower.includes('ट्रैक') ||
    lower.includes('स्थिति')
  ) {
    const activeBooking = initialBookings[0]
    const message = isHindi
      ? `आपकी हालिया बुकिंग #${activeBooking.id} (${activeBooking.service}) की स्थिति '${activeBooking.status}' है। आपके सेवा कर्मी ${activeBooking.worker} रास्ते में हैं (अनुमानित समय ~${activeBooking.etaMinutes || 12} मिनट)।`
      : `Your active booking #${activeBooking.id} for ${activeBooking.service} is currently marked as '${activeBooking.status}'. Worker ${activeBooking.worker} has an estimated arrival time of ~${activeBooking.etaMinutes || 12} minutes.`

    const action: ChatActionPayload = {
      action_type: 'booking_status',
      data: {
        booking_id: activeBooking.id,
        service: activeBooking.service,
        worker_name: activeBooking.worker,
        status: activeBooking.status,
        eta_minutes: activeBooking.etaMinutes || 12,
        address: activeBooking.address,
      },
    }

    return {
      sender: 'assistant',
      message,
      action,
      suggested_actions: isHindi
        ? ['लाइव मैप पर देखें', 'समीक्षा लिखें', 'सहायता संपर्क']
        : ['View on Live Map', 'Contact Worker', 'Support Help'],
      timestamp: new Date().toISOString(),
    }
  }

  // 3. WORKER RECOMMENDATION / FIND A SERVICE FLOW
  if (matchedService || lower.includes('find') || lower.includes('chahiye') || lower.includes('plumber') || lower.includes('electrician') || lower.includes('खोजें') || lower.includes('काम')) {
    const serviceName = matchedService || 'Plumber'
    const serviceWorkers = initialWorkers.filter(
      (w) =>
        w.service.toLowerCase().includes(serviceName.toLowerCase()) ||
        w.primarySkill.toLowerCase().includes(serviceName.toLowerCase()) ||
        (w.secondarySkills && w.secondarySkills.some((s) => s.toLowerCase().includes(serviceName.toLowerCase())))
    )

    const sorted = serviceWorkers
      .map((w) => ({
        ...w,
        dist: calculateHaversineDistance(userLat, userLng, w.lat, w.lng),
      }))
      .sort((a, b) => {
        // Available workers first, then distance
        if (a.availability === 'Available' && b.availability !== 'Available') return -1
        if (b.availability === 'Available' && a.availability !== 'Available') return 1
        return a.dist - b.dist
      })

    const topWorker = sorted[0] || initialWorkers[0]
    const distanceKm = topWorker.dist ? topWorker.dist.toFixed(1) : '1.2'
    const eta = estimateEtaMinutes(parseFloat(distanceKm))

    const message = isHindi
      ? `मुझे आपके क्षेत्र के लिए शीर्ष मूल्यांकित ${serviceName} मिले हैं। ${topWorker.name} (${topWorker.rating}★, ${topWorker.completedJobs} कार्य पूर्ण) केवल ${distanceKm} किमी दूर उपलब्ध हैं। सहकारी निर्धारित दर ₹${topWorker.price} है।`
      : `I found verified top-rated cooperative ${serviceName}s near your location. ${topWorker.name} (${topWorker.rating}★, ${topWorker.completedJobs} jobs) is available just ${distanceKm} km away at ₹${topWorker.price}/hr (no middleman surge pricing).`

    const action: ChatActionPayload = {
      action_type: 'worker_recommendation',
      data: {
        worker: {
          id: topWorker.id,
          name: topWorker.name,
          service: topWorker.service,
          primarySkill: topWorker.primarySkill,
          secondarySkills: topWorker.secondarySkills,
          rating: topWorker.rating,
          reviews: topWorker.reviews,
          completedJobs: topWorker.completedJobs,
          availability: topWorker.availability,
          price: topWorker.price,
          distance: parseFloat(distanceKm),
          etaMinutes: eta,
          cooperative: topWorker.cooperative,
          verified: topWorker.verified,
        },
        explanation: isHindi
          ? `${topWorker.name} प्रमाणित सहकारी सदस्य हैं और निकटतम दूरी पर उपलब्ध हैं।`
          : `${topWorker.name} is a verified cooperative artisan with highest customer satisfaction in your zone.`,
        suggested_service: serviceName,
      },
    }

    return {
      sender: 'assistant',
      message,
      action,
      suggested_actions: isHindi
        ? [`${topWorker.name} को बुक करें`, 'अन्य कामगार देखें', 'दर सूची']
        : [`Book ${topWorker.name} (₹${topWorker.price})`, 'Compare All Workers', 'Price Breakdown'],
      timestamp: new Date().toISOString(),
    }
  }

  // 4. WORKER ROLE SPECIFIC QUERIES
  if (
    lower.includes('earning') ||
    lower.includes('kamai') ||
    lower.includes('pending job') ||
    lower.includes('कमाई')
  ) {
    const message = isHindi
      ? `इस सप्ताह आपकी कुल कमाई ₹18,450 है (12 पूर्ण कार्य, 4.9★ रेटिंग)। अगला सहकारी लाभांश वितरण 1 तारीख को निर्धारित है।`
      : `Your total verified earnings this week are ₹18,450 across 12 completed assignments with an average 4.9★ rating. Next cooperative dividend distribution is on the 1st.`

    return {
      sender: 'assistant',
      message,
      suggested_actions: isHindi
        ? ['कल्याण लाभ देखें', 'उपलब्धता बदलें', 'पेआउट विवरण']
        : ['View Welfare Fund', 'Toggle Availability', 'Payout Statement'],
      timestamp: new Date().toISOString(),
    }
  }

  // 5. ADMIN ROLE SPECIFIC QUERIES
  if (lower.includes('demand') || lower.includes('analytics') || lower.includes('forecast') || lower.includes('मांग')) {
    const message = isHindi
      ? `सहकारी पूर्वानुमान विश्लेषण: सेंट्रल जोन और कोरमंगला में वर्षा के कारण प्लंबिंग और इलेक्ट्रिकल सेवाओं की मांग में 35% की वृद्धि देखी गई है। कुल 28 में से 22 कामगार वर्तमान में सक्रिय हैं।`
      : `Cooperative Demand Analytics: Central Zone and Koramangala are experiencing a 35% surge in Plumbing and Electrical requests due to seasonal weather. 22 out of 28 verified artisans are currently active.`

    return {
      sender: 'assistant',
      message,
      suggested_actions: isHindi
        ? ['मांग पूर्वानुमान चार्ट', 'सत्यापन कतार', 'कामगार आवंटन']
        : ['Demand Forecast Chart', 'Verification Queue', 'Workforce Allocation'],
      timestamp: new Date().toISOString(),
    }
  }

  // 6. COOPERATIVE FAQ / PLATFORM ETHICS
  if (
    lower.includes('coop') ||
    lower.includes('cooperative') ||
    lower.includes('price') ||
    lower.includes('fair') ||
    lower.includes('सहकारी') ||
    lower.includes('कीमत')
  ) {
    const message = isHindi
      ? `Co-opServe कामगारों के स्वामित्व वाला मंच है। पारंपरिक ऐप्स के विपरीत जो 25-35% कमीशन काटते हैं, यहाँ 75-80% सीधे कामगार को जाता है, 15% उनके स्वास्थ्य व पेंशन फंड में, और 5-10% संचालन में। कोई बिचौलिया मुनाफाखोरी नहीं है।`
      : `Co-opServe is a worker-owned cooperative marketplace. Unlike gig apps that take 25–35% commissions, here 75–80% goes directly to the worker, 15% is pooled into their healthcare and pension welfare fund, and 5–10% sustains operations. Zero extractive venture fees.`

    return {
      sender: 'assistant',
      message,
      suggested_actions: isHindi
        ? ['सेवाएं देखें', 'कामगार खोजें', 'पारदर्शिता रिपोर्ट']
        : ['Browse Services', 'Find Nearby Workers', 'Transparency Model'],
      timestamp: new Date().toISOString(),
    }
  }

  // 7. DEFAULT HELPFUL FALLBACK
  const defaultReply = isHindi
    ? `नमस्ते! मैं Co-opServe AI सहायक हूँ। मैं आपको विश्वसनीय प्लंबर, इलेक्ट्रीशियन, बढ़ई या क्लीनर खोजने, लाइव बुकिंग ट्रैक करने, या सहकारी सेवाओं की जानकारी देने में मदद कर सकता हूँ। आप क्या सेवा चाहते हैं?`
    : `Hello! I am your Co-opServe AI Assistant. I can help you find verified local artisans (Plumbers, Electricians, Carpenters, Cleaners), track live arrivals, or provide transparent cooperative rates. How can I help you today?`

  return {
    sender: 'assistant',
    message: defaultReply,
    suggested_actions: isHindi
      ? ['प्लंबर खोजें', 'इलेक्ट्रीशियन खोजें', 'बुकिंग ट्रैक करें', 'सहकारी मॉडल']
      : ['Find a Plumber', 'Find an Electrician', 'Track Active Booking', 'Cooperative Model'],
    timestamp: new Date().toISOString(),
  }
}
