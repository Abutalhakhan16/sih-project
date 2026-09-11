'use client'

import React, { useState, useMemo } from 'react'
import { Worker } from '@/lib/types'
import { analyzeProblemAllocation } from '@/lib/matching'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import {
  X,
  Sparkles,
  ShieldCheck,
  Star,
  Clock,
  AlertTriangle,
  ArrowRight,
  Zap,
  CheckCircle2,
  Users,
} from 'lucide-react'

interface ProblemDescriptionModalProps {
  worker: Worker
  allWorkers: Worker[]
  customerLocation?: { lat: number; lng: number; label?: string }
  onConfirm: (payload: {
    worker: Worker
    problemDescription: string
    urgency: 'Standard' | 'Urgent' | 'Emergency'
    aiMatchScore: number
    fairPriceEstimate: number
  }) => void
  onInstantRequest?: (worker: Worker) => void
  onInstantBook?: (worker: Worker) => void
  onClose: () => void
}

const COMMON_ISSUES: Record<string, string[]> = {
  Plumber: [
    'Pipe leak under sink',
    'Blocked bathroom drain',
    'Tap/faucet dripping constantly',
    'Low water pressure',
    'Flush tank not filling',
    'Water heater/geyser line leak',
  ],
  Electrician: [
    'Short circuit / sparking socket',
    'Ceiling fan making noise/stopped',
    'MCB tripping repeatedly',
    'Switchboard replacement',
    'Heavy appliance wiring',
  ],
  'Home cleaning': [
    'Deep kitchen grease cleaning',
    'Bathroom tile sanitation',
    'Post-renovation dust cleaning',
    'Sofa & upholstery cleaning',
  ],
  Carpenter: [
    'Main door hinge loose',
    'Cabinet/drawer stuck',
    'Wooden bed/table assembly',
    'Lock & latch repair',
  ],
  'Appliance repair': [
    'AC not blowing cold air',
    'Refrigerator freezing food/leaking',
    'Washing machine not spinning',
    'Microwave not heating',
  ],
  Painter: [
    'Damp wall patching & paint',
    'Balcony ceiling peeling',
    'Single bedroom repaint',
  ],
}

