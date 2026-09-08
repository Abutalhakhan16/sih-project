'use client'

import React, { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  Worker,
  RankedWorker,
  CustomerLocation,
} from '@/lib/types'
import {
  PRESET_LOCATIONS,
  DEFAULT_CUSTOMER_LOCATION,
  formatDistance,
} from '@/lib/geo'
import { findSmartMatches } from '@/lib/matching'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import {
  MapPin,
  Navigation,
  Sparkles,
  Star,
  Clock3,
  BadgeCheck,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  AlertCircle,
  CheckCircle2,
  Phone,
} from 'lucide-react'

// Dynamically import InteractiveMap without SSR
const InteractiveMap = dynamic(
  () => import('@/components/map/InteractiveMap'),
  {
    ssr: false,
    loading: () => (
      <div className="map-skeleton-loading">
        <div className="map-skeleton-spinner" />
        <span>Loading interactive map tiles...</span>
      </div>
    ),
  }
)

interface ClosestWorkerMapSectionProps {
  workers: Worker[]
  categories: string[]
  currentService: string
  onServiceChange: (service: string) => void
  onBookWorker: (worker: RankedWorker, location: CustomerLocation) => void
  onViewProfile?: (worker: Worker) => void
}

export default function ClosestWorkerMapSection({
  workers,
  categories,
  currentService,
  onServiceChange,
  onBookWorker,
  onViewProfile,
}: ClosestWorkerMapSectionProps) {
  const { t, lang } = useTranslation()

  // Customer Location State
  const [customerLoc, setCustomerLoc] = useState<CustomerLocation>(DEFAULT_CUSTOMER_LOCATION)
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsNotification, setGpsNotification] = useState<{
    type: 'success' | 'warning' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  // Interactive Selected Worker (defaults to Best Worker)
  const [activeWorkerOverride, setActiveWorkerOverride] = useState<RankedWorker | null>(null)

  // Smart Matching Computation
  const matchResult = useMemo(() => {
    return findSmartMatches(
      workers,
      customerLoc.lat,
      customerLoc.lng,
      currentService,
      lang
    )
  }, [workers, customerLoc.lat, customerLoc.lng, currentService, lang])

  const { bestWorker, rankedWorkers, totalFound, explanation } = matchResult

  // Active worker shown in detail card (either user clicked on map or best worker)
  const displayedWorker = activeWorkerOverride && activeWorkerOverride.service === currentService
    ? activeWorkerOverride
    : bestWorker

  // Geolocation Request Handler
  const handleRequestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsNotification({
        type: 'error',
        message:
          lang === 'hi'
            ? 'इस डिवाइस पर ब्राउज़र जियोलोकेशन समर्थित नहीं है। स्थान चुनने के लिए मानचित्र पर क्लिक करें।'
            : 'Browser geolocation is not supported on this device. You can click on the map to set your location.',
      })
      return
    }

    setGpsLoading(true)
    setGpsNotification({ type: null, message: '' })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setCustomerLoc({
          lat: latitude,
          lng: longitude,
          label: lang === 'hi' ? 'आपका वर्तमान जीपीएस स्थान' : 'Your Current GPS Location',
          source: 'gps',
        })
        setGpsLoading(false)
        setIsSelectingOnMap(false)
        setActiveWorkerOverride(null)
        setGpsNotification({
          type: 'success',
          message:
            lang === 'hi'
              ? `स्थान की पहचान हुई (${latitude.toFixed(4)}, ${longitude.toFixed(4)})। निकटतम कर्मी पुनर्गणित।`
              : `Location detected (${latitude.toFixed(4)}, ${longitude.toFixed(4)}). Workers recalculating...`,
        })
      },
      (error) => {
        setGpsLoading(false)
        let errorMsg =
          lang === 'hi'
            ? 'स्थान अनुमति अस्वीकृत। कृपया मानचित्र पर क्लिक करें या नीचे दिए गए डेमो क्षेत्र चुनें।'
            : 'Location permission denied. Please click on the map or choose a neighborhood below.'
        if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg =
            lang === 'hi'
              ? 'जीपीएस सिग्नल अनुपलब्ध। कृपया मानचित्र पर अपना स्थान चुनें।'
              : 'GPS signal unavailable. Please select your location on the map.'
        } else if (error.code === error.TIMEOUT) {
          errorMsg =
            lang === 'hi'
              ? 'स्थान अनुरोध समय समाप्त। कृपया मानचित्र पर स्थान चुनें।'
              : 'Location request timed out. Please select your location on the map.'
        }
        setGpsNotification({
          type: 'warning',
          message: errorMsg,
        })
        setIsSelectingOnMap(true)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    )
  }, [lang])

  // Map Click Location Selection Handler
  const handleMapLocationSelect = useCallback((lat: number, lng: number) => {
    setCustomerLoc({
      lat,
      lng,
      label: lang === 'hi' ? `पिन किया गया स्थान (${lat.toFixed(4)}, ${lng.toFixed(4)})` : `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      source: 'manual',
    })
    setIsSelectingOnMap(false)
    setActiveWorkerOverride(null)
    setGpsNotification({
      type: 'success',
      message:
        lang === 'hi'
          ? 'मानचित्र पर स्थान अद्यतन किया गया! निकटतम कर्मियों की पुनर्गणना संपन्न।'
          : 'Location updated on map! Nearest workers recalculated.',
    })
  }, [lang])

  // Preset location change handler
  const handlePresetSelect = (loc: CustomerLocation) => {
    setCustomerLoc(loc)
    setIsSelectingOnMap(false)
    setActiveWorkerOverride(null)
    setGpsNotification({ type: null, message: '' })
  }

  return (
    <section className="map-feature-container">
      {/* Section Header */}
      <div className="map-feature-header">
        <div>
          <div className="eyebrow-badge">
            <Sparkles size={13} className="text-emerald-700" />
            <span>{t('map.eyebrow')}</span>
          </div>
          <h2 className="map-feature-title">{t('map.title')}</h2>
          <p className="muted">
            {t('map.subtitle')}
          </p>
        </div>

        {/* Location & GPS Controls */}
        <div className="map-header-actions">
          <button
            type="button"
            className={`map-pill-btn ${gpsLoading ? 'loading' : ''}`}
            onClick={handleRequestGeolocation}
            disabled={gpsLoading}
          >
            <Navigation size={14} className={gpsLoading ? 'animate-spin' : ''} />
            {gpsLoading ? t('map.locating') : t('map.useGps')}
          </button>

          <button
            type="button"
            className={`map-pill-btn ${isSelectingOnMap ? 'active-pill' : ''}`}
            onClick={() => setIsSelectingOnMap(!isSelectingOnMap)}
          >
            <MapPin size={14} />
            {isSelectingOnMap ? t('map.clickMapToPin') : t('map.selectOnMap')}
          </button>

          <div className="preset-selector-wrap">
            <select
              value={customerLoc.label}
              onChange={(e) => {
                const found = PRESET_LOCATIONS.find((p) => p.label === e.target.value)
                if (found) handlePresetSelect(found)
              }}
              className="preset-select"
            >
              {PRESET_LOCATIONS.map((p) => (
                <option key={p.label} value={p.label}>
                  {t('map.demoPrefix')} {p.label}
                </option>
              ))}
              {customerLoc.source === 'gps' && (
                <option value={customerLoc.label}>{t('map.gpsDetected')}</option>
              )}
              {customerLoc.source === 'manual' && (
                <option value={customerLoc.label}>{t('map.customPinned')}</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* GPS / Feedback Notification */}
      {gpsNotification?.message && (
        <div
          className={`map-notification-bar ${
            gpsNotification.type === 'success'
              ? 'notif-success'
              : gpsNotification.type === 'warning'
              ? 'notif-warning'
              : 'notif-error'
          }`}
        >
          {gpsNotification.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{gpsNotification.message}</span>
          <button
            type="button"
            onClick={() => setGpsNotification({ type: null, message: '' })}
            className="notif-close"
          >
            ✕
          </button>
        </div>
      )}

      {/* Service Filter Chips */}
      <div className="map-service-strip">
        <span className="strip-label">{t('map.selectService')}</span>
        <div className="strip-scroll">
          {categories.map((cat) => {
            const isSelected = currentService === cat
            const translatedCat = t(`categories.${cat}`)
            return (
              <button
                key={cat}
                type="button"
                className={`map-service-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onServiceChange(cat)
                  setActiveWorkerOverride(null)
                }}
              >
                {translatedCat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Map + Card Split Layout */}
      <div className="map-split-grid">
        {/* Left/Top: Interactive Map */}
        <div className="map-column">
          <InteractiveMap
            customerLocation={{ lat: customerLoc.lat, lng: customerLoc.lng }}
            workers={rankedWorkers}
            bestWorker={bestWorker}
            selectedWorker={displayedWorker}
            onSelectWorker={(worker) => setActiveWorkerOverride(worker)}
            onLocationSelect={handleMapLocationSelect}
            isSelectingLocation={isSelectingOnMap}
            showRoute={true}
            height="440px"
          />

          {/* Explanation bar below map */}
          <div className="match-explanation-box">
            <ShieldCheck size={16} className="text-emerald-700 flex-shrink-0" />
            <p>{explanation}</p>
          </div>
        </div>

        {/* Right/Bottom: Best Available Worker & Actions */}
        <div className="worker-details-column">
          {displayedWorker ? (
            <div className="best-worker-card">
              <div className="card-top-header">
                <div className="best-tag">
                  <Sparkles size={13} />
                  <span>
                    {displayedWorker.id === bestWorker?.id
                      ? t('map.bestAvailableWorker')
                      : t('map.selectedWorker')}
                  </span>
                </div>
                <span
                  className={`status-chip ${
                    displayedWorker.availability === 'Available'
                      ? 'chip-available'
                      : 'chip-busy'
                  }`}
                >
                  <span className="dot" />
                  {t(`status.${displayedWorker.availability}`)}
                </span>
              </div>

              {/* Worker Profile Header */}
              <div className="worker-profile-row">
                <div className={`worker-avatar-large ${displayedWorker.color}`}>
                  {displayedWorker.initials}
                </div>
                <div className="worker-info-main">
                  <div className="worker-name-row">
                    <h3>{displayedWorker.name}</h3>
                    {displayedWorker.verified && (
                      <span className="verified-badge" title={t('common.verified')}>
                        <BadgeCheck size={16} />
                      </span>
                    )}
                  </div>
                  <div className="worker-service-line">
                    <span>{t(`categories.${displayedWorker.service}`)}</span>
                    <span className="bullet">·</span>
                    <span className="worker-rating">
                      <Star size={13} fill="currentColor" /> {displayedWorker.rating}
                      <small>({displayedWorker.reviews})</small>
                    </span>
                  </div>
                  <div className="worker-address-muted">
                    <MapPin size={12} />
                    <span>{displayedWorker.address || displayedWorker.serviceArea || 'Bengaluru'}</span>
                  </div>
                </div>
              </div>

              {/* Metrics Grid: Distance, ETA, Experience, Price */}
              <div className="worker-metrics-grid">
                <div className="metric-cell">
                  <span className="metric-label">{t('map.distance')}</span>
                  <strong className="metric-value text-emerald-800">
                    {formatDistance(displayedWorker.distanceKm)}
                  </strong>
                </div>
                <div className="metric-cell">
                  <span className="metric-label">{t('map.estArrival')}</span>
                  <strong className="metric-value flex items-center gap-1">
                    <Clock3 size={14} className="text-emerald-700" />
                    ~{displayedWorker.etaMinutes} {t('map.mins')}
                  </strong>
                </div>
                <div className="metric-cell">
                  <span className="metric-label">{t('map.experience')}</span>
                  <strong className="metric-value">{displayedWorker.experience} {t('map.yrs')}</strong>
                </div>
                <div className="metric-cell">
                  <span className="metric-label">{t('map.startingPrice')}</span>
                  <strong className="metric-value price">₹{displayedWorker.price}</strong>
                </div>
              </div>

              {/* Bio summary */}
              <p className="worker-bio-snippet">{displayedWorker.bio}</p>

              {/* Action Buttons */}
              <div className="card-actions-row">
                {onViewProfile && (
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => onViewProfile(displayedWorker)}
                  >
                    {t('common.viewProfile')}
                  </button>
                )}
                <button
                  type="button"
                  className="primary book-btn"
                  disabled={displayedWorker.availability === 'Offline' || displayedWorker.availability === 'On Leave'}
                  onClick={() => onBookWorker(displayedWorker, customerLoc)}
                >
                  {displayedWorker.availability === 'Busy' || displayedWorker.availability === 'On Job'
                    ? t('common.requestAnyway')
                    : t('map.requestThisWorker')}
                  <ArrowRight size={15} />
                </button>
              </div>

              {(displayedWorker.availability === 'Busy' || displayedWorker.availability === 'On Job') && (
                <div className="busy-warning-note">
                  <AlertCircle size={13} />
                  <span>
                    {t('map.busyNote')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="no-worker-box">
              <AlertCircle size={32} className="text-amber-600" />
              <h3>{t('map.noWorkerTitle', { service: t(`categories.${currentService}`) })}</h3>
              <p>
                {t('map.noWorkerDesc')}
              </p>
              <button
                type="button"
                className="outline-button"
                onClick={() => handlePresetSelect(PRESET_LOCATIONS[0])}
              >
                {t('map.resetDemoLoc')}
              </button>
            </div>
          )}

          {/* List of other nearby workers in this trade */}
          <div className="other-workers-panel">
            <div className="panel-subhead">
              <b>{t('map.otherWorkersInRange', { service: t(`categories.${currentService}`) })}</b>
              <span className="count-badge">{t('map.foundCount', { count: rankedWorkers.length })}</span>
            </div>

            <div className="other-workers-list">
              {rankedWorkers
                .filter((w) => w.id !== displayedWorker?.id)
                .slice(0, 3)
                .map((worker) => (
                  <div
                    key={worker.id}
                    className={`other-worker-item ${
                      worker.availability !== 'Available' ? 'item-busy' : ''
                    }`}
                    onClick={() => setActiveWorkerOverride(worker)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={`item-avatar ${worker.color}`}>
                      {worker.initials}
                    </div>
                    <div className="item-meta">
                      <div className="item-name-line">
                        <b>{worker.name}</b>
                        <span
                          className={`mini-status ${
                            worker.availability === 'Available'
                              ? 'status-avail'
                              : 'status-busy'
                          }`}
                        >
                          {t(`status.${worker.availability}`)}
                        </span>
                      </div>
                      <span className="item-sub">
                        {formatDistance(worker.distanceKm)} · ★ {worker.rating} · ₹
                        {worker.price}
                      </span>
                    </div>
                    <ArrowRight size={14} className="item-arrow" />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
