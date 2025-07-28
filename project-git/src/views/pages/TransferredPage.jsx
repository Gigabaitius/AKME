// src/views/pages/TransferredPage.jsx
/**
 * 📤 Страница переданных кандидатов
 * @description Кандидаты, переданные на 1-ю линию поддержки
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SendHorizontal,
  User,
  Calendar,
  Clock,
  MessageCircle,
  Search,
  Filter,
  Download,
  RotateCcw,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Phone,
  Briefcase,
  FileText
} from 'lucide-react';

// Компоненты
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

// Контроллеры и утилиты
import CandidateController from '@controllers/CandidateController';
import EventBus from '@utils/EventBus';
import Logger from '@utils/Logger';
import { formatDate, getDaysDifference } from '@utils/dateHelpers';

// Стили
import './TransferredPage.css';

const logger = new Logger('TransferredPage');

/**
 * Страница переданных кандидатов
 * @returns {JSX.Element} Страница переданных
 */
const TransferredPage = () => {
  // Состояние
  const [transferredCandidates, setTransferredCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedReason, setSelectedReason] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    lastWeek: 0,
    lastMonth: 0,
    byReason: {
      silent: 0,
      manual: 0,
      auto: 0
    }
  });

  // Контроллер
  const [controller] = useState(() => new CandidateController());

  // Загрузка переданных кандидатов
  const loadTransferredCandidates = useCallback(async () => {
    try {
      setIsLoading(true);
      const candidates = await controller.getTransferredCandidates();
      setTransferredCandidates(candidates);
      setFilteredCandidates(candidates);
      calculateStats(candidates);
    } catch (error) {
      logger.error('Ошибка загрузки переданных кандидатов', error);
      EventBus.emit('notification:error', 'Не удалось загрузить кандидатов');
    } finally {
      setIsLoading(false);
    }
  }, [controller]);

  // Расчет статистики
  const calculateStats = (candidates) => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total: candidates.length,
      lastWeek: 0,
      lastMonth: 0,
      byReason: {
        silent: 0,
        manual: 0,
        auto: 0
      }
    };

    candidates.forEach(candidate => {
      const transferDate = new Date(candidate.transferredAt);
      
      if (transferDate >= weekAgo) stats.lastWeek++;
      if (transferDate >= monthAgo) stats.lastMonth++;
      
      // Подсчет по причинам
      if (candidate.transferReason?.includes('молч') || candidate.transferReason?.includes('не отвеча')) {
        stats.byReason.silent++;
      } else if (candidate.transferReason?.includes('автомат')) {
        stats.byReason.auto++;
      } else {
        stats.byReason.manual++;
      }
    });

    setStats(stats);
  };

  // Эффект загрузки при монтировании
  useEffect(() => {
    loadTransferredCandidates();

    // Подписка на события
    const handleCandidateTransferred = () => loadTransferredCandidates();
    const handleCandidateReturned = () => loadTransferredCandidates();

    EventBus.on('candidate:transferred', handleCandidateTransferred);
    EventBus.on('candidate:returned', handleCandidateReturned);

    return () => {
      EventBus.off('candidate:transferred', handleCandidateTransferred);
      EventBus.off('candidate:returned', handleCandidateReturned);
    };
  }, [loadTransferredCandidates]);

  // Фильтрация кандидатов
  useEffect(() => {
    let filtered = [...transferredCandidates];

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(candidate =>
        candidate.name?.toLowerCase().includes(query) ||
        candidate.phone?.toLowerCase().includes(query) ||
        candidate.project?.toLowerCase().includes(query) ||
        candidate.transferReason?.toLowerCase().includes(query)
      );
    }

    // Фильтр по проекту
    if (selectedProject !== 'all') {
      filtered = filtered.filter(candidate => candidate.project === selectedProject);
    }

    // Фильтр по периоду
    if (selectedPeriod !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (selectedPeriod) {
        case 'today':
          filterDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(candidate => 
        new Date(candidate.transferredAt) >= filterDate
      );
    }

    // Фильтр по причине
    if (selectedReason !== 'all') {
      filtered = filtered.filter(candidate => {
        const reason = candidate.transferReason?.toLowerCase() || '';
        switch (selectedReason) {
          case 'silent':
            return reason.includes('молч') || reason.includes('не отвеча');
          case 'auto':
            return reason.includes('автомат');
          case 'manual':
            return !reason.includes('молч') && !reason.includes('не отвеча') && !reason.includes('автомат');
          default:
            return true;
        }
      });
    }

    // Сортировка по дате передачи (новые первыми)
    filtered.sort((a, b) => new Date(b.transferredAt) - new Date(a.transferredAt));

    setFilteredCandidates(filtered);
  }, [transferredCandidates, searchQuery, selectedProject, selectedPeriod, selectedReason]);

  // Получение уникальных проектов
  const getUniqueProjects = () => {
    const projects = new Set(transferredCandidates.map(c => c.project).filter(Boolean));
    return Array.from(projects).sort();
  };

  // Вернуть кандидата в работу
  const handleReturnCandidate = async (candidate) => {
    if (window.confirm(`Вернуть кандидата ${candidate.name} в работу?`)) {
      try {
        await controller.returnFromFirstLine(candidate.id);
        EventBus.emit('notification:success', 'Кандидат возвращен в работу');
        loadTransferredCandidates();
      } catch (error) {
        logger.error('Ошибка возврата кандидата', error);
        EventBus.emit('notification:error', 'Не удалось вернуть кандидата');
      }
    }
  };

  // Показать детали кандидата
  const handleShowDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setShowDetailsModal(true);
  };

  // Экспорт переданных
  const handleExport = async () => {
    try {
      const csv = await controller.exportTransferredToCSV(filteredCandidates);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `transferred_candidates_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      EventBus.emit('notification:success', 'Кандидаты экспортированы');
    } catch (error) {
      logger.error('Ошибка экспорта', error);
      EventBus.emit('notification:error', 'Не удалось экспортировать кандидатов');
    }
  };

  // Получение иконки причины
  const getReasonIcon = (reason) => {
    if (!reason) return <AlertCircle size={16} />;
    
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('молч') || lowerReason.includes('не отвеча')) {
      return <Clock size={16} />;
    }
    if (lowerReason.includes('автомат')) {
      return <SendHorizontal size={16} />;
    }
    return <User size={16} />;
  };

  // Компонент карточки переданного кандидата
  const TransferredCandidateCard = ({ candidate }) => {
    const daysOnFirstLine = getDaysDifference(new Date(candidate.transferredAt), new Date());
    
    return (
      <motion.div
        className="transferred-candidate-card"
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
          
          <div className="transfer-badge">
            <SendHorizontal size={16} />
            <span>{daysOnFirstLine} дней на 1-й</span>
          </div>
        </div>

        <div className="transfer-info">
          <div className="transfer-reason">
            <div className="reason-icon">
              {getReasonIcon(candidate.transferReason)}
            </div>
            <div className="reason-details">
              <span className="reason-label">Причина передачи:</span>
              <p className="reason-text">{candidate.transferReason || 'Не указана'}</p>
            </div>
          </div>

          <div className="transfer-date">
            <Calendar size={16} />
            <span>Передан: {formatDate(candidate.transferredAt, 'full')}</span>
          </div>
        </div>

        {candidate.firstLineComment && (
          <div className="first-line-comment">
            <span className="comment-label">Комментарий 1-й линии:</span>
            <p className="comment-text">{candidate.firstLineComment}</p>
          </div>
        )}

        <div className="candidate-timeline">
          <div className="timeline-item">
            <CheckCircle size={16} className="timeline-icon" />
            <span>Создан: {formatDate(candidate.createdAt, 'default')}</span>
          </div>
          
          {candidate.silentSince && (
            <div className="timeline-item">
              <Clock size={16} className="timeline-icon" />
              <span>Молчал с: {formatDate(candidate.silentSince, 'default')}</span>
            </div>
          )}
          
          <div className="timeline-item">
            <SendHorizontal size={16} className="timeline-icon" />
            <span>Передан: {formatDate(candidate.transferredAt, 'default')}</span>
          </div>
        </div>

        <div className="candidate-actions">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleReturnCandidate(candidate)}
          >
            <RotateCcw size={16} />
            Вернуть в работу
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleShowDetails(candidate)}
          >
            <FileText size={16} />
            Подробнее
          </Button>
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка переданных кандидатов...</p>
      </div>
    );
  }

  return (
    <div className="transferred-page">
      {/* Заголовок страницы */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <SendHorizontal size={32} />
            Переданы на 1-ю линию
          </h1>
          <p className="page-subtitle">
            Кандидаты, переданные специалистам первой линии • {stats.total} человек
          </p>
        </div>
        
        <div className="header-actions">
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={filteredCandidates.length === 0}
          >
            <Download size={20} />
            Экспорт в CSV
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="transferred-stats">
        <div className="stat-card">
          <SendHorizontal size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Всего передано</span>
          </div>
        </div>
        
        <div className="stat-card">
          <Calendar size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.lastWeek}</span>
            <span className="stat-label">За неделю</span>
          </div>
        </div>
        
        <div className="stat-card">
          <Clock size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.byReason.silent}</span>
            <span className="stat-label">Из-за молчания</span>
          </div>
        </div>
        
        <div className="stat-card">
          <User size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.byReason.manual}</span>
            <span className="stat-label">Вручную</span>
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
              placeholder="Поиск по имени, телефону, проекту, причине..."
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
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все время</option>
            <option value="today">Сегодня</option>
            <option value="week">За неделю</option>
            <option value="month">За месяц</option>
          </select>

          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все причины</option>
            <option value="silent">Молчание</option>
            <option value="auto">Автоматически</option>
            <option value="manual">Вручную</option>
          </select>
        </div>
      </div>

      {/* Список кандидатов */}
      <div className="transferred-candidates-grid">
        {filteredCandidates.length > 0 ? (
          <AnimatePresence>
            {filteredCandidates.map(candidate => (
              <TransferredCandidateCard 
                key={candidate.id} 
                candidate={candidate}
              />
            ))}
          </AnimatePresence>
        ) : (
          <div className="empty-state">
            <SendHorizontal size={64} className="empty-icon" />
            <h3>Нет переданных кандидатов</h3>
            <p>
              {searchQuery || selectedProject !== 'all' || selectedPeriod !== 'all' || selectedReason !== 'all'
                ? 'Попробуйте изменить параметры поиска'
                : 'Пока нет кандидатов, переданных на первую линию'}
            </p>
          </div>
        )}
      </div>

      {/* Модальное окно деталей */}
      {showDetailsModal && selectedCandidate && (
        <Modal
          title={`Детали: ${selectedCandidate.name}`}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCandidate(null);
          }}
          size="lg"
        >
          <div className="candidate-details-modal">
            <div className="details-section">
              <h3>Основная информация</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">ФИО:</span>
                  <span className="value">{selectedCandidate.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Телефон:</span>
                  <span className="value">{selectedCandidate.phone}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Email:</span>
                  <span className="value">{selectedCandidate.email || 'Не указан'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Проект:</span>
                  <span className="value">{selectedCandidate.project}</span>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h3>История передачи</h3>
              <div className="transfer-history">
                <div className="history-item">
                  <CheckCircle size={20} className="history-icon success" />
                  <div className="history-content">
                    <span className="history-date">
                      {formatDate(selectedCandidate.createdAt, 'full')}
                    </span>
                    <span className="history-event">Кандидат создан</span>
                  </div>
                </div>

                {selectedCandidate.silentSince && (
                  <div className="history-item">
                    <Clock size={20} className="history-icon warning" />
                    <div className="history-content">
                      <span className="history-date">
                        {formatDate(selectedCandidate.silentSince, 'full')}
                      </span>
                      <span className="history-event">Начал молчать</span>
                    </div>
                  </div>
                )}

                <div className="history-item">
                  <SendHorizontal size={20} className="history-icon danger" />
                  <div className="history-content">
                    <span className="history-date">
                      {formatDate(selectedCandidate.transferredAt, 'full')}
                    </span>
                    <span className="history-event">
                      Передан на 1-ю линию
                      <br />
                      <small>Причина: {selectedCandidate.transferReason}</small>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {selectedCandidate.comment && (
              <div className="details-section">
                <h3>Комментарий</h3>
                <p className="comment-text">{selectedCandidate.comment}</p>
              </div>
            )}

            <div className="modal-actions">
              <Button
                variant="primary"
                onClick={() => {
                  handleReturnCandidate(selectedCandidate);
                  setShowDetailsModal(false);
                }}
              >
                <RotateCcw size={20} />
                Вернуть в работу
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Закрыть
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TransferredPage;
