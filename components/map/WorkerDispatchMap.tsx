'use client'

import React, { useEffect, useRef, useState } from 'react'
import type * as LeafletType from 'leaflet'
import { Booking, Worker } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { calculateHaversineDistance, estimateEtaMinutes, formatDistance } from '@/lib/geo'
import {
  Navigation,
  MapPin,
  Clock3,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Compass,
  Sparkles,
} from 'lucide-react'

interface WorkerDispatchMapProps {
  workerProfile: Worker | null
  activeJob: Booking | null
  height?: string
}

export default function WorkerDispatchMap({
  workerProfile,
  activeJob,
  height = '360px',
}: WorkerDispatchMapProps) {
  const { t, lang } = useTranslation()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletType.Map | null>(null)
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null)
  const routeLayerRef = useRef<LeafletType.Polyline | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [leafletLib, setLeafletLib] = useState<typeof LeafletType | null>(null)

  // Default coordinates: Ravi Kumar / MP Nagar, Bhopal
  const workerLat = workerProfile?.lat || 23.2320
  const workerLng = workerProfile?.lng || 77.4325

  // Active Job Coordinates in Bhopal (defaults to customer address or preset)
  const hasActiveJob = !!activeJob && ['Requested', 'Accepted', 'On the Way', 'Arrived', 'In Progress'].includes(activeJob.status)
  const customerLat = activeJob?.customerLat || (hasActiveJob ? 23.2135 : null)
  const customerLng = activeJob?.customerLng || (hasActiveJob ? 77.4377 : null)

  const distanceKm = customerLat && customerLng
    ? calculateHaversineDistance(workerLat, workerLng, customerLat, customerLng)
    : 1.8
  const etaMins = estimateEtaMinutes(distanceKm)

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
      center: [workerLat, workerLng],
      zoom: 14,
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
  }, [leafletLib, workerLat, workerLng])

  // Update Markers and Navigation Route
  useEffect(() => {
    if (!isMapReady || !leafletLib || !mapInstanceRef.current || !markersLayerRef.current) {
      return
    }

    const L = leafletLib
    const map = mapInstanceRef.current
    const layer = markersLayerRef.current

    layer.clearLayers()
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }

    // 1. Worker Marker (Blue/Emerald Dispatch Pin)
    const workerHtml = `
      <div class="custom-customer-marker pulse-selecting" style="filter: drop-shadow(0 4px 8px rgba(23, 107, 77, 0.4));">
        <div class="marker-halo" style="border-color: #176b4d;"></div>
        <div class="marker-core" style="background: #176b4d; color: #fff;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="marker-label" style="background: #176b4d; color: #fff;">
          ${lang === 'hi' ? 'आप (सेवा कर्मी)' : 'You (Worker)'}
        </div>
      </div>
    `

    const workerIcon = L.divIcon({
      html: workerHtml,
      className: 'leaflet-customer-marker-container',
      iconSize: [42, 50],
      iconAnchor: [21, 46],
      popupAnchor: [0, -42],
    })

    const wMarker = L.marker([workerLat, workerLng], { icon: workerIcon, zIndexOffset: 1000 }).addTo(layer)
    wMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; padding: 2px;">
        <strong style="color: #176b4d; font-size: 13px;">${workerProfile?.name || 'Ravi Kumar'}</strong>
        <p style="margin: 3px 0 0; color: #666;">
          ${workerProfile?.service || 'Electrician'} · ${workerProfile?.address || 'Zone-I, MP Nagar, Bhopal'}
        </p>
      </div>
    `)

    // 2. Active Job Destination Pin in Bhopal
    if (hasActiveJob && customerLat && customerLng) {
      const custHtml = `
        <div class="custom-worker-marker is-best" style="filter: drop-shadow(0 4px 8px rgba(224, 76, 56, 0.35));">
          <div class="best-badge-crown" style="background: #e04c38; font-size: 9px; font-weight: 800;">
            ${lang === 'hi' ? 'ग्राहक' : 'CUSTOMER'}
          </div>
          <div class="worker-pin-bubble" style="background: #e04c38; color: #fff; border-color: #fff;">
            <span class="worker-pin-initials">${activeJob.customerName ? activeJob.customerName.slice(0, 2).toUpperCase() : 'CN'}</span>
            <span class="worker-pin-price">₹${activeJob.amount}</span>
          </div>
          <div class="worker-pin-tip" style="border-top-color: #e04c38;"></div>
          <div class="worker-pin-distance" style="background: #222; color: #fff;">
            ${formatDistance(distanceKm)}
          </div>
        </div>
      `

      const custIcon = L.divIcon({
        html: custHtml,
        className: 'leaflet-worker-marker-container',
        iconSize: [52, 62],
        iconAnchor: [26, 54],
        popupAnchor: [0, -50],
      })

      const cMarker = L.marker([customerLat, customerLng], { icon: custIcon, zIndexOffset: 950 }).addTo(layer)
      cMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 2px; min-width: 160px;">
          <strong style="color: #e04c38; font-size: 13px;">${activeJob.customerName || 'Customer Destination'}</strong>
          <p style="margin: 3px 0; color: #333; font-size: 11px;">${activeJob.address || 'Bhopal, MP'}</p>
          <div style="border-top: 1px solid #eee; padding-top: 4px; display: flex; justify-content: space-between; font-weight: 700;">
            <span>Status: ${activeJob.status}</span>
            <span style="color: #176b4d;">₹${activeJob.amount}</span>
          </div>
        </div>
      `)

      // Route polyline with slight curved waypoint for urban road feel
      const midLat = (workerLat + customerLat) / 2 + 0.0018
      const midLng = (workerLng + customerLng) / 2 - 0.0014
      const routePoints: [number, number][] = [
        [workerLat, workerLng],
        [midLat, midLng],
        [customerLat, customerLng],
      ]

      const polyline = L.polyline(routePoints, {
        color: '#176b4d',
        weight: 4,
        opacity: 0.85,
        dashArray: activeJob.status === 'On the Way' ? '8, 8' : undefined,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)

      routeLayerRef.current = polyline

      // Fit bounds with padding so both pins are visible
      map.fitBounds([
        [workerLat, workerLng],
        [customerLat, customerLng],
      ], { padding: [40, 40], maxZoom: 15 })
    } else {
      // Idle mode: show surrounding Bhopal demand hot-zones
      const hotspots = [
        { name: 'Arera Colony (High Demand)', lat: 23.2135, lng: 77.4377, count: '18 requests', color: '#176b4d' },
        { name: 'New Market / TT Nagar', lat: 23.2384, lng: 77.4018, count: '14 requests', color: '#3b82f6' },
        { name: 'Kolar Road / Sarvadharma', lat: 23.1780, lng: 77.4190, count: '12 requests', color: '#f59e0b' },
      ]

      hotspots.forEach((spot) => {
        const circle = L.circle([spot.lat, spot.lng], {
          radius: 650,
          color: spot.color,
          fillColor: spot.color,
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: '4, 6',
        }).addTo(layer)

        circle.bindPopup(`
          <div style="font-size: 11px;">
            <strong style="color: ${spot.color};">${spot.name}</strong><br/>
            <span>Active cooperative demand: <b>${spot.count}</b></span>
          </div>
        `)
      })

      map.setView([workerLat, workerLng], 13)
    }
  }, [isMapReady, leafletLib, workerLat, workerLng, hasActiveJob, customerLat, customerLng, activeJob, distanceKm, lang])

  return (
    <div className="worker-dispatch-map-wrapper" style={{ marginBottom: '20px' }}>
      {/* Map Control Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--card, #fff)',
          padding: '12px 16px',
          border: '1px solid var(--border, #e5e7eb)',
          borderBottom: 'none',
          borderTopLeftRadius: '14px',
          borderTopRightRadius: '14px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: hasActiveJob ? '#e4f1e9' : '#f0f4f2',
              color: '#176b4d',
            }}
          >
            <Navigation size={15} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>
              {hasActiveJob
                ? (lang === 'hi' ? 'लाइव कार्य नेविगेशन (भोपाल)' : 'Live Job Route & Dispatch (Bhopal, MP)')
                : (lang === 'hi' ? 'भोपाल कार्यक्षेत्र और मांग क्षेत्र' : 'Bhopal Service Area & Demand Zones')}
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
              {hasActiveJob
                ? `Destination: ${activeJob.address || 'Bhopal'}`
                : `Base: ${workerProfile?.address || 'Zone-I, MP Nagar, Bhopal'}`}
            </span>
          </div>
        </div>

        {hasActiveJob ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#176b4d',
                background: '#e4f1e9',
                padding: '4px 10px',
                borderRadius: '20px',
              }}
            >
              <Navigation size={12} />
              {formatDistance(distanceKm)} · ~{etaMins} {t('map.mins')}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '20px',
                background: activeJob.status === 'On the Way' ? '#dbeafe' : '#fef3c7',
                color: activeJob.status === 'On the Way' ? '#1e40af' : '#92400e',
              }}
            >
              {t(`status.${activeJob.status}`) || activeJob.status}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#176b4d',
                background: '#e4f1e9',
                padding: '4px 10px',
                borderRadius: '20px',
              }}
            >
              <Sparkles size={11} style={{ display: 'inline', marginRight: '4px' }} />
              {lang === 'hi' ? 'मांग हॉटस्पॉट्स सक्रिय' : 'Live Bhopal Demand Heatmap'}
            </span>
          </div>
        )}
      </div>

      {/* Map Tile Container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height,
          border: '1px solid var(--border, #e5e7eb)',
          borderBottomLeftRadius: '14px',
          borderBottomRightRadius: '14px',
          overflow: 'hidden',
          zIndex: 1,
        }}
      />
    </div>
  )
}
