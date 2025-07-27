// src/views/components/common/Modal.jsx
/**
 * 🪟 Компонент модального окна
 * @description Универсальное модальное окно с анимацией
 */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import './Modal.css';

/**
 * Модальное окно
 * @param {Object} props - Пропсы компонента
 * @param {React.ReactNode} props.children - Содержимое модального окна
 * @param {string} props.title - Заголовок
 * @param {Function} props.onClose - Обработчик закрытия
 * @param {string} props.size - Размер окна (sm, md, lg, xl, full)
 * @param {boolean} props.showCloseButton - Показывать кнопку закрытия
 * @param {boolean} props.closeOnOverlay - Закрывать при клике на оверлей
 * @param {boolean} props.closeOnEsc - Закрывать при нажатии Esc
 * @param {string} props.className - Дополнительные CSS классы
 * @returns {JSX.Element|null} Модальное окно
 */
const Modal = ({
  children,
  title,
  onClose,
  size = 'md',
  showCloseButton = true,
  closeOnOverlay = true,
  closeOnEsc = true,
  className = ''
}) => {
  const modalRef = useRef(null);

  // Обработка нажатия Esc
  useEffect(() => {
    if (!closeOnEsc) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [closeOnEsc, onClose]);

  // Блокировка прокрутки body
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Фокус на модальном окне
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  // Обработка клика на оверлей
  const handleOverlayClick = (e) => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Анимация модального окна
  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: -20
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  };

  // Анимация оверлея
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.2 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  const modalContent = (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={handleOverlayClick}
      >
        <motion.div
          ref={modalRef}
          className={`modal modal-${size} ${className}`}
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {/* Заголовок */}
          {(title || showCloseButton) && (
            <div className="modal-header">
              {title && (
                <h2 id="modal-title" className="modal-title">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  className="modal-close"
                  onClick={onClose}
                  aria-label="Закрыть"
                >
                  <X size={24} />
                </button>
              )}
            </div>
          )}

          {/* Контент */}
          <div className="modal-body">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Рендерим через портал
  return createPortal(
    modalContent,
    document.body
  );
};

export default Modal;
