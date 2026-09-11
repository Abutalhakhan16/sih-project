'use client'

import React, { useState } from 'react'
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  ShieldCheck,
  X,
  Smartphone,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react'
import { Booking } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/LanguageContext'

interface UpiPaymentModalProps {
  booking: Booking
  onClose: () => void
  onPaymentSuccess: (bookingId: number) => void
}

export default function UpiPaymentModal({
  booking,
  onClose,
  onPaymentSuccess,
}: UpiPaymentModalProps) {
  const { t, lang } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedApp, setSelectedApp] = useState<'bhim' | 'gpay' | 'phonepe' | 'paytm'>('gpay')

  const amount = booking.amount || 450
  const upiId = 'coopserve.bhopal@sbi'

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSimulatePayment = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      onPaymentSuccess(booking.id)
    }, 1200)
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
          padding: '26px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          background: '#ffffff',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.22)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="pill pill-green">
            <ShieldCheck size={12} />
            {lang === 'hi' ? 'सुरक्षित सहकारी यूपीआई गेटवे' : 'SECURE COOPERATIVE UPI GATEWAY'}
          </span>
        </div>

        <h2 style={{ fontSize: '22px', margin: '0 0 6px', letterSpacing: '-0.6px' }}>
          {lang === 'hi' ? 'डिजिटल यूपीआई भुगतान' : 'Digital UPI Payment & Settlement'}
        </h2>
        <p className="muted" style={{ fontSize: '13px', margin: '0 0 18px' }}>
          {lang === 'hi'
            ? 'सेवा पूर्ण होने के बाद पारदर्शी सहकारी दर पर सीधे श्रमिक के खाते में भुगतान करें।'
            : `Direct cooperative settlement for ${booking.worker} (${booking.service}).`}
        </p>

        {/* Amount Hero Card */}
        <div
          style={{
            background: '#f8faf9',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: 700 }}>
              {lang === 'hi' ? 'कुल देय राशि' : 'TOTAL AMOUNT DUE'}
            </span>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--green)' }}>
              ₹{amount.toFixed(2)}
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--muted-foreground)' }}>
            <div>Booking #{booking.id}</div>
            <div style={{ color: '#15803d', fontWeight: 700 }}>85% directly to worker</div>
          </div>
        </div>

        {/* Dynamic UPI QR Code Box */}
        <div
          style={{
            background: '#ffffff',
            border: '2px dashed var(--border)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '18px',
          }}
        >
          {/* SVG QR Code Simulation */}
          <div
            style={{
              width: '160px',
              height: '160px',
              margin: '0 auto 12px',
              background: '#f0fdf4',
              border: '2px solid var(--green)',
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              position: 'relative',
              boxShadow: '0 4px 12px rgba(23, 107, 77, 0.1)',
            }}
          >
            <QrCode size={110} style={{ color: 'var(--green)' }} />
            <div
              style={{
                position: 'absolute',
                background: '#ffffff',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '9px',
                fontWeight: 900,
                color: 'var(--green)',
                border: '1px solid var(--green)',
              }}
            >
              BHIM UPI
            </div>
          </div>

          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--foreground)' }}>
            {lang === 'hi' ? 'किसी भी यूपीआई ऐप से स्कैन करें' : 'Scan with any UPI App'}
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f1f5f3',
              padding: '6px 12px',
              borderRadius: '8px',
              marginTop: '8px',
              fontSize: '11px',
            }}
          >
            <code>{upiId}</code>
            <button
              type="button"
              onClick={handleCopyUpi}
              style={{
                border: 0,
                background: 'transparent',
                color: 'var(--green)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* UPI App Selection Chips */}
        <div style={{ marginBottom: '18px' }}>
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
            {lang === 'hi' ? 'या समर्थित ऐप से भुगतान करें' : 'Or Pay via Supported App'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { id: 'gpay', label: 'Google Pay', color: '#4285F4' },
              { id: 'phonepe', label: 'PhonePe', color: '#5f259f' },
              { id: 'paytm', label: 'Paytm', color: '#00b9f5' },
              { id: 'bhim', label: 'BHIM UPI', color: '#00833e' },
            ].map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => setSelectedApp(app.id as any)}
                style={{
                  border: selectedApp === app.id ? `2px solid ${app.color}` : '1px solid var(--border)',
                  background: selectedApp === app.id ? '#fcfdfd' : '#ffffff',
                  padding: '8px 4px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {app.label}
              </button>
            ))}
          </div>
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
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isProcessing ? (
              lang === 'hi' ? 'यूपीआई भुगतान सत्यापित हो रहा है...' : 'Verifying with Bank...'
            ) : (
              <>
                <Smartphone size={16} />
                {lang === 'hi' ? `₹${amount} का भुगतान करें` : `Approve & Pay ₹${amount}`}
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
