// src/views/pages/ShiftWorkersPage.jsx
/**
 * 🏗️ Страница вахтовиков
 * @description Управление вахтовиками и контрольными точками
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HardHat,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  MessageCircle,
  MapPin,
  Phone,
  Edit,
  Trash2,
  Send
} from 'lucide-react';

// Компоненты
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

// Контроллеры и утилиты
import ShiftWorkerController from '@controllers/ShiftWorkerController';
import EventBus from '@utils/EventBus';
import Logger from '@utils/Logger';
import { formatDate } from '@utils/dateHelpers';

// Стили
import './ShiftWorkersPage.css';

const logger = new Logger('ShiftWorkersPage');

/**
 * Страница вахтовиков
 * @returns {JSX.Element} Страница вахтовиков
 */
const ShiftWorkersPage = () => {
  // Состояние
  const [workers, setWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObject, setSelectedObject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    onShift: 0,
    todayCheckpoints: 0,
    overdueCheckpoints: 0
  });

  // Контроллер
  const [controller] = useState(() => new ShiftWorkerController());

  // Загрузка вахтовиков
  const loadWorkers = useCallback(async () => {
    try {
      setIsLoading(true);
      const { workers: allWorkers, stats: workerStats } = await controller.getAllShiftWorkers();
      setWorkers(allWorkers);
      setFilteredWorkers(allWorkers);
      setStats(workerStats);
    } catch (error) {
      logger.error('Ошибка загрузки вахтовиков', error);
      EventBus.emit('notification:error', 'Не удалось загрузить вахтовиков');
    } finally {
      setIsLoading(false);
    }
  }, [controller]);

  // Эффект загрузки при монтировании
  useEffect(() => {
    loadWorkers();

    // Подписка на события
    const handleWorkerCreated = () => loadWorkers();
    const handleWorkerUpdated = () => loadWorkers();
    const handleWorkerDeleted = () => loadWorkers();
    const handleMissedCheckpoint = ({ workerId }) => {
      EventBus.emit('notification:error', 'Пропущена контрольная точка!');
      highlightWorker(workerId);
    };

    EventBus.on('shiftWorker:created', handleWorkerCreated);
    EventBus.on('shiftWorker:updated', handleWorkerUpdated);
    EventBus.on('shiftWorker:deleted', handleWorkerDeleted);
    EventBus.on('missedCheckpoint', handleMissedCheckpoint);

    return () => {
      EventBus.off('shiftWorker:created', handleWorkerCreated);
      EventBus.off('shiftWorker:updated', handleWorkerUpdated);
      EventBus.off('shiftWorker:deleted', handleWorkerDeleted);
      EventBus.off('missedCheckpoint', handleMissedCheckpoint);
    };
  }, [loadWorkers]);

  // Фильтрация вахтовиков
  useEffect(() => {
    let filtered = [...workers];

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(worker =>
        worker.name?.toLowerCase().includes(query) ||
        worker.phone?.toLowerCase().includes(query) ||
        worker.object?.toLowerCase().includes(query) ||
        worker.position?.toLowerCase().includes(query)
      );
    }

    // Фильтр по объекту
    if (selectedObject !== 'all') {
      filtered = filtered.filter(worker => worker.object === selectedObject);
    }

    // Фильтр по статусу
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(worker => worker.status === selectedStatus);
    }

    // Фильтр просроченных КТ
    if (overdueOnly) {
      filtered = filtered.filter(worker => worker.isCheckpointOverdue);
    }

    setFilteredWorkers(filtered);
  }, [workers, searchQuery, selectedObject, selectedStatus, overdueOnly]);

  // Получение уникальных объектов
  const getUniqueObjects = () => {
    const objects = new Set(workers.map(w => w.object).filter(Boolean));
    return Array.from(objects).sort();
  };

  // Подсветка вахтовика
  const highlightWorker = (workerId) => {
    const element = document.getElementById(`worker-${workerId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlighted');
      setTimeout(() => element.classList.remove('highlighted'), 3000);
    }
  };

  // Добавление вахтовика
  const handleAddWorker = async (workerData) => {
    try {
      await controller.createShiftWorker(workerData);
      setShowAddModal(false);
      EventBus.emit('notification:success', 'Вахтовик добавлен');
    } catch (error) {
      logger.error('Ошибка добавления вахтовика', error);
      EventBus.emit('notification:error', 'Не удалось добавить вахтовика');
    }
  };

  // Редактирование вахтовика
  const handleEditWorker = async (workerData) => {
    try {
      await controller.updateShiftWorker(editingWorker.id, workerData);
      setShowEditModal(false);
      setEditingWorker(null);
      EventBus.emit('notification:success', 'Вахтовик обновлен');
    } catch (error) {
      logger.error('Ошибка обновления вахтовика', error);
      EventBus.emit('notification:error', 'Не удалось обновить вахтовика');
    }
  };

  // Удаление вахтовика
  const handleDeleteWorker = async (workerId) => {
    if (window.confirm('Удалить вахтовика?')) {
      try {
        await controller.deleteShiftWorker(workerId);
        EventBus.emit('notification:success', 'Вахтовик удален');
      } catch (error) {
        logger.error('Ошибка удаления вахтовика', error);
        EventBus.emit('notification:error', 'Не удалось удалить вахтовика');
      }
    }
  };

  // Установка контрольной точки
  const handleSetCheckpoint = async (checkpoint, date) => {
    try {
      await controller.setCheckpoint(selectedWorker.id, checkpoint, date);
      setShowCheckpointModal(false);
      setSelectedWorker(null);
      EventBus.emit('notification:success', 'Контрольная точка установлена');
    } catch (error) {
      logger.error('Ошибка установки КТ', error);
      EventBus.emit('notification:error', 'Не удалось установить КТ');
    }
  };

  // Отправка напоминания о КТ
  const handleSendReminder = async (worker) => {
    try {
      await controller.sendCheckpointReminder(worker.id);
      EventBus.emit('notification:success', 'Напоминание отправлено');
    } catch (error) {
      logger.error('Ошибка отправки напоминания', error);
      EventBus.emit('notification:error', 'Не удалось отправить напоминание');
    }
  };

  // Получение класса статуса КТ
  const getCheckpointStatusClass = (worker) => {
    if (!worker.checkpointDate) return '';
    if (worker.checkpointStatus === 'Ответил') return 'checkpoint-success';
    if (worker.checkpointStatus === 'Пропущена') return 'checkpoint-danger';
    if (worker.isCheckpointOverdue) return 'checkpoint-warning';
    return 'checkpoint-pending';
  };

  // Компонент карточки вахтовика
  const WorkerCard = ({ worker }) => (
    <motion.div
      id={`worker-${worker.id}`}
      className={`worker-card ${getCheckpointStatusClass(worker)}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="worker-header">
        <div className="worker-info">
          <div className="worker-name">
            <HardHat size={20} />
            <h3>{worker.name}</h3>
          </div>
          <div className="worker-details">
            <span className="worker-phone">
              <Phone size={14} />
              {worker.phone}
            </span>
            <span className="worker-object">
              <MapPin size={14} />
              {worker.object}
            </span>
            {worker.position && (
              <span className="worker-position">{worker.position}</span>
            )}
          </div>
        </div>
        
        <div className="worker-status">
          <span className={`status-badge status-${worker.status.toLowerCase()}`}>
            {worker.status}
          </span>
        </div>
      </div>

      {worker.checkpointDate && (
        <div className="checkpoint-info">
          <div className="checkpoint-header">
            <h4>Контрольная точка</h4>
            {worker.isCheckpointOverdue && (
              <AlertCircle size={16} className="overdue-icon" />
            )}
          </div>
          
          <div className="checkpoint-details">
            <div className="checkpoint-item">
              <span className="label">КТ:</span>
              <span className="value">{worker.currentCheckpoint || 'Не указана'}</span>
            </div>
            
            <div className="checkpoint-item">
              <span className="label">Дата:</span>
              <span className="value">
                {formatDate(worker.checkpointDate, 'default')}
              </span>
            </div>
            
            <div className="checkpoint-item">
              <span className="label">Статус:</span>
              <span className={`value status-${worker.checkpointStatus?.toLowerCase()}`}>
                {worker.checkpointStatus}
              </span>
            </div>
            
            {worker.checkpointResponse && (
              <div className="checkpoint-response">
                <span className="label">Ответ:</span>
                <p className="value">{worker.checkpointResponse}</p>
              </div>
            )}
          </div>

          {worker.checkpointStatus === 'Ожидание' && (
            <div className="checkpoint-actions">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSendReminder(worker)}
              >
                <Send size={16} />
                Напомнить
              </Button>
            </div>
          )}
        </div>
      )}

      {worker.soComment && (
        <div className="so-comment">
          <span className="label">Комментарий СО:</span>
          <p>{worker.soComment}</p>
        </div>
      )}

      <div className="worker-actions">
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setSelectedWorker(worker);
            setShowCheckpointModal(true);
          }}
        >
          <Calendar size={16} />
          Установить КТ
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setEditingWorker(worker);
            setShowEditModal(true);
          }}
        >
          <Edit size={16} />
          Редактировать
        </Button>
        
        <Button
          variant="danger"
          size="sm"
          onClick={() => handleDeleteWorker(worker.id)}
        >
          <Trash2 size={16} />
          Удалить
        </Button>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка вахтовиков...</p>
      </div>
    );
  }

  return (
    <div className="shift-workers-page">
      {/* Заголовок страницы */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">Вахтовики</h1>
          <p className="page-subtitle">
            Всего: {stats.total} | На вахте: {stats.onShift} | КТ сегодня: {stats.todayCheckpoints}
          </p>
        </div>
        
        <div className="header-actions">
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={20} />
            Добавить вахтовика
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="workers-stats">
        <div className="stat-card">
          <HardHat size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Всего вахтовиков</span>
          </div>
        </div>
        
        <div className="stat-card">
          <CheckCircle size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.active}</span>
            <span className="stat-label">Активных</span>
          </div>
        </div>
        
        <div className="stat-card">
          <Calendar size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.todayCheckpoints}</span>
            <span className="stat-label">КТ сегодня</span>
          </div>
        </div>
        
        <div className="stat-card danger">
          <AlertCircle size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.overdueCheckpoints}</span>
            <span className="stat-label">Просрочено КТ</span>
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
              placeholder="Поиск по имени, телефону, объекту..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Фильтры */}
          <select
            value={selectedObject}
            onChange={(e) => setSelectedObject(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все объекты</option>
            {getUniqueObjects().map(object => (
              <option key={object} value={object}>{object}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все статусы</option>
            <option value="Активен">Активен</option>
            <option value="На вахте">На вахте</option>
            <option value="В отпуске">В отпуске</option>
            <option value="Уволен">Уволен</option>
          </select>
        </div>

        <div className="toolbar-right">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
            />
            <span>Только с просроченными КТ</span>
          </label>
        </div>
      </div>

      {/* Список вахтовиков */}
      <div className="workers-grid">
        {filteredWorkers.length > 0 ? (
          <AnimatePresence>
            {filteredWorkers.map(worker => (
              <WorkerCard key={worker.id} worker={worker} />
            ))}
          </AnimatePresence>
        ) : (
          <div className="empty-state">
            <HardHat size={64} className="empty-icon" />
            <h3>Нет вахтовиков</h3>
            <p>
              {searchQuery || selectedObject !== 'all' || selectedStatus !== 'all' || overdueOnly
                ? 'Попробуйте изменить параметры поиска'
                : 'Добавьте первого вахтовика'}
            </p>
            {workers.length === 0 && (
              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={20} />
                Добавить вахтовика
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно добавления вахтовика */}
      {showAddModal && (
        <Modal
          title="Новый вахтовик"
          onClose={() => setShowAddModal(false)}
          size="md"
        >
          <ShiftWorkerForm
            onSubmit={handleAddWorker}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}

      {/* Модальное окно редактирования */}
      {showEditModal && editingWorker && (
        <Modal
          title="Редактировать вахтовика"
          onClose={() => {
            setShowEditModal(false);
            setEditingWorker(null);
          }}
          size="md"
        >
          <ShiftWorkerForm
            worker={editingWorker}
            onSubmit={handleEditWorker}
            onCancel={() => {
              setShowEditModal(false);
              setEditingWorker(null);
            }}
          />
        </Modal>
      )}

      {/* Модальное окно установки КТ */}
      {showCheckpointModal && selectedWorker && (
        <Modal
          title="Установить контрольную точку"
          onClose={() => {
            setShowCheckpointModal(false);
            setSelectedWorker(null);
          }}
          size="sm"
        >
          <CheckpointForm
            worker={selectedWorker}
            onSubmit={handleSetCheckpoint}
            onCancel={() => {
              setShowCheckpointModal(false);
              setSelectedWorker(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

/**
 * Форма вахтовика (упрощенная версия)
 */
const ShiftWorkerForm = ({ worker, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: worker?.name || '',
    phone: worker?.phone || '',
    object: worker?.object || '',
    position: worker?.position || '',
    status: worker?.status || 'Активен',
    soComment: worker?.soComment || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="worker-form">
      <div className="form-group">
        <label>ФИО *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
      </div>

      <div className="form-group">
        <label>Телефон *</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          required
        />
      </div>

      <div className="form-group">
        <label>Объект *</label>
        <input
          type="text"
          value={formData.object}
          onChange={(e) => setFormData({...formData, object: e.target.value})}
          required
        />
      </div>

      <div className="form-group">
        <label>Должность</label>
        <input
          type="text"
          value={formData.position}
          onChange={(e) => setFormData({...formData, position: e.target.value})}
        />
      </div>

      <div className="form-group">
        <label>Статус</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({...formData, status: e.target.value})}
        >
          <option value="Активен">Активен</option>
          <option value="На вахте">На вахте</option>
          <option value="В отпуске">В отпуске</option>
          <option value="Уволен">Уволен</option>
        </select>
      </div>

      <div className="form-group">
        <label>Комментарий СО</label>
        <textarea
          value={formData.soComment}
          onChange={(e) => setFormData({...formData, soComment: e.target.value})}
          rows={3}
        />
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary">
          {worker ? 'Сохранить' : 'Добавить'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
};

/**
 * Форма контрольной точки
 */
const CheckpointForm = ({ worker, onSubmit, onCancel }) => {
  const [checkpoint, setCheckpoint] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(checkpoint, new Date(date));
  };

  return (
    <form onSubmit={handleSubmit} className="checkpoint-form">
      <div className="form-info">
        <p>Вахтовик: <strong>{worker.name}</strong></p>
        <p>Объект: <strong>{worker.object}</strong></p>
      </div>

      <div className="form-group">
        <label>Контрольная точка *</label>
        <input
          type="text"
          value={checkpoint}
          onChange={(e) => setCheckpoint(e.target.value)}
          placeholder="Например: КТ-1"
          required
        />
      </div>

      <div className="form-group">
        <label>Дата КТ *</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          required
        />
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary">
          <Calendar size={16} />
          Установить
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
};

export default ShiftWorkersPage;
