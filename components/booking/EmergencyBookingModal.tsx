'use client'

import React, { useState, useMemo } from 'react'
import {
  AlertTriangle,
  Zap,
  Droplets,
  Wrench,
  Car,
  HeartHandshake,
  MapPin,
  Clock,
  ShieldCheck,
  X,
  ArrowRight,
} from 'lucide-react'
import { Worker, CustomerLocation } from '@/lib/types'
import { PRESET_LOCATIONS, calculateHaversineDistance } from '@/lib/geo'
import { useTranslation } from '@/lib/i18n/LanguageContext'

interface EmergencyBookingModalProps {
  workers: Worker[]
  currentLocation: CustomerLocation
  onClose: () => void
  onConfirmEmergencyBooking: (data: {
    worker: Worker
    service: string
    problemDescription: string
    urgency: 'Emergency'
    address: string
    etaMinutes: number
    amount: number
  }) => void
}

interface EmergencyCategory {
  id: string
  trade: string
  label: string
  labelHi: string
  icon: React.ReactNode
  color: string
  defaultDesc: string
  basePrice: number
}

const EMERGENCY_CATEGORIES: EmergencyCategory[] = [
  {
    id: 'elec-short',
    trade: 'Electrician',
    label: 'Electrical Spark / Power Failure',
    labelHi: 'बिजली शॉर्ट सर्किट / स्पार्किंग',
    icon: <Zap size={22} />,
    color: '#d97706',
    defaultDesc: 'Critical electrical spark / tripping main circuit breaker. Immediate assistance needed.',
    basePrice: 450,
  },
  {
    id: 'pipe-burst',
    trade: 'Plumber',
    label: 'Main Pipe Burst / Major Flooding',
    labelHi: 'पाइप फटना / पानी का रिसाव',
    icon: <Droplets size={22} />,
    color: '#2563eb',
    defaultDesc: 'Severe water leak / main supply burst flooding premises. Urgent shut-off required.',
    basePrice: 420,
  },
  {
    id: 'lock-break',
    trade: 'Carpenter',
    label: 'Lockout / Jammed Security Door',
    labelHi: 'दरवाजे का ताला टूटना / जाम होना',
    icon: <Wrench size={22} />,
    color: '#9333ea',
    defaultDesc: 'Main entry door lock jammed or compromised. Emergency entry required.',
    basePrice: 400,
  },
  {
    id: 'elder-care',
    trade: 'Caregiver',
    label: 'Urgent Caregiver / Mobility Aid',
    labelHi: 'आपातकालीन देखभाल / मोबिलिटी सहायता',
    icon: <HeartHandshake size={22} />,
    color: '#e11d48',
    defaultDesc: 'Immediate physical assistance needed for elderly / patient bed-to-wheelchair mobility.',
    basePrice: 500,
  },
  {
    id: 'auto-break',
    trade: 'Auto Mechanic',
    label: 'Vehicle Breakdown / Roadside Help',
    labelHi: 'वाहन ब्रेकडाउन / आपातकालीन सहायता',
    icon: <Car size={22} />,
    color: '#059669',
    defaultDesc: 'Engine failure / dead battery in Bhopal transit. Roadside assistance required.',
    basePrice: 450,
  },
]

