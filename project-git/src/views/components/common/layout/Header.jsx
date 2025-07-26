// src/views/components/layout/Header.jsx
/**
 * 🎯 Компонент заголовка приложения
 * @description Верхняя панель с навигацией и уведомлениями
 */
import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Bell, 
  Sun, 
  Moon, 
  Search,
  User,
  LogOut,
  Settings,
  HelpCircle,
  ChevronDown
} from 'lucide-react';

// Утилиты
import EventBus from '@utils/EventBus';

// Стили
import './Header.css';

/**
 * Компонент заголовка
 * @param {Object} props - Пропсы компонента
 * @param {Function} props.onMenuClick - Обработчик клика по меню
 * @param {boolean} props.isSidebarOpen - Открыт ли сайдбар
 * @param {Object} props.settings - Настройки приложения
 * @param {Array} props.notifications - Уведомления
 * @param {string} props.currentPage - Текущая страница
 * @returns {JSX.Element} Заголовок
 */
const Header = ({ 
  onMenuClick, 
  isSidebarOpen, 
  settings = {}, 
  notifications = [],
  currentPage 
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // Закрытие выпадающих меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Переключение темы
  const toggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    EventBus.emit('settings:update', { theme: newTheme });
  };

  // Обработка поиска
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      EventBus.emit('search:query', searchQuery);
    }
  };

  // Выход из системы
  const handleLogout = () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      EventBus.emit('auth:logout');
    }
  };

  // Непрочитанные уведомления
  const unreadCount = notifications.filter(n => !n.read).length;

  // Получение названия страницы
  const getPageTitle = () => {
    const titles = {
      dashboard: 'Дашборд',
      candidates: 'Кандидаты',
      'shift-workers': 'Вахтовики',
      silent: 'Молчащие кандидаты',
      transferred: 'Переданные на 1-ю линию',
      training: 'Обучение GPT',
      knowledge: 'База знаний',
      mailings: 'Рассылки',
      settings: 'Настройки'
    };
    return titles[currentPage] || 'HR Assistant';
  };

  return (
    <header className="header">
      <div className="header-left">
        {/* Кнопка меню */}
        <button
          className="header-menu-button"
          onClick={onMenuClick}
          aria-label={isSidebarOpen ? 'Закрыть меню' : 'Открыть меню'}
        >
          <Menu size={24} />
        </button>

        {/* Заголовок страницы */}
        <h2 className="header-title">{getPageTitle()}</h2>
      </div>

      <div className="header-center">
        {/* Поиск */}
        <form className="header-search" onSubmit={handleSearch}>
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Поиск кандидатов, проектов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </form>
      </div>

      <div className="header-right">
        {/* Переключатель темы */}
        <button
          className="header-icon-button"
          onClick={toggleTheme}
          aria-label="Переключить тему"
        >
          {settings.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Уведомления */}
        <div className="notification-wrapper" ref={notificationRef}>
          <button
            className={`header-icon-button ${unreadCount > 0 ? 'has-badge' : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Уведомления"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="dropdown-header">
                <h3>Уведомления</h3>
                {unreadCount > 0 && (
                  <button
                    className="mark-all-read"
                    onClick={() => EventBus.emit('notifications:markAllRead')}
                  >
                    Прочитать все
                  </button>
                )}
              </div>
              <div className="notification-list">
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map(notification => (
                    <div
                      key={notification.id}
                      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                      onClick={() => EventBus.emit('notification:click', notification.id)}
                    >
                      <div className="notification-icon">
                        {notification.type === 'success' && '✅'}
                        {notification.type === 'error' && '❌'}
                        {notification.type === 'warning' && '⚠️'}
                        {notification.type === 'info' && 'ℹ️'}
                      </div>
                      <div className="notification-content">
                        <p className="notification-text">{notification.message}</p>
                        <span className="notification-time">
                          {new Date(notification.timestamp).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-notifications">
                    <p>Нет новых уведомлений</p>
                  </div>
                )}
              </div>
              {notifications.length > 5 && (
                <div className="dropdown-footer">
                  <button
                    onClick={() => EventBus.emit('navigation:request', { page: 'notifications' })}
                  >
                    Показать все
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Меню пользователя */}
        <div className="user-menu-wrapper" ref={userMenuRef}>
          <button
            className="user-menu-button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="Меню пользователя"
          >
            <div className="user-avatar">
              <User size={20} />
            </div>
            <span className="user-name">HR Manager</span>
            <ChevronDown size={16} className={`chevron ${showUserMenu ? 'rotated' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <div className="dropdown-header">
                <div className="user-info">
                  <div className="user-avatar-large">
                    <User size={32} />
                  </div>
                  <div className="user-details">
                    <p className="user-fullname">HR Manager</p>
                    <p className="user-email">hr@company.com</p>
                  </div>
                </div>
              </div>
              <div className="dropdown-divider" />
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => EventBus.emit('navigation:request', { page: 'profile' })}
                >
                  <User size={18} />
                  <span>Профиль</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => EventBus.emit('navigation:request', { page: 'settings' })}
                >
                  <Settings size={18} />
                  <span>Настройки</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => window.open('/help', '_blank')}
                >
                  <HelpCircle size={18} />
                  <span>Помощь</span>
                </button>
              </div>
              <div className="dropdown-divider" />
              <div className="dropdown-footer">
                <button
                  className="dropdown-item logout"
                  onClick={handleLogout}
                >
                  <LogOut size={18} />
                  <span>Выйти</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
