import { Worker, RankedWorker, SmartMatchResult } from './types'
import { calculateHaversineDistance, estimateEtaMinutes } from './geo'

/**
 * Smart matching engine for Co-opServe:
 * Evaluates gig workers using strict priority hierarchy:
 * 1. Skill Match
 * 2. Availability (Must be 'Available' — Busy/On Job/Offline/On Leave are never picked as best worker)
 * 3. Verified Status (Must be verified)
 * 4. Distance (Haversine km)
 * 5. Workload (Tie-breaker for workers within 0.3 km, balances co-op opportunities)
 * 6. Rating (Secondary tie-breaker)
 */
export function findSmartMatches(
  workers: Worker[],
  customerLat: number,
  customerLng: number,
  requestedService: string,
  lang: 'en' | 'hi' = 'en'
): SmartMatchResult {
  // Step 1: Calculate distance and metadata for all workers
  const evaluated: RankedWorker[] = workers.map((worker) => {
    const distanceKm = calculateHaversineDistance(
      customerLat,
      customerLng,
      worker.lat,
      worker.lng
    )
    const etaMinutes = estimateEtaMinutes(distanceKm)

    const skillMatches =
      worker.service.toLowerCase().trim() === requestedService.toLowerCase().trim() ||
      (worker.primarySkill && worker.primarySkill.toLowerCase().trim() === requestedService.toLowerCase().trim()) ||
      (worker.secondarySkills && worker.secondarySkills.some(s => s.toLowerCase().includes(requestedService.toLowerCase())))

    const isVerified = worker.verified !== false && worker.verificationStatus !== 'Rejected' && worker.verificationStatus !== 'Pending'
    const status = worker.currentStatus || worker.availability
    const isAvailable = status === 'Available'

    let isEligible = false
    let disqualificationReason: string | undefined

    if (!skillMatches) {
      disqualificationReason =
        lang === 'hi'
          ? `कौशल (${worker.service}) अनुरोधित सेवा (${requestedService}) से मेल नहीं खाता`
          : `Service skill (${worker.service}) does not match requested (${requestedService})`
    } else if (!isVerified) {
      disqualificationReason =
        lang === 'hi'
          ? 'सहकारी संस्था द्वारा सत्यापन लंबित है'
          : 'Worker is pending verification by the cooperative'
    } else if (status === 'Busy') {
      disqualificationReason =
        lang === 'hi'
          ? 'सेवा कर्मी वर्तमान में अन्य कार्य में व्यस्त है'
          : 'Worker is currently busy on an active assignment'
    } else if (status === 'On Job') {
      disqualificationReason =
        lang === 'hi'
          ? 'सेवा कर्मी वर्तमान में किसी कार्य पर है'
          : 'Worker is currently on an active job'
    } else if (status === 'On Leave') {
      disqualificationReason =
        lang === 'hi'
          ? 'सेवा कर्मी निर्धारित अवकाश पर है'
          : 'Worker is currently on scheduled leave'
    } else if (status === 'Offline') {
      disqualificationReason =
        lang === 'hi'
          ? 'सेवा कर्मी वर्तमान में ऑफ़लाइन है'
          : 'Worker is currently offline'
    } else {
      isEligible = true
    }

    // Co-op Fair Match Score (0 to 99)
    // Starts high, penalized by distance and active workload, rewarded by rating
    const rawScore = 96 - distanceKm * 3.5 - (worker.workload || 1) * 2.5 + worker.rating * 2
    const matchScore = Math.max(55, Math.min(99, Math.round(rawScore)))

    return {
      ...worker,
      distance: distanceKm,
      distanceKm,
      etaMinutes,
      matchScore,
      isEligible,
      disqualificationReason,
    }
  })

  // Filter to service match first (so user can inspect all workers for this service)
  const serviceWorkers = evaluated.filter((w) => {
    return (
      w.service.toLowerCase().trim() === requestedService.toLowerCase().trim() ||
      (w.primarySkill && w.primarySkill.toLowerCase().trim() === requestedService.toLowerCase().trim()) ||
      (w.secondarySkills && w.secondarySkills.some(s => s.toLowerCase().includes(requestedService.toLowerCase())))
    )
  })

  // Separate eligible (available + verified) from non-eligible
  const eligible = serviceWorkers.filter((w) => w.isEligible)
  const ineligible = serviceWorkers.filter((w) => !w.isEligible)

  // Step 2: Rank eligible workers by Priority: Distance -> Workload -> Rating
  eligible.sort((a, b) => {
    const distDiff = a.distanceKm - b.distanceKm

    // If within 300 meters, apply fair work distribution (lower workload first)
    if (Math.abs(distDiff) < 0.3) {
      const aWorkload = a.workload || 1
      const bWorkload = b.workload || 1
      if (aWorkload !== bWorkload) {
        return aWorkload - bWorkload
      }
      return b.rating - a.rating
    }

    return distDiff
  })

  // Ineligible workers sorted by distance for visibility
  ineligible.sort((a, b) => a.distanceKm - b.distanceKm)

  const bestWorker = eligible.length > 0 ? eligible[0] : null

  // Generate clear matching explanation
  let explanation = ''
  if (bestWorker) {
    const closerBusy = ineligible.find(
      (w) => (w.availability === 'Busy' || w.currentStatus === 'Busy' || w.currentStatus === 'On Job') && w.distanceKm < bestWorker.distanceKm
    )
    if (closerBusy) {
      if (lang === 'hi') {
        explanation = `सर्वश्रेष्ठ मिलान: ${bestWorker.name} (${bestWorker.distanceKm.toFixed(
          1
        )} किमी दूर, उपलब्ध)। ${closerBusy.name} अधिक नजदीक (${closerBusy.distanceKm.toFixed(
          1
        )} किमी) थे लेकिन वर्तमान में व्यस्त हैं।`
      } else {
        explanation = `Matched ${bestWorker.name} (${bestWorker.distanceKm.toFixed(
          1
        )} km away, Available). ${closerBusy.name} was closer (${closerBusy.distanceKm.toFixed(
          1
        )} km) but is currently busy.`
      }
    } else {
      if (lang === 'hi') {
        explanation = `सर्वश्रेष्ठ उपलब्ध सत्यापित ${requestedService}: ${bestWorker.name} (${bestWorker.distanceKm.toFixed(
          1
        )} किमी दूर, अनुमानित आगमन ~${bestWorker.etaMinutes} मिनट)।`
      } else {
        explanation = `Matched ${bestWorker.name} as the nearest available verified ${requestedService} (${bestWorker.distanceKm.toFixed(
          1
        )} km away, ETA ~${bestWorker.etaMinutes} mins).`
      }
    }
  } else if (ineligible.length > 0) {
    if (lang === 'hi') {
      explanation = `${requestedService} कौशल वाले ${ineligible.length} कर्मी मिले, परंतु कोई भी वर्तमान में उपलब्ध नहीं है।`
    } else {
      explanation = `Found ${ineligible.length} worker(s) with ${requestedService} skills, but none are currently available.`
    }
  } else {
    if (lang === 'hi') {
      explanation = `"${requestedService}" कौशल वाले कोई सेवा कर्मी उपलब्ध नहीं हैं।`
    } else {
      explanation = `No workers found matching the skill "${requestedService}".`
    }
  }

  return {
    bestWorker,
    rankedWorkers: [...eligible, ...ineligible],
    totalFound: eligible.length,
    explanation,
  }
}

