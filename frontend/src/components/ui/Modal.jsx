import Dialog from './Dialog'

/**
 * Modal — legacy-compatible wrapper over Dialog (same isOpen/onClose/title/
 * size API) so existing pages gain the focus trap, Esc handling and ARIA
 * semantics without churn.
 */
export function Modal({ isOpen, onClose, title, children, size = 'md', footer, ...rest }) {
  return (
    <Dialog open={isOpen} onClose={onClose} title={title} size={size} footer={footer} {...rest}>
      {children}
    </Dialog>
  )
}

export default Modal
