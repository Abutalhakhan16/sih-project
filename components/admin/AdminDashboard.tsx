'use client'

import React, { useEffect, useState } from 'react'
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
  Search,
  Check,
  X,
  Filter,
  LogOut,
  ChevronRight,
  BarChart3,
  Layers,
  ArrowRight,
  Building2,
  Award,
} from 'lucide-react'
import { Worker, Booking, CoopStats } from '@/lib/types'
import { initialCoopStats, initialWorkers, initialBookings } from '@/lib/mock-data'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import ThemeToggle from '@/components/ui/ThemeToggle'
import Chatbot from '@/components/chat/Chatbot'
import dynamic from 'next/dynamic'
import { adminApi, aiApi, servicesApi, ServiceItem, AIForecastResponse, WorkforceRecommendationResponse } from '@/lib/api'

const AdminCityMap = dynamic(() => import('@/components/map/AdminCityMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--muted, #f3f4f6)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
      }}
    >
      <span>Loading Bhopal Operations Map...</span>
    </div>
  ),
})

interface AdminDashboardProps {
  onLogout: () => void
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const { t, lang } = useTranslation()
  const [activeTab, setActiveTab] = useState<'Overview' | 'Live Map' | 'Workers' | 'Federation Societies' | 'Bookings' | 'Forecast' | 'Services'>('Overview')
  
  // Data states
  const [stats, setStats] = useState<CoopStats | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [forecast, setForecast] = useState<AIForecastResponse | null>(null)
  const [recommendation, setRecommendation] = useState<WorkforceRecommendationResponse | null>(null)
  
