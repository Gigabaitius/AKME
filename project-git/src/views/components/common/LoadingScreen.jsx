// src/views/components/common/LoadingScreen.jsx
/**
 * ⏳ Компонент экрана загрузки
 * @description Полноэкранный индикатор загрузки
 */
import React from 'react';
import { motion } from 'framer-motion';
import './LoadingScreen.css';

/**
 * Экран загрузки
 * @param {Object} props - Пропсы компонента
 * @param {string} props.message - Сообщение загрузки
 * @returns {JSX.Element} Экран загрузки
 */
const LoadingScreen = ({ message = 'Загрузка...' }) => {
  return (
    <div className="loading-screen">
      <motion.div
        className="loading-content"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Анимированный логотип */}
        <div className="loading-logo">
          <motion.div
            className="logo-circle"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <svg
              width="80"
              height="80"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="283"
                strokeDashoffset="75"
              />
            </svg>
          </motion.div>
          <div className="logo-center">
            <span className="logo-text">HR</span>
          </div>
        </div>

        {/* Индикатор загрузки */}
        <div className="loading-indicator">
          <motion.div
            className="loading-bar"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        {/* Сообщение */}
        <motion.p
          className="loading-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {message}
        </motion.p>

        {/* Дополнительная информация */}
        <motion.div
          className="loading-tips"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p className="loading-tip">
            💡 Совет: Вы можете добавлять кандидатов через WhatsApp
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
