// src/views/components/layout/Sidebar.jsx
/**
 * 📱 Компонент боковой панели навигации
 * @description Основная навигация приложения
 */
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Volume2, 
  SendHorizontal, 
  GraduationCap,
  BookOpen,
  Mail,
  Settings,
  ChevronDown,
  X,
  HardHat,
  UserX,
  Clock
} from 'lucide-react';

// Стили
import './Sidebar.css';

/**
 * Элемент навигации
 * @param {Object} props - Пропсы компонента
 * @param {Object} props.item - Элемент меню
 * @param {boolean} props.isActive - Активный элемент
 * @returns {JSX.Element} Элемент навигации
 */
const NavItem = ({ item, isActive }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (item.children) {
    return (
      <div className={`nav-item-group ${isExpanded ? 'expanded' : ''}`}>
        <button
          className={`nav-item nav-item-parent ${isActive ? 'active' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="nav-item-icon">{item.icon}</span>
          <span className="nav-item-label">{item.label}</span>
          {item.badge && (
            <span className="nav-item-badge">{item.badge}</span>
          )}
          <ChevronDown 
            size={16} 
            className={`nav-item-chevron ${isExpanded ? 'rotated' : ''}`}
          />
        </button>
        {isExpanded && (
          <div className="nav-item-children">
            {item.children.map(child => (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) => 
                  `nav-item nav-item-child ${isActive ? 'active' : ''}`
                }
              >
                <span className="nav-item-icon">{child.icon}</span>
                <span className="nav-item-label">{child.label}</span>
                {child.badge && (
                  <span className="nav-item-badge">{child.badge}</span>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => 
        `nav-item ${isActive ? 'active' : ''}`
      }
    >
      <span className="nav-item-icon">{item.icon}</span>
      <span className="nav-item-label">{item.label}</span>
      {item.badge && (
        <span className="nav-item-badge">{item.badge}</span>
      )}
    </NavLink>
  );
};

/**
 * Компонент боковой панели
 * @param {Object} props - Пропсы компонента
 * @param {string} props.currentPage - Текущая страница
 * @param {Object} props.stats - Статистика
 * @param {Function} props.onClose - Обработчик закрытия (для мобильных)
 * @returns {JSX.Element} Боковая панель
 */
const Sidebar = ({ currentPage, stats = {}, onClose }) => {
  const location = useLocation();
  
  // Структура навигации
  const navigation = [
    {
      path: '/dashboard',
      label: 'Дашборд',
      icon: <LayoutDashboard size={20} />
    },
    {
      path: '/candidates',
      label: 'Кандидаты',
      icon: <Users size={20} />,
      badge: stats.totalCandidates || null,
      children: [
        {
          path: '/candidates',
          label: 'Все кандидаты',
          icon: <Users size={18} />,
          badge: stats.totalCandidates || null
        },
        {
          path: '/silent',
          label: 'Молчат',
          icon: <Volume2 size={18} />,
          badge: stats.silentCount || null
        },
        {
          path: '/transferred',
          label: 'Переданы на 1-ю',
          icon: <SendHorizontal size={18} />,
          badge: stats.transferredCount || null
        }
      ]
    },
    {
      path: '/shift-workers',
      label: 'Вахтовики',
      icon: <HardHat size={20} />,
      badge: stats.shiftWorkersCount || null
    },
    {
      path: '/training',
      label: 'Обучение GPT',
      icon: <GraduationCap size={20} />
    },
    {
      path: '/knowledge',
      label: 'База знаний',
      icon: <BookOpen size={20} />
    },
    {
      path: '/mailings',
      label: 'Рассылки',
      icon: <Mail size={20} />
    }
  ];

  // Проверка активности группы
  const isGroupActive = (item) => {
    if (!item.children) return false;
    return item.children.some(child => location.pathname === child.path);
  };

  return (
    <div className="sidebar">
      {/* Заголовок */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Users size={28} className="logo-svg" />
          </div>
          <div className="logo-text">
            <h1>HR Assistant</h1>
            <span className="logo-subtitle">MVC Edition</span>
          </div>
        </div>
        {onClose && (
          <button 
            className="sidebar-close"
            onClick={onClose}
            aria-label="Закрыть меню"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Навигация */}
      <nav className="sidebar-nav">
        {navigation.map(item => (
          <NavItem 
            key={item.path} 
            item={item} 
            isActive={isGroupActive(item)}
          />
        ))}
      </nav>

      {/* Разделитель */}
      <div className="sidebar-divider" />

      {/* Настройки */}
      <div className="sidebar-footer">
        <NavLink
          to="/settings"
          className={({ isActive }) => 
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="nav-item-icon">
            <Settings size={20} />
          </span>
          <span className="nav-item-label">Настройки</span>
        </NavLink>
      </div>

      {/* Статистика (опционально) */}
      {stats.unreadChats > 0 && (
        <div className="sidebar-stats">
          <div className="stat-item">
            <Clock size={16} />
            <span>Непрочитанных: {stats.unreadChats}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
