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
