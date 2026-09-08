'use client'

import React, { useState } from 'react'
import { NotificationItem, Role } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { Bell, Check, CheckCheck, Clock, X } from 'lucide-react'

interface NotificationDropdownProps {
  notifications: NotificationItem[]
  role: Role
  onClose: () => void
}

export default function NotificationDropdown({
  notifications,
  role,
  onClose,
}: NotificationDropdownProps) {
  const { t, lang } = useTranslation()
  const [items, setItems] = useState<NotificationItem[]>(
    notifications.filter((n) => n.role === role)
  )

  const markAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })))
  }

  const markItemRead = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    )
  }

  return (
    <div
      className="modal-backdrop"
      style={{ background: 'transparent', zIndex: 120 }}
      onClick={onClose}
    >
      <div
        className="notification-dropdown-panel"
        style={{
          position: 'fixed',
          top: '70px',
          right: '4vw',
          width: 'min(380px, 92vw)',
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          boxShadow: '0 16px 45px rgba(24, 35, 31, 0.18)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease',
          zIndex: 130,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={16} className="text-emerald-700" />
            <b style={{ fontSize: '13px' }}>{t('notifications.title')}</b>
            {items.some((i) => !i.read) && (
              <span className="pill pill-yellow" style={{ fontSize: '9px', padding: '2px 6px' }}>
                {items.filter((i) => !i.read).length} new
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="text-button"
              style={{ fontSize: '11px' }}
              onClick={markAllRead}
            >
              <CheckCheck size={13} /> {t('notifications.markAllRead')}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--muted-foreground)' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '12px' }}>
              {t('notifications.noNotifications')}
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => markItemRead(item.id)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: item.read ? '#ffffff' : '#f8fcf9',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: '10px',
                  fontSize: '12px',
                  transition: 'background 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: item.read ? '#cbd5e1' : '#176b4d',
                    marginTop: '5px',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: 'block', fontSize: '12px', color: 'var(--foreground)' }}>
                    {item.title}
                  </b>
                  <p style={{ margin: '2px 0 4px', color: 'var(--muted-foreground)', fontSize: '11px', lineHeight: '1.4' }}>
                    {item.message}
                  </p>
                  <small style={{ color: '#94a3b8', fontSize: '10px' }}>{item.time}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
