'use client'

import React from 'react'
import { WorkerWelfare } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import {
  ShieldCheck,
  HeartPulse,
  GraduationCap,
  CalendarDays,
  Award,
  AlertCircle,
  X,
  CheckCircle2,
} from 'lucide-react'

interface WorkerWelfareModalProps {
  welfare: WorkerWelfare
  workerName: string
  onClose: () => void
}

export default function WorkerWelfareModal({
  welfare,
  workerName,
  onClose,
}: WorkerWelfareModalProps) {
  const { t, lang } = useTranslation()

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="profile-modal"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="pill pill-green">
            <ShieldCheck size={12} /> {t('nav.coopProtected')}
          </span>
        </div>

        <h2>{t('welfareModal.title')}</h2>
        <p className="muted">
          {workerName} · {t('welfareModal.subtitle')}
        </p>

        <div
          style={{
            display: 'grid',
            gap: '12px',
            margin: '20px 0',
            fontSize: '12px',
          }}
        >
          {/* Insurance */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: '#f8fbf8',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <HeartPulse size={20} className="text-emerald-700" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <b style={{ display: 'block', marginBottom: '2px' }}>
                {t('welfareModal.insuranceLabel')}
              </b>
              <span className="muted">{welfare.insuranceStatus}</span>
            </div>
          </div>

          {/* Training & Certifications */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: '#f8fbf8',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <GraduationCap size={20} className="text-blue-700" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <b style={{ display: 'block', marginBottom: '2px' }}>
                {t('welfareModal.trainingLabel')}
              </b>
              <span className="muted">{welfare.trainingCompleted}</span>
            </div>
          </div>

          {/* Paid Leave Balance */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: '#f8fbf8',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <CalendarDays size={20} className="text-amber-700" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <b style={{ display: 'block', marginBottom: '2px' }}>
                {t('welfareModal.leaveLabel')}
              </b>
              <span className="muted">
                {t('welfareModal.daysCount', { count: welfare.leaveBalance })} · Paid emergency days with 100% wage guarantee
              </span>
            </div>
          </div>

          {/* Welfare Eligibility */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: '#f8fbf8',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <Award size={20} className="text-emerald-700" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <b style={{ display: 'block', marginBottom: '2px' }}>
                {t('welfareModal.eligibilityLabel')}
              </b>
              <span className="muted">{welfare.welfareEligibility}</span>
            </div>
          </div>

          {/* Grievance Redressal */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: '#f8fbf8',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <CheckCircle2 size={20} className="text-emerald-700" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <b style={{ display: 'block', marginBottom: '2px' }}>
                {t('welfareModal.grievancesLabel')}
              </b>
              <span className="muted">{welfare.grievanceStatus}</span>
            </div>
          </div>
        </div>

        <button type="button" className="primary full" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}
