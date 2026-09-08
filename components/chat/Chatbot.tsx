'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  MessageSquare,
  X,
  Send,
  Mic,
  MicOff,
  Sparkles,
  MapPin,
  Clock,
  Star,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Minimize2,
  Maximize2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Briefcase,
  DollarSign
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { chatApi, ChatMessage, ChatActionPayload } from '@/lib/api'

interface ChatbotProps {
  userRole?: 'customer' | 'worker' | 'admin'
  userLocation?: { lat: number; lng: number; label?: string }
  onTrackBooking?: (bookingId: number) => void
  onBookWorker?: (workerId: number, serviceName: string) => void
  onViewWorkerProfile?: (workerId: number) => void
}

export default function Chatbot({
  userRole = 'customer',
  userLocation,
  onTrackBooking,
  onBookWorker,
  onViewWorkerProfile
}: ChatbotProps) {
  const { t, lang } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  // Default suggested quick actions by role
  const quickActions =
    userRole === 'worker'
      ? [
          lang === 'hi' ? 'लंबित कार्य दिखाएं' : 'Show my pending jobs',
          lang === 'hi' ? 'मेरी कमाई कितनी हुई?' : 'How much did I earn this week?',
          lang === 'hi' ? 'मुझे उपलब्ध सेट करें' : 'Set me as available',
          lang === 'hi' ? 'मेरी रेटिंग दिखाएं' : 'Show my ratings'
        ]
      : userRole === 'admin'
      ? [
          lang === 'hi' ? 'सबसे अधिक मांग किस क्षेत्र में है?' : 'Which zone has highest demand?',
          lang === 'hi' ? 'कितने प्लंबर उपलब्ध हैं?' : 'How many plumbers are available?',
          lang === 'hi' ? 'लंबित कार्य कितने हैं?' : 'How many jobs are pending?',
          lang === 'hi' ? 'सबसे लोकप्रिय सेवा कौन सी है?' : 'Which service is most requested?'
        ]
      : [
          lang === 'hi' ? 'मुझे प्लंबर चाहिए' : 'Find a Service',
          lang === 'hi' ? 'कामगार खोजें' : 'Find a Worker',
          lang === 'hi' ? 'मेरी बुकिंग ट्रैक करें' : 'Track Booking',
          lang === 'hi' ? 'मेरी पिछली बुकिंग' : 'My Bookings',
          lang === 'hi' ? 'भुगतान सहायता' : 'Payment Help',
          lang === 'hi' ? '🚨 आपातकालीन सेवा' : '🚨 Emergency Service'
        ]

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isMinimized])

  // Load chat history or welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetchHistory()
    }
  }, [isOpen])

  // Initialize Speech Recognition if supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-US'

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInputMessage(transcript)
          setIsListening(false)
        }

        recognition.onerror = () => {
          setIsListening(false)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
      }
    }
  }, [lang])

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert(
        lang === 'hi'
          ? 'आपके ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।'
          : 'Voice input is not supported in this browser.'
      )
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.lang = lang === 'hi' ? 'hi-IN' : 'en-US'
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        setIsListening(false)
      }
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await chatApi.getHistory()
      if (res && res.messages && res.messages.length > 0) {
        setMessages(res.messages)
      } else {
        // Add welcome message
        const welcome: ChatMessage = {
          sender: 'assistant',
          message:
            lang === 'hi'
              ? 'नमस्ते! मैं Co-opServe सेवा सहायक हूँ। मैं आपकी सेवा खोजने, कामगार मैच करने, बुकिंग ट्रैक करने या आपातकालीन अनुरोध में कैसे मदद कर सकता हूँ?'
              : 'Hello! I am your Co-opServe Service Assistant. I can help you discover services, find verified cooperative workers, track live bookings, or dispatch emergency assistance.',
          suggested_actions: quickActions
        }
        setMessages([welcome])
      }
    } catch (err) {
      // Offline / fallback welcome
      const welcome: ChatMessage = {
        sender: 'assistant',
        message:
          lang === 'hi'
            ? 'नमस्ते! मैं Co-opServe सेवा सहायक हूँ। आप मुझसे कोई भी सेवा खोजने या बुकिंग के बारे में पूछ सकते हैं।'
            : 'Hello! I am your Co-opServe Service Assistant. How may I assist you with your home services today?',
        suggested_actions: quickActions
      }
      setMessages([welcome])
    }
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || isLoading) return

    setInputMessage('')
    setErrorNotice(null)

    // Append optimistic user message
    const userMsg: ChatMessage = {
      sender: 'user',
      message: text,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const reply = await chatApi.sendMessage(text, {
        language: lang,
        latitude: userLocation?.lat || 12.9716,
        longitude: userLocation?.lng || 77.5946,
        address: userLocation?.label || 'MG Road, Bengaluru'
      })

      setMessages(prev => [...prev, reply])
    } catch (err: any) {
      // Graceful fallback behavior as per specification
      const fallbackMsg: ChatMessage = {
        sender: 'assistant',
        message:
          lang === 'hi'
            ? 'एआई सहायक अस्थायी रूप से अनुपलब्ध है। आप सामान्य Co-opServe सेवा और बुकिंग विकल्पों का उपयोग जारी रख सकते हैं।'
            : 'AI Assistant is temporarily unavailable. You can still use the normal Co-opServe service and booking options.',
        suggested_actions: quickActions
      }
      setMessages(prev => [...prev, fallbackMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearHistory = async () => {
    try {
      await chatApi.clearHistory()
      setMessages([
        {
          sender: 'assistant',
          message:
            lang === 'hi'
              ? 'बातचीत का इतिहास साफ कर दिया गया है। मैं आपकी क्या मदद कर सकता हूँ?'
              : 'Conversation history has been cleared. How can I help you?',
          suggested_actions: quickActions
        }
      ])
    } catch (err) {
      setMessages([])
    }
  }

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true)
            setIsMinimized(false)
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#176b4d] text-white rounded-full shadow-lg hover:bg-[#0e563c] transition-all duration-200 transform hover:scale-105 active:scale-95 font-semibold text-sm cursor-pointer border border-[#1b432025]"
          title="Open Co-opServe Assistant"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          <span className="text-base">🤖</span>
          <span>Co-opServe Assistant</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-[#dfe7e0] flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized
              ? 'w-80 h-14'
              : 'w-[92vw] sm:w-[410px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-[#176b4d] text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🤖</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm leading-none">Co-opServe Assistant</h3>
                  <span className="flex items-center gap-1 bg-[#238160] text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block"></span>
                    Online
                  </span>
                </div>
                {!isMinimized && (
                  <p className="text-[11px] text-emerald-100 mt-0.5">
                    {userRole === 'worker'
                      ? 'Worker Assistant'
                      : userRole === 'admin'
                      ? 'Cooperative Admin Assistant'
                      : 'Bilingual Service Concierge'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-emerald-100">
              <button
                onClick={handleClearHistory}
                title="Reset conversation"
                className="p-1.5 hover:text-white hover:bg-[#0e563c] rounded-md transition-colors"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                className="p-1.5 hover:text-white hover:bg-[#0e563c] rounded-md transition-colors"
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 hover:text-white hover:bg-[#0e563c] rounded-md transition-colors"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Body Content when not minimized */}
          {!isMinimized && (
            <>
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f7faf7] text-sm">
                {messages.map((msg, idx) => {
                  const isUser = msg.sender === 'user'

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      {/* Message Bubble */}
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-[#176b4d] text-white rounded-br-none'
                            : 'bg-white text-[#18231f] border border-[#dfe7e0] rounded-bl-none'
                        }`}
                      >
                        {msg.message}
                      </div>

                      {/* Render Rich Action Widgets if present */}
                      {!isUser && msg.action && (
                        <div className="w-full mt-2 space-y-2">
                          {/* 1. Worker Recommendation Card */}
                          {msg.action.action_type === 'worker_recommendation' &&
                            msg.action.data.bestWorker && (
                              <div className="bg-white border border-[#b9d9c5] rounded-xl p-3 shadow-sm text-xs">
                                <div className="flex items-start justify-between gap-2 border-b border-[#edf1ed] pb-2 mb-2">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#176b4d] bg-[#e4f1e9] px-2 py-0.5 rounded-full inline-block mb-1">
                                      Best Match
                                    </span>
                                    <h4 className="font-bold text-sm text-[#18231f]">
                                      {msg.action.data.bestWorker.name}
                                    </h4>
                                    <p className="text-[11px] text-gray-500">
                                      {msg.action.data.service || 'Service Specialist'}
                                    </p>
                                  </div>
                                  <span className="flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    <Star size={12} className="fill-amber-500 text-amber-500" />
                                    {msg.action.data.bestWorker.rating}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 mb-3">
                                  <div className="flex items-center gap-1.5">
                                    <MapPin size={13} className="text-[#176b4d]" />
                                    <span>{msg.action.data.bestWorker.distanceKm} km away</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Clock size={13} className="text-[#176b4d]" />
                                    <span>ETA: {msg.action.data.bestWorker.etaMinutes} min</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                    <span>Available Now</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 font-semibold text-[#18231f]">
                                    <span>₹{msg.action.data.bestWorker.hourlyRate}/hr</span>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  {onViewWorkerProfile && (
                                    <button
                                      onClick={() =>
                                        onViewWorkerProfile(msg.action?.data.bestWorker.id)
                                      }
                                      className="flex-1 py-1.5 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-center transition-colors"
                                    >
                                      View Profile
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (onBookWorker) {
                                        onBookWorker(
                                          msg.action?.data.bestWorker.id,
                                          msg.action?.data.service
                                        )
                                      } else {
                                        handleSendMessage(
                                          `Book ${msg.action?.data.bestWorker.name}`
                                        )
                                      }
                                    }}
                                    className="flex-1 py-1.5 px-2.5 bg-[#176b4d] hover:bg-[#0e563c] text-white font-bold rounded-lg text-center shadow-sm transition-colors"
                                  >
                                    Book Worker
                                  </button>
                                </div>
                              </div>
                            )}

                          {/* 2. Emergency Alert Banner & Card */}
                          {msg.action.action_type === 'emergency_alert' && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 shadow-sm text-xs">
                              <div className="flex items-center gap-2 text-red-800 font-bold text-xs mb-1.5">
                                <AlertTriangle size={16} className="text-red-600" />
                                <span>🚨 Emergency Service Request</span>
                              </div>
                              <p className="text-[11px] text-red-700 mb-2 leading-relaxed">
                                High-priority dispatch matched to closest emergency verified
                                worker.
                              </p>

                              {msg.action.data.worker && (
                                <div className="bg-white border border-red-200 rounded-lg p-2.5 mb-2">
                                  <div className="flex justify-between items-center font-bold text-gray-900">
                                    <span>{msg.action.data.worker.name}</span>
                                    <span className="text-amber-600 flex items-center gap-1">
                                      <Star size={11} className="fill-amber-500 text-amber-500" />
                                      {msg.action.data.worker.rating}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-gray-600 mt-1">
                                    <span>📍 {msg.action.data.worker.distanceKm} km</span>
                                    <span>⏱️ ETA: {msg.action.data.worker.etaMinutes} min</span>
                                  </div>
                                </div>
                              )}

                              <button
                                onClick={() =>
                                  handleSendMessage(
                                    `Book ${msg.action?.data.worker?.name || 'Worker'} immediately`
                                  )
                                }
                                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-center shadow transition-colors"
                              >
                                ⚡ Confirm Emergency Dispatch
                              </button>
                            </div>
                          )}

                          {/* 3. Booking Status Card */}
                          {msg.action.action_type === 'booking_status' && (
                            <div className="bg-white border border-[#dfe7e0] rounded-xl p-3 shadow-sm text-xs">
                              <div className="flex justify-between items-center border-b border-[#edf1ed] pb-2 mb-2">
                                <span className="font-bold text-[#18231f]">
                                  Booking #{msg.action.data.id}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                                  {msg.action.data.status}
                                </span>
                              </div>
                              <div className="space-y-1 text-[11px] text-gray-600 mb-3">
                                <div>
                                  <span className="text-gray-400">Service:</span>{' '}
                                  <b>{msg.action.data.service}</b>
                                </div>
                                <div>
                                  <span className="text-gray-400">Assigned Worker:</span>{' '}
                                  <b>{msg.action.data.worker}</b>
                                </div>
                                <div>
                                  <span className="text-gray-400">ETA:</span>{' '}
                                  <b>{msg.action.data.etaMinutes} mins</b> ({msg.action.data.distanceKm} km away)
                                </div>
                              </div>

                              {onTrackBooking && (
                                <button
                                  onClick={() => onTrackBooking(msg.action?.data.id)}
                                  className="w-full py-1.5 bg-[#176b4d] hover:bg-[#0e563c] text-white font-bold rounded-lg text-center flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <MapPin size={13} />
                                  <span>Track on Map</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* 4. Booking Confirmed Card */}
                          {msg.action.action_type === 'booking_confirmed' && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-sm text-xs">
                              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-2">
                                <ShieldCheck size={16} className="text-emerald-600" />
                                <span>Booking Confirmed (Booking #{msg.action.data.bookingId})</span>
                              </div>
                              <p className="text-[11px] text-emerald-700 mb-3">
                                Assigned to <b>{msg.action.data.workerName}</b>. Expected arrival in{' '}
                                <b>{msg.action.data.etaMinutes} minutes</b>.
                              </p>
                              {onTrackBooking && (
                                <button
                                  onClick={() => onTrackBooking(msg.action?.data.bookingId)}
                                  className="w-full py-1.5 bg-[#176b4d] hover:bg-[#0e563c] text-white font-bold rounded-lg text-center flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <MapPin size={13} />
                                  <span>Track on Map</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* 5. Worker Stats Card */}
                          {msg.action.action_type === 'worker_stats' && (
                            <div className="bg-white border border-[#dfe7e0] rounded-xl p-3 shadow-sm text-xs">
                              <h4 className="font-bold text-sm text-[#18231f] mb-2 flex items-center gap-1.5">
                                <DollarSign size={14} className="text-[#176b4d]" />
                                <span>Cooperative Earnings & Metrics</span>
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                                <div className="bg-[#f7faf7] p-2 rounded-lg">
                                  <span className="text-gray-500 block text-[10px]">Total Earned</span>
                                  <span className="font-extrabold text-sm text-[#176b4d]">
                                    ₹{msg.action.data.totalEarnings}
                                  </span>
                                </div>
                                <div className="bg-[#f7faf7] p-2 rounded-lg">
                                  <span className="text-gray-500 block text-[10px]">Jobs Completed</span>
                                  <span className="font-extrabold text-sm text-[#18231f]">
                                    {msg.action.data.completedJobs}
                                  </span>
                                </div>
                              </div>
                              <div className="text-[11px] text-gray-500">
                                <span>Welfare: {msg.action.data.insuranceStatus}</span>
                              </div>
                            </div>
                          )}

                          {/* 6. Admin Analytics Card */}
                          {msg.action.action_type === 'admin_analytics' && (
                            <div className="bg-white border border-[#dfe7e0] rounded-xl p-3 shadow-sm text-xs">
                              <h4 className="font-bold text-sm text-[#18231f] mb-2 flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-[#176b4d]" />
                                <span>Cooperative Demand Overview</span>
                              </h4>
                              <div className="bg-[#f7faf7] p-2 rounded-lg mb-2">
                                <div className="text-[11px] text-gray-600">
                                  Peak Demand Zone:{' '}
                                  <b className="text-[#18231f]">{msg.action.data.highestDemandZone}</b>
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  Requests: <b>{msg.action.data.highestDemandRequests}</b> | Active
                                  Workers: <b>{msg.action.data.highestDemandActiveWorkers}</b>
                                </div>
                              </div>
                              <div className="text-[11px] text-gray-500">
                                Available Plumbers: <b>{msg.action.data.availablePlumbers}</b> |
                                Pending Jobs: <b>{msg.action.data.pendingJobs}</b>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Render Suggested Action Chips */}
                      {!isUser && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {msg.suggested_actions.map((sug, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => handleSendMessage(sug)}
                              className="text-[11px] bg-white hover:bg-[#e4f1e9] text-[#176b4d] border border-[#b9d9c5] font-medium px-2.5 py-1 rounded-full shadow-2xs transition-colors text-left"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 p-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#176b4d] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#176b4d]"></span>
                    </span>
                    <span>Assistant is analyzing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="px-3 py-2 bg-white border-t border-[#edf1ed] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] uppercase font-bold text-gray-400 shrink-0">
                  {lang === 'hi' ? 'सुझाव:' : 'Quick:'}
                </span>
                {quickActions.slice(0, 4).map((action, aIdx) => (
                  <button
                    key={aIdx}
                    onClick={() => handleSendMessage(action)}
                    className="shrink-0 text-[10px] font-semibold bg-[#edf1ed] hover:bg-[#e4f1e9] text-[#18231f] hover:text-[#176b4d] px-2 py-0.5 rounded-full transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <div className="p-3 bg-white border-t border-[#dfe7e0] flex items-center gap-2">
                <button
                  onClick={toggleSpeechRecognition}
                  type="button"
                  title="Voice Input (Mic)"
                  className={`p-2 rounded-lg border transition-colors ${
                    isListening
                      ? 'bg-red-50 border-red-400 text-red-600 animate-pulse'
                      : 'border-gray-200 text-gray-500 hover:text-[#176b4d] hover:border-[#176b4d]'
                  }`}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                <input
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSendMessage()
                  }}
                  placeholder={
                    lang === 'hi'
                      ? 'पूछें (जैसे "नल लीक हो रहा है", "बुकिंग ट्रैक करें")...'
                      : 'Ask anything (e.g. "I need a plumber", "Where is my worker?")...'
                  }
                  className="flex-1 bg-[#f7faf7] border border-[#dfe7e0] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#18231f] focus:outline-none focus:border-[#176b4d] transition-colors"
                />

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  title="Send"
                  className="p-2 bg-[#176b4d] hover:bg-[#0e563c] disabled:opacity-40 text-white rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
