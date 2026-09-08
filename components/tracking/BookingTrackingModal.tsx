'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Booking, Worker, RankedWorker } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import {
  MapPin,
  Clock3,
  Phone,
  MessageCircle,
  BadgeCheck,
  Check,
  X,
  ShieldCheck,
  Navigation,
  Sparkles,
  FileText,
  Star,
  Printer,
} from 'lucide-react'

const InteractiveMap = dynamic(
  () => import('@/components/map/InteractiveMap'),
  { ssr: false }
)

interface BookingTrackingModalProps {
  booking: Booking
  worker?: Worker | RankedWorker | null
  onClose: () => void
}

export default function BookingTrackingModal({
  booking,
  worker,
  onClose,
}: BookingTrackingModalProps) {
  const { t, lang } = useTranslation()
  const [eta, setEta] = useState(booking.etaMinutes || 12)
  const [activeStep, setActiveStep] = useState<number>(2) // 1: Sent, 2: Accepted, 3: On Way, 4: Complete
  const [notice, setNotice] = useState<string>('')
  const [showInvoice, setShowInvoice] = useState<boolean>(false)

  // Simulate progress
  useEffect(() => {
    const timer = setInterval(() => {
      setEta((prev) => (prev > 1 ? prev - 1 : 1))
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  const customerCoords = {
    lat: booking.customerLat || 12.9716,
    lng: booking.customerLng || 77.5946,
  }

  const workerCoords = {
    lat: booking.workerLat || (worker?.lat ?? 12.9795),
    lng: booking.workerLng || (worker?.lng ?? 77.601),
  }

  const workerRanked: any = worker
    ? {
        ...worker,
        distanceKm: (booking as any).distanceKm || 1.2,
        etaMinutes: eta,
        isEligible: true,
        matchScore: 95,
      }
    : {
        id: booking.workerId || 101,
        name: booking.worker,
        initials: booking.worker
          .split(' ')
          .map((n) => n[0])
          .join(''),
        service: booking.service,
        rating: 4.8,
        experience: 8,
        availability: 'Busy',
        price: booking.amount,
        reviews: 120,
        color: 'mint',
        bio: 'Assigned verified specialist',
        lat: workerCoords.lat,
        lng: workerCoords.lng,
        verified: true,
        workload: 2,
        distanceKm: 1.2,
        etaMinutes: eta,
        isEligible: true,
        matchScore: 95,
      }

  const workerShare = Math.round(booking.amount * 0.75)
  const coopShare = Math.round(booking.amount * 0.20)
  const communityFund = Math.round(booking.amount * 0.05)
  const invoiceNum = booking.invoiceNumber || `INV-2025-${booking.id.toString().slice(-4)}`

  return (
    <div className="modal-backdrop tracking-backdrop" onClick={onClose}>
      <div
        className="tracking-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="tracking-modal-header">
          <div className="tracking-title-wrap">
            <span className="live-status-pill">
              <span className="pulse-dot" /> {t('tracking.liveTracking')}
            </span>
            <h2>{t('tracking.dispatchInProgress')}</h2>
            <p className="muted">
              {t(`categories.${booking.service}`) || booking.service} · {t('tracking.bookingNum', { id: booking.id.toString().slice(-4) })}
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {notice && (
          <div className="notice mb-3">
            <Check size={16} />
            <span>{notice}</span>
            <button onClick={() => setNotice('')}>✕</button>
          </div>
        )}

        {/* Live Interactive Map Pane */}
        <div className="tracking-map-container">
          <InteractiveMap
            customerLocation={customerCoords}
            workers={[workerRanked]}
            bestWorker={workerRanked}
            selectedWorker={workerRanked}
            showRoute={true}
            height="260px"
          />
          <div className="tracking-map-eta-badge">
            <Clock3 size={15} />
            <span>{t('tracking.etaBadge', { eta })}</span>
          </div>
        </div>

        {/* Dispatch Stepper */}
        <div className="tracking-stepper">
          <div className={`step-item ${activeStep >= 1 ? 'completed' : ''}`}>
            <div className="step-circle">
              {activeStep > 1 ? <Check size={12} /> : '1'}
            </div>
            <span>{t('tracking.step1')}</span>
          </div>
          <div className={`step-connector ${activeStep >= 2 ? 'filled' : ''}`} />

          <div className={`step-item ${activeStep >= 2 ? 'completed active' : ''}`}>
            <div className="step-circle">
              {activeStep > 2 ? <Check size={12} /> : '2'}
            </div>
            <span>{t('tracking.step2')}</span>
          </div>
          <div className={`step-connector ${activeStep >= 3 ? 'filled' : ''}`} />

          <div className={`step-item ${activeStep >= 3 ? 'completed' : ''}`}>
            <div className="step-circle">
              {activeStep > 3 ? <Check size={12} /> : '3'}
            </div>
            <span>{t('tracking.step3')}</span>
          </div>
          <div className={`step-connector ${activeStep >= 4 ? 'filled' : ''}`} />

          <div className={`step-item ${activeStep >= 4 ? 'completed' : ''}`}>
            <div className="step-circle">4</div>
            <span>{t('tracking.step4')}</span>
          </div>
        </div>

        {/* Assigned Worker Details Card */}
        <div className="tracking-worker-card">
          <div className={`person-avatar ${workerRanked.color}`}>
            {workerRanked.initials}
          </div>
          <div className="worker-details-meta">
            <div className="name-line">
              <b>{workerRanked.name}</b>
              <BadgeCheck size={15} className="text-emerald-700" />
            </div>
            <span className="muted">
              {t(`categories.${workerRanked.service}`) || workerRanked.service} · ★ {workerRanked.rating} (
              {workerRanked.reviews} {lang === 'hi' ? 'समीक्षाएं' : 'reviews'})
            </span>
            <small className="eta-highlight">
              <Navigation size={12} /> {t('tracking.enRouteTo', { address: booking.address || (lang === 'hi' ? 'आपका स्थान' : 'your location') })}
            </small>
          </div>

          <div className="tracking-actions-col">
            <button
              type="button"
              className="icon-action-btn primary-subtle"
              title={t('tracking.call')}
              onClick={() =>
                setNotice(
                  lang === 'hi'
                    ? `${workerRanked.name} को कॉल से जोड़ा जा रहा है (${workerRanked.phone || '+91 98451 22345'})...`
                    : `Connecting call to ${workerRanked.name} (${workerRanked.phone || '+91 98451 22345'})...`
                )
              }
            >
              <Phone size={16} />
              <span>{t('tracking.call')}</span>
            </button>
            <button
              type="button"
              className="icon-action-btn"
              title={t('tracking.message')}
              onClick={() =>
                setNotice(
                  lang === 'hi'
                    ? `${workerRanked.name} के साथ सुरक्षित चैट चैनल प्रारंभ हुआ।`
                    : `Encrypted chat channel opened with ${workerRanked.name}.`
                )
              }
            >
              <MessageCircle size={16} />
              <span>{t('tracking.message')}</span>
            </button>
          </div>
        </div>

        {/* Co-op Transparency & Price Footer */}
        <div className="tracking-footer">
          <div className="fee-breakdown">
            <ShieldCheck size={18} className="text-emerald-700" />
            <div>
              <b>{t('tracking.guaranteedPrice', { amount: booking.amount })}</b>
              <p className="muted">
                {t('tracking.feeBreakdownText', {
                  workerShare,
                  coopShare: coopShare + communityFund,
                })}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="outline-button"
              onClick={() => setShowInvoice(true)}
            >
              <FileText size={14} />
              {t('tracking.viewInvoice')}
            </button>
            <button
              type="button"
              className="primary"
              onClick={onClose}
            >
              {t('tracking.backToDashboard')}
            </button>
          </div>
        </div>

        {/* INVOICE / चालान MODAL POPUP */}
        {showInvoice && (
          <div
            className="modal-backdrop"
            style={{ zIndex: 150 }}
            onClick={() => setShowInvoice(false)}
          >
            <div
              className="profile-modal"
              style={{ maxWidth: '480px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setShowInvoice(false)}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="pill pill-green">
                  <BadgeCheck size={12} /> {t('common.verified')}
                </span>
                <span className="pill pill-blue">{invoiceNum}</span>
              </div>

              <h2>{t('tracking.invoiceTitle')}</h2>
              <p className="muted">
                {t('common.cooperative')}: Bengaluru Kaushalya Sahakari (Reg. #KA-COOP-4421)
              </p>

              <div
                style={{
                  background: '#f8faf8',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px',
                  margin: '16px 0',
                  display: 'grid',
                  gap: '10px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">{t('tracking.billTo')}:</span>
                  <b>{booking.customerName || 'Ananya Nair'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">{t('tracking.serviceRendered')}:</span>
                  <b>{t(`categories.${booking.service}`) || booking.service}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">{t('common.worker')}:</span>
                  <b>{workerRanked.name}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">{t('tracking.date')}:</span>
                  <b>{booking.date}</b>
                </div>
                <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#176b4d' }}>
                  <span>{t('tracking.workerShare')}:</span>
                  <b>₹{workerShare}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a5568' }}>
                  <span>{t('tracking.coopOperations')}:</span>
                  <b>₹{coopShare}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a5568' }}>
                  <span>{t('tracking.communityFund')}:</span>
                  <b>₹{communityFund}</b>
                </div>
                <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <b>{t('tracking.totalPaid')}:</b>
                  <b style={{ color: '#176b4d' }}>₹{booking.amount}</b>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="outline-button"
                  style={{ flex: 1 }}
                  onClick={() => alert(lang === 'hi' ? 'चालान सफलतापूर्वक डाउनलोड हो गया।' : 'Invoice downloaded as PDF.')}
                >
                  <Printer size={14} />
                  {lang === 'hi' ? 'चालान प्रिंट / डाउनलोड' : 'Print / Download'}
                </button>
                <button
                  type="button"
                  className="primary"
                  style={{ flex: 1 }}
                  onClick={() => setShowInvoice(false)}
                >
                  {t('tracking.closeInvoice')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
