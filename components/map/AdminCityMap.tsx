'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import type * as LeafletType from 'leaflet'
import { Worker, Booking } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import {
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Sparkles,
  Phone,
  Star,
  Check,
  X,
  Briefcase,
} from 'lucide-react'

interface AdminCityMapProps {
  workers: Worker[]
  bookings: Booking[]
  onVerifyWorker?: (workerId: number, status: 'VERIFIED' | 'REJECTED') => void
  height?: string
}

export default function AdminCityMap({
  workers,
  bookings,
  onVerifyWorker,
  height = '480px',
}: AdminCityMapProps) {
  const { t, lang } = useTranslation()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletType.Map | null>(null)
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [leafletLib, setLeafletLib] = useState<typeof LeafletType | null>(null)

  // Filters
  const [selectedService, setSelectedService] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [inspectedWorker, setInspectedWorker] = useState<Worker | null>(null)

  // Zone Presets for quick zoom
  const BHOPAL_ZONES = [
    { label: 'All Bhopal Metro', lat: 23.2399, lng: 77.4126, zoom: 12 },
    { label: 'Central (MP Nagar & TT Nagar)', lat: 23.2350, lng: 77.4180, zoom: 14 },
    { label: 'South (Arera Colony & Shahpura)', lat: 23.2100, lng: 77.4390, zoom: 14 },
    { label: 'South Hub (Kolar Road)', lat: 23.1780, lng: 77.4190, zoom: 14 },
    { label: 'East Corridor (Hoshangabad Rd & Misrod)', lat: 23.1890, lng: 77.4560, zoom: 14 },
    { label: 'North (Ayodhya Bypass & Karond)', lat: 23.2900, lng: 77.4200, zoom: 13 },
  ]

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const matchService = selectedService === 'all' || w.service === selectedService
      const status = w.currentStatus || w.availability
      const isPending = !w.verified || w.verificationStatus === 'Pending'
      
      let matchStatus = true
      if (selectedStatus === 'available') matchStatus = status === 'Available' && !isPending
      else if (selectedStatus === 'busy') matchStatus = (status === 'Busy' || status === 'On Job') && !isPending
      else if (selectedStatus === 'pending') matchStatus = isPending
      else if (selectedStatus === 'offline') matchStatus = status === 'Offline' || status === 'On Leave'

      return matchService && matchStatus
    })
  }, [workers, selectedService, selectedStatus])

  // Active bookings in Bhopal
  const activeBookings = useMemo(() => {
    return bookings.filter((b) =>
      ['Requested', 'Accepted', 'On the Way', 'Arrived', 'In Progress'].includes(b.status)
    )
  }, [bookings])

  // Dynamically load Leaflet on client side
  useEffect(() => {
    let active = true
    import('leaflet').then((L) => {
      if (active) setLeafletLib(L)
    })
    return () => {
      active = false
    }
  }, [])

  // Initialize Map
  useEffect(() => {
    if (!leafletLib || !mapContainerRef.current || mapInstanceRef.current) return

    const L = leafletLib
    const map = L.map(mapContainerRef.current, {
      center: [23.2399, 77.4126], // Bhopal center
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    const markersGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = markersGroup
    mapInstanceRef.current = map
    setIsMapReady(true)

    setTimeout(() => {
      map.invalidateSize()
    }, 200)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markersLayerRef.current = null
      setIsMapReady(false)
    }
  }, [leafletLib])

  // Pan to Zone when user changes zone dropdown
  const handleZoneSelect = (zoneLabel: string) => {
    setSelectedZone(zoneLabel)
    const target = BHOPAL_ZONES.find((z) => z.label === zoneLabel)
    if (target && mapInstanceRef.current) {
      mapInstanceRef.current.setView([target.lat, target.lng], target.zoom, { animate: true })
    }
  }

  // Update Markers
  useEffect(() => {
    if (!isMapReady || !leafletLib || !mapInstanceRef.current || !markersLayerRef.current) {
      return
    }

    const L = leafletLib
    const layer = markersLayerRef.current
    layer.clearLayers()

    // 1. Worker Markers
    filteredWorkers.forEach((worker) => {
      const isPending = !worker.verified || worker.verificationStatus === 'Pending'
      const status = worker.currentStatus || worker.availability
      const isAvailable = status === 'Available' && !isPending
      const isBusy = (status === 'Busy' || status === 'On Job') && !isPending

      let pinBg = '#6b7280' // gray for offline
      let pinBorder = '#4b5563'
      if (isPending) {
        pinBg = '#f59e0b' // yellow for pending verification
        pinBorder = '#b45309'
      } else if (isAvailable) {
        pinBg = '#10b981' // emerald for available
        pinBorder = '#047857'
      } else if (isBusy) {
        pinBg = '#3b82f6' // blue for busy
        pinBorder = '#1d4ed8'
      }

      const markerHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          ${isPending ? '<div style="background: #ef4444; color: #fff; font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 4px; margin-bottom: 2px; white-space: nowrap;">PENDING</div>' : ''}
          <div style="background: ${pinBg}; border: 2px solid ${pinBorder}; color: #fff; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; box-shadow: 0 3px 6px rgba(0,0,0,0.25);">
            ${worker.initials}
          </div>
          <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${pinBorder}; margin-top: -1px;"></div>
          <div style="background: rgba(255,255,255,0.92); border: 1px solid #ccc; font-size: 9px; font-weight: 700; color: #111; padding: 1px 4px; border-radius: 4px; margin-top: 2px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
            ${worker.service}
          </div>
        </div>
      `

      const icon = L.divIcon({
        html: markerHtml,
        className: 'leaflet-admin-worker-marker',
        iconSize: [40, 52],
        iconAnchor: [20, 36],
        popupAnchor: [0, -34],
      })

      const marker = L.marker([worker.lat, worker.lng], { icon }).addTo(layer)

      marker.on('click', () => {
        setInspectedWorker(worker)
      })
    })

    // 2. Active Customer Bookings Markers
    activeBookings.forEach((b) => {
      if (!b.customerLat || !b.customerLng) return

      const jobHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="background: #e11d48; color: #fff; border: 2px solid #fff; border-radius: 8px; padding: 2px 6px; font-size: 9px; font-weight: 800; box-shadow: 0 3px 6px rgba(225, 29, 72, 0.4); white-space: nowrap;">
            ★ JOB: ₹${b.amount}
          </div>
          <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #e11d48;"></div>
        </div>
      `

      const jobIcon = L.divIcon({
        html: jobHtml,
        className: 'leaflet-admin-job-marker',
        iconSize: [60, 30],
        iconAnchor: [30, 25],
        popupAnchor: [0, -22],
      })

      const jobMarker = L.marker([b.customerLat, b.customerLng], { icon: jobIcon, zIndexOffset: 990 }).addTo(layer)
      jobMarker.bindPopup(`
        <div style="font-size: 11px; padding: 2px;">
          <strong style="color: #e11d48; font-size: 12px;">${b.service}</strong>
          <p style="margin: 2px 0; color: #444;">Customer: <b>${b.customerName}</b></p>
          <p style="margin: 2px 0; color: #666;">${b.address || 'Bhopal'}</p>
          <span style="font-weight: 700; color: #176b4d;">Status: ${b.status}</span>
        </div>
      `)
    })
  }, [isMapReady, leafletLib, filteredWorkers, activeBookings])

  return (
    <div className="admin-city-map-container" style={{ background: 'var(--card, #fff)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
      {/* Map Toolbar Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: '#176b4d', letterSpacing: '0.05em' }}>
            <MapPin size={13} />
            <span>{lang === 'hi' ? 'भोपाल शहर सहकारी संचालन मानचित्र' : 'BHOPAL CITY COOPERATIVE OPERATIONS MAP'}</span>
          </div>
          <h3 style={{ margin: '3px 0 0', fontSize: '18px', fontWeight: 700 }}>
            {lang === 'hi' ? 'लाइव कार्यबल और मांग कवरेज' : 'Live Workforce & Demand Surveillance'}
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-foreground)' }}>
            Showing {filteredWorkers.length} active workers and {activeBookings.length} live jobs across Bhopal, MP
          </p>
        </div>

        {/* Filter Controls Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Zone Selector */}
          <select
            value={selectedZone}
            onChange={(e) => handleZoneSelect(e.target.value)}
            style={{
              fontSize: '12px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontWeight: 600,
            }}
          >
            {BHOPAL_ZONES.map((z) => (
              <option key={z.label} value={z.label}>
                {z.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              fontSize: '12px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontWeight: 600,
            }}
          >
            <option value="all">All Statuses</option>
            <option value="available">🟢 Available ({workers.filter((w) => w.availability === 'Available' && w.verified).length})</option>
            <option value="busy">🔵 Busy ({workers.filter((w) => w.availability === 'Busy' || w.availability === 'On Job').length})</option>
            <option value="pending">🟡 Pending Verification ({workers.filter((w) => !w.verified || w.verificationStatus === 'Pending').length})</option>
            <option value="offline">⚪ Offline / On Leave</option>
          </select>

          {/* Trade Filter */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            style={{
              fontSize: '12px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontWeight: 600,
            }}
          >
            <option value="all">All Trades ({workers.length})</option>
            {['Plumber', 'Electrician', 'Carpenter', 'Painter', 'Cleaner', 'Gardener', 'Driver', 'Appliance Repair', 'AC Technician', 'Caregiver'].map((trade) => (
              <option key={trade} value={trade}>
                {trade} ({workers.filter((w) => w.service === trade).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Split Map View + Inspection Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: inspectedWorker ? '1fr 340px' : '1fr', position: 'relative' }}>
        {/* Map Canvas */}
        <div ref={mapContainerRef} style={{ width: '100%', height, zIndex: 1 }} />

        {/* Worker Inspection Drawer (when a worker pin is clicked) */}
        {inspectedWorker && (
          <div
            style={{
              background: 'var(--card, #fff)',
              borderLeft: '1px solid var(--border)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              maxHeight: height,
              overflowY: 'auto',
              boxShadow: '-4px 0 16px rgba(0,0,0,0.06)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: inspectedWorker.verified ? '#e4f1e9' : '#fef3c7',
                    color: inspectedWorker.verified ? '#176b4d' : '#92400e',
                  }}
                >
                  {inspectedWorker.verified ? 'Verified Member' : 'Pending Verification'}
                </span>
                <button
                  type="button"
                  onClick={() => setInspectedWorker(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#e4f1e9',
                    color: '#176b4d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 800,
                  }}
                >
                  {inspectedWorker.initials}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{inspectedWorker.name}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                    {inspectedWorker.service} · {inspectedWorker.experience} yrs exp
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '8px', fontSize: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={13} style={{ color: '#176b4d' }} />
                  <span>{inspectedWorker.address || 'Bhopal, MP'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={13} style={{ color: '#176b4d' }} />
                  <span>{inspectedWorker.phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Star size={13} style={{ color: '#f59e0b' }} fill="#f59e0b" />
                  <span>{inspectedWorker.rating} ({inspectedWorker.reviews} reviews · {inspectedWorker.completedJobs} jobs)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={13} style={{ color: '#176b4d' }} />
                  <span>{inspectedWorker.cooperative}</span>
                </div>
              </div>

              <div style={{ background: '#f8faf9', padding: '10px 12px', borderRadius: '8px', fontSize: '11px', color: '#555', marginBottom: '16px', lineHeight: 1.4 }}>
                {inspectedWorker.bio}
              </div>
            </div>

            {/* Actions */}
            <div>
              {(!inspectedWorker.verified || inspectedWorker.verificationStatus === 'Pending') && onVerifyWorker && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#176b4d',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                    onClick={() => {
                      onVerifyWorker(inspectedWorker.id, 'VERIFIED')
                      setInspectedWorker({ ...inspectedWorker, verified: true, verificationStatus: 'Verified' })
                    }}
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                    onClick={() => {
                      onVerifyWorker(inspectedWorker.id, 'REJECTED')
                      setInspectedWorker({ ...inspectedWorker, verified: false, verificationStatus: 'Rejected' })
                    }}
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      <div
        style={{
          padding: '10px 16px',
          background: 'var(--muted, #f9fafb)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            Available Workers ({workers.filter(w => w.availability === 'Available' && w.verified).length})
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
            Busy / On Job ({workers.filter(w => (w.availability === 'Busy' || w.availability === 'On Job') && w.verified).length})
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
            Pending Verification ({workers.filter(w => !w.verified || w.verificationStatus === 'Pending').length})
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#e11d48', display: 'inline-block' }}></span>
            Live Customer Request ({activeBookings.length})
          </span>
        </div>

        <span style={{ color: 'var(--muted-foreground)' }}>
          Cooperative Governance Zone: <b>Bhopal District & Metrowide</b>
        </span>
      </div>
    </div>
  )
}
