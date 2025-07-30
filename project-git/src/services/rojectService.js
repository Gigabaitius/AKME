// src/views/pages/MailingsPage.jsx
/**
 * 📧 Страница рассылок
 * @description Создание и управление массовыми рассылками
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail,
  Plus,
  Send,
  MessageCircle,
  Phone,
  Users,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  Copy,
  Play,
  Pause,
  BarChart3
} from 'lucide-react';

// Компоненты
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

// Контроллеры и утилиты
import MailingController from '@controllers/MailingController';
import CandidateController from '@controllers/CandidateController';
import EventBus from '@utils/EventBus';
import Logger from '@utils/Logger';
import { formatDate } from '@utils/dateHelpers';

// Стили
import './MailingsPage.css';

const logger = new Logger('MailingsPage');

/**
 * Страница рассылок
 * @returns {JSX.Element} Страница рассылок
 */
const MailingsPage = () => {
  // Состояние
  const [mailings, setMailings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMailing, setSelectedMailing] = useState(null);
  const [sendingProgress, setSendingProgress] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    draft: 0,
    totalRecipients: 0,
    successRate: 0
  });

  // Контроллеры
  const [mailingController] = useState(() => new MailingController());
  const [candidateController] = useState(() => new CandidateController());

  // Загрузка рассылок
  const loadMailings = useCallback(async () => {
    try {
      setIsLoading(true);
      const history = mailingController.getMailingHistory();
      setMailings(history);
      
      const statistics = mailingController.getMailingStatistics();
      setStats(statistics);
    } catch (error) {
      logger.error('Ошибка загрузки рассылок', error);
      EventBus.emit('notification:error', 'Не удалось загрузить рассылки');
    } finally {
      setIsLoading(false);
    }
  }, [mailingController]);

  // Эффект загрузки при монтировании
  useEffect(() => {
    loadMailings();

    // Подписка на события
    const handleMailingCreated = () => loadMailings();
    const handleMailingCompleted = () => loadMailings();
    const handleMailingDeleted = () => loadMailings();
    const handleMailingProgress = ({ mailingId, sent, failed, total }) => {
      setSendingProgress(prev => ({
        ...prev,
        [mailingId]: { sent, failed, total, progress: Math.round((sent + failed) / total * 100) }
      }));
    };

    EventBus.on('mailing:created', handleMailingCreated);
    EventBus.on('mailing:completed', handleMailingCompleted);
    EventBus.on('mailing:deleted', handleMailingDeleted);
    EventBus.on('mailing:progress', handleMailingProgress);

    return () => {
      EventBus.off('mailing:created', handleMailingCreated);
      EventBus.off('mailing:completed', handleMailingCompleted);
      EventBus.off('mailing:deleted', handleMailingDeleted);
      EventBus.off('mailing:progress', handleMailingProgress);
    };
  }, [loadMailings]);

  // Создание рассылки
  const handleCreateMailing = async (mailingData) => {
    try {
      await mailingController.createMailing(mailingData);
      setShowCreateModal(false);
      loadMailings();
    } catch (error) {
      logger.error('Ошибка создания рассылки', error);
      EventBus.emit('notification:error', 'Не удалось создать рассылку');
    }
  };

  // Отправка рассылки
  const handleSendMailing = async (mailingId) => {
    if (!window.confirm('Начать отправку рассылки?')) return;
    
    try {
      setSendingProgress(prev => ({
        ...prev,
        [mailingId]: { sent: 0, failed: 0, total: 0, progress: 0 }
      }));
      
      await mailingController.sendMailing(mailingId);
      
      // Убираем прогресс после завершения
      setTimeout(() => {
        setSendingProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[mailingId];
          return newProgress;
        });
      }, 3000);
      
      loadMailings();
    } catch (error) {
      logger.error('Ошибка отправки рассылки', error);
      EventBus.emit('notification:error', 'Ошибка при отправке рассылки');
    }
  };

  // Удаление рассылки
  const handleDeleteMailing = async (mailingId) => {
    if (!window.confirm('Удалить эту рассылку?')) return;
    
    try {
      mailingController.deleteMailing(mailingId);
      loadMailings();
    } catch (error) {
      logger.error('Ошибка удаления рассылки', error);
    }
  };

  // Дублирование рассылки
  const handleDuplicateMailing = (mailing) => {
    const duplicated = {
      ...mailing,
      name: `${mailing.name} (копия)`,
      status: 'draft'
    };
    delete duplicated.id;
    delete duplicated.createdAt;
    delete duplicated.sent;
    delete duplicated.failed;
    
    // Открываем модал создания с данными
    setSelectedMailing(duplicated);
    setShowCreateModal(true);
  };

  // Просмотр деталей
  const handleViewDetails = (mailing) => {
    setSelectedMailing(mailing);
    setShowDetailsModal(true);
  };

  // Получение иконки канала
  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageCircle size={16} />;
      case 'sms':
        return <Phone size={16} />;
      case 'telegram':
        return <Send size={16} />;
      default:
        return <Mail size={16} />;
    }
  };

  // Получение статуса рассылки
  const getMailingStatus = (mailing) => {
    if (mailing.status === 'sent') {
      const successRate = mailing.total > 0 
        ? Math.round((mailing.sent / mailing.total) * 100) 
        : 0;
      
      if (successRate === 100) {
        return { text: 'Отправлено', class: 'status-success', icon: <CheckCircle size={16} /> };
      } else if (successRate >= 80) {
        return { text: `Отправлено ${successRate}%`, class: 'status-warning', icon: <AlertCircle size={16} /> };
      } else {
        return { text: `Ошибки ${100 - successRate}%`, class: 'status-danger', icon: <XCircle size={16} /> };
      }
    }
    
    if (mailing.status === 'sending') {
      return { text: 'Отправляется...', class: 'status-info', icon: <Clock size={16} /> };
    }
    
    return { text: 'Черновик', class: 'status-default', icon: <Edit size={16} /> };
  };

  // Компонент карточки рассылки
  const MailingCard = ({ mailing }) => {
    const status = getMailingStatus(mailing);
    const progress = sendingProgress[mailing.id];
    const isSending = mailing.status === 'sending' || progress;

    return (
      <motion.div
        className="mailing-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div className="mailing-header">
          <div className="mailing-info">
            <h3 className="mailing-name">{mailing.name}</h3>
            <div className="mailing-meta">
              <span className="mailing-date">
                <Clock size={14} />
                {formatDate(mailing.createdAt, 'default')}
              </span>
              <span className={`mailing-status ${status.class}`}>
                {status.icon}
                {status.text}
              </span>
            </div>
          </div>
        </div>

        <div className="mailing-content">
          <p className="mailing-message">
            {mailing.message.length > 100 
              ? mailing.message.substring(0, 100) + '...'
              : mailing.message
            }
          </p>
        </div>

        <div className="mailing-details">
          <div className="mailing-targets">
            <span className="detail-label">Целевые группы:</span>
            <div className="target-badges">
              {mailing.targetGroups.map(group => (
                <span key={group} className="target-badge">
                  <Users size={12} />
                  {group === 'candidates' && 'Кандидаты'}
                  {group === 'silent' && 'Молчащие'}
                  {group === 'shiftWorkers' && 'Вахтовики'}
                </span>
              ))}
            </div>
          </div>

          <div className="mailing-channels">
            <span className="detail-label">Каналы:</span>
            <div className="channel-badges">
              {mailing.channels.map(channel => (
                <span key={channel} className="channel-badge">
                  {getChannelIcon(channel)}
                  {channel}
                </span>
              ))}
            </div>
          </div>

          <div className="mailing-stats">
            <div className="stat-item">
              <span className="stat-label">Получателей:</span>
              <span className="stat-value">{mailing.total || 0}</span>
            </div>
            {mailing.status === 'sent' && (
              <>
                <div className="stat-item success">
                  <span className="stat-label">Отправлено:</span>
                  <span className="stat-value">{mailing.sent || 0}</span>
                </div>
                <div className="stat-item danger">
                  <span className="stat-label">Ошибок:</span>
                  <span className="stat-value">{mailing.failed || 0}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {isSending && progress && (
          <div className="sending-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <div className="progress-stats">
              <span>Отправлено: {progress.sent}/{progress.total}</span>
              {progress.failed > 0 && (
                <span className="progress-errors">Ошибок: {progress.failed}</span>
              )}
            </div>
          </div>
        )}

        <div className="mailing-actions">
          {mailing.status === 'draft' && !isSending && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSendMailing(mailing.id)}
            >
              <Send size={16} />
              Отправить
            </Button>
          )}
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleViewDetails(mailing)}
          >
            <Eye size={16} />
            Подробнее
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDuplicateMailing(mailing)}
          >
            <Copy size={16} />
            Дублировать
          </Button>
          
          {mailing.status !== 'sending' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteMailing(mailing.id)}
            >
              <Trash2 size={16} />
              Удалить
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
        <p>Загрузка рассылок...</p>
      </div>
    );
  }

  return (
    <div className="mailings-page">
      {/* Заголовок страницы */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <Mail size={32} />
            Рассылки
          </h1>
          <p className="page-subtitle">
            Массовые рассылки через WhatsApp, SMS и Telegram
          </p>
        </div>
        
        <div className="header-actions">
          <Button
            variant="primary"
            onClick={() => {
              setSelectedMailing(null);
              setShowCreateModal(true);
            }}
          >
            <Plus size={20} />
            Создать рассылку
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="mailings-stats">
        <div className="stat-card">
          <Mail size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Всего рассылок</span>
          </div>
        </div>
        
        <div className="stat-card">
          <Send size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.sent}</span>
            <span className="stat-label">Отправлено</span>
          </div>
        </div>
        
        <div className="stat-card">
          <Users size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.totalRecipients}</span>
            <span className="stat-label">Получателей</span>
          </div>
        </div>
        
        <div className="stat-card">
          <BarChart3 size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.successRate}%</span>
            <span className="stat-label">Успешность</span>
          </div>
        </div>
      </div>

      {/* Список рассылок */}
      <div className="mailings-content">
        {mailings.length > 0 ? (
          <div className="mailings-grid">
            <AnimatePresence>
              {mailings.map(mailing => (
                <MailingCard key={mailing.id} mailing={mailing} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="empty-state">
            <Mail size={64} className="empty-icon" />
            <h3>Нет рассылок</h3>
            <p>Создайте первую рассылку для начала работы</p>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={20} />
              Создать рассылку
            </Button>
          </div>
        )}
      </div>

      {/* Модальное окно создания */}
      {showCreateModal && (
        <CreateMailingModal
          initialData={selectedMailing}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedMailing(null);
          }}
          onSubmit={handleCreateMailing}
          controller={mailingController}
          candidateController={candidateController}
        />
      )}

      {/* Модальное окно деталей */}
      {showDetailsModal && selectedMailing && (
        <MailingDetailsModal
          mailing={selectedMailing}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedMailing(null);
          }}
        />
      )}
    </div>
  );
};

