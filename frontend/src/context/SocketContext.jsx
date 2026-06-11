import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

const SEVERITY_EMOJI = {
  CRITICAL: '🔴',
  HIGH: '🟠',
  MEDIUM: '🟡',
  LOW: '🟢',
}

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [latestAlert, setLatestAlert] = useState(null)
  const [latestEvent, setLatestEvent] = useState(null)
  const listenersRef = useRef({})

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setConnected(false)
      }
      return
    }

    const getBackendUrl = () => {
      if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL
      }
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '/'
      }
      return 'http://localhost:5000'
    }

    const socket = io(getBackendUrl(), {
      withCredentials: true,
      transports: ['polling', 'websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('new_alert', (alert) => {
      setLatestAlert(alert)
      const emoji = SEVERITY_EMOJI[alert.severity] || '⚠️'
      const msg = `${emoji} ${alert.severity}: ${alert.file_name || 'File'} — ${alert.event_type}`

      if (alert.severity === 'CRITICAL') {
        toast.error(msg, { duration: 8000, icon: '🚨' })
        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification('FIM CRITICAL ALERT', { body: msg, icon: '/favicon.ico' })
        }
      } else if (alert.severity === 'HIGH') {
        toast.error(msg, { duration: 6000 })
      } else if (alert.severity === 'MEDIUM') {
        toast(msg, { icon: '⚠️', duration: 5000 })
      } else {
        toast.success(msg, { duration: 4000 })
      }

      // Notify external listeners
      Object.values(listenersRef.current).forEach((cb) => cb('alert', alert))
    })

    socket.on('file_event', (event) => {
      setLatestEvent(event)
      Object.values(listenersRef.current).forEach((cb) => cb('file_event', event))
    })

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [user])

  const subscribe = (id, callback) => {
    listenersRef.current[id] = callback
    return () => delete listenersRef.current[id]
  }

  return (
    <SocketContext.Provider value={{ connected, latestAlert, latestEvent, subscribe }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
