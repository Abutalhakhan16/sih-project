'use client'

import React, { useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  Filter,
  Home,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  X,
  Zap,
  Map as MapIcon,
  LayoutGrid,
  HeartPulse,
  Award,
  FileText,
  BarChart3,
} from 'lucide-react'
import {
  Role,
  Status,
  Worker,
  Booking,
  CustomerLocation,
  RankedWorker,
  CoopStats,
  DemandForecast,
  NotificationItem,
} from '@/lib/types'
import {
  categories,
  initialWorkers,
  initialBookings,
  initialCustomers,
  initialCoopStats,
  initialForecast,
  initialNotifications,
  demoWorkerWelfare,
} from '@/lib/mock-data'
import {
  calculateHaversineDistance,
  DEFAULT_CUSTOMER_LOCATION,
  formatDistance,
} from '@/lib/geo'
import { LanguageProvider, useTranslation } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import ClosestWorkerMapSection from '@/components/map/ClosestWorkerMapSection'
import BookingTrackingModal from '@/components/tracking/BookingTrackingModal'
import CoopInsightsView from '@/components/coop/CoopInsightsView'
import NotificationDropdown from '@/components/ui/NotificationDropdown'
import WorkerWelfareModal from '@/components/welfare/WorkerWelfareModal'

function Brand() {
  const { t } = useTranslation()
  return (
    <div className="brand">
      <span className="brand-mark">
        <Users size={17} />
      </span>
      <span>
        Co-op<span className="brand-accent">Serve</span>
      </span>
    </div>
  )
}

function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: string
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

function StatusPill({ status }: { status: Status }) {
  const { t } = useTranslation()
  const tone =
    status === 'Completed'
      ? 'green'
      : status === 'In Progress' || status === 'On the Way'
      ? 'lilac'
      : status === 'Accepted' || status === 'Assigned'
      ? 'blue'
      : status === 'Cancelled'
      ? 'neutral'
      : 'yellow'
  return <Pill tone={tone}>{t(`status.${status}`) || status}</Pill>
}

function Avatar({
  initials,
  color = 'mint',
}: {
  initials: string
  color?: string
}) {
  return <span className={`person-avatar ${color}`}>{initials}</span>
}

function Login({ onEnter }: { onEnter: (role: Role) => void }) {
  const { t, lang } = useTranslation()
  const [role, setRole] = useState<Role>('customer')

  return (
    <main className="auth-shell">
      <nav className="topbar">
        <Brand />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LanguageSwitcher />
          <Pill tone="green">
            <span className="live-dot" /> {t('common.liveDemo')}
          </Pill>
        </div>
      </nav>
      <section className="auth-grid">
        <div className="auth-copy">
          <Pill tone="green">{t('roles.welcomeEyebrow')}</Pill>
          <h1>
            {lang === 'hi' ? (
              <>सेवाएँ जो <em>लोगों</em> को प्राथमिकता देती हैं।</>
            ) : (
              <>Services that put <em>people</em> first.</>
            )}
          </h1>
          <p>{t('common.brandSubtext')}</p>
          <div className="proof-row">
            <div className="avatar-stack">
              <span>AN</span>
              <span>RK</span>
              <span>PS</span>
              <span>+2k</span>
            </div>
            <span>2,400+ {t('roles.doorwaySubtext')}</span>
          </div>
        </div>
        <div className="login-card">
          <div className="eyebrow">{t('roles.welcomeEyebrow')}</div>
          <h2>{t('roles.chooseDoorway')}</h2>
          <p className="muted">{t('roles.doorwaySubtext')}</p>
          <div className="role-switch">
            <button
              className={role === 'customer' ? 'active' : ''}
              onClick={() => setRole('customer')}
            >
              <Home size={17} />
              {t('common.customer')}
            </button>
            <button
              className={role === 'worker' ? 'active' : ''}
              onClick={() => setRole('worker')}
            >
              <Wrench size={17} />
              {t('common.worker')}
            </button>
          </div>
          <div className="demo-account">
            <Avatar
              initials={role === 'customer' ? 'AN' : 'RK'}
              color={role === 'customer' ? 'peach' : 'green'}
            />
            <div>
              <b>{role === 'customer' ? t('roles.demoCustomer') : t('roles.demoWorker')}</b>
              <small>
                {role === 'customer'
                  ? t('roles.demoCustomerSub')
                  : t('roles.demoWorkerSub')}
              </small>
            </div>
            <BadgeCheck size={17} />
          </div>
          <button className="primary full" onClick={() => onEnter(role)}>
            {role === 'customer' ? t('roles.enterCustomer') : t('roles.enterWorker')}{' '}
            <ArrowRight size={16} />
          </button>
          <p className="terms">{t('common.demoNotice')}</p>
        </div>
      </section>
      <footer className="auth-footer">
        <span>{t('common.ownedByPeople')}</span>
        <span>{t('common.transparentPricing')}</span>
      </footer>
    </main>
  )
}

