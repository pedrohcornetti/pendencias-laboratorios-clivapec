import { useEffect } from 'react'

export default function Modal({ title, small, onClose, footer, children, viewer }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const backdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  if (viewer) {
    return (
      <div className="overlay center" onMouseDown={backdrop}>
        {children}
      </div>
    )
  }

  return (
    <div className="overlay" onMouseDown={backdrop}>
      <div className={'modal' + (small ? ' sm' : '')}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">&times;</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
