// src/views/components/templates/MainTemplate.jsx
/**
 * 🏠 Основной шаблон приложения
 * @description Главный лейаут с навигацией, заголовком и контентом
 */
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

// Компоненты
import Sidebar from '../layout/Sidebar';
import Header from '../layout/Header';
import ExtensionSetup from '../features/ExtensionSetup';
import LoadingScreen from '../common/LoadingScreen';

// Утилиты
import EventBus from '@utils/EventBus';
import Logger from '@utils/Logger';

// Стили
import './MainTemplate.css';

const logger = new Logger('MainTemplate');

/**
 * Основной шаблон приложения
 * @param {Object} props - Пропсы компонента
 * @param {React.ReactNode} props.children - Дочерние компоненты (страницы)
 * @param {string} props.currentPage - Текущая страница
 * @param {Object} props.settings - Настройки приложения
 * @param {boolean} props.isLoading - Состояние загрузки
 * @param {Object} props.appController - Контроллер приложения
 * @returns {JSX.Element} Основной шаблон
 */
const MainTemplate = ({ 
  children, 
  currentPage, 
  settings, 
  isLoading,
  appController,
  error 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Состояние компонента
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showExtensionSetup, setShowExtensionSetup] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    silentCount: 0,
    unreadChats: 0
  });

  // Определение мобильного устройства
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Проверка расширения при загрузке
  useEffect(() => {
    const checkExtension = async () => {
      const extensionAvailable = await appController?.checkExtensionAvailable();
      if (!extensionAvailable && !settings?.extensionChecked) {
        setShowExtensionSetup(true);
      }
    };

    checkExtension();
  }, [appController, settings]);

  // Подписка на события
  useEffect(() => {
    const handleStatsUpdate = (newStats) => {
      setStats(newStats);
    };

    const handleNotification = (notification) => {
      setNotifications(prev => [...prev, notification]);
      // Автоудаление через 5 секунд
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    };

    const handleNavigate = ({ page }) => {
      navigate(`/${page}`);
    };

    // Подписываемся на события
    EventBus.on('dashboard:statsUpdated', handleStatsUpdate);
    EventBus.on('notification:show', handleNotification);
    EventBus.on('navigation:request', handleNavigate);

    return () => {
      EventBus.off('dashboard:statsUpdated', handleStatsUpdate);
      EventBus.off('notification:show', handleNotification);
      EventBus.off('navigation:request', handleNavigate);
    };
  }, [navigate]);

  // Переключение сайдбара
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Закрытие сайдбара на мобильных при навигации
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location, isMobile]);

  // Обработка установки расширения
  const handleExtensionSetupComplete = () => {
    setShowExtensionSetup(false);
    appController?.updateSettings({ extensionChecked: true });
  };

  // Класс для основного контейнера
  const containerClass = `main-template ${settings?.theme || 'light'} ${
    isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'
  } ${isMobile ? 'mobile' : 'desktop'}`;

  return (
    <div className={containerClass}>
      {/* Оверлей для мобильных устройств */}
      {isMobile && isSidebarOpen && (
        <div 
          className="mobile-overlay"
          onClick={toggleSidebar}
        />
      )}

      {/* Сайдбар */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            className="template-sidebar"
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Sidebar 
              currentPage={currentPage}
              stats={stats}
              onClose={isMobile ? toggleSidebar : undefined}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Основной контент */}
      <div className="template-main">
        {/* Заголовок */}
        <Header 
          onMenuClick={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          settings={settings}
          notifications={notifications}
          currentPage={currentPage}
        />

        {/* Контент страницы */}
        <main className="template-content">
          {isLoading ? (
            <LoadingScreen />
          ) : error ? (
            <div className="error-container">
              <h2>Произошла ошибка</h2>
              <p>{error.message}</p>
              <button onClick={() => window.location.reload()}>
                Перезагрузить страницу
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="page-container"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* Футер (опционально) */}
        <footer className="template-footer">
          <div className="footer-content">
            <span className="footer-version">
              HR Assistant v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </span>
            <span className="footer-copyright">
              © 2025 HR Assistant. Все права защищены.
            </span>
          </div>
        </footer>
      </div>

      {/* Кнопка меню для мобильных */}
      {isMobile && !isSidebarOpen && (
        <button 
          className="mobile-menu-button"
          onClick={toggleSidebar}
          aria-label="Открыть меню"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Модальное окно установки расширения */}
      {showExtensionSetup && (
        <ExtensionSetup 
          onComplete={handleExtensionSetupComplete}
          onSkip={() => setShowExtensionSetup(false)}
        />
      )}

      {/* Уведомления */}
      <div className="notifications-container">
        <AnimatePresence>
          {notifications.map(notification => (
            <motion.div
              key={notification.id}
              className={`notification notification-${notification.type}`}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="notification-content">
                <span className="notification-icon">
                  {notification.type === 'success' && '✅'}
                  {notification.type === 'error' && '❌'}
                  {notification.type === 'warning' && '⚠️'}
                  {notification.type === 'info' && 'ℹ️'}
                </span>
                <span className="notification-message">{notification.message}</span>
              </div>
              <button 
                className="notification-close"
                onClick={() => setNotifications(prev => 
                  prev.filter(n => n.id !== notification.id)
                )}
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MainTemplate;