export default function ProblemDescriptionModal({
  worker: initialWorker,
  allWorkers,
  customerLocation = { lat: 12.9716, lng: 77.5946, label: 'Central Bangalore' },
  onConfirm,
  onInstantRequest,
  onInstantBook,
  onClose,
}: ProblemDescriptionModalProps) {
  const { t, lang } = useTranslation()
  const [currentWorker, setCurrentWorker] = useState<Worker>(initialWorker)
  const [problemText, setProblemText] = useState('')
  const [urgency, setUrgency] = useState<'Standard' | 'Urgent' | 'Emergency'>('Standard')

  const availableIssues = useMemo(() => {
    return (
      COMMON_ISSUES[currentWorker.service] || [
        'Routine maintenance',
        'Emergency repair',
        'Inspection & estimate',
        'Installation work',
      ]
    )
  }, [currentWorker.service])

  // Live AI Allocation Analysis
  const allocation = useMemo(() => {
    return analyzeProblemAllocation(
      currentWorker,
      problemText,
      urgency,
      allWorkers,
      customerLocation,
      lang
    )
  }, [currentWorker, problemText, urgency, allWorkers, customerLocation, lang])

  const handleToggleIssue = (issue: string) => {
    if (problemText.includes(issue)) {
      setProblemText((prev) =>
        prev
          .replace(issue, '')
          .replace(/,\s*,/g, ',')
          .trim()
          .replace(/^,\s*|,\s*$/g, '')
      )
    } else {
      setProblemText((prev) => (prev ? `${prev}, ${issue}` : issue))
    }
  }

  const handleSwitchWorker = (altWorker: Worker) => {
    setCurrentWorker(altWorker)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm({
      worker: currentWorker,
      problemDescription: problemText || 'General service requested',
      urgency,
      aiMatchScore: allocation.matchScore,
      fairPriceEstimate: allocation.fairPriceEstimate,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="problem-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="problem-modal-title"
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="problem-modal-header">
          <div className="ai-badge-header">
            <Sparkles size={14} className="sparkle-icon" />
            <span>AI-Powered Worker Allocation</span>
          </div>
          <h2 id="problem-modal-title">Describe Your Problem</h2>
          <p className="modal-subtext">
            Provide issue details so our cooperative matching engine can verify specialized tools,
            calculate accurate resolution time, and optimize your dispatch.
          </p>
        </div>

        {/* Selected Worker Mini-Card */}
        <div className="worker-allocation-preview">
          <div className={`person-avatar ${currentWorker.color || 'mint'}`}>
            {currentWorker.initials}
          </div>
          <div className="preview-meta">
            <div className="preview-top">
              <b>{currentWorker.name}</b>
              <span className="worker-price">₹{currentWorker.price}/hr</span>
            </div>
            <div className="preview-sub">
              <span>{currentWorker.service}</span>
              <span>·</span>
              <span className="rating-tag">
                <Star size={11} fill="#b17a14" color="#b17a14" />
                {currentWorker.rating} ({currentWorker.completedJobs} jobs)
              </span>
              <span>·</span>
              <span>{currentWorker.cooperative}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="problem-modal-form">
          {/* Quick Problem Tag Chips */}
          <div className="issue-chips-section">
            <label className="field-label">Quick select common issues:</label>
            <div className="issue-chips-wrap">
              {availableIssues.map((issue) => {
                const isSelected = problemText.includes(issue)
                return (
                  <button
                    key={issue}
                    type="button"
                    className={`issue-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => handleToggleIssue(issue)}
                  >
                    {isSelected && <CheckCircle2 size={12} className="chip-check" />}
                    {issue}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description Textarea */}
          <div className="form-group">
            <label htmlFor="problem-desc" className="field-label">
              Detailed problem description:
            </label>
            <textarea
              id="problem-desc"
              rows={3}
              className="problem-textarea"
              placeholder="e.g., Kitchen sink pipe has a crack underneath and water is pooling on the floor whenever the tap runs..."
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
            />
          </div>

          {/* Urgency Selection */}
          <div className="form-group">
            <label className="field-label">Urgency Level:</label>
            <div className="urgency-selector">
              {(['Standard', 'Urgent', 'Emergency'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  className={`urgency-btn ${urgency === u ? 'active ' + u.toLowerCase() : ''}`}
                  onClick={() => setUrgency(u)}
                >
                  {u === 'Emergency' && <AlertTriangle size={13} className="urgency-icon" />}
                  {u === 'Urgent' && <Zap size={13} className="urgency-icon" />}
                  {u === 'Standard' && <Clock size={13} className="urgency-icon" />}
                  <span>{u}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live AI Allocation Analysis Box */}
          <div className="ai-analysis-card">
            <div className="analysis-top">
              <div className="match-pill">
                <Sparkles size={13} />
                <span>AI Allocation Score: {allocation.matchScore}%</span>
              </div>
              <div className="est-pill">
                <span>Fair Rate: ₹{allocation.fairPriceEstimate}</span>
                <span className="est-duration">· {allocation.estimatedDuration}</span>
              </div>
            </div>
            <p className="analysis-explanation">{allocation.explanation}</p>

            {/* Smart alternative worker suggestion if available */}
            {allocation.betterAlternativeWorker && (
              <div className="alternative-worker-box">
                <div className="alt-text">
                  <span className="alt-badge">Cooperative Recommendation</span>
                  <p>{allocation.betterAlternativeReason}</p>
                </div>
                <button
                  type="button"
                  className="switch-worker-btn"
                  onClick={() => handleSwitchWorker(allocation.betterAlternativeWorker!)}
                >
                  Switch to {allocation.betterAlternativeWorker.name}
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="problem-modal-actions">
            <button
              type="button"
              className="secondary-btn instant-skip-btn"
              onClick={() => {
                if (onInstantBook) onInstantBook(currentWorker)
                else if (onInstantRequest) onInstantRequest(currentWorker)
              }}
              title="Request immediately without specifying details"
            >
              Instant Request (Skip Details)
            </button>
            <button type="submit" className="primary-btn submit-allocation-btn">
              <Sparkles size={15} />
              Confirm with AI Allocation
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
