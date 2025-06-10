import { useState, useEffect } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now()
    const toast = { id, message, type, duration }
    
    setToasts(prev => [...prev, toast])
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return { toasts, addToast, removeToast }
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

function Toast({ toast, onRemove }) {
  const getToastStyles = (type) => {
    const baseStyles = {
      padding: '12px 16px',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      minWidth: '300px',
      maxWidth: '400px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      animation: 'slideIn 0.3s ease-out'
    }

    const typeStyles = {
      success: { backgroundColor: '#10b981' },
      error: { backgroundColor: '#ef4444' },
      warning: { backgroundColor: '#f59e0b' },
      info: { backgroundColor: '#3b82f6' }
    }

    return { ...baseStyles, ...typeStyles[type] }
  }

  return (
    <div style={getToastStyles(toast.type)}>
      <span>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '18px',
          cursor: 'pointer',
          marginLeft: '10px'
        }}
      >
        ×
      </button>
    </div>
  )
}