// src/views/pages/DashboardPage.jsx
/**
 * 📊 Страница дашборда
 * @description Главная страница с метриками и статистикой
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Volume2, 
  SendHorizontal, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  BarChart3,
  Calendar,
  Target,
  MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

// Компоненты
import StatCard from '@components/features/StatCard';
import CandidateView from '@components/features/CandidateView';
import Button from '@components/common/Button';

// Утилиты
import EventBus from '@utils/EventBus';
import Logger from '@utils/Logger';
import { formatDate } from '@utils/dateHelpers';

// Стили
import './DashboardPage.css';

const logger = new Logger('DashboardPage');

/**
 * Страница дашборда
 * @returns {JSX.Element} Страница дашборда
 */
const DashboardPage = () => {
  const navigate = useNavigate();
  
  // Состояние
  const [stats, setStats] = useState({
    totalCandidates: 0,
    activeCandidates: 0,
    silentCandidates: 0,
    transferredCandidates: 0,
    shiftWorkers: 0,
    unreadChats: 0,
    botReplies: 0,
    todayMessages: 0,
    conversionRate: 0
  });

  const [recentCandidates, setRecentCandidates] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadDashboardData();
    
    // Подписка на обновления
    const handleStatsUpdate = (newStats) => {
      setStats(prevStats => ({ ...prevStats, ...newStats }));
    };

    const handleCandidateUpdate = () => {
      loadRecentCandidates();
    };

    EventBus.on('dashboard:statsUpdated', handleStatsUpdate);
    EventBus.on('candidate:updated', handleCandidateUpdate);
    EventBus.on('candidate:created', handleCandidateUpdate);

    return () => {
      EventBus.off('dashboard:statsUpdated', handleStatsUpdate);
      EventBus.off('candidate:updated', handleCandidateUpdate);
      EventBus.off('candidate:created', handleCandidateUpdate);
    };
  }, []);

  // Загрузка данных дашборда
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Получаем данные из localStorage
      const storedData = localStorage.getItem('hr-assistant-data');
      if (storedData) {
        const data = JSON.parse(storedData);
        
        // Подсчет статистики
        const candidates = data.candidates || [];
        const silentCandidates = data.silentCandidates || [];
        const transferredCandidates = data.transferredCandidates || [];
        const shiftWorkers = data.shiftWorkers || [];
        
        setStats({
          totalCandidates: candidates.length,
          activeCandidates: candidates.filter(c => c.status === 'Активен').length,
          silentCandidates: silentCandidates.length,
          transferredCandidates: transferredCandidates.length,
          shiftWorkers: shiftWorkers.length,
          unreadChats: Math.floor(Math.random() * 50) + 10, // Мокированные данные
          botReplies: Math.floor(Math.random() * 100) + 50,
          todayMessages: Math.floor(Math.random() * 200) + 100,
          conversionRate: Math.floor(Math.random() * 30) + 15
        });
        
        // Последние кандидаты
        const allCandidates = [...candidates, ...silentCandidates, ...transferredCandidates];
        const recent = allCandidates
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentCandidates(recent);
        
        // Последние активности
        loadRecentActivities();
      }
      
    } catch (error) {
      logger.error('Ошибка загрузки данных дашборда', error);
      EventBus.emit('notification:error', 'Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка последних кандидатов
  const loadRecentCandidates = async () => {
    try {
      const storedData = localStorage.getItem('hr-assistant-data');
      if (storedData) {
        const data = JSON.parse(storedData);
        const allCandidates = [
          ...(data.candidates || []),
          ...(data.silentCandidates || []),
          ...(data.transferredCandidates || [])
        ];
        
        const recent = allCandidates
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        
        setRecentCandidates(recent);
      }
    } catch (error) {
      logger.error('Ошибка загрузки последних кандидатов', error);
    }
  };

  // Загрузка последних активностей
  const loadRecentActivities = () => {
    // Мокированные данные активностей
    const activities = [
      {
        id: 1,
        type: 'candidate_added',
        message: 'Добавлен новый кандидат Иван Иванов',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        icon: <Users size={16} />,
        color: 'success'
      },
      {
        id: 2,
        type: 'message_sent',
        message: 'Отправлено напоминание кандидату Петр Петров',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        icon: <MessageCircle size={16} />,
        color: 'info'
      },
      {
        id: 3,
        type: 'candidate_silent',
        message: 'Кандидат Мария Сидорова перешла в статус "Молчит"',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        icon: <Volume2 size={16} />,
        color: 'warning'
      },
      {
        id: 4,
        type: 'checkpoint_missed',
        message: 'Вахтовик Алексей пропустил контрольную точку',
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        icon: <AlertCircle size={16} />,
        color: 'error'
      },
      {
        id: 5,
        type: 'candidate_transferred',
        message: 'Кандидат Ольга Смирнова передана на 1-ю линию',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        icon: <SendHorizontal size={16} />,
        color: 'warning'
      }
    ];
    
    setRecentActivities(activities);
  };

  // Навигация к странице
  const navigateToPage = (page) => {
    navigate(`/${page}`);
  };

  // Анимация для карточек
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка дашборда...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Заголовок страницы */}
      <div className="page-header">
        <h1 className="page-title">Дашборд</h1>
        <p className="page-subtitle">
          Добро пожаловать в HR Assistant! Вот краткая сводка по вашей работе.
        </p>
      </div>

      {/* Статистические карточки */}
      <div className="stats-grid">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
        >
          <StatCard
            title="Всего кандидатов"
            value={stats.totalCandidates}
            icon={<Users size={24} />}
            trend={+12}
            color="primary"
            onClick={() => navigateToPage('candidates')}
          />
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          <StatCard
            title="Молчат"
            value={stats.silentCandidates}
            icon={<Volume2 size={24} />}
            trend={-5}
            color="warning"
            onClick={() => navigateToPage('silent')}
          />
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
        >
          <StatCard
            title="Переданы на 1-ю"
            value={stats.transferredCandidates}
            icon={<SendHorizontal size={24} />}
            trend={+3}
            color="info"
            onClick={() => navigateToPage('transferred')}
          />
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
        >
          <StatCard
            title="Вахтовики"
            value={stats.shiftWorkers}
            icon={<Target size={24} />}
            trend={0}
            color="success"
            onClick={() => navigateToPage('shift-workers')}
          />
        </motion.div>
      </div>

      {/* Дополнительные метрики */}
      <div className="metrics-row">
        <motion.div
          className="metric-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
        >
          <div className="metric-icon">
            <MessageCircle size={32} />
          </div>
          <div className="metric-content">
            <h3>Непрочитанных чатов</h3>
            <p className="metric-value">{stats.unreadChats}</p>
            <span className="metric-label">требуют внимания</span>
          </div>
        </motion.div>

        <motion.div
          className="metric-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.6 }}
        >
          <div className="metric-icon">
            <Activity size={32} />
          </div>
          <div className="metric-content">
            <h3>Сообщений сегодня</h3>
            <p className="metric-value">{stats.todayMessages}</p>
            <span className="metric-label">обработано</span>
          </div>
        </motion.div>

        <motion.div
          className="metric-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.7 }}
        >
          <div className="metric-icon">
            <TrendingUp size={32} />
          </div>
          <div className="metric-content">
            <h3>Конверсия</h3>
            <p className="metric-value">{stats.conversionRate}%</p>
            <span className="metric-label">кандидатов доведены</span>
          </div>
        </motion.div>
      </div>

      <div className="dashboard-content">
        {/* Последние кандидаты */}
        <motion.div
          className="recent-section"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.8 }}
        >
          <div className="section-header">
            <h2 className="section-title">
              <Users size={20} />
              Последние кандидаты
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateToPage('candidates')}
            >
              Показать всех
            </Button>
          </div>
          
          <div className="candidates-list">
            {recentCandidates.length > 0 ? (
              recentCandidates.map(candidate => (
                <CandidateView
                  key={candidate.id}
                  candidate={candidate}
                  onEdit={() => EventBus.emit('candidate:edit', candidate)}
                  onDelete={() => EventBus.emit('candidate:delete', candidate.id)}
                  onSendMessage={() => EventBus.emit('whatsapp:sendMessage', candidate)}
                />
              ))
            ) : (
              <div className="empty-state">
                <Users size={48} className="empty-icon" />
                <p>Нет кандидатов</p>
                <Button
                  variant="primary"
                  onClick={() => navigateToPage('candidates')}
                >
                  Добавить кандидата
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Последние активности */}
        <motion.div
          className="activity-section"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.9 }}
        >
          <div className="section-header">
            <h2 className="section-title">
              <Activity size={20} />
              Последние активности
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateToPage('activities')}
            >
              Все активности
            </Button>
          </div>
          
          <div className="activity-list">
            {recentActivities.map(activity => (
              <div key={activity.id} className={`activity-item ${activity.color}`}>
                <div className="activity-icon">
                  {activity.icon}
                </div>
                <div className="activity-content">
                  <p className="activity-message">{activity.message}</p>
                  <span className="activity-time">
                    {formatDate(activity.timestamp, 'relative')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Быстрые действия */}
      <motion.div
        className="quick-actions"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 1.0 }}
      >
        <h2 className="section-title">Быстрые действия</h2>
        <div className="actions-grid">
          <Button
            variant="primary"
            onClick={() => EventBus.emit('candidate:addNew')}
          >
            <Users size={20} />
            Добавить кандидата
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => navigateToPage('training')}
          >
            <MessageCircle size={20} />
            Обучить GPT
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => navigateToPage('mailings')}
          >
            <SendHorizontal size={20} />
            Создать рассылку
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => EventBus.emit('data:export')}
          >
            <BarChart3 size={20} />
            Экспорт данных
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
