'use client'

import React, { useEffect, useRef, useState } from 'react'
import type * as LeafletType from 'leaflet'
import { RankedWorker, Worker } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { MapPin, Navigation, ZoomIn, ZoomOut, Compass } from 'lucide-react'

interface InteractiveMapProps {
  customerLocation: { lat: number; lng: number }
  workers: RankedWorker[]
  selectedWorker?: Worker | null
  bestWorker?: Worker | null
  onSelectWorker?: (worker: RankedWorker) => void
  onLocationSelect?: (lat: number, lng: number) => void
  isSelectingLocation?: boolean
  showRoute?: boolean
  className?: string
  height?: string
}

export default function InteractiveMap({
  customerLocation,
  workers,
  selectedWorker,
  bestWorker,
  onSelectWorker,
  onLocationSelect,
  isSelectingLocation = false,
  showRoute = true,
  className = '',
  height = '420px',
}: InteractiveMapProps) {
  const { t, lang } = useTranslation()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletType.Map | null>(null)
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null)
  const routeLayerRef = useRef<LeafletType.Polyline | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [leafletLib, setLeafletLib] = useState<typeof LeafletType | null>(null)

  // Dynamically load Leaflet on client side only
  useEffect(() => {
    let active = true
    import('leaflet').then((L) => {
      if (active) {
        setLeafletLib(L)
      }
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
      center: [customerLocation.lat, customerLocation.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    })

    // OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    const markersGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = markersGroup
    mapInstanceRef.current = map
    setIsMapReady(true)

    // Invalidate size after mount in case layout shifted
    setTimeout(() => {
      map.invalidateSize()
    }, 150)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markersLayerRef.current = null
      setIsMapReady(false)
    }
  }, [leafletLib])

  // Handle map clicks for "Select location on map" fallback
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const handleMapClick = (e: LeafletType.LeafletMouseEvent) => {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng)
      }
    }

    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
    }
  }, [onLocationSelect])

  // Update Markers & Polyline when data or language changes
  useEffect(() => {
    if (!isMapReady || !leafletLib || !mapInstanceRef.current || !markersLayerRef.current) {
      return
    }

    const L = leafletLib
    const map = mapInstanceRef.current
    const layerGroup = markersLayerRef.current

    layerGroup.clearLayers()

    const youLabel = t('map.legendYou')
    const customerTitle = lang === 'hi' ? 'ग्राहक स्थान (आप)' : 'Customer Location'
    const clickReposition = lang === 'hi' ? 'स्थान बदलने के लिए नक्शे पर क्लिक करें' : 'Click anywhere on map to reposition'
    const crownBadgeText = lang === 'hi' ? '★ श्रेष्ठ' : '★ BEST'
    const kmUnit = lang === 'hi' ? 'किमी' : 'km'
    const awayText = t('map.away')

    // 1. Customer Marker (Distinct pulsating Emerald Pin)
    const customerHtml = `
      <div class="custom-customer-marker ${isSelectingLocation ? 'pulse-selecting' : ''}">
        <div class="marker-halo"></div>
        <div class="marker-core">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div class="marker-label">${youLabel}</div>
      </div>
    `

    const customerIcon = L.divIcon({
      html: customerHtml,
      className: 'leaflet-customer-marker-container',
      iconSize: [40, 48],
      iconAnchor: [20, 44],
      popupAnchor: [0, -42],
    })

    const customerMarker = L.marker([customerLocation.lat, customerLocation.lng], {
      icon: customerIcon,
      zIndexOffset: 1000,
    }).addTo(layerGroup)

    customerMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px;">
        <strong style="color: #176b4d; display: block; font-size: 13px;">${customerTitle}</strong>
        <span style="color: #555;">${clickReposition}</span>
      </div>
    `)

    // 2. Worker Markers
    const bounds: [number, number][] = [[customerLocation.lat, customerLocation.lng]]

    workers.forEach((worker) => {
      const isBest = bestWorker?.id === worker.id
      const isSelected = selectedWorker?.id === worker.id
      const status = worker.currentStatus || worker.availability
      const isAvailable = status === 'Available'
      const translatedStatus = t(`status.${status}`)
      const translatedService = t(`categories.${worker.service}`)

      bounds.push([worker.lat, worker.lng])

      // Determine marker appearance
      let markerClasses = 'custom-worker-marker'
      if (isBest) markerClasses += ' is-best'
      if (isSelected && !isBest) markerClasses += ' is-selected'
      if (!isAvailable) markerClasses += ' is-unavailable'

      const workerHtml = `
        <div class="${markerClasses}">
          ${isBest ? `<div class="best-badge-crown">${crownBadgeText}</div>` : ''}
          <div class="worker-pin-bubble">
            <span class="worker-pin-initials">${worker.initials}</span>
            <span class="worker-pin-price">₹${worker.price}</span>
          </div>
          <div class="worker-pin-tip"></div>
          <div class="worker-pin-distance">${worker.distanceKm ? worker.distanceKm.toFixed(1) + ' ' + kmUnit : ''}</div>
        </div>
      `

      const workerIcon = L.divIcon({
        html: workerHtml,
        className: 'leaflet-worker-marker-container',
        iconSize: [52, 60],
        iconAnchor: [26, 52],
        popupAnchor: [0, -48],
      })

      const workerMarker = L.marker([worker.lat, worker.lng], {
        icon: workerIcon,
        zIndexOffset: isBest ? 900 : isSelected ? 850 : 500,
      }).addTo(layerGroup)

      // Popup Content
      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; min-width: 170px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <strong style="font-size: 13px; color: #18231f;">${worker.name}</strong>
            <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 999px; background: ${
              isAvailable ? '#e4f1e9' : '#fff2cb'
            }; color: ${isAvailable ? '#176b4d' : '#87650b'};">
              ${translatedStatus}
            </span>
          </div>
          <div style="color: #6b7872; font-size: 11px; margin-bottom: 6px;">
            ${translatedService} · ★ ${worker.rating} (${worker.reviews})
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 5px; font-size: 11px;">
            <span style="color: #176b4d; font-weight: 700;">${worker.distanceKm.toFixed(1)} ${kmUnit} ${awayText}</span>
            <strong>₹${worker.price}</strong>
          </div>
          ${
            !isAvailable && worker.disqualificationReason
              ? `<div style="margin-top: 5px; color: #b46045; font-size: 10px;">${worker.disqualificationReason}</div>`
              : ''
          }
        </div>
      `

      workerMarker.bindPopup(popupContent)

      workerMarker.on('click', () => {
        if (onSelectWorker) {
          onSelectWorker(worker)
        }
      })
    })

    // 3. Route Polyline to Best Worker or Selected Worker
    const targetWorker = selectedWorker || bestWorker
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }

    if (showRoute && targetWorker) {
      const latlngs: [number, number][] = [
        [customerLocation.lat, customerLocation.lng],
        [targetWorker.lat, targetWorker.lng],
      ]

      const polyline = L.polyline(latlngs, {
        color: '#176b4d',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '7, 9',
      }).addTo(map)

      routeLayerRef.current = polyline
    }

    // Fit bounds smoothly to accommodate customer and visible workers
    if (bounds.length > 1) {
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 15,
        animate: true,
      })
    }
  }, [
    isMapReady,
    leafletLib,
    customerLocation,
    workers,
    selectedWorker,
    bestWorker,
    showRoute,
    isSelectingLocation,
    onSelectWorker,
    lang,
    t,
  ])

  // Custom Zoom Handlers
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn()
  }

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut()
  }

  const handleResetCenter = () => {
    mapInstanceRef.current?.setView(
      [customerLocation.lat, customerLocation.lng],
      14,
      { animate: true }
    )
  }

  return (
    <div
      className={`map-shell-wrapper ${className}`}
      style={{ height, position: 'relative', overflow: 'hidden', borderRadius: '14px' }}
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Map Interactive Overlay Controls */}
      <div className="map-floating-controls">
        <button
          type="button"
          onClick={handleResetCenter}
          className="map-control-btn"
          title={lang === 'hi' ? 'मेरे स्थान पर केंद्रित करें' : 'Center on my location'}
          aria-label="Center on my location"
        >
          <Compass size={17} />
        </button>
        <button
          type="button"
          onClick={handleZoomIn}
          className="map-control-btn"
          title={lang === 'hi' ? 'बड़ा करें' : 'Zoom In'}
          aria-label="Zoom in"
        >
          <ZoomIn size={17} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="map-control-btn"
          title={lang === 'hi' ? 'छोटा करें' : 'Zoom Out'}
          aria-label="Zoom out"
        >
          <ZoomOut size={17} />
        </button>
      </div>

      {/* Mode hint banner if user is clicking on map to place pin */}
      {isSelectingLocation && (
        <div className="map-instruction-toast">
          <Navigation size={14} className="animate-spin" />
          <span>{t('map.pinHint')}</span>
        </div>
      )}

      {/* Legend pill */}
      <div className="map-legend-pill">
        <span className="legend-dot customer" /> {t('map.legendYou')}
        <span className="legend-dot best" /> {t('map.legendBest')}
        <span className="legend-dot available" /> {t('map.legendAvailable')}
        <span className="legend-dot busy" /> {t('map.legendBusy')}
      </div>
    </div>
  )
}
