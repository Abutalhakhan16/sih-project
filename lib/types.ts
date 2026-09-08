export type Role = 'customer' | 'worker' | 'admin'

export type Language = 'en' | 'hi'

export type Status =
  | 'Requested'
  | 'Matching'
  | 'Assigned'
  | 'Accepted'
  | 'On the Way'
  | 'Arrived'
  | 'In Progress'
  | 'Completed'
  | 'Paid'
  | 'Rated'
  | 'Cancelled'
  | 'Rejected'
  | 'Pending' // backwards-compatibility

export type WorkerAvailability =
  | 'Available'
  | 'Busy'
  | 'On Job'
  | 'Offline'
  | 'On Leave'

export interface Worker {
  id: number
  name: string
  initials: string
  phone: string
  service: string // primarySkill alias for compatibility
  primarySkill: string
  secondarySkills: string[]
  experience: number
  certifications: string[]
  rating: number
  reviews: number
  completedJobs: number
  availability: WorkerAvailability
  currentStatus: WorkerAvailability
  price: number // starting price or hourly rate
  hourlyRate: number
  color: string
  bio: string
  lat: number
  lng: number
  serviceArea: string
  verified: boolean
  verificationStatus: 'Verified' | 'Pending' | 'Rejected'
  cooperative: string
  language: string[]
  workload: number // active ongoing jobs / capacity indicator
  insuranceStatus: string
  address?: string
  distance?: number
}

export interface CustomerLocation {
  lat: number
  lng: number
  label: string
  source: 'gps' | 'manual' | 'preset'
}

export interface CustomerRecord {
  id: number
  name: string
  phone: string
  location: string
  lat: number
  lng: number
  previousBookings: number
  preferredLanguage: Language
}

export interface CatalogService {
  serviceId: string
  category: string
  serviceName: string
  description: string
  basePrice: number
  estimatedDuration: string
  priorityOptions: ('Standard' | 'Emergency' | 'Same Day')[]
  requiredSkills: string[]
}

export interface Booking {
  id: number
  service: string
  serviceId?: string
  worker: string
  workerId?: number
  customerId?: number
  customerName?: string
  workerLat?: number
  workerLng?: number
  customerLat?: number
  customerLng?: number
  date: string
  status: Status
  amount: number
  etaMinutes?: number
  address?: string
  invoiceNumber?: string
  rating?: number
  review?: string
  paymentMethod?: string
  workerEarnings?: number
  coopFee?: number
  communityFund?: number
  invoice?: {
    id: number
    invoice_number: string
    subtotal: number
    tax: number
    total: number
    worker_earnings: number
    coop_fee: number
    community_fund: number
    issued_at?: string
  }
}

export interface RankedWorker extends Worker {
  distanceKm: number
  etaMinutes: number
  matchScore: number
  isEligible: boolean
  disqualificationReason?: string
}

export interface SmartMatchResult {
  bestWorker: RankedWorker | null
  rankedWorkers: RankedWorker[]
  totalFound: number
  explanation: string
}

export interface WorkerWelfare {
  insuranceStatus: string
  trainingCompleted: string
  certificationStatus: string
  leaveBalance: number
  welfareEligibility: string
  grievanceStatus: string
}

export interface DemandForecast {
  id: string
  date: string
  dayOfWeek: string
  serviceType: string
  zone: string
  requests: number
  weather: string
  holiday: boolean
  trendPercent: number
  predictionText: string
}

export interface CoopStats {
  totalWorkers: number
  verifiedWorkers: number
  activeJobs: number
  completedJobs: number
  pendingJobs: number
  workerUtilization: number
  totalRequests: number
  revenue: number
  workerEarnings: number
  averageRating: number
  topServices: { name: string; count: number; percentage: number }[]
  demandByArea: { zone: string; requests: number; activeWorkers: number }[]
}

export interface NotificationItem {
  id: string
  role: Role
  title: string
  message: string
  time: string
  read: boolean
  type: 'booking' | 'system' | 'payment' | 'welfare'
}
