// src/views/components/features/StatCard.jsx
/**
 * 📊 Компонент карточки статистики
 * @description Отображает статистическую информацию с трендом
 */
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import './StatCard.css';

/**
 * Карточка статистики
 * @param {Object} props - Пропсы компонента
 * @param {string} props.title - Заголовок
 * @param {number|string} props.value - Значение
 * @param {React.ReactNode} props.icon - Иконка
 * @param {number} props.trend - Тренд в процентах
 * @param {string} props.color - Цветовая схема (primary, success, warning, danger, info)
 * @param {Function} props.onClick - Обработчик клика
 * @param {boolean} props.loading - Состояние загрузки
 * @returns {JSX.Element} Карточка статистики
 */
const StatCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  color = 'primary', 
  onClick,
  loading = false 
}) => {
  // Определяем иконку тренда
  const getTrendIcon = () => {
    if (!trend || trend === 0) return <Minus size={16} />;
    return trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
  };

  // Определяем класс тренда
  const getTrendClass = () => {
    if (!trend || trend === 0) return 'neutral';
    return trend > 0 ? 'positive' : 'negative';
  };

  // Форматирование значения
  const formatValue = (val) => {
    if (typeof val === 'number') {
      return val.toLocaleString('ru-RU');
    }
    return val;
  };

  return (
    <motion.div
      className={`stat-card stat-card-${color} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
    >
      {loading ? (
        <div className="stat-card-loading">
          <div className="loading-skeleton">
            <div className="skeleton-icon"></div>
            <div className="skeleton-content">
              <div className="skeleton-title"></div>
              <div className="skeleton-value"></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="stat-card-header">
            <div className="stat-card-icon">
              {icon}
            </div>
            {trend !== undefined && (
              <div className={`stat-card-trend ${getTrendClass()}`}>
                {getTrendIcon()}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>

          <div className="stat-card-body">
            <h3 className="stat-card-title">{title}</h3>
            <p className="stat-card-value">{formatValue(value)}</p>
          </div>

          {onClick && (
            <div className="stat-card-footer">
              <span className="stat-card-link">
                Подробнее →
              </span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default StatCard;
