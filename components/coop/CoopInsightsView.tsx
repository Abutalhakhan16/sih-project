'use client'

import React from 'react'
import { CoopStats, DemandForecast } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import {
  Users,
  ShieldCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  Wallet,
  Star,
  MapPin,
  Sparkles,
  AlertTriangle,
  Calendar,
  CloudSun,
} from 'lucide-react'

interface CoopInsightsViewProps {
  stats: CoopStats
  forecast: DemandForecast[]
}

export default function CoopInsightsView({ stats, forecast }: CoopInsightsViewProps) {
  const { t, lang } = useTranslation()

  return (
    <div className="coop-insights-page">
      {/* Header */}
      <div className="welcome-line">
        <div>
          <div className="eyebrow">{t('coopStats.eyebrow')}</div>
          <h2>{t('coopStats.title')}</h2>
          <p className="muted">{t('coopStats.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pill pill-yellow">
            <Sparkles size={12} /> {t('common.syntheticDataNote')}
          </span>
          <span className="pill pill-green">
            <ShieldCheck size={12} /> 100% {t('payments.transparentTag')}
          </span>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="worker-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card">
          <span className="stat-icon green">
            <Users size={18} />
          </span>
          <small>{t('coopStats.totalWorkers')}</small>
          <strong>{stats.totalWorkers}</strong>
          <span className="stat-change">{stats.verifiedWorkers} {t('common.verified')}</span>
        </div>

        <div className="stat-card">
          <span className="stat-icon blue">
            <Briefcase size={18} />
          </span>
          <small>{t('coopStats.activeJobs')}</small>
          <strong>{stats.activeJobs}</strong>
          <span className="stat-change">{stats.pendingJobs} {t('status.Pending')}</span>
        </div>

        <div className="stat-card">
          <span className="stat-icon peach">
            <TrendingUp size={18} />
          </span>
          <small>{t('coopStats.workerUtilization')}</small>
          <strong>{stats.workerUtilization}%</strong>
          <span className="stat-change">+6% vs last week</span>
        </div>

        <div className="stat-card">
          <span className="stat-icon green">
            <Star size={18} />
          </span>
          <small>{t('coopStats.avgRating')}</small>
          <strong>{stats.averageRating} <small>/ 5.0</small></strong>
          <span className="stat-change">{stats.completedJobs} {t('status.Completed')}</span>
        </div>
      </div>

      {/* Financial Marketplace Volume Breakdown */}
      <div className="payment-split" style={{ marginBottom: '24px' }}>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('coopStats.grossRevenue')}</h3>
              <p className="muted">Total platform transactions this month</p>
            </div>
            <Wallet size={20} className="green-icon" />
          </div>
          <div className="big-amount">₹{stats.revenue.toLocaleString('en-IN')}</div>
          <div className="split-line">
            <span>
              {t('coopStats.distributedEarnings')} <b>₹{stats.workerEarnings.toLocaleString('en-IN')} (75%)</b>
            </span>
            <span>
              Co-op Operations & Tech <b>₹{Math.round(stats.revenue * 0.20).toLocaleString('en-IN')} (20%)</b>
            </span>
            <span>
              Community Welfare & Emergency Fund <b>₹{Math.round(stats.revenue * 0.05).toLocaleString('en-IN')} (5%)</b>
            </span>
          </div>
        </div>

        {/* AI Synthetic Prediction Callout Banner */}
        <div className="panel fairness-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={20} />
            <span className="pill pill-yellow" style={{ fontSize: '10px' }}>
              {t('common.syntheticDataNote')}
            </span>
          </div>
          <h3 style={{ marginTop: '6px' }}>{t('aiForecast.bannerTitle')}</h3>
          <p style={{ lineHeight: '1.6' }}>
            <b>{t('aiForecast.predictedSpike')}</b>
          </p>
          <div style={{ background: '#fff', padding: '10px 14px', borderRadius: '8px', marginTop: '14px', fontSize: '11px', color: '#527361', border: '1px solid #cce4d4' }}>
            {t('aiForecast.syntheticDisclaimer')}
          </div>
        </div>
      </div>

      {/* Dual Table / Chart Panels: Demand by Zone & Top Trades */}
      <div className="lower-grid" style={{ marginBottom: '24px' }}>
        {/* Demand by Zone Table */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('coopStats.demandByAreaTitle')}</h3>
              <p className="muted">Live distribution across Bengaluru metro sectors</p>
            </div>
            <MapPin size={18} className="green-icon" />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.demandByArea.map((area, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#f8fbf8',
                  border: '1px solid var(--border)',
                  fontSize: '12px',
                }}
              >
                <div>
                  <b>{area.zone}</b>
                  <small style={{ display: 'block', color: 'var(--muted-foreground)' }}>
                    {area.activeWorkers} {t('coopStats.activeWorkers')}
                  </small>
                </div>
                <span className="pill pill-green" style={{ fontSize: '11px' }}>
                  {area.requests} {t('coopStats.requests')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Trades Breakdown */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>{t('coopStats.topServicesTitle')}</h3>
              <p className="muted">Most requested trades this month</p>
            </div>
            <Briefcase size={18} className="green-icon" />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.topServices.map((trade, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <b>{t(`categories.${trade.name}`) || trade.name}</b>
                  <span>{trade.count} {t('coopStats.requests')} ({trade.percentage}%)</span>
                </div>
                <div style={{ height: '7px', background: 'var(--muted)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${trade.percentage * 2.5}%`,
                      background: i === 0 ? '#176b4d' : i === 1 ? '#397192' : '#d49c20',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7-Day AI Demand Forecast Table */}
      <div className="panel table-panel">
        <div style={{ padding: '18px 21px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px' }}>{t('workerDash.demandForecast')}</h3>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: '12px' }}>
              {t('workerDash.forecastSubtext')}
            </p>
          </div>
          <span className="pill pill-yellow">
            <Sparkles size={12} /> {t('common.syntheticDataNote')}
          </span>
        </div>

        <div className="table-row table-head" style={{ gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1fr 1fr 2fr' }}>
          <span>{t('bookings.dateHead')}</span>
          <span>{t('coopStats.zone')}</span>
          <span>{t('bookings.serviceHead')}</span>
          <span>{t('coopStats.requests')}</span>
          <span>Weather</span>
          <span>Prediction / Recommendation</span>
        </div>

        {forecast.map((fc) => (
          <div
            className="table-row"
            key={fc.id}
            style={{ gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1fr 1fr 2fr', fontSize: '12px' }}
          >
            <span>
              <b>{fc.date}</b>
              {fc.holiday && <span className="pill pill-yellow" style={{ marginLeft: '6px', fontSize: '9px' }}>Weekend</span>}
            </span>
            <span>{fc.zone}</span>
            <span>{t(`categories.${fc.serviceType}`) || fc.serviceType}</span>
            <span>
              <b>{fc.requests}</b> <small style={{ color: '#176b4d', fontWeight: 700 }}>+{fc.trendPercent}%</small>
            </span>
            <span>
              <CloudSun size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
              {fc.weather}
            </span>
            <span style={{ color: 'var(--foreground)', fontSize: '11px', lineHeight: '1.4' }}>
              {fc.predictionText}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
