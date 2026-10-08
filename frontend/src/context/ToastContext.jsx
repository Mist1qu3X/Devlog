// Простые всплывающие уведомления (тосты). Вызов: toast('Текст', 'success').
import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const toast = useCallback((message, type = 'info') => {
    const id = ++idRef.current
    setToasts((list) => [...list, { id, message, type }])
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const icon = {
    success: 'fa-solid fa-circle-check',
    error: 'fa-solid fa-circle-exclamation',
    info: 'fa-solid fa-circle-info',
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <i className={icon[t.type]} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
