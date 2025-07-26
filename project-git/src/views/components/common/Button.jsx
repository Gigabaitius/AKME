// src/views/components/common/Button.jsx
/**
 * Универсальный компонент кнопки
 * @description Переиспользуемая кнопка с различными вариантами
 */
import React from 'react';
import './Button.css';

/**
 * Компонент кнопки
 * @param {Object} props - Пропсы компонента
 * @param {ReactNode} props.children - Содержимое кнопки
 * @param {string} props.variant - Вариант кнопки (primary, secondary, danger, etc.)
 * @param {string} props.size - Размер кнопки (sm, md, lg)
 * @param {boolean} props.disabled - Заблокирована ли кнопка
 * @param {boolean} props.loading - Состояние загрузки
 * @param {Function} props.onClick - Обработчик клика
 * @param {string} props.className - Дополнительные CSS классы
 * @returns {JSX.Element} Компонент кнопки
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const disabledClass = disabled ? 'btn-disabled' : '';
  const loadingClass = loading ? 'btn-loading' : '';
  
  const classes = [
    baseClass,
    variantClass,
    sizeClass,
    disabledClass,
    loadingClass,
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && <span className="btn-spinner" />}
      <span className={loading ? 'btn-content-loading' : 'btn-content'}>
        {children}
      </span>
    </button>
  );
};

export default Button;