export default function EmergencyBookingModal({
  workers,
  currentLocation,
  onClose,
  onConfirmEmergencyBooking,
}: EmergencyBookingModalProps) {
  const { t, lang } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState<EmergencyCategory>(
    EMERGENCY_CATEGORIES[0]
  )
  const [selectedLocation, setSelectedLocation] = useState<CustomerLocation>(currentLocation)
  const [notes, setNotes] = useState<string>(selectedCategory.defaultDesc)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Find nearest available worker in Bhopal for the selected trade
  const matchedWorker = useMemo(() => {
    const tradeWorkers = workers.filter(
      (w) =>
        (w.service.toLowerCase() === selectedCategory.trade.toLowerCase() ||
          w.primarySkill.toLowerCase() === selectedCategory.trade.toLowerCase()) &&
        w.availability === 'Available'
    )

    if (tradeWorkers.length === 0) {
      // Fallback to any worker of this trade
      return (
        workers.find(
          (w) =>
            w.service.toLowerCase() === selectedCategory.trade.toLowerCase() ||
            w.primarySkill.toLowerCase() === selectedCategory.trade.toLowerCase()
        ) || workers[0]
      )
    }

    // Sort by proximity to selected Bhopal location
    return [...tradeWorkers].sort((a, b) => {
      const distA = calculateHaversineDistance(
        selectedLocation.lat,
        selectedLocation.lng,
        a.lat,
        a.lng
      )
      const distB = calculateHaversineDistance(
        selectedLocation.lat,
        selectedLocation.lng,
        b.lat,
        b.lng
      )
      return distA - distB
    })[0]
  }, [workers, selectedCategory, selectedLocation])

  const calculatedDistance = useMemo(() => {
    if (!matchedWorker) return 1.8
    return calculateHaversineDistance(
      selectedLocation.lat,
      selectedLocation.lng,
      matchedWorker.lat,
      matchedWorker.lng
    )
  }, [matchedWorker, selectedLocation])

  const calculatedEta = useMemo(() => {
    // Emergency priority calculation: ~3-4 mins per km + 4 mins prep
    const mins = Math.max(6, Math.min(18, Math.round(calculatedDistance * 3.5 + 4)))
    return mins
  }, [calculatedDistance])

  const handleCategorySelect = (cat: EmergencyCategory) => {
    setSelectedCategory(cat)
    setNotes(cat.defaultDesc)
  }

  const handleDispatch = () => {
    if (!matchedWorker) return
    setIsSubmitting(true)
    setTimeout(() => {
      onConfirmEmergencyBooking({
        worker: matchedWorker,
        service: selectedCategory.trade,
        problemDescription: notes,
        urgency: 'Emergency',
        address: selectedLocation.label,
        etaMinutes: calculatedEta,
        amount: selectedCategory.basePrice,
      })
    }, 400)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="profile-modal"
        style={{
          maxWidth: '640px',
          width: '95%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '24px',
          border: '2px solid #ef4444',
          borderRadius: '18px',
          boxShadow: '0 25px 60px rgba(239, 68, 68, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        {/* SOS Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <span
            style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.6px',
            }}
          >
            <AlertTriangle size={14} className="animate-pulse" />
            {lang === 'hi' ? '24/7 आपातकालीन डिस्पैच' : '24/7 EMERGENCY SOS DISPATCH'}
          </span>
          <span
            style={{
              background: '#dcfce7',
              color: '#16a34a',
              padding: '6px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Clock size={12} />
            {lang === 'hi' ? '15 मिनट प्रतिक्रिया' : '15-Min Response'}
          </span>
        </div>

        <h2 style={{ fontSize: '24px', margin: '0 0 6px', letterSpacing: '-0.8px' }}>
          {lang === 'hi' ? 'आपातकालीन सेवा अनुरोध' : 'Instant Emergency Service Booking'}
        </h2>
        <p className="muted" style={{ fontSize: '13px', margin: '0 0 16px' }}>
          {lang === 'hi'
            ? 'भोपाल में निकटतम सत्यापित सहकारी सेवा कर्मी को तत्काल प्राथमिक कार्य आदेश के साथ भेजा जाएगा।'
            : 'Dispatches the closest verified cooperative specialist in Bhopal with top-priority routing.'}
        </p>

        {/* Cooperative Zero Surge Guarantee */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #86efac',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <ShieldCheck size={28} style={{ color: '#16a34a', flexShrink: 0 }} />
          <div>
            <b style={{ color: '#166534', fontSize: '12px', display: 'block' }}>
              {lang === 'hi'
                ? 'सहकारी नैतिकता गारंटी: शून्य सर्ज मूल्य निर्धारण'
                : 'Cooperative Ethics Guarantee: Zero Surge Pricing'}
            </b>
            <span style={{ color: '#15803d', fontSize: '11px', lineHeight: 1.4, display: 'block' }}>
              {lang === 'hi'
                ? 'निजी ऐप्स संकट के समय 2x-3x सर्ज लेते हैं। हमारे सहकारी संघ में केवल वास्तविक पारदर्शी मजदूरी ली जाती है।'
                : 'Unlike private apps with 2x-3x surge multipliers, cooperative federation rates remain standard and transparent.'}
            </span>
          </div>
        </div>

        {/* Select Emergency Type */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--muted-foreground)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '8px',
            }}
          >
            {lang === 'hi' ? '1. आपात स्थिति चुनें' : '1. Select Emergency Type'}
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '8px',
            }}
          >
            {EMERGENCY_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory.id === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: isSelected ? `2px solid ${cat.color}` : '1px solid var(--border)',
                    background: isSelected ? '#ffffff' : '#fcfdfc',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ color: cat.color, marginTop: '2px', flexShrink: 0 }}>
                    {cat.icon}
                  </span>
                  <div>
                    <b style={{ fontSize: '12px', display: 'block', color: 'var(--foreground)' }}>
                      {lang === 'hi' ? cat.labelHi : cat.label}
                    </b>
                    <small style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
                      ₹{cat.basePrice} · {cat.trade}
                    </small>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Bhopal Location Selector */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--muted-foreground)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '6px',
            }}
          >
            {lang === 'hi' ? '2. भोपाल में आपका स्थान' : '2. Your Bhopal Location'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <MapPin size={16} style={{ color: 'var(--green)' }} />
            <select
              value={selectedLocation.label}
              onChange={(e) => {
                const found = PRESET_LOCATIONS.find((p) => p.label === e.target.value)
                if (found) setSelectedLocation(found)
              }}
              style={{
                flex: 1,
                minWidth: '220px',
                height: '38px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0 10px',
                fontSize: '12px',
                fontWeight: 700,
                background: '#fff',
              }}
            >
              {PRESET_LOCATIONS.map((loc) => (
                <option key={loc.label} value={loc.label}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Problem Notes */}
        <div style={{ marginBottom: '18px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--muted-foreground)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '6px',
            }}
          >
            {lang === 'hi' ? '3. स्थिति का विवरण' : '3. Situation Details'}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe hazard or specific location instructions..."
            style={{
              width: '100%',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Matched Specialist Preview */}
        {matchedWorker && (
          <div
            style={{
              background: '#f8faf9',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--green)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                }}
              >
                {matchedWorker.initials}
              </div>
              <div>
                <b style={{ fontSize: '14px', display: 'block' }}>{matchedWorker.name}</b>
                <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                  {matchedWorker.service} · {matchedWorker.cooperative}
                </span>
                <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 700, marginTop: '2px' }}>
                  ★ {matchedWorker.rating} ({matchedWorker.reviews} reviews) · {matchedWorker.experience} yrs exp
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626' }}>
                {calculatedEta} mins
              </div>
              <small style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
                {calculatedDistance.toFixed(1)} km away · Priority Dispatch
              </small>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            style={{ padding: '11px 18px' }}
          >
            {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleDispatch}
            disabled={isSubmitting || !matchedWorker}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 0,
              padding: '12px 22px',
              borderRadius: '9px',
              fontWeight: 800,
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 18px rgba(220, 38, 38, 0.35)',
            }}
          >
            <Zap size={16} fill="currentColor" />
            {isSubmitting
              ? (lang === 'hi' ? 'डिस्पैच हो रहा है...' : 'Dispatching Specialist...')
              : (lang === 'hi'
                  ? `तत्काल भेजें (₹${selectedCategory.basePrice})`
                  : `Dispatch Nearest Specialist (₹${selectedCategory.basePrice})`)}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
