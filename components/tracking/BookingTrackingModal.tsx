'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Booking, Worker, RankedWorker } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { paymentsApi, ratingsApi, bookingsApi } from '@/lib/api'
import {
  Clock3,
  Phone,
  MessageCircle,
  BadgeCheck,
  Check,
  X,
  ShieldCheck,
  Navigation,
  FileText,
  Star,
  Printer,
  CreditCard,
} from 'lucide-react'

const InteractiveMap = dynamic(
  () => import('@/components/map/InteractiveMap'),
  { ssr: false }
)

interface BookingTrackingModalProps {
  booking: Booking
  worker?: Worker | RankedWorker | null
  onClose: () => void
  onBookingUpdated?: (updated: Booking) => void
}

export default function BookingTrackingModal({
  booking,
  worker,
  onClose,
  onBookingUpdated,
}: BookingTrackingModalProps) {
  const { t, lang } = useTranslation()
  const [currentBooking, setCurrentBooking] = useState<Booking>(booking)
  const [eta, setEta] = useState(booking.etaMinutes || 12)
  const [notice, setNotice] = useState<string>('')
  const [showInvoice, setShowInvoice] = useState<boolean>(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false)
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false)
  const [selectedRating, setSelectedRating] = useState<number>(5)
  const [reviewText, setReviewText] = useState<string>('')
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false)

  // Map backend status to stepper step (1-4)
  const getActiveStep = (status: string): number => {
    const s = status.toLowerCase()
    if (s.includes('completed') || s.includes('paid') || s.includes('rated')) return 4
    if (s.includes('way') || s.includes('arrived') || s.includes('progress')) return 3
    if (s.includes('accept') || s.includes('assign')) return 2
    return 1
  }

  const activeStep = getActiveStep(currentBooking.status)

  // Simulate progress countdown if in transit
  useEffect(() => {
    const timer = setInterval(() => {
      setEta((prev) => (prev > 1 ? prev - 1 : 1))
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  const customerCoords = {
    lat: currentBooking.customerLat || 12.9716,
    lng: currentBooking.customerLng || 77.5946,
  }

  const workerCoords = {
    lat: currentBooking.workerLat || (worker?.lat ?? 12.9795),
    lng: currentBooking.workerLng || (worker?.lng ?? 77.601),
  }

  const workerRanked: any = worker
    ? {
        ...worker,
        distanceKm: (currentBooking as any).distanceKm || 1.2,
        etaMinutes: eta,
        isEligible: true,
        matchScore: 95,
      }
    : {
        id: currentBooking.workerId || 101,
        name: currentBooking.worker,
        initials: currentBooking.worker
          .split(' ')
          .map((n) => n[0])
          .join(''),
        service: currentBooking.service,
        rating: 4.8,
        experience: 8,
        availability: 'Busy',
        price: currentBooking.amount,
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

  const workerShare = Math.round(currentBooking.amount * 0.75)
  const coopShare = Math.round(currentBooking.amount * 0.20)
  const communityFund = Math.round(currentBooking.amount * 0.05)
  const invoiceNum = currentBooking.invoiceNumber || currentBooking.invoice?.invoice_number || `INV-2026-${currentBooking.id.toString().padStart(4, '0')}`

  // Payment Handler
  const handlePayNow = async () => {
    setIsProcessingPayment(true)
    setNotice('')
    try {
      // Step 1: Initiate sandbox payment
      const p = await paymentsApi.createPayment({
        booking_id: currentBooking.id,
        amount: currentBooking.amount,
      })
      // Step 2: Verify sandbox transaction
      await paymentsApi.verifyPayment({
        booking_id: currentBooking.id,
        transaction_reference: p.transaction_reference,
      })
      const updated: Booking = { ...currentBooking, status: 'Paid' }
      setCurrentBooking(updated)
      onBookingUpdated?.(updated)
      setNotice(lang === 'hi' ? 'भुगतान सफल! कृपया सेवा कर्मी को रेटिंग दें।' : 'Payment successful! Please rate your service experience.')
      setShowRatingModal(true)
    } catch (err: any) {
      setNotice(err.message || 'Payment processing failed.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // Rating Submission Handler
  const handleSubmitRating = async () => {
    setIsSubmittingRating(true)
    try {
      await ratingsApi.submitRating({
        booking_id: currentBooking.id,
        rating: selectedRating,
        review: reviewText || 'Cooperative service completed satisfactorily.',
      })
      const updated: Booking = {
        ...currentBooking,
        status: 'Rated',
        rating: selectedRating,
        review: reviewText,
      }
      setCurrentBooking(updated)
      onBookingUpdated?.(updated)
      setShowRatingModal(false)
      setNotice(lang === 'hi' ? 'रेटिंग दर्ज कर ली गई है! धन्यवाद।' : 'Thank you! Your review and rating have been recorded.')
    } catch (err: any) {
      setNotice(err.message || 'Failed to submit rating.')
    } finally {
      setIsSubmittingRating(false)
    }
  }

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
              {t(`categories.${currentBooking.service}`) || currentBooking.service} · {t('tracking.bookingNum', { id: currentBooking.id.toString().slice(-4) })}
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
            <div className="step-circle">
              {activeStep >= 4 ? <Check size={12} /> : '4'}
            </div>
            <span>{t('tracking.step4')}</span>
          </div>
        </div>

        {/* Assigned Worker Details Card */}
        <div className="tracking-worker-card">
          <div className={`person-avatar ${workerRanked.color || 'mint'}`}>
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
              <Navigation size={12} /> {t('tracking.enRouteTo', { address: currentBooking.address || (lang === 'hi' ? 'आपका स्थान' : 'your location') })}
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
              <b>{t('tracking.guaranteedPrice', { amount: currentBooking.amount })}</b>
              <p className="muted">
                {t('tracking.feeBreakdownText', {
                  workerShare,
                  coopShare: coopShare + communityFund,
                })}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* If completed, prompt Pay Now */}
            {(currentBooking.status === 'Completed' || currentBooking.status.toLowerCase() === 'completed') && (
              <button
                type="button"
                className="primary"
                style={{ background: '#176b4d' }}
                disabled={isProcessingPayment}
                onClick={handlePayNow}
              >
                <CreditCard size={14} />
                {isProcessingPayment ? 'Processing...' : `Pay ₹${currentBooking.amount}`}
              </button>
            )}

            {/* If paid but not rated, prompt Rate */}
            {currentBooking.status === 'Paid' && (
              <button
                type="button"
                className="primary"
                onClick={() => setShowRatingModal(true)}
              >
                <Star size={14} /> Rate Worker
              </button>
            )}

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

        {/* RATING MODAL */}
        {showRatingModal && (
          <div
            className="modal-backdrop"
            style={{ zIndex: 160 }}
            onClick={() => setShowRatingModal(false)}
          >
            <div
              className="profile-modal"
              style={{ maxWidth: '420px', textAlign: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setShowRatingModal(false)}>
                <X size={18} />
              </button>
              <div className="pill pill-green mb-2">Service Completed</div>
              <h3>Rate your experience with {workerRanked.name}</h3>
              <p className="muted">Your feedback strengthens the cooperative community</p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '16px 0' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    onClick={() => setSelectedRating(star)}
                  >
                    <Star
                      size={28}
                      fill={star <= selectedRating ? '#eab308' : 'none'}
                      color={star <= selectedRating ? '#eab308' : '#94a3b8'}
                    />
                  </button>
                ))}
              </div>

              <textarea
                style={{
                  width: '100%',
                  minHeight: '70px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  padding: '8px',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
                placeholder="Write a brief review (optional)..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="outline-button"
                  style={{ flex: 1 }}
                  onClick={() => setShowRatingModal(false)}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="primary"
                  style={{ flex: 1 }}
                  disabled={isSubmittingRating}
                  onClick={handleSubmitRating}
                >
                  {isSubmittingRating ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                  <b>{currentBooking.customerName || 'Ananya Nair'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">{t('tracking.serviceRendered')}:</span>
                  <b>{t(`categories.${currentBooking.service}`) || currentBooking.service}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">{t('common.worker')}:</span>
                  <b>{workerRanked.name}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="muted">{t('tracking.date')}:</span>
                  <b>{currentBooking.date}</b>
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
                  <b style={{ color: '#176b4d' }}>₹{currentBooking.amount}</b>
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
