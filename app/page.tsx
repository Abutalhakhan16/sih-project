'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
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
import AdminDashboard from '@/components/admin/AdminDashboard'
import Chatbot from '@/components/chat/Chatbot'
import { coopserveApi } from '@/lib/api/client'
import {
  authApi,
  workersApi,
  servicesApi,
  bookingsApi,
  paymentsApi,
  ratingsApi,
  notificationsApi,
  adminApi,
} from '@/lib/api'
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext'
import { UserProfile } from '@/lib/api/auth'

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

function Login() {
  const { t, lang } = useTranslation()
  const { login, demoLogin, register } = useAuth()
  const [role, setRole] = useState<Role>('customer')
  const [mode, setMode] = useState<'login' | 'register'>('login')

  // Login form states
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Registration form states
  const [name, setName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [prefLanguage, setPrefLanguage] = useState<'en' | 'hi'>('en')

  // Worker-specific registration fields
  const [skill, setSkill] = useState('Plumber')
  const [experience, setExperience] = useState(2)
  const [cooperative, setCooperative] = useState('Bengaluru Service Cooperative')
  const [serviceArea, setServiceArea] = useState('Bengaluru Central')

  // Feedback and UI state
  const [loading, setLoading] = useState(false)
  const [demoLoadingRole, setDemoLoadingRole] = useState<Role | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showForgotNotice, setShowForgotNotice] = useState(false)

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    if (!identifier.trim()) {
      setErrorMsg(lang === 'hi' ? 'कृपया अपना ईमेल या मोबाइल नंबर दर्ज करें।' : 'Please enter your email or mobile number.')
      return
    }
    if (!password) {
      setErrorMsg(lang === 'hi' ? 'कृपया पासवर्ड दर्ज करें।' : 'Please enter your password.')
      return
    }

    setLoading(true)
    try {
      await login(identifier.trim(), password, rememberMe)
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'hi' ? 'अमान्य ईमेल या पासवर्ड।' : 'Invalid email or password.'))
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLoginClick = async (demoRole: Role) => {
    setErrorMsg('')
    setSuccessMsg('')
    setDemoLoadingRole(demoRole)
    try {
      await demoLogin(demoRole, true)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to authenticate demo account. Please verify backend is running.')
    } finally {
      setDemoLoadingRole(null)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    if (!name.trim()) {
      setErrorMsg(lang === 'hi' ? 'कृपया अपना पूरा नाम दर्ज करें।' : 'Please enter your full name.')
      return
    }
    if (!regEmail.trim()) {
      setErrorMsg(lang === 'hi' ? 'कृपया एक वैध ईमेल पता दर्ज करें।' : 'Please enter a valid email address.')
      return
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMsg(lang === 'hi' ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' : 'Password must be at least 6 characters long.')
      return
    }
    if (regPassword !== confirmPassword) {
      setErrorMsg(lang === 'hi' ? 'पासवर्ड मेल नहीं खाते हैं।' : 'Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await register({
        name: name.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        password: regPassword,
        confirm_password: confirmPassword,
        role: role as 'customer' | 'worker',
        language: prefLanguage,
        service: role === 'worker' ? skill : undefined,
        skills: role === 'worker' ? [skill] : undefined,
        experience_years: role === 'worker' ? Number(experience) : undefined,
        cooperative: role === 'worker' ? cooperative : undefined,
        service_area: role === 'worker' ? serviceArea : undefined,
      })
      if (role === 'worker') {
        setSuccessMsg(
          lang === 'hi'
            ? 'पंजीकरण सफल! आपका सेवा कर्मी खाता व्यवस्थापक सत्यापन के लिए लंबित है।'
            : 'Registration successful! Your worker profile has been submitted and is pending Admin verification.'
        )
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
          <div className="eyebrow">{mode === 'login' ? 'SECURE ACCESS' : 'CREATE ACCOUNT'}</div>
          <h2>{mode === 'login' ? t('roles.chooseDoorway') : (role === 'customer' ? 'Customer Registration' : 'Gig Worker Registration')}</h2>
          <p className="muted">
            {mode === 'login'
              ? 'Select your role and authenticate with credentials or use one-click demo login.'
              : 'Join the transparent, worker-owned cooperative network today.'}
          </p>

          {/* Role Selector Tabs */}
          <div className="role-switch" style={{ display: 'grid', gridTemplateColumns: mode === 'register' ? '1fr 1fr' : '1fr 1fr 1fr', gap: '4px' }}>
            <button
              type="button"
              className={role === 'customer' ? 'active' : ''}
              onClick={() => { setRole('customer'); setErrorMsg(''); }}
            >
              <Home size={15} />
              <span>{lang === 'hi' ? 'ग्राहक' : 'Customer'}</span>
            </button>
            <button
              type="button"
              className={role === 'worker' ? 'active' : ''}
              onClick={() => { setRole('worker'); setErrorMsg(''); }}
            >
              <Wrench size={15} />
              <span>{lang === 'hi' ? 'सेवा कर्मी' : 'Gig Worker'}</span>
            </button>
            {mode === 'login' && (
              <button
                type="button"
                className={role === 'admin' ? 'active' : ''}
                onClick={() => { setRole('admin'); setErrorMsg(''); }}
              >
                <ShieldCheck size={15} />
                <span>{lang === 'hi' ? 'प्रबंधक' : 'Co-op Admin'}</span>
              </button>
            )}
          </div>

          {/* Status Notices */}
          {errorMsg && (
            <div className="notice" role="alert" style={{ marginBottom: '12px' }}>
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="notice" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534', marginBottom: '12px' }}>
              {successMsg}
            </div>
          )}
          {showForgotNotice && (
            <div className="notice" style={{ background: '#f8fafc', borderColor: '#cbd5e1', color: '#334155', marginBottom: '14px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <b>Password Reset Assistance:</b>
                  <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                    Demo accounts use the shared password <code>demo123</code>. For real accounts, password reset instructions are coordinated with your cooperative admin at <code>admin@coopserve.local</code>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} style={{ marginTop: '10px' }}>
              <label>
                <span>{lang === 'hi' ? 'ईमेल या मोबाइल नंबर' : 'Email / Mobile Number'}</span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    role === 'customer'
                      ? 'demo.customer@coopserve.test or 9000000001'
                      : role === 'worker'
                      ? 'demo.worker@coopserve.test or 9000000003'
                      : 'demo.admin@coopserve.test or 9000000002'
                  }
                  required
                />
              </label>

              <label>
                <span>{lang === 'hi' ? 'पासवर्ड' : 'Password'}</span>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted-foreground)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 16px', fontSize: '12px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0, fontWeight: 500, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ height: '14px', width: '14px', margin: 0 }}
                  />
                  {lang === 'hi' ? 'मुझे याद रखें' : 'Remember Me'}
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotNotice(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: '12px' }}
                >
                  {lang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                </button>
              </div>

              <button type="submit" className="primary full" disabled={loading}>
                {loading ? 'Authenticating...' : (
                  role === 'customer'
                    ? (lang === 'hi' ? 'ग्राहक के रूप में लॉगिन करें' : 'Login as Customer')
                    : role === 'worker'
                    ? (lang === 'hi' ? 'सेवा कर्मी के रूप में लॉगिन करें' : 'Login as Gig Worker')
                    : (lang === 'hi' ? 'प्रबंधक के रूप में लॉगिन करें' : 'Login as Admin')
                )}{' '}
                <ArrowRight size={16} />
              </button>

              {role !== 'admin' ? (
                <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--green)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    Register as {role === 'customer' ? 'Customer' : 'Gig Worker'}
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '11px', color: 'var(--muted-foreground)' }}>
                  Cooperative Administrator credentials are authorized by governance council.
                </div>
              )}
            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} style={{ marginTop: '10px' }}>
              <label>
                <span>{lang === 'hi' ? 'पूरा नाम' : 'Full Name'}</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'customer' ? 'e.g. Ananya Nair' : 'e.g. Ramesh Kumar'}
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label>
                  <span>{lang === 'hi' ? 'ईमेल' : 'Email'}</span>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                </label>
                <label>
                  <span>{lang === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number'}</span>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="9876543210"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label>
                  <span>{lang === 'hi' ? 'पासवर्ड' : 'Password'}</span>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 6 chars"
                    required
                  />
                </label>
                <label>
                  <span>{lang === 'hi' ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password'}</span>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                  />
                </label>
              </div>

              {/* Worker-Specific Registration Fields */}
              {role === 'worker' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label>
                      <span>Primary Skill</span>
                      <select
                        value={skill}
                        onChange={(e) => setSkill(e.target.value)}
                        style={{ height: '42px', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', background: '#fff' }}
                      >
                        <option value="Plumber">Plumber</option>
                        <option value="Electrician">Electrician</option>
                        <option value="Home cleaning">Home cleaning</option>
                        <option value="Appliance repair">Appliance repair</option>
                        <option value="Carpenter">Carpenter</option>
                        <option value="Painter">Painter</option>
                        <option value="AC service">AC service</option>
                      </select>
                    </label>
                    <label>
                      <span>Experience (Years)</span>
                      <input
                        type="number"
                        min="1"
                        max="40"
                        value={experience}
                        onChange={(e) => setExperience(Number(e.target.value))}
                        required
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label>
                      <span>Cooperative Affiliation</span>
                      <input
                        type="text"
                        value={cooperative}
                        onChange={(e) => setCooperative(e.target.value)}
                        placeholder="Bengaluru Service Cooperative"
                      />
                    </label>
                    <label>
                      <span>Service Area</span>
                      <input
                        type="text"
                        value={serviceArea}
                        onChange={(e) => setServiceArea(e.target.value)}
                        placeholder="Bengaluru Central"
                      />
                    </label>
                  </div>

                  <div className="notice" style={{ background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e', margin: '8px 0', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    <span><strong>Worker Verification Notice:</strong> New worker accounts are created with <em>Verification Status = Pending</em> until approved by a Cooperative Administrator.</span>
                  </div>
                </>
              )}

              <label>
                <span>Preferred Language</span>
                <select
                  value={prefLanguage}
                  onChange={(e) => setPrefLanguage(e.target.value as 'en' | 'hi')}
                  style={{ height: '42px', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', background: '#fff' }}
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </label>

              <button type="submit" className="primary full" disabled={loading} style={{ marginTop: '12px' }}>
                {loading ? 'Submitting Registration...' : (role === 'customer' ? 'Create Customer Account' : 'Submit Worker Application')}{' '}
                <ArrowRight size={16} />
              </button>

              <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--green)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Login here
                </button>
              </div>
            </form>
          )}

          {/* ONE-CLICK DEMO LOGIN SECTION */}
          <div
            className="demo-login-section"
            style={{
              marginTop: '22px',
              paddingTop: '18px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div className="eyebrow" style={{ color: 'var(--green)', fontSize: '10px', letterSpacing: '1.2px' }}>TRY DEMO</div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ink)' }}>Explore Co-opServe instantly</div>
              </div>
              <Pill tone="green">
                <span className="live-dot" /> 1-Click
              </Pill>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className="outline-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: '#fcfcfc',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  width: '100%',
                }}
                disabled={demoLoadingRole !== null || loading}
                onClick={() => handleDemoLoginClick('customer')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar initials="AN" color="peach" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>Login as Demo Customer</div>
                    <small className="muted" style={{ fontSize: '11px' }}>demo.customer@coopserve.test · Bookings & map</small>
                  </div>
                </div>
                {demoLoadingRole === 'customer' ? <span style={{ fontSize: '12px' }}>...</span> : <ArrowRight size={15} />}
              </button>

              <button
                type="button"
                className="outline-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: '#fcfcfc',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  width: '100%',
                }}
                disabled={demoLoadingRole !== null || loading}
                onClick={() => handleDemoLoginClick('worker')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar initials="RK" color="green" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>Login as Demo Worker</div>
                    <small className="muted" style={{ fontSize: '11px' }}>demo.worker@coopserve.test · Verified master plumber</small>
                  </div>
                </div>
                {demoLoadingRole === 'worker' ? <span style={{ fontSize: '12px' }}>...</span> : <ArrowRight size={15} />}
              </button>

              <button
                type="button"
                className="outline-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: '#fcfcfc',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  width: '100%',
                }}
                disabled={demoLoadingRole !== null || loading}
                onClick={() => handleDemoLoginClick('admin')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar initials="AD" color="blue" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>Login as Demo Admin</div>
                    <small className="muted" style={{ fontSize: '11px' }}>demo.admin@coopserve.test · Verifications & AI forecast</small>
                  </div>
                </div>
                {demoLoadingRole === 'admin' ? <span style={{ fontSize: '12px' }}>...</span> : <ArrowRight size={15} />}
              </button>
            </div>

            <p className="terms" style={{ marginTop: '10px', fontSize: '11px', textAlign: 'center', color: '#64748b' }}>
              Demo accounts use preloaded sample data for presentation and testing.
            </p>
          </div>
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

  const { user } = useAuth()
  const name = user?.name || (role === 'customer' ? 'Ananya Nair' : 'Ravi Kumar')
  const initials = name
    .replace('[DEMO] ', '')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || (role === 'customer' ? 'AN' : 'RK')

  return (
    <aside className="sidebar">
      <Brand />
      <div className="workspace">
        <Avatar
          initials={initials}
          color={role === 'customer' ? 'peach' : 'green'}
        />
        <span>
          {name}
          <small>
            {role === 'customer'
              ? `${t('common.customer')} · Co-op Member`
              : `${t('common.worker')} · ${user?.verification_status === 'PENDING' ? 'Pending Verification' : t('common.verified')}`}
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
  onLogout,
}: {
  role: Role
  onOpenNotifications: () => void
  unreadCount: number
  onLogout?: () => void
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const name = user?.name || (role === 'customer' ? 'Ananya Nair' : 'Ravi Kumar')
  const initials = name
    .replace('[DEMO] ', '')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || (role === 'customer' ? 'AN' : 'RK')

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
          initials={initials}
          color={role === 'customer' ? 'peach' : 'green'}
        />
        {onLogout && (
          <button
            className="icon-button"
            title="Logout"
            aria-label="Logout"
            onClick={onLogout}
            style={{ color: '#ef4444' }}
          >
            <LogOut size={17} />
          </button>
        )}
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
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)
  const [showNotifications, setShowNotifications] = useState(false)

  const [selected, setSelected] = useState<Worker | null>(null)
  const [notice, setNotice] = useState('')

  // Live tracking modal state
  const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null)

  // Customer location reference for distance calculation in grid view
  const defaultLoc = DEFAULT_CUSTOMER_LOCATION

  useEffect(() => {
    Promise.all([coopserveApi.workers(), coopserveApi.bookings(), coopserveApi.notifications()])
      .then(([apiWorkers, apiBookings, apiNotifications]) => {
        setWorkersList(apiWorkers as Worker[])
        setBookings(apiBookings as Booking[])
        setNotifications(apiNotifications as NotificationItem[])
      })
      .catch(() => setNotice(lang === 'hi' ? 'डेमो डेटा दिखाया जा रहा है; API से कनेक्ट नहीं हो सका।' : 'Showing demo data while the API is unavailable.'))
  }, [lang])

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

  // Persist the request first; UI state follows the API response.
  const handleBookWorker = async (
    w: Worker | RankedWorker,
    location?: CustomerLocation
  ) => {
    const loc = location || defaultLoc
    let newBooking: Booking
    try {
      const created: any = await coopserveApi.createBooking({
        worker_id: w.id, service: w.service, customer_lat: loc.lat,
        customer_lng: loc.lng, address: loc.label, amount: w.price,
        eta_minutes: (w as RankedWorker).etaMinutes || 12,
      })
      newBooking = { ...created, status: created.status === 'MATCHED' ? 'Matching' : created.status as Booking['status'] }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Booking could not be created.')
      return
    }

    setBookings((prev) => [newBooking, ...prev])

    // Update dashboard aggregate counters dynamically.
    setCoopStats((prev) => ({
      ...prev,
      activeJobs: prev.activeJobs + 1,
      totalRequests: prev.totalRequests + 1,
      revenue: prev.revenue + w.price,
      workerEarnings: prev.workerEarnings + Math.round(w.price * 0.75),
    }))

    // Immediately display the matched booking in tracking.
    setTrackingBooking(newBooking)
    setNotice(
      lang === 'hi'
        ? `${w.name} को अनुरोध भेजा गया! लाइव ट्रैकिंग सक्रिय है।`
        : `Request sent to ${w.name}. Live tracking is now active.`
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
          onLogout={onLogout}
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
          {active === 'Payments' && <Payments bookings={bookings} />}

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
          onBookingUpdated={(updated) => {
            setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
            setTrackingBooking(updated)
          }}
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

      {/* CO-OPSERVE AI CHATBOT ASSISTANT */}
      <Chatbot
        userRole="customer"
        userLocation={{ lat: defaultLoc.lat, lng: defaultLoc.lng, label: defaultLoc.label }}
        onTrackBooking={async (bookingId) => {
          let target = bookings.find((b) => b.id === bookingId)
          if (!target) {
            try {
              target = await bookingsApi.getBooking(bookingId)
            } catch (e) {
              // ignore
            }
          }
          if (target) {
            setTrackingBooking(target)
          }
        }}
        onViewWorkerProfile={(workerId) => {
          const target = workersList.find((w) => w.id === workerId)
          if (target) setSelected(target)
        }}
        onBookWorker={(workerId) => {
          const target = workersList.find((w) => w.id === workerId)
          if (target) handleBookWorker(target)
        }}
      />
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
  const { t, lang } = useTranslation()
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
              {b.status === 'Completed' ? (
                <button
                  type="button"
                  className="text-button"
                  style={{ color: '#176b4d', fontWeight: 700 }}
                  onClick={() => onTrack && onTrack(b)}
                >
                  <CreditCard size={13} /> {lang === 'hi' ? 'भुगतान करें' : `Pay ₹${b.amount}`}
                </button>
              ) : b.status === 'Paid' ? (
                <button
                  type="button"
                  className="text-button"
                  style={{ color: '#d97706', fontWeight: 600 }}
                  onClick={() => onTrack && onTrack(b)}
                >
                  <Star size={13} /> {t('bookings.rateBtn')}
                </button>
              ) : b.status === 'Rated' || rated === b.id ? (
                <span className="rated">
                  <Check size={13} /> {t('bookings.ratedThanks')}
                </span>
              ) : (b.status === 'Pending' || b.status === 'Requested' || b.status === 'Matching') ? (
                <button
                  className="text-button danger"
                  onClick={async () => {
                    try {
                      await bookingsApi.cancelBooking(b.id)
                      setBookings((bs) => bs.map((x) => (x.id === b.id ? { ...x, status: 'Cancelled' } : x)))
                    } catch {
                      setBookings((bs) => bs.filter((x) => x.id !== b.id))
                    }
                  }}
                >
                  {t('bookings.cancelBtn')}
                </button>
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

function Payments({ bookings = [] }: { bookings?: Booking[] }) {
  const { t } = useTranslation()
  const paidBookings = bookings.filter((b) => ['Paid', 'Rated', 'Completed'].includes(b.status))
  const totalAmount = paidBookings.reduce((sum, b) => sum + (b.amount || 0), 0) || 1680
  const count = paidBookings.length || 5
  const workerShare = Math.round(totalAmount * 0.75)
  const coopShare = Math.round(totalAmount * 0.20)
  const fundShare = Math.round(totalAmount * 0.05)

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
          <p className="muted">{t('payments.statementSubtitle', { count })}</p>
          <div className="big-amount">₹{totalAmount.toLocaleString('en-IN')}</div>
          <div className="split-line">
            <span>
              {t('payments.workerEarningsLabel')} <b>₹{workerShare.toLocaleString('en-IN')} (75%)</b>
            </span>
            <span>
              {t('payments.coopOpsLabel')} <b>₹{coopShare.toLocaleString('en-IN')} (20%)</b>
            </span>
            <span>
              {t('payments.communityFundLabel')} <b>₹{fundShare.toLocaleString('en-IN')} (5%)</b>
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
  const [workerBookings, setWorkerBookings] = useState<Booking[]>(initialBookings)
  const [currentJob, setCurrentJob] = useState<Booking | null>(null)
  const [workerProfile, setWorkerProfile] = useState<Worker | null>(null)
  const [notice, setNotice] = useState('')
  const [showWelfare, setShowWelfare] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const [coopStats] = useState<CoopStats>(initialCoopStats)
  const [forecast] = useState<DemandForecast[]>(initialForecast)
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)

  useEffect(() => {
    Promise.all([
      bookingsApi.getBookings().catch(() => []),
      notificationsApi.getNotifications().catch(() => []),
      authApi.getWorkerMe().catch(() => null),
      workersApi.getWorkers().catch(() => []),
    ]).then(([bookingsData, notifData, myWorker, workersData]) => {
      if (bookingsData && bookingsData.length > 0) {
        setWorkerBookings(bookingsData)
        const activeJob =
          bookingsData.find((b) =>
            ['Requested', 'Matching', 'Accepted', 'On the Way', 'Arrived', 'In Progress'].includes(b.status)
          ) || bookingsData[0]
        setCurrentJob(activeJob || null)
      }
      if (notifData && notifData.length > 0) {
        setNotifications(notifData)
      }
      const profileToUse = myWorker || (workersData && workersData.length > 0 ? workersData[0] : null)
      if (profileToUse) {
        setWorkerProfile(profileToUse)
        setAvailable(profileToUse.availability === 'Available' || profileToUse.currentStatus === 'Available')
      }
    })
  }, [])

  const toggleAvailability = async () => {
    const next = !available
    setAvailable(next)
    if (workerProfile) {
      try {
        await workersApi.updateWorkerAvailability(
          workerProfile.id,
          next ? 'AVAILABLE' : 'OFFLINE'
        )
        setNotice(
          next
            ? (lang === 'hi' ? 'आप अब काम के लिए उपलब्ध हैं।' : 'You are now marked Available for work.')
            : (lang === 'hi' ? 'आपकी स्थिति ऑफ़लाइन कर दी गई है।' : 'Your status is now Offline.')
        )
      } catch (err: any) {
        setNotice(err.message || 'Could not update availability')
      }
    }
  }

  const handleTransition = async (nextStatus: string) => {
    if (!currentJob) return
    try {
      const updated = await bookingsApi.updateBookingStatus(currentJob.id, nextStatus)
      setCurrentJob(updated)
      setWorkerBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
      if (['Completed', 'Paid', 'Rated'].includes(updated.status)) {
        setAvailable(true)
      }
      setNotice(
        lang === 'hi'
          ? `कार्य स्थिति: ${t(`status.${updated.status}`) || updated.status}`
          : `Job status transitioned to ${updated.status}.`
      )
    } catch (err: any) {
      setNotice(err.message || 'Status transition failed.')
    }
  }

  const completedJobsList = workerBookings.filter((b) =>
    ['Completed', 'Paid', 'Rated'].includes(b.status)
  )
  const done = currentJob ? ['Completed', 'Paid', 'Rated'].includes(currentJob.status) : false
  const totalEarnings =
    completedJobsList.reduce((acc, b) => acc + Math.round(b.amount * 0.75), 0) || 18450

  const unreadCount = notifications.filter((n) => n.role === 'worker' && !n.read).length
  const isPendingVerification = workerProfile && (!workerProfile.verified || workerProfile.verificationStatus?.toLowerCase() === 'pending')

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
          onLogout={onLogout}
        />
        <div className="dash-content">
          {isPendingVerification && (
            <div className="notice" style={{ background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} />
              <span><strong>Account Verification Pending:</strong> Your worker profile is awaiting cooperative administrator verification. Once verified, dispatch will begin.</span>
            </div>
          )}
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
                  onClick={toggleAvailability}
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
                  <strong>₹{totalEarnings.toLocaleString('en-IN')}</strong>
                  <span className="stat-change">+{completedJobsList.length} completed jobs</span>
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
                        <span className="pulse-dot" /> {currentJob?.status || t('workerDash.newRequest')}
                      </Pill>
                      <h3>{currentJob ? (t(`categories.${currentJob.service}`) || currentJob.service) : 'Deep Home Cleaning'}</h3>
                      <p className="muted">
                        Requested by {currentJob?.customerName || 'Ananya Nair'} · {currentJob?.address || 'Indiranagar'}
                      </p>
                    </div>
                    <b className="request-price">₹{currentJob?.amount || 650}</b>
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
                      {currentJob?.date ? new Date(currentJob.date).toLocaleDateString() : 'Today'}
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

                  {/* Lifecycle Controls */}
                  {currentJob && ['Completed', 'Paid', 'Rated'].includes(currentJob.status) ? (
                    <div className="accepted-state">
                      <Check size={18} />
                      <b>{t('workerDash.jobCompleted')}</b>
                      <span>Earnings updated: ₹{Math.round(currentJob.amount * 0.75)} credited to your Co-op wallet.</span>
                    </div>
                  ) : currentJob && currentJob.status === 'In Progress' ? (
                    <div className="accepted-state">
                      <Clock3 size={18} />
                      <b>Service in progress</b>
                      <span>Perform work according to cooperative quality guidelines.</span>
                      <button
                        className="primary"
                        onClick={() => handleTransition('COMPLETED')}
                      >
                        {t('workerDash.markComplete')}
                      </button>
                    </div>
                  ) : currentJob && currentJob.status === 'Arrived' ? (
                    <div className="accepted-state">
                      <MapPin size={18} />
                      <b>Arrived at customer address</b>
                      <span>Greet customer and initiate service verification.</span>
                      <button
                        className="primary"
                        onClick={() => handleTransition('IN_PROGRESS')}
                      >
                        Begin Service
                      </button>
                    </div>
                  ) : currentJob && currentJob.status === 'On the Way' ? (
                    <div className="accepted-state">
                      <Navigation size={18} />
                      <b>En route to customer</b>
                      <span>Follow GPS navigation route safely.</span>
                      <button
                        className="primary"
                        onClick={() => handleTransition('ARRIVED')}
                      >
                        Mark Arrived
                      </button>
                    </div>
                  ) : currentJob && currentJob.status === 'Accepted' ? (
                    <div className="accepted-state">
                      <Check size={18} />
                      <b>{t('workerDash.jobAccepted')}</b>
                      <span>{t('workerDash.customerUnlocked')}</span>
                      <button
                        className="primary"
                        onClick={() => handleTransition('ON_THE_WAY')}
                      >
                        Start Transit (On the Way)
                      </button>
                    </div>
                  ) : (
                    <div className="request-actions">
                      <button
                        className="outline-button"
                        onClick={() => setNotice(lang === 'hi' ? 'अनुरोध अस्वीकार किया गया।' : 'Request declined.')}
                      >
                        {t('workerDash.declineRequest')}
                      </button>
                      <button
                        className="primary"
                        disabled={!available}
                        onClick={() => handleTransition('ACCEPTED')}
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

      {/* CO-OPSERVE WORKER AI ASSISTANT */}
      <Chatbot userRole="worker" />
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

function MainContent() {
  const { role, isLoading, logout } = useAuth()

  if (isLoading) {
    return (
      <main className="auth-shell" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Brand />
          <div style={{ marginTop: '16px' }}>
            <Pill tone="green">
              <span className="live-dot" /> Restoring session...
            </Pill>
          </div>
        </div>
      </main>
    )
  }

  return (
    <>
      {role === 'customer' ? (
        <CustomerDashboard onLogout={logout} />
      ) : role === 'worker' ? (
        <WorkerDashboard onLogout={logout} />
      ) : role === 'admin' ? (
        <AdminDashboard onLogout={logout} />
      ) : (
        <Login />
      )}
    </>
  )
}

export default function Page() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </LanguageProvider>
  )
}
