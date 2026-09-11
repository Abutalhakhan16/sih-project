'use client'

import React, { useState } from 'react'
import {
  Star,
  CheckCircle2,
  ShieldCheck,
  X,
  Sparkles,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react'
import { Booking } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/LanguageContext'

interface RatingFeedbackModalProps {
  booking: Booking
  onClose: () => void
  onSubmitRating: (data: {
    bookingId: number
    workerName: string
    rating: number
    tags: string[]
    comment: string
  }) => void
}

const FEEDBACK_TAGS = [
  { id: 'punctual', label: 'Prompt Arrival', labelHi: 'समय पर आगमन' },
  { id: 'expert', label: 'Master Workmanship', labelHi: 'उत्कृष्ट शिल्प कौशल' },
  { id: 'fair_price', label: 'Fair Cooperative Price', labelHi: 'उचित सहकारी मूल्य' },
  { id: 'polite', label: 'Courteous & Respectful', labelHi: 'विनम्र और सम्मानजनक' },
  { id: 'safety', label: 'Wore Safety Gear & ID', labelHi: 'सुरक्षा उपकरण और आईडी' },
  { id: 'clean', label: 'Cleaned Workspace After', labelHi: 'कार्यस्थल को साफ किया' },
]

export default function RatingFeedbackModal({
  booking,
  onClose,
  onSubmitRating,
}: RatingFeedbackModalProps) {
  const { t, lang } = useTranslation()
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'punctual',
    'fair_price',
  ])
  const [comment, setComment] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagId))
    } else {
      setSelectedTags([...selectedTags, tagId])
    }
  }

  const handleSubmit = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      onSubmitRating({
        bookingId: booking.id,
        workerName: booking.worker,
        rating,
        tags: selectedTags,
        comment,
      })
    }, 400)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="profile-modal"
        style={{
          maxWidth: '520px',
          width: '95%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '28px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          background: '#ffffff',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        {/* Modal Pill Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="pill pill-green">
            <ShieldCheck size={12} />
            {lang === 'hi' ? 'सहकारी गुणवत्ता प्रतिक्रिया' : 'COOPERATIVE QUALITY FEEDBACK'}
          </span>
        </div>

        <h2 style={{ fontSize: '22px', margin: '0 0 6px', letterSpacing: '-0.6px' }}>
          {lang === 'hi' ? 'सेवा का मूल्यांकन करें' : 'Rate & Review Service'}
        </h2>
        <p className="muted" style={{ fontSize: '13px', margin: '0 0 20px' }}>
          {lang === 'hi'
            ? `${booking.worker} (${booking.service}) के लिए आपकी प्रतिक्रिया सहकारी संघ में उनकी प्रतिष्ठा और कल्याण को मजबूत करती है।`
            : `Your feedback directly supports ${booking.worker}'s standing and fair allocation in the Bhopal Labour Cooperative.`}
        </p>

        {/* Worker Summary Strip */}
        <div
          style={{
            background: '#f8faf9',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'var(--green)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: '12px',
            }}
          >
            {booking.worker
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div>
            <b style={{ fontSize: '13px', display: 'block' }}>{booking.worker}</b>
            <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
              {booking.service} · {booking.address || 'Bhopal, MP'}
            </span>
          </div>
        </div>

        {/* Star Rating Selector */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--muted-foreground)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '10px',
            }}
          >
            {lang === 'hi' ? 'समग्र संतुष्टि' : 'Overall Workmanship Rating'}
          </label>
          <div
            style={{
              display: 'inline-flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = (hoverRating || rating) >= star
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: '4px',
                    transition: 'transform 0.15s ease',
                    transform: (hoverRating || rating) >= star ? 'scale(1.15)' : 'scale(1)',
                  }}
                  aria-label={`${star} star`}
                >
                  <Star
                    size={32}
                    fill={filled ? '#f59e0b' : 'none'}
                    stroke={filled ? '#f59e0b' : '#9ca3af'}
                  />
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--green)', marginTop: '6px' }}>
            {rating === 5
              ? (lang === 'hi' ? 'उत्कृष्ट (5/5) - मास्टर क्राफ्ट्समैन' : 'Exceptional (5/5) - Master Craftsman')
              : rating === 4
              ? (lang === 'hi' ? 'बहुत अच्छा (4/5)' : 'Very Good (4/5)')
              : rating === 3
              ? (lang === 'hi' ? 'संतोषजनक (3/5)' : 'Satisfactory (3/5)')
              : (lang === 'hi' ? 'सुधार की आवश्यकता (1-2/5)' : 'Needs Improvement')}
          </div>
        </div>

        {/* Feedback Badges */}
        <div style={{ marginBottom: '20px' }}>
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
            {lang === 'hi' ? 'सकारात्मक पहलू चुनें' : 'Select Highlights'}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {FEEDBACK_TAGS.map((t) => {
              const isSelected = selectedTags.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  style={{
                    border: isSelected ? '1px solid var(--green)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--soft-green)' : '#ffffff',
                    color: isSelected ? 'var(--green)' : 'var(--foreground)',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {lang === 'hi' ? t.labelHi : t.label} {isSelected && '✓'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Comments Textarea */}
        <div style={{ marginBottom: '22px' }}>
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
            {lang === 'hi' ? 'विस्तृत समीक्षा (वैकल्पिक)' : 'Written Review (Optional)'}
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              lang === 'hi'
                ? 'श्रमिक के काम और व्यवहार के बारे में कुछ शब्द लिखें...'
                : 'Share details about the service quality, cleanliness, or fair pricing...'
            }
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            style={{ padding: '10px 16px' }}
          >
            {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ padding: '10px 20px', fontSize: '13px' }}
          >
            {isSubmitting
              ? (lang === 'hi' ? 'दर्ज किया जा रहा है...' : 'Submitting Feedback...')
              : (lang === 'hi' ? 'समीक्षा सबमिट करें' : 'Submit Cooperative Review')}
          </button>
        </div>
      </div>
    </div>
  )
}