export interface ProblemAllocationAnalysis {
  matchScore: number
  matchedSkills: string[]
  estimatedDuration: string
  fairPriceEstimate: number
  urgencyLevel: 'Standard' | 'Urgent' | 'Emergency'
  explanation: string
  betterAlternativeWorker?: Worker | null
  betterAlternativeReason?: string
}

export function analyzeProblemAllocation(
  worker: Worker,
  problemText: string,
  urgency: 'Standard' | 'Urgent' | 'Emergency' = 'Standard',
  allWorkers: Worker[] = [],
  customerLoc = { lat: 12.9716, lng: 77.5946 },
  lang: 'en' | 'hi' = 'en'
): ProblemAllocationAnalysis {
  const text = (problemText || '').toLowerCase().trim()
  const matchedSkills: string[] = []

  // Check worker skills against problem description
  const allWorkerSkills = [
    worker.service,
    worker.primarySkill,
    ...(worker.secondarySkills || []),
    ...(worker.certifications || []),
  ].filter(Boolean)

  allWorkerSkills.forEach((skill) => {
    const skillWords = skill.toLowerCase().split(/\s+/)
    if (skillWords.some((word) => word.length > 3 && text.includes(word))) {
      if (!matchedSkills.includes(skill)) matchedSkills.push(skill)
    }
  })

  // Calculate match score
  let score = 88 // baseline qualified cooperative member
  if (matchedSkills.length > 0) score += Math.min(8, matchedSkills.length * 4)
  if (worker.rating >= 4.8) score += 2
  if (worker.completedJobs > 100) score += 1
  if (urgency === 'Emergency' && (worker.availability === 'Available' || worker.currentStatus === 'Available')) score += 1
  score = Math.min(99, score)

  // Estimate duration and fair price
  let estimatedDuration = '45–60 mins'
  let priceMultiplier = 1.0

  if (text.includes('deep') || text.includes('full') || text.includes('install') || text.includes('rewir')) {
    estimatedDuration = '1.5–2.5 hrs'
    priceMultiplier = 1.4
  } else if (text.includes('small') || text.includes('tap') || text.includes('switch') || text.includes('bulb')) {
    estimatedDuration = '30–45 mins'
    priceMultiplier = 0.9
  }

  if (urgency === 'Emergency') {
    estimatedDuration = `Immediate (~12m arrival) + ${estimatedDuration}`
  }

  const fairPriceEstimate = Math.round(worker.price * priceMultiplier)

  // Check for specialized alternative worker
  let betterAlternativeWorker: Worker | null = null
  let betterAlternativeReason: string | undefined

  if (text.length > 5 && allWorkers.length > 0) {
    const currentWorkerDist = calculateHaversineDistance(customerLoc.lat, customerLoc.lng, worker.lat, worker.lng)

    const candidates = allWorkers.filter(
      (w) =>
        w.id !== worker.id &&
        (w.availability === 'Available' || w.currentStatus === 'Available') &&
        w.service.toLowerCase() === worker.service.toLowerCase()
    )

    for (const alt of candidates) {
      const altDist = calculateHaversineDistance(customerLoc.lat, customerLoc.lng, alt.lat, alt.lng)
      const altSpecificMatch = (alt.secondarySkills || []).some((s) => text.includes(s.toLowerCase()))

      if (altSpecificMatch && altDist < currentWorkerDist) {
        betterAlternativeWorker = alt
        betterAlternativeReason =
          lang === 'hi'
            ? `${alt.name} आपके और निकट (${altDist.toFixed(1)} किमी) हैं और इस विशिष्ट समस्या में विशेषज्ञता रखते हैं।`
            : `${alt.name} is closer (${altDist.toFixed(1)} km) and specifically specializes in this issue.`
        break
      }
    }
  }

  const skillSummary = matchedSkills.length > 0 ? matchedSkills.join(', ') : worker.primarySkill
  const explanation =
    lang === 'hi'
      ? `एआई विश्लेषण: ${worker.name} के पास ${skillSummary} में सिद्ध अनुभव है (${score}% मैच)।`
      : `AI Allocation: ${worker.name} holds verified proficiency in ${skillSummary} (${score}% match for this issue).`

  return {
    matchScore: score,
    matchedSkills,
    estimatedDuration,
    fairPriceEstimate,
    urgencyLevel: urgency,
    explanation,
    betterAlternativeWorker,
    betterAlternativeReason,
  }
}