function SideNav({
  role,
  active,
  setActive,
  logout,
}: {
  role: Role
  active: string
  setActive: (s: string) => void
  logout: () => void
}) {
  const { t, lang } = useTranslation()

  const links =
    role === 'customer'
      ? [
          ['Overview', t('nav.overview'), Home],
          ['Find a service', t('nav.findService'), Search],
          ['My bookings', t('nav.myBookings'), CalendarDays],
          ['Payments', t('nav.payments'), CreditCard],
          ['Co-op Insights', t('nav.coopInsights'), BarChart3],
          ['Profile & settings', t('nav.profileSettings'), Users],
        ]
      : [
          ['Overview', t('nav.overview'), Home],
          ['Job requests', t('nav.jobRequests'), Bell],
          ['My schedule', t('nav.mySchedule'), CalendarDays],
          ['Earnings', t('nav.earnings'), Wallet],
          ['Co-op Insights', t('nav.coopInsights'), BarChart3],
          ['My profile', t('nav.myProfile'), Users],
        ]

  return (
    <aside className="sidebar">
      <Brand />
      <div className="workspace">
        <Avatar
          initials={role === 'customer' ? 'AN' : 'RK'}
          color={role === 'customer' ? 'peach' : 'green'}
        />
        <span>
          {role === 'customer' ? 'Ananya Nair' : 'Ravi Kumar'}
          <small>
            {role === 'customer'
              ? `${t('common.customer')} · 2024`
              : `${t('common.worker')} · ${t('common.verified')}`}
          </small>
        </span>
        <ChevronRight size={15} />
      </div>
      <nav>
        {links.map(([key, label, Icon]) => (
          <button
            key={key as string}
            className={active === key ? 'nav-active' : ''}
            onClick={() => setActive(key as string)}
          >
            <Icon size={18} />
            {label as string}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="coop-note">
          <ShieldCheck size={17} />
          <span>
            <b>{t('nav.coopProtected')}</b>
            <small>{t('nav.fairWorkFairPay')}</small>
          </span>
        </div>
        <button className="logout" onClick={logout}>
          <LogOut size={17} /> {t('common.exitDemo')}
        </button>
      </div>
    </aside>
  )
}

function Header({
  role,
  onOpenNotifications,
  unreadCount,
}: {
  role: Role
  onOpenNotifications: () => void
  unreadCount: number
}) {
  const { t } = useTranslation()
  return (
    <header className="dash-header">
      <div className="mobile-brand">
        <Brand />
      </div>
      <div className="crumb">
        {t('nav.workspace')} <ChevronRight size={14} />
        <b>{role === 'customer' ? t('nav.customerDashboard') : t('nav.workerDashboard')}</b>
      </div>
      <div className="header-actions">
        {/* Bilingual Language Switcher */}
        <LanguageSwitcher />

        {/* Notifications Bell */}
        <button
          className="icon-button"
          aria-label={t('notifications.title')}
          onClick={onOpenNotifications}
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className="notification-dot" />}
        </button>
        <Avatar
          initials={role === 'customer' ? 'AN' : 'RK'}
          color={role === 'customer' ? 'peach' : 'green'}
        />
      </div>
    </header>
  )
}

function WorkerCard({
  worker,
  onRequest,
  onView,
}: {
  worker: Worker
  onRequest: () => void
  onView: () => void
}) {
  const { t } = useTranslation()
  const status = worker.currentStatus || worker.availability
  const isAvailable = status === 'Available'

  return (
    <article className="worker-card">
      <div className="worker-card-top">
        <Avatar initials={worker.initials} color={worker.color} />
        <div className="worker-main">
          <b>{worker.name}</b>
          <span>{t(`categories.${worker.service}`) || worker.service}</span>
          <span className="rating">
            <Star size={13} fill="currentColor" /> {worker.rating}{' '}
            <small>({worker.reviews})</small>
          </span>
        </div>
        <Pill
          tone={
            isAvailable
              ? 'green'
              : status === 'Busy' || status === 'On Job'
              ? 'yellow'
              : 'neutral'
          }
        >
          <span
            className={`availability-dot ${isAvailable ? 'available' : 'busy'}`}
          />
          {t(`status.${status}`) || status}
        </Pill>
      </div>
      <div className="worker-details">
        <span>
          <MapPin size={14} />
          {worker.distance ? `${worker.distance.toFixed(1)} km` : 'Nearby'}
        </span>
        <span>
          <BadgeCheck size={14} />
          {worker.experience} {t('map.yrs')}
        </span>
        <b>From ₹{worker.price}</b>
      </div>
      <div className="worker-actions">
        <button type="button" className="outline-button" onClick={onView}>
          {t('common.viewProfile')}
        </button>
        <button
          type="button"
          className="primary"
          disabled={status === 'Offline' || status === 'On Leave'}
          onClick={onRequest}
        >
          {status === 'Busy' || status === 'On Job'
            ? t('common.requestAnyway')
            : t('common.requestWorker')}{' '}
          <ArrowRight size={14} />
        </button>
      </div>
    </article>
  )
}

function CustomerDashboard({ onLogout }: { onLogout: () => void }) {
  const { t, lang } = useTranslation()
  const [active, setActive] = useState('Overview')
  const [service, setService] = useState('Plumber')
  const [sort, setSort] = useState<'distance' | 'rating'>('distance')
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')

  // Dynamic reactive workers and bookings state
  const [workersList, setWorkersList] = useState<Worker[]>(initialWorkers)
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [coopStats, setCoopStats] = useState<CoopStats>(initialCoopStats)
  const [forecast] = useState<DemandForecast[]>(initialForecast)
  const [notifications] = useState<NotificationItem[]>(initialNotifications)
  const [showNotifications, setShowNotifications] = useState(false)

  const [selected, setSelected] = useState<Worker | null>(null)
  const [notice, setNotice] = useState('')

  // Live tracking modal state
  const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null)

  // Customer location reference for distance calculation in grid view
  const defaultLoc = DEFAULT_CUSTOMER_LOCATION

  // Filtered & sorted workers list for "Find a service"
  const filtered = useMemo(() => {
    return workersList
      .filter((w) => {
        const matchesService =
          w.service.toLowerCase() === service.toLowerCase() ||
          (w.primarySkill && w.primarySkill.toLowerCase() === service.toLowerCase()) ||
          (w.secondarySkills && w.secondarySkills.some(s => s.toLowerCase().includes(service.toLowerCase())))
        const matchesQuery = w.name.toLowerCase().includes(query.toLowerCase())
        return matchesService && matchesQuery
      })
      .map((w) => {
        const dist = calculateHaversineDistance(
          defaultLoc.lat,
          defaultLoc.lng,
          w.lat,
          w.lng
        )
        return { ...w, distance: dist }
      })
      .sort((a, b) => {
        if (sort === 'distance') {
          return (a.distance || 0) - (b.distance || 0)
        }
        return b.rating - a.rating
      })
  }, [workersList, service, query, sort, defaultLoc.lat, defaultLoc.lng])

  // Booking action: switches worker status to Busy and updates dashboard stats
  const handleBookWorker = (
    w: Worker | RankedWorker,
    location?: CustomerLocation
  ) => {
    const loc = location || defaultLoc
    const bookingId = Date.now()

    // 1. Change worker status to 'Busy'
    setWorkersList((prev) =>
      prev.map((item) =>
        item.id === w.id
          ? { ...item, availability: 'Busy' as const, currentStatus: 'Busy' as const }
          : item
      )
    )

    // 2. Create updated booking entry
    const newBooking: Booking = {
      id: bookingId,
      service: w.service,
      worker: w.name,
      workerId: w.id,
      customerName: 'Ananya Nair',
      workerLat: w.lat,
      workerLng: w.lng,
      customerLat: loc.lat,
      customerLng: loc.lng,
      date: 'Today · ASAP',
      status: 'Accepted',
      amount: w.price,
      etaMinutes: (w as any).etaMinutes || 12,
      address: loc.label,
      invoiceNumber: `INV-2025-${bookingId.toString().slice(-4)}`,
      paymentMethod: 'Co-op Wallet Pay',
      workerEarnings: Math.round(w.price * 0.75),
      coopFee: Math.round(w.price * 0.20),
      communityFund: Math.round(w.price * 0.05),
    }

    setBookings((prev) => [newBooking, ...prev])

    // 3. Update dashboard aggregate counters dynamically
    setCoopStats((prev) => ({
      ...prev,
      activeJobs: prev.activeJobs + 1,
      totalRequests: prev.totalRequests + 1,
      revenue: prev.revenue + w.price,
      workerEarnings: prev.workerEarnings + Math.round(w.price * 0.75),
    }))

    // 4. Immediately display the worker on the customer's tracking screen
    setTrackingBooking(newBooking)
    setNotice(
      lang === 'hi'
        ? `${w.name} को अनुरोध भेजा गया! स्थिति 'व्यस्त' में अद्यतन और लाइव ट्रैकिंग सक्रिय।`
        : `Dispatched request to ${w.name}! Status updated to Busy and live tracking is now active.`
    )
  }

  const unreadCount = notifications.filter((n) => n.role === 'customer' && !n.read).length

  return (
    <div className="dashboard">
      <SideNav
        role="customer"
        active={active}
        setActive={setActive}
        logout={onLogout}
      />
      <div className="dash-main">
        <Header
          role="customer"
          onOpenNotifications={() => setShowNotifications(!showNotifications)}
          unreadCount={unreadCount}
        />
        <div className="dash-content">
          {/* OVERVIEW SCREEN */}
          {active === 'Overview' && (
            <>
              {/* REAL INTERACTIVE MAP FEATURE */}
              <ClosestWorkerMapSection
                workers={workersList}
                categories={categories}
                currentService={service}
                onServiceChange={setService}
                onBookWorker={handleBookWorker}
                onViewProfile={(w) => setSelected(w)}
              />

              <div className="welcome-line">
                <div>
                  <div className="eyebrow">{t('overview.todayIs')}</div>
                  <h2>{t('overview.goodMorning')}</h2>
                  <p className="muted">{t('overview.whatHelp')}</p>
                </div>
                <Pill tone="green">
                  <span className="live-dot" /> {t('overview.memberBenefits')}
                </Pill>
              </div>

              <div className="hero-booking">
                <div>
                  <Pill tone="yellow">{t('overview.needHelp')}</Pill>
                  <h3>{t('overview.findNearestHero')}</h3>
                  <p>{t('overview.heroSubtext')}</p>
                  <button
                    className="dark-button"
                    onClick={() => {
                      setActive('Find a service')
                      setViewMode('map')
                    }}
                  >
                    {t('overview.exploreOnMap')} <ArrowRight size={16} />
                  </button>
                </div>
                <div className="hero-art">
                  <span className="art-card art-one">
                    <MapPin size={14} /> Within 5 km
                  </span>
                  <span className="art-card art-two">
                    <Star size={14} fill="currentColor" /> 4.9 avg. rating
                  </span>
                  <div className="art-circle">
                    <Users size={42} />
                  </div>
                </div>
              </div>

              <div className="section-heading">
                <div>
                  <h3>{t('overview.popularServices')}</h3>
                  <p className="muted">{t('overview.vettedByCommunity')}</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setActive('Find a service')}
                >
                  {t('overview.viewAll')} <ArrowRight size={15} />
                </button>
              </div>

              <div className="service-grid">
                {categories.slice(0, 4).map((name, i) => (
                  <button
                    className="service-card"
                    key={name}
                    onClick={() => {
                      setService(name)
                      setActive('Find a service')
                    }}
                  >
                    <span
                      className={`service-icon ${
                        ['mint', 'blue', 'peach', 'lilac'][i]
                      }`}
                    >
                      <Wrench size={20} />
                    </span>
                    <b>{t(`categories.${name}`) || name}</b>
                    <small>{t('overview.nearbyWorkers')}</small>
                    <ChevronRight className="service-arrow" size={16} />
                  </button>
                ))}
              </div>

              <div className="lower-grid">
                <div className="panel booking-panel">
                  <div className="panel-head">
                    <div>
                      <h3>{t('overview.upcomingBooking')}</h3>
                      <p className="muted">{t('overview.yourNextService')}</p>
                    </div>
                    <StatusPill status={bookings[0]?.status || 'Accepted'} />
                  </div>
                  <div className="booking-person">
                    <Avatar
                      initials={
                        bookings[0]?.worker
                          .split(' ')
                          .map((n) => n[0])
                          .join('') || 'PS'
                      }
                      color="mint"
                    />
                    <div>
                      <b>{t(`categories.${bookings[0]?.service}`) || bookings[0]?.service || 'Deep home cleaning'}</b>
                      <span>
                        <CalendarDays size={14} /> {bookings[0]?.date || 'Wed, 13 Mar · 10:00 AM'}
                      </span>
                      <span>
                        <MapPin size={14} /> {bookings[0]?.address || '14 Palm Grove, Indiranagar'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="primary text-xs py-1 px-3"
                      style={{ marginLeft: 'auto', fontSize: '11px', padding: '6px 12px' }}
                      onClick={() => setTrackingBooking(bookings[0])}
                    >
                      <Navigation size={13} />
                      {t('overview.trackBtn')}
                    </button>
                  </div>
                  <div className="booking-progress">
                    <span className="done">
                      <Check size={12} />
                    </span>
                    <i className="filled" />
                    <span className="done">
                      <Check size={12} />
                    </span>
                    <i className="filled" />
                    <span>3</span>
                    <i />
                    <span>4</span>
                  </div>
                  <div className="progress-labels">
                    <small>{t('overview.stepRequested')}</small>
                    <small>{t('overview.stepAssigned')}</small>
                    <small>{t('overview.stepInProgress')}</small>
                    <small>{t('overview.stepComplete')}</small>
                  </div>
                </div>

                <div className="panel impact-panel">
                  <div className="panel-head">
                    <div>
                      <h3>{t('overview.coopImpact')}</h3>
                      <p className="muted">{t('overview.thisMonth')}</p>
                    </div>
                    <TrendingUp size={19} className="green-icon" />
                  </div>
                  <div className="impact-number">
                    ₹1,280 <small>{t('overview.spentLocally')}</small>
                  </div>
                  <div className="impact-bar">
                    <span />
                  </div>
                  <p className="muted">
                    {t('overview.impactSubtext', { hours: '6.4' })}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* FIND A SERVICE SCREEN */}
          {active === 'Find a service' && (
            <>
              <div className="welcome-line">
                <div>
                  <div className="eyebrow">{t('findService.marketplaceEyebrow')}</div>
                  <h2>{t('findService.title')}</h2>
                  <p className="muted">
                    {t('findService.workersNearby', {
                      count: filtered.length,
                      service: t(`categories.${service}`) || service,
                    })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`map-pill-btn ${viewMode === 'grid' ? 'active-pill' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid size={14} /> {t('findService.gridView')}
                  </button>
                  <button
                    type="button"
                    className={`map-pill-btn ${viewMode === 'map' ? 'active-pill' : ''}`}
                    onClick={() => setViewMode('map')}
                  >
                    <MapIcon size={14} /> {t('findService.mapView')}
                  </button>
                </div>
              </div>

              {/* MAP VIEW */}
              {viewMode === 'map' && (
                <ClosestWorkerMapSection
                  workers={workersList}
                  categories={categories}
                  currentService={service}
                  onServiceChange={setService}
                  onBookWorker={handleBookWorker}
                  onViewProfile={(w) => setSelected(w)}
                />
              )}

              {/* GRID VIEW */}
              {viewMode === 'grid' && (
                <>
                  <div className="finder-toolbar">
                    <div className="search-box">
                      <Search size={17} />
                      <input
                        placeholder={t('findService.searchPlaceholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <button
                      className="sort-button"
                      onClick={() =>
                        setSort(sort === 'distance' ? 'rating' : 'distance')
                      }
                    >
                      <SlidersHorizontal size={16} />{' '}
                      {t('findService.sortBy', {
                        sort: sort === 'distance' ? t('findService.nearest') : t('findService.topRated'),
                      })}
                    </button>
                  </div>

                  <div className="category-chips">
                    {categories.map((c) => (
                      <button
                        key={c}
                        className={service === c ? 'chosen' : ''}
                        onClick={() => setService(c)}
                      >
                        {t(`categories.${c}`) || c}
                      </button>
                    ))}
                  </div>

                  {notice && (
                    <div className="notice">
                      <Check size={16} />
                      {notice}
                      <button onClick={() => setNotice('')}>
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  <div className="worker-grid customer-workers">
                    {filtered.map((w) => (
                      <WorkerCard
                        key={w.id}
                        worker={w}
                        onRequest={() => handleBookWorker(w)}
                        onView={() => setSelected(w)}
                      />
                    ))}
                  </div>

                  {filtered.length === 0 && (
                    <div className="empty-state">
                      {t('findService.noResults')}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* MY BOOKINGS SCREEN */}
          {active === 'My bookings' && (
            <Bookings
              bookings={bookings}
              setBookings={setBookings}
              onTrack={(b) => setTrackingBooking(b)}
            />
          )}

          {/* PAYMENTS SCREEN */}
          {active === 'Payments' && <Payments />}

          {/* CO-OP INSIGHTS (SIH Cooperative Dashboard & AI Predictions) */}
          {active === 'Co-op Insights' && (
            <CoopInsightsView stats={coopStats} forecast={forecast} />
          )}

          {/* PROFILE & SETTINGS */}
          {active === 'Profile & settings' && <Profile role="customer" />}
        </div>
      </div>

      {/* PROFILE DETAIL MODAL */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div
            className="profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelected(null)}
            >
              <X size={18} />
            </button>
            <Avatar initials={selected.initials} color={selected.color} />
            <Pill tone="green">
              <BadgeCheck size={12} /> {t('common.verified')} {t('common.worker')}
            </Pill>
            <h2>{selected.name}</h2>
            <p className="muted">
              {t(`categories.${selected.service}`) || selected.service} ·{' '}
              {selected.distance ? `${selected.distance.toFixed(1)} km ${t('map.away')}` : 'Nearby'}
            </p>
            <div className="modal-stats">
              <span>
                <Star size={15} fill="currentColor" /> {selected.rating}
                <small>{selected.reviews} {lang === 'hi' ? 'समीक्षाएं' : 'reviews'}</small>
              </span>
              <span>
                <Clock3 size={15} />
                {selected.experience} {t('map.yrs')}
                <small>{t('map.experience')}</small>
              </span>
              <span>
                <Wallet size={15} />₹{selected.price}
                <small>{t('map.startingPrice')}</small>
              </span>
            </div>
            <p>{selected.bio}</p>

            {/* Certifications & Languages */}
            {selected.certifications && (
              <div style={{ margin: '14px 0', fontSize: '11px', color: 'var(--muted-foreground)' }}>
                <b style={{ color: 'var(--foreground)' }}>Certifications: </b>
                {selected.certifications.join(' · ')}
              </div>
            )}

            <button
              className="primary full"
              disabled={selected.availability === 'Offline' || selected.availability === 'On Leave'}
              onClick={() => {
                handleBookWorker(selected)
                setSelected(null)
              }}
            >
              {selected.availability === 'Busy' || selected.availability === 'On Job'
                ? t('common.requestAnyway')
                : t('common.requestWorker')}{' '}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* LIVE BOOKING TRACKING MODAL */}
      {trackingBooking && (
        <BookingTrackingModal
          booking={trackingBooking}
          worker={workersList.find((w) => w.id === trackingBooking.workerId)}
          onClose={() => setTrackingBooking(null)}
        />
      )}

      {/* NOTIFICATIONS DROPDOWN */}
      {showNotifications && (
        <NotificationDropdown
          notifications={notifications}
          role="customer"
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
  )
}

function Bookings({
  bookings,
  setBookings,
  onTrack,
}: {
  bookings: Booking[]
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>
  onTrack?: (b: Booking) => void
}) {
  const { t } = useTranslation()
  const [rated, setRated] = useState<number | null>(null)

  return (
    <>
      <div className="welcome-line">
        <div>
          <div className="eyebrow">{t('bookings.eyebrow')}</div>
          <h2>{t('bookings.title')}</h2>
          <p className="muted">{t('bookings.subtitle')}</p>
        </div>
        <button className="primary">
          {t('bookings.bookServiceBtn')} <ArrowRight size={15} />
        </button>
      </div>
      <div className="booking-summary">
        <span>
          <b>{bookings.length}</b> {t('bookings.totalBookings', { count: '' })}
        </span>
        <span>
          <b>{bookings.filter((b) => b.status === 'Completed').length}</b> {t('bookings.completedCount', { count: '' })}
        </span>
        <span>
          <b>
            {
              bookings.filter(
                (b) =>
                  b.status === 'Pending' ||
                  b.status === 'Accepted' ||
                  b.status === 'In Progress' ||
                  b.status === 'On the Way'
              ).length
            }
          </b>{' '}
          {t('bookings.activeCount', { count: '' })}
        </span>
      </div>
      <div className="panel table-panel">
        <div className="table-row table-head">
          <span>{t('bookings.serviceHead')}</span>
          <span>{t('bookings.workerHead')}</span>
          <span>{t('bookings.dateHead')}</span>
          <span>{t('bookings.statusHead')}</span>
          <span>{t('bookings.amountHead')}</span>
          <span>{t('bookings.actionHead')}</span>
        </div>
        {bookings.map((b) => (
          <div className="table-row" key={b.id}>
            <span>
              <b>{t(`categories.${b.service}`) || b.service}</b>
            </span>
            <span>{b.worker}</span>
            <span>{b.date}</span>
            <span>
              <StatusPill status={b.status} />
            </span>
            <span>₹{b.amount}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(b.status === 'Accepted' ||
                b.status === 'In Progress' ||
                b.status === 'On the Way' ||
                b.status === 'Pending') &&
                onTrack && (
                  <button
                    type="button"
                    className="text-button"
                    style={{ fontWeight: 700 }}
                    onClick={() => onTrack(b)}
                  >
                    <Navigation size={13} /> {t('common.trackWorker')}
                  </button>
                )}
              {b.status === 'Completed' && !rated ? (
                <button
                  className="text-button"
                  onClick={() => setRated(b.id)}
                >
                  <Star size={14} /> {t('bookings.rateBtn')}
                </button>
              ) : b.status === 'Pending' ? (
                <button
                  className="text-button danger"
                  onClick={() =>
                    setBookings((bs) => bs.filter((x) => x.id !== b.id))
                  }
                >
                  {t('bookings.cancelBtn')}
                </button>
              ) : rated === b.id ? (
                <span className="rated">
                  <Check size={13} /> {t('bookings.ratedThanks')}
                </span>
              ) : (
                <span className="muted">—</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

function Payments() {
  const { t } = useTranslation()
  return (
    <>
      <div className="welcome-line">
        <div>
          <div className="eyebrow">{t('payments.eyebrow')}</div>
          <h2>{t('payments.title')}</h2>
          <p className="muted">{t('payments.subtitle')}</p>
        </div>
      </div>
      <div className="payment-split">
        <div className="panel">
          <h3>{t('payments.statementTitle')}</h3>
          <p className="muted">{t('payments.statementSubtitle', { count: 5 })}</p>
          <div className="big-amount">₹1,680</div>
          <div className="split-line">
            <span>
              {t('payments.workerEarningsLabel')} <b>₹1,260 (75%)</b>
            </span>
            <span>
              {t('payments.coopOpsLabel')} <b>₹336 (20%)</b>
            </span>
            <span>
              {t('payments.communityFundLabel')} <b>₹84 (5%)</b>
            </span>
          </div>
        </div>
        <div className="panel fairness-card">
          <ShieldCheck size={26} />
          <h3>{t('payments.fairnessTitle')}</h3>
          <p>{t('payments.fairnessDesc')}</p>
          <Pill tone="green">{t('payments.transparentTag')}</Pill>
        </div>
      </div>
    </>
  )
}

function Profile({ role }: { role: Role }) {
  const { t } = useTranslation()
  return (
    <>
      <div className="welcome-line">
        <div>
          <div className="eyebrow">ACCOUNT SETTINGS</div>
          <h2>{role === 'customer' ? 'Ananya Nair' : 'Ravi Kumar'}</h2>
          <p className="muted">Manage your profile and community preferences.</p>
        </div>
        <Pill tone="green">
          <BadgeCheck size={12} /> {t('common.verified')} member
        </Pill>
      </div>
      <div className="profile-grid">
        <div className="panel profile-card">
          <Avatar
            initials={role === 'customer' ? 'AN' : 'RK'}
            color={role === 'customer' ? 'peach' : 'green'}
          />
          <h3>{role === 'customer' ? t('roles.demoCustomer') : t('roles.demoWorker')}</h3>
          <p className="muted">
            {role === 'customer'
              ? 'Indiranagar, Bengaluru'
              : 'Electrician · 8 years experience'}
          </p>
          <button className="outline-button">{t('common.edit')} profile</button>
        </div>
        <div className="panel settings-list">
          <div>
            <ShieldCheck size={18} />
            <span>
              <b>{t('nav.coopProtected')}</b>
              <small>Community guidelines and social protection are active.</small>
            </span>
            <ChevronRight size={16} />
          </div>
          <div>
            <Bell size={18} />
            <span>
              <b>{t('notifications.title')}</b>
              <small>Booking dispatch updates and direct messages.</small>
            </span>
            <ChevronRight size={16} />
          </div>
          <div>
            <CreditCard size={18} />
            <span>
              <b>{t('common.payment')} methods</b>
              <small>UPI, Co-op Fair Wallet & NetBanking enabled.</small>
            </span>
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </>
  )
}

function WorkerDashboard({ onLogout }: { onLogout: () => void }) {
  const { t, lang } = useTranslation()
  const [active, setActive] = useState('Overview')
  const [available, setAvailable] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [done, setDone] = useState(false)
  const [notice, setNotice] = useState('')
  const [showWelfare, setShowWelfare] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const [coopStats] = useState<CoopStats>(initialCoopStats)
  const [forecast] = useState<DemandForecast[]>(initialForecast)
  const [notifications] = useState<NotificationItem[]>(initialNotifications)

  const accept = () => {
    setAccepted(true)
    setNotice(
      lang === 'hi'
        ? 'अनुरोध स्वीकार किया गया। ग्राहक विवरण अब अनलॉक हो गए हैं।'
        : 'Request accepted. Customer details are now unlocked.'
    )
  }

  const unreadCount = notifications.filter((n) => n.role === 'worker' && !n.read).length

  return (
    <div className="dashboard">
      <SideNav
        role="worker"
        active={active}
        setActive={setActive}
        logout={onLogout}
      />
      <div className="dash-main">
        <Header
          role="worker"
          onOpenNotifications={() => setShowNotifications(!showNotifications)}
          unreadCount={unreadCount}
        />
        <div className="dash-content">
          {(active === 'Overview' || active === 'Job requests') && (
            <>
              <div className="welcome-line">
                <div>
                  <div className="eyebrow">{t('workerDash.spaceEyebrow')}</div>
                  <h2>{t('workerDash.welcomeBack')}</h2>
                  <p className="muted">{t('workerDash.skillsMakeStronger')}</p>
                </div>
                <button
                  className={`availability ${available ? 'is-on' : ''}`}
                  onClick={() => setAvailable(!available)}
                >
                  <span />
                  {available ? t('workerDash.availableForWork') : t('workerDash.offlineStatus')}
                </button>
              </div>

              <div className="worker-stats">
                <div className="stat-card">
                  <span className="stat-icon green">
                    <Wallet size={18} />
                  </span>
                  <small>{t('workerDash.monthEarnings')}</small>
                  <strong>{done ? '₹19,100' : '₹18,450'}</strong>
                  <span className="stat-change">+18% vs last month</span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon blue">
                    <Star size={18} />
                  </span>
                  <small>{t('workerDash.communityRating')}</small>
                  <strong>
                    4.9 <small>/ 5.0</small>
                  </strong>
                  <span className="stat-change">Top 8% of workers</span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon peach">
                    <Clock3 size={18} />
                  </span>
                  <small>{t('workerDash.hoursWorked')}</small>
                  <strong>
                    32.5 <small>hrs</small>
                  </strong>
                  <span className="stat-change">8 hrs open</span>
                </div>
              </div>

              {notice && (
                <div className="notice">
                  <Check size={16} />
                  {notice}
                  <button onClick={() => setNotice('')}>
                    <X size={15} />
                  </button>
                </div>
              )}

              <div className="worker-grid">
                <div className="panel request-panel">
                  <div className="panel-head">
                    <div>
                      <Pill tone="yellow">
                        <span className="pulse-dot" /> {t('workerDash.newRequest')}
                      </Pill>
                      <h3>Deep Home Cleaning</h3>
                      <p className="muted">Requested by Ananya Nair · 2 min ago</p>
                    </div>
                    <b className="request-price">₹650</b>
                  </div>
                  <div className="request-meta">
                    <span>
                      <MapPin size={15} />
                      1.8 km {t('map.away')}
                    </span>
                    <span>
                      <Clock3 size={15} />
                      2.5 hours
                    </span>
                    <span>
                      <CalendarDays size={15} />
                      Tomorrow, 10 AM
                    </span>
                  </div>
                  <div className="fair-match">
                    <div className="match-score">
                      94<span>%</span>
                    </div>
                    <div>
                      <b>{t('workerDash.fairMatchScore')}</b>
                      <p className="muted">{t('workerDash.fairMatchDesc')}</p>
                    </div>
                    <button className="info-button">i</button>
                  </div>
                  {accepted ? (
                    <div className="accepted-state">
                      <Check size={18} />
                      <b>{done ? t('workerDash.jobCompleted') : t('workerDash.jobAccepted')}</b>
                      <span>
                        {done
                          ? 'Earnings updated. Great work.'
                          : t('workerDash.customerUnlocked')}
                      </span>
                      {!done && (
                        <button
                          className="primary"
                          onClick={() => {
                            setDone(true)
                            setNotice(
                              lang === 'hi'
                                ? 'कार्य पूर्ण हुआ। ₹650 आपकी कमाई में जोड़े गए।'
                                : 'Job completed. ₹650 added to your earnings.'
                            )
                          }}
                        >
                          {t('workerDash.markComplete')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="request-actions">
                      <button
                        className="outline-button"
                        onClick={() =>
                          setNotice(
                            lang === 'hi'
                              ? 'अनुरोध अस्वीकार किया गया।'
                              : 'Request declined.'
                          )
                        }
                      >
                        {t('workerDash.declineRequest')}
                      </button>
                      <button
                        className="primary"
                        disabled={!available}
                        onClick={accept}
                      >
                        {t('workerDash.acceptRequest')} <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="panel forecast-panel">
                  <div className="panel-head">
                    <div>
                      <Pill tone="lilac">
                        <Sparkles size={12} /> {t('workerDash.aiInsight')}
                      </Pill>
                      <h3>{t('workerDash.demandForecast')}</h3>
                      <p className="muted">{t('workerDash.forecastSubtext')}</p>
                    </div>
                    <TrendingUp size={18} className="green-icon" />
                  </div>
                  <div className="forecast-chart">
                    <div className="chart-bars">
                      {[38, 54, 44, 72, 58, 86, 66].map((n, i) => (
                        <span
                          style={{ height: `${n}%` }}
                          className={i === 5 ? 'today' : ''}
                          key={i}
                        />
                      ))}
                    </div>
                    <div className="chart-days">
                      <small>Tue</small>
                      <small>Wed</small>
                      <small>Thu</small>
                      <small>Fri</small>
                      <small>Sat</small>
                      <small>Sun</small>
                      <small>Mon</small>
                    </div>
                  </div>
                  <p className="muted">
                    <b className="ink">+24% demand</b> expected this weekend.
                    Consider opening 4 more hours.
                  </p>
                </div>
              </div>

              {/* Welfare Strip with Modal Opener */}
              <div className="panel welfare-strip">
                <ShieldCheck size={21} />
                <div>
                  <b>{t('workerDash.welfareTitle')}</b>
                  <p className="muted">{t('workerDash.welfareSubtext')}</p>
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setShowWelfare(true)}
                >
                  {t('workerDash.viewBenefits')} <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {active === 'My schedule' && <WorkerSchedule />}
          {active === 'Earnings' && <WorkerEarnings done={done} />}
          {active === 'Co-op Insights' && (
            <CoopInsightsView stats={coopStats} forecast={forecast} />
          )}
          {active === 'My profile' && <Profile role="worker" />}
        </div>
      </div>

      {/* WORKER WELFARE MODAL */}
      {showWelfare && (
        <WorkerWelfareModal
          welfare={demoWorkerWelfare}
          workerName="Ravi Kumar"
          onClose={() => setShowWelfare(false)}
        />
      )}

      {/* NOTIFICATIONS DROPDOWN */}
      {showNotifications && (
        <NotificationDropdown
          notifications={notifications}
          role="worker"
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
  )
}

function WorkerEarnings({ done }: { done: boolean }) {
  const { t } = useTranslation()
  return (
    <>
      <div className="welcome-line">
        <div>
          <div className="eyebrow">YOUR MONEY, YOUR DATA</div>
          <h2>{t('nav.earnings')}</h2>
          <p className="muted">A clear view of your contribution.</p>
        </div>
      </div>
      <div className="payment-split">
        <div className="panel">
          <h3>March earnings</h3>
          <p className="muted">{done ? 13 : 12} completed jobs</p>
          <div className="big-amount">{done ? '₹19,100' : '₹18,450'}</div>
          <div className="split-line">
            <span>
              Service earnings <b>{done ? '₹16,700' : '₹16,050'} (75%)</b>
            </span>
            <span>
              Co-op dividend <b>₹1,200 (15%)</b>
            </span>
            <span>
              Benefits & insurance fund <b>₹1,200 (10%)</b>
            </span>
          </div>
        </div>
        <div className="panel fairness-card">
          <Wallet size={26} />
          <h3>Fair pay, visible</h3>
          <p>
            You keep 75%+ of every booking. Your co-op dividend grows with the
            value you create together.
          </p>
          <Pill tone="green">Paid weekly</Pill>
        </div>
      </div>
    </>
  )
}

function WorkerSchedule() {
  const { t } = useTranslation()
  return (
    <>
      <div className="welcome-line">
        <div>
          <div className="eyebrow">YOUR WEEK</div>
          <h2>{t('workerDash.scheduleTitle')}</h2>
          <p className="muted">{t('workerDash.openHoursThisWeek', { count: 8 })}</p>
        </div>
      </div>
      <div className="panel schedule-panel">
        <div className="schedule-day">
          <b>Tomorrow · Wed 13 Mar</b>
          <Pill tone="blue">10:00 AM</Pill>
          <span>Deep home cleaning · Ananya Nair · 2.5 hrs</span>
        </div>
        <div className="schedule-day">
          <b>Friday · 15 Mar</b>
          <Pill tone="green">2:00 PM</Pill>
          <span>Appliance repair · Vikram Rao · 1.5 hrs</span>
        </div>
        <div className="schedule-day open">
          <b>Saturday · 16 Mar</b>
          <Pill tone="yellow">Open</Pill>
          <span>{t('workerDash.openSlot')}</span>
        </div>
      </div>
    </>
  )
}

export default function Page() {
  const [role, setRole] = useState<Role | null>(null)

  return (
    <LanguageProvider>
      {role === 'customer' ? (
        <CustomerDashboard onLogout={() => setRole(null)} />
      ) : role === 'worker' ? (
        <WorkerDashboard onLogout={() => setRole(null)} />
      ) : (
        <Login onEnter={setRole} />
      )}
    </LanguageProvider>
  )
}