// Компонент модального окна создания рассылки
const CreateMailingModal = ({ initialData, onClose, onSubmit, controller, candidateController }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    message: initialData?.message || '',
    targetGroups: initialData?.targetGroups || [],
    channels: initialData?.channels || [],
    filters: initialData?.filters || {},
    scheduledAt: initialData?.scheduledAt || null,
    ...initialData
  });

  const [recipients, setRecipients] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Расчет получателей
  const calculateRecipients = async () => {
    if (formData.targetGroups.length === 0) {
      setRecipients([]);
      return;
    }

    try {
      setIsCalculating(true);
      const allRecipients = await controller.calculateRecipients(formData);
      setRecipients(allRecipients);
    } catch (error) {
      console.error('Ошибка расчета получателей', error);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    calculateRecipients();
  }, [formData.targetGroups, formData.filters]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.message) {
      EventBus.emit('notification:error', 'Заполните обязательные поля');
      return;
    }

    if (formData.targetGroups.length === 0) {
      EventBus.emit('notification:error', 'Выберите целевые группы');
      return;
    }

    if (formData.channels.length === 0) {
      EventBus.emit('notification:error', 'Выберите каналы отправки');
      return;
    }

    onSubmit({
      ...formData,
      total: recipients.length
    });
  };

  return (
    <Modal
      title="Создание рассылки"
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="mailing-form">
        <div className="form-group">
          <label>Название рассылки *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Например: Приглашение на собеседование"
            required
          />
        </div>

        <div className="form-group">
          <label>Текст сообщения *</label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Введите текст сообщения..."
            rows={6}
            required
          />
          <div className="form-hint">
            Доступные переменные: {'{name}'}, {'{project}'}, {'{phone}'}, {'{silentTime}'}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Целевые группы *</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.targetGroups.includes('candidates')}
                  onChange={(e) => {
                    const groups = e.target.checked
                      ? [...formData.targetGroups, 'candidates']
                      : formData.targetGroups.filter(g => g !== 'candidates');
                    setFormData({ ...formData, targetGroups: groups });
                  }}
                />
                Кандидаты
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.targetGroups.includes('silent')}
                  onChange={(e) => {
                    const groups = e.target.checked
                      ? [...formData.targetGroups, 'silent']
                      : formData.targetGroups.filter(g => g !== 'silent');
                    setFormData({ ...formData, targetGroups: groups });
                  }}
                />
                Молчащие
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.targetGroups.includes('shiftWorkers')}
                  onChange={(e) => {
                    const groups = e.target.checked
                      ? [...formData.targetGroups, 'shiftWorkers']
                      : formData.targetGroups.filter(g => g !== 'shiftWorkers');
                    setFormData({ ...formData, targetGroups: groups });
                  }}
                />
                Вахтовики
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Каналы отправки *</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.channels.includes('whatsapp')}
                  onChange={(e) => {
                    const channels = e.target.checked
                      ? [...formData.channels, 'whatsapp']
                      : formData.channels.filter(c => c !== 'whatsapp');
                    setFormData({ ...formData, channels });
                  }}
                />
                WhatsApp
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.channels.includes('sms')}
                  onChange={(e) => {
                    const channels = e.target.checked
                      ? [...formData.channels, 'sms']
                      : formData.channels.filter(c => c !== 'sms');
                    setFormData({ ...formData, channels });
                  }}
                />
                SMS
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.channels.includes('telegram')}
                  onChange={(e) => {
                    const channels = e.target.checked
                      ? [...formData.channels, 'telegram']
                      : formData.channels.filter(c => c !== 'telegram');
                    setFormData({ ...formData, channels });
                  }}
                />
                Telegram
              </label>
            </div>
          </div>
        </div>

        <div className="recipients-preview">
          <h4>Получатели</h4>
          {isCalculating ? (
            <p>Расчет получателей...</p>
          ) : (
            <p>Будет отправлено: <strong>{recipients.length}</strong> сообщений</p>
          )}
        </div>

        <div className="form-actions">
          <Button type="submit" variant="primary">
            Создать рассылку
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Компонент модального окна деталей рассылки
const MailingDetailsModal = ({ mailing, onClose }) => {
  return (
    <Modal
      title={mailing.name}
      onClose={onClose}
      size="lg"
    >
      <div className="mailing-details-content">
        <div className="detail-section">
          <h4>Информация о рассылке</h4>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Создана:</span>
              <span className="detail-value">{formatDate(mailing.createdAt)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Статус:</span>
              <span className="detail-value">{mailing.status}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Получателей:</span>
              <span className="detail-value">{mailing.total || 0}</span>
            </div>
            {mailing.status === 'sent' && (
              <>
                <div className="detail-item">
                  <span className="detail-label">Отправлено:</span>
                  <span className="detail-value success">{mailing.sent || 0}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Ошибок:</span>
                  <span className="detail-value danger">{mailing.failed || 0}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h4>Сообщение</h4>
          <div className="message-preview">
            {mailing.message}
          </div>
        </div>

        <div className="detail-section">
          <h4>Настройки рассылки</h4>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Целевые группы:</span>
              <div className="badges">
                {mailing.targetGroups.map(group => (
                  <span key={group} className="badge">{group}</span>
                ))}
              </div>
            </div>
            <div className="detail-item">
              <span className="detail-label">Каналы:</span>
              <div className="badges">
                {mailing.channels.map(channel => (
                  <span key={channel} className="badge">{channel}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {mailing.results && mailing.results.length > 0 && (
          <div className="detail-section">
            <h4>Результаты отправки</h4>
            <div className="results-list">
              {mailing.results.slice(0, 10).map((result, index) => (
                <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                  <span>{result.recipient}</span>
                  <span>{result.success ? 'Отправлено' : result.error}</span>
                </div>
              ))}
              {mailing.results.length > 10 && (
                <p className="results-more">И еще {mailing.results.length - 10} записей...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MailingsPage;