  // UI states
  const [loading, setLoading] = useState<boolean>(true)
  const [notice, setNotice] = useState<string>('')
  const [workerFilter, setWorkerFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [bookingFilter, setBookingFilter] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, workersData, bookingsData, servicesData, forecastData, recData] = await Promise.all([
        adminApi.getAdminDashboard().catch(() => null),
        adminApi.getAdminWorkers().catch(() => []),
        adminApi.getAdminBookings().catch(() => []),
        servicesApi.getServices().catch(() => []),
        aiApi.getAIForecast('Plumber', 'Central Zone').catch(() => null),
        aiApi.getWorkforceRecommendation('Plumber', 'Central Zone').catch(() => null),
      ])
      setStats(statsData || initialCoopStats)
      setWorkers(workersData && workersData.length > 0 ? workersData : initialWorkers)
      setBookings(bookingsData && bookingsData.length > 0 ? bookingsData : initialBookings)
      setServices(servicesData && servicesData.length > 0 ? servicesData : [])
      setForecast(forecastData)
      setRecommendation(recData)
    } catch (err: any) {
      setStats(initialCoopStats)
      setWorkers(initialWorkers)
      setBookings(initialBookings)
      setNotice(err.message || 'Displaying local cooperative data.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyWorker = async (workerId: number, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const updated = await adminApi.verifyWorker(workerId, status)
      setWorkers((prev) =>
        prev.map((w) => (w.id === workerId ? { ...w, verificationStatus: (status === 'VERIFIED' ? 'Verified' : 'Rejected') as any, verified: status === 'VERIFIED' } : w))
      )
      setNotice(
        status === 'VERIFIED'
          ? (lang === 'hi' ? 'सेवा कर्मी को सत्यापित कर दिया गया है।' : 'Worker has been approved and verified.')
          : (lang === 'hi' ? 'सत्यापन अस्वीकार किया गया।' : 'Worker verification was rejected.')
      )
    } catch (err: any) {
      setNotice(err.message || 'Failed to update verification status.')
    }
  }

  const filteredWorkers = workers.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.service.toLowerCase().includes(searchQuery.toLowerCase())
    if (workerFilter === 'pending') return matchesSearch && (w.verificationStatus === 'Pending' || !w.verified)
    if (workerFilter === 'verified') return matchesSearch && (w.verificationStatus === 'Verified' || w.verified)
    return matchesSearch
  })

  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'active') {
      return ['Requested', 'Matching', 'Accepted', 'On the Way', 'In Progress', 'Arrived', 'Pending'].includes(b.status)
    }
    if (bookingFilter === 'completed') {
      return ['Completed', 'Paid', 'Rated'].includes(b.status)
    }
    if (bookingFilter === 'cancelled') {
      return ['Cancelled', 'Rejected'].includes(b.status)
    }
    return true
  })

  return (
    <div className="dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Users size={17} />
          </span>
          <span>
            Co-op<span className="brand-accent">Serve</span>
          </span>
        </div>

        <div className="workspace">
          <span className="person-avatar blue">AD</span>
          <span>
            Cooperative Admin
            <small>Bhopal Central, MP</small>
          </span>
          <ChevronRight size={15} />
        </div>

        <nav>
          <button
            className={activeTab === 'Overview' ? 'nav-active' : ''}
            onClick={() => setActiveTab('Overview')}
          >
            <BarChart3 size={18} />
            {lang === 'hi' ? 'अवलोकन और एनालिटिक्स' : 'Overview & Analytics'}
          </button>
          <button
            className={activeTab === 'Live Map' ? 'nav-active' : ''}
            onClick={() => setActiveTab('Live Map')}
          >
            <MapPin size={18} />
            {lang === 'hi' ? 'भोपाल लाइव मैप' : 'Bhopal Live Map'}
          </button>
          <button
            className={activeTab === 'Workers' ? 'nav-active' : ''}
            onClick={() => setActiveTab('Workers')}
          >
            <Users size={18} />
            {lang === 'hi' ? 'सेवा कर्मी सत्यापन' : 'Worker Verification'}
            {workers.filter((w) => w.verificationStatus === 'Pending' || !w.verified).length > 0 && (
              <span className="pill pill-yellow" style={{ marginLeft: 'auto', fontSize: '10px' }}>
                {workers.filter((w) => w.verificationStatus === 'Pending' || !w.verified).length}
              </span>
            )}
          </button>
          <button
            className={activeTab === 'Federation Societies' ? 'nav-active' : ''}
            onClick={() => setActiveTab('Federation Societies')}
          >
            <Building2 size={18} />
            {lang === 'hi' ? 'सहकारी समितियां' : 'Federation Societies'}
          </button>
          <button
            className={activeTab === 'Bookings' ? 'nav-active' : ''}
            onClick={() => setActiveTab('Bookings')}
          >
            <Briefcase size={18} />
            {lang === 'hi' ? 'सक्रिय कार्य निगरानी' : 'Active Bookings'}
          </button>
          <button
            className={activeTab === 'Forecast' ? 'nav-active' : ''}
            onClick={() => setActiveTab('Forecast')}
          >
            <Sparkles size={18} />
            {lang === 'hi' ? 'AI मांग पूर्वानुमान' : 'AI Demand Forecast'}
          </button>
          <button
            className={activeTab === 'Services' ? 'nav-active' : ''}
            onClick={() => setActiveTab('Services')}
          >
            <Layers size={18} />
            {lang === 'hi' ? 'सेवाएं सूची' : 'Service Catalog'}
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="coop-note">
            <ShieldCheck size={17} />
            <span>
              <b>Admin Access</b>
              <small>RBAC Authorized</small>
            </span>
          </div>
          <button className="logout" onClick={onLogout}>
            <LogOut size={17} /> {t('common.exitDemo')}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="dash-main">
        <header className="dash-header">
          <div className="crumb">
            Admin Portal <ChevronRight size={14} />
            <b>{activeTab}</b>
          </div>
          <div className="header-actions">
            <LanguageSwitcher />
            <ThemeToggle />
            <span className="pill pill-green">
              <span className="live-dot" /> Live System
            </span>
          </div>
        </header>

        <div className="dash-content">
          {notice && (
            <div className="notice mb-4">
              <Check size={16} />
              <span>{notice}</span>
              <button onClick={() => setNotice('')}>
                <X size={15} />
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'Overview' && stats && (
            <>
              <div className="welcome-line">
                <div>
                  <div className="eyebrow">COOPERATIVE INTELLIGENCE · BHOPAL MP</div>
                  <h2>Governance & Performance Hub</h2>
                  <p className="muted">Real-time surveillance & transparent metrics across Bhopal district</p>
                </div>
                <button className="outline-button" onClick={loadData}>
                  Refresh Data
                </button>
              </div>

              {/* BHOPAL CITY LIVE OPERATIONS MAP */}
              <AdminCityMap
                workers={workers}
                bookings={bookings}
                onVerifyWorker={handleVerifyWorker}
                height="420px"
              />

              {/* STATS GRID */}
              <div className="worker-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
                <div className="stat-card">
                  <span className="stat-icon green">
                    <Users size={18} />
                  </span>
                  <small>Total Cooperative Workers</small>
                  <strong>{stats.totalWorkers}</strong>
                  <span className="stat-change">{stats.verifiedWorkers} Verified Members</span>
                </div>

                <div className="stat-card">
                  <span className="stat-icon blue">
                    <Briefcase size={18} />
                  </span>
                  <small>Active Marketplace Jobs</small>
                  <strong>{stats.activeJobs}</strong>
                  <span className="stat-change">{stats.pendingJobs} Awaiting Match/Accept</span>
                </div>

                <div className="stat-card">
                  <span className="stat-icon peach">
                    <TrendingUp size={18} />
                  </span>
                  <small>Worker Utilization Rate</small>
                  <strong>{stats.workerUtilization}%</strong>
                  <span className="stat-change">Optimally distributed</span>
                </div>

                <div className="stat-card">
                  <span className="stat-icon green">
                    <Star size={18} />
                  </span>
                  <small>Community Trust Score</small>
                  <strong>{stats.averageRating} <small>/ 5.0</small></strong>
                  <span className="stat-change">{stats.completedJobs} Completed Jobs</span>
                </div>
              </div>

              {/* FINANCIALS PANEL */}
              <div className="payment-split" style={{ marginBottom: '24px' }}>
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>Marketplace Gross Volume</h3>
                      <p className="muted">Total settled transaction volume</p>
                    </div>
                    <Wallet size={20} className="green-icon" />
                  </div>
                  <div className="big-amount">₹{stats.revenue.toLocaleString('en-IN')}</div>
                  <div className="split-line">
                    <span>
                      Direct Worker Earnings: <b>₹{stats.workerEarnings.toLocaleString('en-IN')} (75%)</b>
                    </span>
                    <span>
                      Co-op Fund: <b>₹{Math.round(stats.revenue * 0.2).toLocaleString('en-IN')} (20%)</b>
                    </span>
                    <span>
                      Welfare Reserve: <b>₹{Math.round(stats.revenue * 0.05).toLocaleString('en-IN')} (5%)</b>
                    </span>
                  </div>
                </div>
              </div>

              {/* DEMAND BREAKDOWN */}
              <div className="worker-grid">
                <div className="panel">
                  <h3>Top Requested Services</h3>
                  <p className="muted">Services driving community demand</p>
                  <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
                    {stats.topServices?.length > 0 ? (
                      stats.topServices.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span><b>{s.name}</b> ({s.count} requests)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '40%' }}>
                            <div style={{ flex: 1, background: 'var(--border)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${s.percentage}%`, background: '#176b4d', height: '100%' }} />
                            </div>
                            <small>{s.percentage}%</small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="muted">No service records yet.</p>
                    )}
                  </div>
                </div>

                <div className="panel">
                  <h3>Zonal Activity Distribution</h3>
                  <p className="muted">Workforce coverage across city zones</p>
                  <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
                    {stats.demandByArea?.map((area, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <b>{area.zone}</b>
                          <p className="muted" style={{ fontSize: '11px', margin: 0 }}>{area.requests} total requests</p>
                        </div>
                        <span className="pill pill-green">
                          {area.activeWorkers} Active Workers
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB: BHOPAL LIVE MAP */}
          {activeTab === 'Live Map' && (
            <>
              <div className="welcome-line">
                <div>
                  <div className="eyebrow">DISTRICT DISPATCH & SURVEILLANCE</div>
                  <h2>Bhopal Metro Live Operations Map</h2>
                  <p className="muted">Real-time geographic surveillance across Arera Colony, MP Nagar, TT Nagar, Kolar Road, and all Bhopal zones</p>
                </div>
                <button className="outline-button" onClick={loadData}>
                  Refresh Map
                </button>
              </div>

              <AdminCityMap
                workers={workers}
                bookings={bookings}
                onVerifyWorker={handleVerifyWorker}
                height="620px"
              />
            </>
          )}

          {/* TAB 2: WORKER VERIFICATION */}
          {activeTab === 'Workers' && (
            <>
              <div className="welcome-line">
                <div>
                  <div className="eyebrow">COMMUNITY TRUST & SAFETY</div>
                  <h2>Worker Verification & Skills</h2>
                  <p className="muted">Approve credentials and certifications for cooperative workers</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`text-button ${workerFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setWorkerFilter('all')}
                  >
                    All ({workers.length})
                  </button>
                  <button
                    className={`text-button ${workerFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setWorkerFilter('pending')}
                  >
                    Pending Verification ({workers.filter((w) => w.verificationStatus === 'Pending' || !w.verified).length})
                  </button>
                  <button
                    className={`text-button ${workerFilter === 'verified' ? 'active' : ''}`}
                    onClick={() => setWorkerFilter('verified')}
                  >
                    Verified ({workers.filter((w) => w.verificationStatus === 'Verified' || w.verified).length})
                  </button>
                </div>
              </div>

              <div className="search-bar" style={{ marginBottom: '16px' }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search workers by name or trade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="panel table-panel">
                <div className="table-row table-head">
                  <span>Worker</span>
                  <span>Service / Skill</span>
                  <span>Experience</span>
                  <span>Rating</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {filteredWorkers.map((w) => (
                  <div className="table-row" key={w.id}>
                    <span>
                      <b>{w.name}</b>
                      <small style={{ display: 'block', color: 'var(--muted-foreground)' }}>{w.cooperative || 'Bhopal Kaushalya Seva Sahakari'}</small>
                      {w.certifications?.[0] && (
                        <small style={{ display: 'block', color: '#15803d', fontSize: '10px', fontWeight: 600 }}>
                          ✓ {w.certifications[0]}
                        </small>
                      )}
                    </span>
                    <span>{w.service || w.primarySkill}</span>
                    <span>{w.experience} yrs</span>
                    <span>★ {w.rating} ({w.reviews} reviews)</span>
                    <span>
                      <span className={`pill ${w.verified || w.verificationStatus === 'Verified' ? 'pill-green' : 'pill-yellow'}`}>
                        {w.verified || w.verificationStatus === 'Verified' ? 'Verified' : 'Pending'}
                      </span>
                    </span>
                    <span style={{ display: 'flex', gap: '8px' }}>
                      {w.verificationStatus !== 'Verified' && !w.verified ? (
                        <>
                          <button
                            type="button"
                            className="text-button"
                            style={{ color: '#176b4d', fontWeight: 700 }}
                            onClick={() => handleVerifyWorker(w.id, 'VERIFIED')}
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            type="button"
                            className="text-button danger"
                            onClick={() => handleVerifyWorker(w.id, 'REJECTED')}
                          >
                            <X size={14} /> Reject
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="text-button danger"
                          onClick={() => handleVerifyWorker(w.id, 'REJECTED')}
                        >
                          Revoke
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB: FEDERATION SOCIETIES */}
          {activeTab === 'Federation Societies' && (
            <>
              <div className="welcome-line">
                <div>
                  <div className="eyebrow">COOPERATIVE REGISTRY · BHOPAL FEDERATION</div>
                  <h2>Primary Labour Cooperative Societies (PACS / LCS)</h2>
                  <p className="muted">Constituent labour societies affiliated with the Madhya Pradesh Cooperative Federation</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="pill pill-green">
                    <CheckCircle2 size={12} /> 4 Active Societies
                  </span>
                  <span className="pill pill-blue">
                    <ShieldCheck size={12} /> 100% Social Compliance
                  </span>
                </div>
              </div>

              {/* Cooperative Societies Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                  {
                    name: 'Bhopal Kaushalya Seva Sahakari Maryadit',
                    regNo: 'MP-BHP-2019-041',
                    zones: 'MP Nagar, Arera Colony, TT Nagar',
                    workers: 28,
                    compliance: '98%',
                    welfareFund: '₹1,42,800',
                    trades: ['Plumber', 'Electrician', 'HVAC'],
                  },
                  {
                    name: 'MP Nagar Nirman & Vidyut Karmachari Sahakari',
                    regNo: 'MP-BHP-2020-072',
                    zones: 'MP Nagar, Hoshangabad Rd, Misrod',
                    workers: 19,
                    compliance: '96%',
                    welfareFund: '₹98,400',
                    trades: ['Electrician', 'Carpenter', 'Mason'],
                  },
                  {
                    name: 'Arera Nagar Kalyan Shramik Sahakari',
                    regNo: 'MP-BHP-2018-019',
                    zones: 'Arera Colony, Shahpura, Gulmohar',
                    workers: 14,
                    compliance: '99%',
                    welfareFund: '₹86,200',
                    trades: ['Caregiver', 'Cleaner', 'Painter'],
                  },
                  {
                    name: 'Kolar Road Nirman & Karigar Sahakari',
                    regNo: 'MP-BHP-2022-114',
                    zones: 'Kolar Road, Chuna Bhatti, Sarvadharma',
                    workers: 10,
                    compliance: '94%',
                    welfareFund: '₹52,900',
                    trades: ['Auto Mechanic', 'Gardener', 'Pest Control'],
                  },
                ].map((soc) => (
                  <div className="panel" key={soc.regNo} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="stat-icon green" style={{ marginBottom: 0 }}>
                        <Building2 size={18} />
                      </span>
                      <span className="pill pill-green" style={{ fontSize: '10px' }}>
                        {soc.compliance} Compliance
                      </span>
                    </div>
                    <b style={{ fontSize: '14px', lineHeight: 1.3 }}>{soc.name}</b>
                    <small className="muted">Reg. No: {soc.regNo}</small>
                    
                    <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 0', margin: '4px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                      <div>
                        <span className="muted" style={{ display: 'block' }}>Active Members</span>
                        <b style={{ fontSize: '14px' }}>{soc.workers}</b>
                      </div>
                      <div>
                        <span className="muted" style={{ display: 'block' }}>Welfare Escrow</span>
                        <b style={{ fontSize: '14px', color: 'var(--green)' }}>{soc.welfareFund}</b>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px' }}>
                      <span className="muted">Operational Zones: </span>
                      <b>{soc.zones}</b>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '6px' }}>
                      {soc.trades.map((t) => (
                        <span key={t} className="pill pill-neutral" style={{ fontSize: '9px', padding: '3px 8px' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB 3: BOOKINGS MONITOR */}
          {activeTab === 'Bookings' && (
            <>
              <div className="welcome-line">
                <div>
                  <div className="eyebrow">REAL-TIME OPERATIONS</div>
                  <h2>Active Marketplace Jobs</h2>
                  <p className="muted">Live status monitoring of customer requests and assignments</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`text-button ${bookingFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setBookingFilter('all')}
                  >
                    All ({bookings.length})
                  </button>
                  <button
                    className={`text-button ${bookingFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setBookingFilter('active')}
                  >
                    Active
                  </button>
                  <button
                    className={`text-button ${bookingFilter === 'completed' ? 'active' : ''}`}
                    onClick={() => setBookingFilter('completed')}
                  >
                    Completed
                  </button>
                </div>
              </div>

              <div className="panel table-panel">
                <div className="table-row table-head">
                  <span>ID & Service</span>
                  <span>Customer</span>
                  <span>Worker</span>
                  <span>Status</span>
                  <span>Amount</span>
                  <span>Scheduled</span>
                </div>
                {filteredBookings.map((b) => (
                  <div className="table-row" key={b.id}>
                    <span>
                      <b>#{b.id} {b.service}</b>
                      <small style={{ display: 'block', color: 'var(--muted-foreground)' }}>{b.address || 'Bengaluru'}</small>
                    </span>
                    <span>{b.customerName || `Customer #${b.customerId}`}</span>
                    <span>{b.worker || `Worker #${b.workerId}`}</span>
                    <span>
                      <span className={`pill ${b.status === 'Completed' || b.status === 'Paid' || b.status === 'Rated' ? 'pill-green' : b.status === 'Cancelled' ? 'pill-neutral' : 'pill-blue'}`}>
                        {b.status}
                      </span>
                    </span>
                    <span>₹{b.amount}</span>
                    <span>{b.date ? new Date(b.date).toLocaleDateString() : 'Today'}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB 4: AI FORECAST */}
          {activeTab === 'Forecast' && (
            <>
              <div className="welcome-line">
                <div>
                  <div className="eyebrow">PREDICTIVE ANALYTICS</div>
                  <h2>AI Demand Forecast & Workforce Planning</h2>
                  <p className="muted">Scikit-Learn powered demand projections paired with supply recommendations</p>
                </div>
              </div>

              <div className="worker-grid" style={{ marginBottom: '24px' }}>
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <span className="pill pill-lilac">
                        <Sparkles size={12} /> ML Model Projection
                      </span>
                      <h3>Tomorrow&apos;s Projected Demand</h3>
                      <p className="muted">{forecast?.location || 'Central Zone'} · {forecast?.service || 'Plumbing'}</p>
                    </div>
                    <TrendingUp size={24} className="green-icon" />
                  </div>
                  <div className="big-amount" style={{ color: '#176b4d' }}>
                    {forecast?.expected_requests || 8} <span style={{ fontSize: '18px', color: 'var(--muted-foreground)' }}>requests</span>
                  </div>
                  <p className="muted" style={{ marginTop: '8px' }}>
                    Algorithm: <b>{forecast?.source || 'scikit-learn-ridge'}</b>
                  </p>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <span className="pill pill-yellow">
                        <AlertTriangle size={12} /> Actionable Workforce Advisory
                      </span>
                      <h3>Supply vs Demand Recommendation</h3>
                      <p className="muted">Automated gap analysis for cooperative coordinators</p>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--foreground)' }}>
                      {recommendation?.recommendation || 'Central Zone has adequate available workforce.'}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                      <span>Predicted: <b>{recommendation?.predictedDemand || 8}</b></span>
                      <span>Available Supply: <b>{recommendation?.availableSupply || 6}</b></span>
                      <span>Gap: <b style={{ color: recommendation?.gap ? '#dc2626' : '#176b4d' }}>{recommendation?.gap || 0}</b></span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 5: SERVICE CATALOG */}
          {activeTab === 'Services' && (
            <>
              <div className="welcome-line">
                <div>
                  <div className="eyebrow">MARKETPLACE CATALOG</div>
                  <h2>Cooperative Services & Pricing</h2>
                  <p className="muted">Standardized baseline pricing and skill criteria</p>
                </div>
              </div>

              <div className="panel table-panel">
                <div className="table-row table-head">
                  <span>Category</span>
                  <span>Service Name</span>
                  <span>Base Price</span>
                  <span>Duration</span>
                  <span>Required Skill</span>
                </div>
                {services.map((s) => (
                  <div className="table-row" key={s.id}>
                    <span><span className="pill pill-blue">{s.category}</span></span>
                    <span><b>{s.name}</b></span>
                    <span>₹{s.base_price}</span>
                    <span>{s.estimated_duration}</span>
                    <span>{s.required_skill || s.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR FOR ADMIN */}
      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className={activeTab === 'Overview' ? 'mobile-nav-item active' : 'mobile-nav-item'}
          onClick={() => setActiveTab('Overview')}
        >
          <BarChart3 size={18} />
          <span>Overview</span>
        </button>
        <button
          type="button"
          className={activeTab === 'Live Map' ? 'mobile-nav-item active' : 'mobile-nav-item'}
          onClick={() => setActiveTab('Live Map')}
        >
          <MapPin size={18} />
          <span>Live Map</span>
        </button>
        <button
          type="button"
          className={activeTab === 'Workers' ? 'mobile-nav-item active' : 'mobile-nav-item'}
          onClick={() => setActiveTab('Workers')}
        >
          <Users size={18} />
          <span>Workers</span>
        </button>
        <button
          type="button"
          className={activeTab === 'Bookings' ? 'mobile-nav-item active' : 'mobile-nav-item'}
          onClick={() => setActiveTab('Bookings')}
        >
          <Briefcase size={18} />
          <span>Bookings</span>
        </button>
        <button
          type="button"
          className={activeTab === 'Forecast' ? 'mobile-nav-item active' : 'mobile-nav-item'}
          onClick={() => setActiveTab('Forecast')}
        >
          <Sparkles size={18} />
          <span>AI Forecast</span>
        </button>
      </nav>

      {/* CO-OPSERVE ADMIN AI ASSISTANT */}
      <Chatbot userRole="admin" />
    </div>
  )
}
