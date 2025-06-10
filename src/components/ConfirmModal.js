import '../css/ConfirmModal.css'

export function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Delete', 
  cancelText = 'Cancel', 
  danger = false 
}) {
  if (!isOpen) return null

  // Prevent clicks on the modal content from closing the modal
  const handleContentClick = (e) => {
    e.stopPropagation()
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={handleContentClick}>
        <h3 className="modal-title">
          {title}
        </h3>
        
        <p className="modal-message">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </p>
        
        <div className="modal-actions">
          <button
            onClick={onCancel}
            className="modal-btn modal-btn-cancel"
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            className={`modal-btn modal-btn-confirm ${danger ? 'danger' : ''}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}