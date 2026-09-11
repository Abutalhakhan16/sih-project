'use client'

import React from 'react'
import {
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  X,
  Building2,
  QrCode,
  Download,
} from 'lucide-react'
import { Booking } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/LanguageContext'

interface CoopInvoiceModalProps {
  booking: Booking
  onClose: () => void
}

export default function CoopInvoiceModal({
  booking,
  onClose,
}: CoopInvoiceModalProps) {
  const { t, lang } = useTranslation()

  const invoiceNo =
    booking.invoiceNumber ||
    booking.invoice?.invoice_number ||
    `INV-2026-BHP-${booking.id.toString().padStart(4, '0')}`

  const amount = booking.amount || 450
  const workerShare = Math.round(amount * 0.85) // 85% worker take-home
  const welfareShare = Math.round(amount * 0.10) // 10% welfare, insurance, health escrow
  const coopShare = amount - workerShare - welfareShare // 5% federation ops

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="profile-modal"
        style={{
          maxWidth: '680px',
          width: '95%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '30px',
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

        {/* Invoice Top Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pill pill-green">
              <ShieldCheck size={12} />
              {lang === 'hi' ? 'प्रमाणित सहकारी बिल' : 'VERIFIED COOPERATIVE TAX INVOICE'}
            </span>
            <span className="pill pill-blue">
              <CheckCircle2 size={12} />
              {booking.status === 'Paid' || booking.status === 'Rated' || booking.status === 'Completed'
                ? (lang === 'hi' ? 'भुगतान संपन्न' : 'PAID')
                : (lang === 'hi' ? 'लंबित' : 'UNPAID')}
            </span>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid var(--border)',
              background: '#f8faf8',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            <Printer size={14} />
            {lang === 'hi' ? 'प्रिंट / रसीद' : 'Print / Receipt'}
          </button>
        </div>

        {/* Federation Letterhead */}
        <div
          style={{
            borderBottom: '2px solid var(--green)',
            paddingBottom: '16px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  background: 'var(--green)',
                  color: '#fff',
                  borderRadius: '6px',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 900,
                }}
              >
                CS
              </div>
              <h2 style={{ fontSize: '18px', margin: 0, letterSpacing: '-0.5px', color: 'var(--green)' }}>
                Madhya Pradesh Labour Cooperative Federation
              </h2>
            </div>
            <p style={{ margin: '2px 0', fontSize: '11px', color: 'var(--muted-foreground)' }}>
              Bhopal District Cooperative Union · Reg. No: MP/BHP/LCS/2021/088
            </p>
            <p style={{ margin: '2px 0', fontSize: '11px', color: 'var(--muted-foreground)' }}>
              GSTIN: 23AAAAA0000A1Z5 · Cooperative Complex, Zone-I, MP Nagar, Bhopal 462011
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: 700 }}>
              INVOICE NUMBER
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--foreground)' }}>
              {invoiceNo}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '3px' }}>
              Date: {booking.date || new Date().toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>

        {/* Customer & Worker Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '22px',
            background: '#f9fbf9',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '14px 16px',
            fontSize: '12px',
          }}
        >
          <div>
            <b style={{ color: 'var(--muted-foreground)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '4px' }}>
              Billed To (Customer):
            </b>
            <div style={{ fontWeight: 800, fontSize: '13px' }}>
              {booking.customerName || 'Ananya Nair (Member)'}
            </div>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '11px', marginTop: '2px' }}>
              {booking.address || 'E-3 Arera Colony, Bhopal, MP'}
            </div>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
              Phone: +91 98260 11223
            </div>
          </div>

          <div>
            <b style={{ color: 'var(--muted-foreground)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '4px' }}>
              Service Provider (Cooperative Specialist):
            </b>
            <div style={{ fontWeight: 800, fontSize: '13px' }}>{booking.worker}</div>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '11px', marginTop: '2px' }}>
              Trade: {booking.service}
            </div>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
              Primary Society: Bhopal Kaushalya Seva Sahakari
            </div>
            <div style={{ color: '#15803d', fontSize: '10px', fontWeight: 700 }}>
              ✓ Ayushman & PMSBY Insurance Active
            </div>
          </div>
        </div>

        {/* Itemized Service Table */}
        <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f4f6f4', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', fontWeight: 800 }}>Service Description</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, width: '90px' }}>Urgency</th>
                <th style={{ padding: '10px 14px', fontWeight: 800, textAlign: 'right', width: '90px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 14px' }}>
                  <b style={{ display: 'block' }}>{booking.service} Service & Diagnostic</b>
                  <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                    {booking.problemDescription || 'Standard cooperative trade visit and verified work completion'}
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span
                    className={
                      booking.urgency === 'Emergency'
                        ? 'pill pill-yellow'
                        : 'pill pill-green'
                    }
                    style={{ fontSize: '10px' }}
                  >
                    {booking.urgency || 'Standard'}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800 }}>
                  ₹{amount.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cooperative Transparent Breakdown Ledger */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <ShieldCheck size={16} style={{ color: 'var(--green)' }} />
            <b style={{ fontSize: '12px', color: '#166534', letterSpacing: '-0.2px' }}>
              Cooperative Fair Wage & Social Protection Split
            </b>
          </div>

          <div style={{ display: 'grid', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
              <span>
                1. Worker Direct Benefit Transfer (DBT):
                <small style={{ display: 'block', color: '#15803d', fontSize: '10px' }}>
                  Directly deposited to {booking.worker}&apos;s verified bank account (85%)
                </small>
              </span>
              <b>₹{workerShare.toFixed(2)}</b>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
              <span>
                2. Worker Welfare & Insurance Escrow:
                <small style={{ display: 'block', color: '#15803d', fontSize: '10px' }}>
                  Ayushman Bharat, PMSBY accidental shield & cooperative emergency fund (10%)
                </small>
              </span>
              <b>₹{welfareShare.toFixed(2)}</b>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
              <span>
                3. Cooperative Platform & Society Administration:
                <small style={{ display: 'block', color: '#15803d', fontSize: '10px' }}>
                  0% private middleman markup. 5% retained for dispatch servers & member tools
                </small>
              </span>
              <b>₹{coopShare.toFixed(2)}</b>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '8px',
                marginTop: '4px',
                borderTop: '1px solid #86efac',
                fontSize: '14px',
                fontWeight: 900,
                color: '#14532d',
              }}
            >
              <span>Total Paid:</span>
              <span>₹{amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Digital Stamp Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--muted-foreground)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                border: '2px dashed var(--green)',
                padding: '6px 10px',
                borderRadius: '8px',
                color: 'var(--green)',
                fontWeight: 800,
                fontSize: '10px',
                letterSpacing: '0.8px',
              }}
            >
              DIGITALLY SEALED & VERIFIED · MP LABOUR CO-OP
            </div>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            style={{ padding: '8px 16px' }}
          >
            {lang === 'hi' ? 'बंद करें' : 'Close Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}
