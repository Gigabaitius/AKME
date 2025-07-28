// src/views/pages/SilentPage.jsx
/**
 * 🔇 Страница молчащих кандидатов
 * @description Управление кандидатами, которые не отвечают более 8 часов
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2,
  Clock,
  MessageCircle,
  Phone,
  Send,
  SendHorizontal,
  AlertTriangle,
  Filter,
  Search,
  RefreshCw,
  ChevronRight,
  Calendar,
  User,
  Briefcase
} from 'lucide-react';

// Компоненты
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

// Контроллеры и утилиты
import CandidateController from '@controllers/CandidateController';
import EventBus from '@utils/EventBus';
import Logger from '@utils/Logger';
import { formatDate, getRelativeTimeString } from '@utils/dateHelpers';

// Стили
import './SilentPage.css';

const logger = new Logger('SilentPage');

/**
 * Страница молчащих кандидатов
 * @returns {JSX.Element} Страница молчащих
 */
const SilentPage = () => {
  // Состояние
  const [silentCandidates, setSilentCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedHours, setSelectedHours] = useState('all');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [messageType, setMessageType] = useState('whatsapp');
  const [customMessage, setCustomMessage] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    smsAttempts: 0,
    readyForTransfer: 0,
    avgSilentHours: 0
  });

  // Контроллер
  const [controller] = useState(() => new CandidateController());

  // Загрузка молчащих кандидатов
  const loadSilentCandidates = useCallback(async () => {
    try {
      setIsLoading(true);
      const candidates = await controller.getSilentCandidates();
      setSilentCandidates(candidates);
      setFilteredCandidates(candidates);
      calculateStats(candidates);
    } catch (error) {
      logger.error('Ошибка загрузки молчащих кандидатов', error);
      EventBus.emit('notification:error', 'Не удалось загрузить кандидатов');
    } finally {
      setIsLoading(false);
    }
  }, [controller]);

  // Расчет статистики
  const calculateStats = (candidates) => {
    const total = candidates.length;
    const smsAttempts = candidates.reduce((sum, c) => sum + (c.smsAttempts || 0), 0);
    const readyForTransfer = candidates.filter(c => {
      const hours = calculateSilentHours(c.silentSince);
      return hours >= 24 || c.smsAttempts >= 3;
    }).length;
    
    const totalHours = candidates.reduce((sum, c) => {
      return sum + calculateSilentHours(c.silentSince);
    }, 0);
    const avgSilentHours = total > 0 ? Math.round(totalHours / total) : 0;

    setStats({ total, smsAttempts, readyForTransfer, avgSilentHours });
  };

  // Расчет часов молчания
  const calculateSilentHours = (silentSince) => {
    if (!silentSince) return 0;
    const now = new Date();
    const silentDate = new Date(silentSince);
    return Math.floor((now - silentDate) / (1000 * 60 * 60));
  };

  // Эффект загрузки при монтировании
  useEffect(() => {
    loadSilentCandidates();

    // Подписка на события
    const handleCandidateUpdated = () => loadSilentCandidates();
    const handleCandidateTransferred = () => loadSilentCandidates();

    EventBus.on('candidate:updated', handleCandidateUpdated);
    EventBus.on('candidate:transferred', handleCandidateTransferred);

    // Автообновление каждые 5 минут
    const interval = setInterval(() => {
      loadSilentCandidates();
    }, 5 * 60 * 1000);

    return () => {
      EventBus.off('candidate:updated', handleCandidateUpdated);
      EventBus.off('candidate:transferred', handleCandidateTransferred);
      clearInterval(interval);
    };
  }, [loadSilentCandidates]);

  // Фильтрация кандидатов
  useEffect(() => {
    let filtered = [...silentCandidates];

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(candidate =>
        candidate.name?.toLowerCase().includes(query) ||
        candidate.phone?.toLowerCase().includes(query) ||
        candidate.project?.toLowerCase().includes(query)
      );
    }

    // Фильтр по проекту
    if (selectedProject !== 'all') {
      filtered = filtered.filter(candidate => candidate.project === selectedProject);
    }

    // Фильтр по часам молчания
    if (selectedHours !== 'all') {
      const hours = parseInt(selectedHours);
      filtered = filtered.filter(candidate => {
        const silentHours = calculateSilentHours(candidate.silentSince);
        if (hours === 8) return silentHours >= 8 && silentHours < 12;
        if (hours === 12) return silentHours >= 12 && silentHours < 24;
        if (hours === 24) return silentHours >= 24;
        return true;
      });
    }

    setFilteredCandidates(filtered);
  }, [silentCandidates, searchQuery, selectedProject, selectedHours]);

  // Получение уникальных проектов
  const getUniqueProjects = () => {
    const projects = new Set(silentCandidates.map(c => c.project).filter(Boolean));
    return Array.from(projects).sort();
  };

  // Отправка напоминания
  const handleSendReminder = async (candidate, type = 'whatsapp') => {
    try {
      setSelectedCandidate(candidate);
      setMessageType(type);
      setShowMessageModal(true);
    } catch (error) {
      logger.error('Ошибка открытия модального окна', error);
    }
  };

  // Отправка сообщения
  const handleSendMessage = async () => {
    try {
      const message = customMessage || getDefaultMessage(selectedCandidate);
      
      if (messageType === 'whatsapp') {
        await controller.sendWhatsAppReminder(selectedCandidate.id, message);
        EventBus.emit('notification:success', 'WhatsApp напоминание отправлено');
      } else {
        await controller.sendSMSReminder(selectedCandidate.id, message);
        EventBus.emit('notification:success', 'SMS напоминание отправлено');
      }
      
      setShowMessageModal(false);
      setCustomMessage('');
      loadSilentCandidates();
    } catch (error) {
      logger.error('Ошибка отправки сообщения', error);
      EventBus.emit('notification:error', 'Не удалось отправить сообщение');
    }
  };

  // Получение стандартного сообщения
  const getDefaultMessage = (candidate) => {
    const hours = calculateSilentHours(candidate.silentSince);
    const hoursText = hours >= 24 ? `${Math.floor(hours / 24)} дней` : `${hours} часов`;
    
    return `Здравствуйте, ${candidate.name}! 

Вы не отвечаете уже ${hoursText}. Мы ждем от вас ответ по поводу вакансии "${candidate.project}". 

Пожалуйста, свяжитесь с нами или сообщите, если вакансия вас больше не интересует.

С уважением,
HR отдел`;
  };

  // Передача на 1-ю линию
  const handleTransferToFirstLine = async (candidate) => {
    if (window.confirm(`Передать кандидата ${candidate.name} на 1-ю линию?`)) {
      try {
        await controller.transferToFirstLine(candidate.id, 'Не отвечает более 24 часов');
        EventBus.emit('notification:success', 'Кандидат передан на 1-ю линию');
        loadSilentCandidates();
      } catch (error) {
        logger.error('Ошибка передачи кандидата', error);
        EventBus.emit('notification:error', 'Не удалось передать кандидата');
      }
    }
  };

  // Массовая передача
  const handleBulkTransfer = async () => {
    const readyForTransfer = filteredCandidates.filter(c => {
      const hours = calculateSilentHours(c.silentSince);
      return hours >= 24 || c.smsAttempts >= 3;
    });

    if (readyForTransfer.length === 0) {
      EventBus.emit('notification:warning', 'Нет кандидатов готовых к передаче');
      return;
    }

    if (window.confirm(`Передать ${readyForTransfer.length} кандидатов на 1-ю линию?`)) {
      try {
        for (const candidate of readyForTransfer) {
          await controller.transferToFirstLine(candidate.id, 'Массовая передача молчащих');
        }
        EventBus.emit('notification:success', `Передано ${readyForTransfer.length} кандидатов`);
        loadSilentCandidates();
      } catch (error) {
        logger.error('Ошибка массовой передачи', error);
        EventBus.emit('notification:error', 'Ошибка при массовой передаче');
      }
    }
  };

  // Определение статуса кандидата
  const getCandidateStatus = (candidate) => {
    const hours = calculateSilentHours(candidate.silentSince);
    
    if (hours >= 24) return { text: 'Готов к передаче', class: 'status-danger' };
    if (hours >= 12) return { text: 'Критично', class: 'status-warning' };
    return { text: 'Молчит', class: 'status-info' };
  };

  // Компонент карточки кандидата
  const SilentCandidateCard = ({ candidate }) => {
    const hours = calculateSilentHours(candidate.silentSince);
    const status = getCandidateStatus(candidate);
    const isReadyForTransfer = hours >= 24 || candidate.smsAttempts >= 3;

    return (
      <motion.div
        className={`silent-candidate-card ${isReadyForTransfer ? 'ready-for-transfer' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div className="candidate-header">
          <div className="candidate-info">
            <div className="candidate-name">
              <User size={20} />
              <h3>{candidate.name}</h3>
            </div>
            <div className="candidate-details">
              <span className="phone">
                <Phone size={14} />
                {candidate.phone}
              </span>
              <span className="project">
                <Briefcase size={14} />
                {candidate.project}
              </span>
            </div>
          </div>
          
          <div className={`candidate-status ${status.class}`}>
            {status.text}
          </div>
        </div>

        <div className="silence-info">
          <div className="silence-duration">
            <Clock size={20} className="duration-icon" />
            <div className="duration-details">
              <span className="duration-value">{hours} часов</span>
              <span className="duration-label">без ответа</span>
              <span className="duration-since">
                с {formatDate(candidate.silentSince, 'full')}
              </span>
            </div>
          </div>

          <div className="sms-attempts">
            <MessageCircle size={20} className="attempts-icon" />
            <div className="attempts-details">
              <span className="attempts-value">{candidate.smsAttempts || 0}</span>
              <span className="attempts-label">SMS отправлено</span>
              {candidate.lastSmsDate && (
                <span className="attempts-last">
                  последнее {getRelativeTimeString(new Date(candidate.lastSmsDate))}
                </span>
              )}
            </div>
          </div>
        </div>

        {candidate.lastReply && (
          <div className="last-message">
            <span className="label">Последний ответ:</span>
            <p className="message">{candidate.lastReply}</p>
            <span className="time">{formatDate(candidate.lastReplyDate, 'relative')}</span>
          </div>
        )}

        <div className="candidate-actions">
          {candidate.chatId && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSendReminder(candidate, 'whatsapp')}
            >
              <MessageCircle size={16} />
              WhatsApp
            </Button>
          )}
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSendReminder(candidate, 'sms')}
            disabled={candidate.smsAttempts >= 3}
          >
            <Phone size={16} />
            SMS {candidate.smsAttempts >= 3 && '(лимит)'}
          </Button>
          
          {isReadyForTransfer && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleTransferToFirstLine(candidate)}
            >
              <SendHorizontal size={16} />
              На 1-ю линию
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка молчащих кандидатов...</p>
      </div>
    );
  }

  return (
    <div className="silent-page">
      {/* Заголовок страницы */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <Volume2 size={32} />
            Молчащие кандидаты
          </h1>
          <p className="page-subtitle">
            Кандидаты без ответа более 8 часов • {stats.total} человек
          </p>
        </div>
        
        <div className="header-actions">
          <Button
            variant="secondary"
            onClick={loadSilentCandidates}
          >
            <RefreshCw size={20} />
            Обновить
          </Button>
          
          {stats.readyForTransfer > 0 && (
            <Button
              variant="danger"
              onClick={handleBulkTransfer}
            >
              <SendHorizontal size={20} />
              Передать готовых ({stats.readyForTransfer})
            </Button>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="silent-stats">
        <div className="stat-card">
          <Volume2 size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Всего молчат</span>
          </div>
        </div>
        
        <div className="stat-card">
          <MessageCircle size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.smsAttempts}</span>
            <span className="stat-label">SMS отправлено</span>
          </div>
        </div>
        
        <div className="stat-card warning">
          <SendHorizontal size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.readyForTransfer}</span>
            <span className="stat-label">Готовы к передаче</span>
          </div>
        </div>
        
        <div className="stat-card">
          <Clock size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.avgSilentHours}ч</span>
            <span className="stat-label">Среднее время молчания</span>
          </div>
        </div>
      </div>

      {/* Панель инструментов */}
      <div className="toolbar">
        <div className="toolbar-left">
          {/* Поиск */}
          <div className="search-box">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Поиск по имени, телефону, проекту..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Фильтры */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все проекты</option>
            {getUniqueProjects().map(project => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>

          <select
            value={selectedHours}
            onChange={(e) => setSelectedHours(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все периоды</option>
            <option value="8">8-12 часов</option>
            <option value="12">12-24 часа</option>
            <option value="24">Более 24 часов</option>
          </select>
        </div>

        <div className="toolbar-right">
          <div className="info-badge">
            <AlertTriangle size={16} />
            <span>Автоматическая передача после 18:30</span>
          </div>
        </div>
      </div>

      {/* Список кандидатов */}
      <div className="silent-candidates-grid">
        {filteredCandidates.length > 0 ? (
          <AnimatePresence>
            {filteredCandidates.map((candidate, index) => (
              <SilentCandidateCard 
                key={candidate.id} 
                candidate={candidate}
              />
            ))}
          </AnimatePresence>
        ) : (
          <div className="empty-state">
            <Volume2 size={64} className="empty-icon" />
            <h3>Нет молчащих кандидатов</h3>
            <p>
              {searchQuery || selectedProject !== 'all' || selectedHours !== 'all'
                ? 'Попробуйте изменить параметры поиска'
                : 'Все кандидаты активно отвечают!'}
            </p>
          </div>
        )}
      </div>

      {/* Модальное окно отправки сообщения */}
      {showMessageModal && selectedCandidate && (
        <Modal
          title={`Отправить ${messageType === 'sms' ? 'SMS' : 'WhatsApp'} напоминание`}
          onClose={() => {
            setShowMessageModal(false);
            setCustomMessage('');
          }}
          size="md"
        >
          <div className="message-modal">
            <div className="recipient-info">
              <p><strong>Кому:</strong> {selectedCandidate.name}</p>
              <p><strong>Телефон:</strong> {selectedCandidate.phone}</p>
              <p><strong>Молчит:</strong> {calculateSilentHours(selectedCandidate.silentSince)} часов</p>
            </div>

            <div className="message-form">
              <label>Сообщение:</label>
              <textarea
                value={customMessage || getDefaultMessage(selectedCandidate)}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={8}
                className="message-textarea"
              />

              <div className="message-templates">
                <p>Быстрые шаблоны:</p>
                <button
                  className="template-button"
                  onClick={() => setCustomMessage('Здравствуйте! Вы еще рассматриваете нашу вакансию?')}
                >
                  Короткое напоминание
                </button>
                <button
                  className="template-button"
                  onClick={() => setCustomMessage(getDefaultMessage(selectedCandidate))}
                >
                  Стандартное сообщение
                </button>
                <button
                  className="template-button"
                  onClick={() => setCustomMessage('Добрый день! Если вакансия вас больше не интересует, пожалуйста, сообщите нам.')}
                >
                  Финальное напоминание
                </button>
              </div>

              <div className="form-actions">
                <Button
                  variant="primary"
                  onClick={handleSendMessage}
                >
                  <Send size={20} />
                  Отправить {messageType === 'sms' ? 'SMS' : 'WhatsApp'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowMessageModal(false);
                    setCustomMessage('');
                  }}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SilentPage;
