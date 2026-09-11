'use client'

import React from 'react'
import { useTheme } from '@/lib/theme/ThemeContext'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun size={15} className="theme-icon sun-icon" />
      ) : (
        <Moon size={15} className="theme-icon moon-icon" />
      )}
      <span className="theme-toggle-label">
        {theme === 'dark' ? 'Light' : 'Dark'}
      </span>
    </button>
  )
}
