// src/views/pages/CandidatesPage.jsx
/**
 * 👥 Страница кандидатов
 * @description Управление списком кандидатов
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Users,
  FileSpreadsheet,
  MessageCircle,
  Trash2,
  Edit,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Компоненты
import CandidateView from '@components/features/CandidateView';
import CandidateForm from '@components/features/CandidateForm';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

// Контроллеры и утилиты
import CandidateController from '@controllers/CandidateController';
import EventBus from '@utils/EventBus';
import Logger from '@utils/Logger';

// Стили
import './CandidatesPage.css';

const logger = new Logger('CandidatesPage');

/**
 * Страница кандидатов
 * @returns {JSX.Element} Страница кандидатов
 */
const CandidatesPage = () => {
  // Состояние
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Контроллер
  const [controller] = useState(() => new CandidateController());

  // Загрузка кандидатов
  const loadCandidates = useCallback(async () => {
    try {
      setIsLoading(true);
      const allCandidates = await controller.getAllCandidates();
      setCandidates(allCandidates);
      setFilteredCandidates(allCandidates);
    } catch (error) {
      logger.error('Ошибка загрузки кандидатов', error);
      EventBus.emit('notification:error', 'Не удалось загрузить кандидатов');
    } finally {
      setIsLoading(false);
    }
  }, [controller]);

  // Эффект загрузки при монтировании
  useEffect(() => {
    loadCandidates();

    // Подписка на события
    const handleCandidateCreated = () => loadCandidates();
    const handleCandidateUpdated = () => loadCandidates();
    const handleCandidateDeleted = () => loadCandidates();
    const handleAddNew = () => setShowAddModal(true);
    const handleEditCandidate = (candidate) => {
      setEditingCandidate(candidate);
      setShowEditModal(true);
    };

    EventBus.on('candidate:created', handleCandidateCreated);
    EventBus.on('candidate:updated', handleCandidateUpdated);
    EventBus.on('candidate:deleted', handleCandidateDeleted);
    EventBus.on('candidate:addNew', handleAddNew);
    EventBus.on('candidate:edit', handleEditCandidate);

    return () => {
      EventBus.off('candidate:created', handleCandidateCreated);
      EventBus.off('candidate:updated', handleCandidateUpdated);
      EventBus.off('candidate:deleted', handleCandidateDeleted);
      EventBus.off('candidate:addNew', handleAddNew);
      EventBus.off('candidate:edit', handleEditCandidate);
    };
  }, [loadCandidates]);

  // Фильтрация кандидатов
  useEffect(() => {
    let filtered = [...candidates];

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(candidate =>
        candidate.name?.toLowerCase().includes(query) ||
        candidate.phone?.toLowerCase().includes(query) ||
        candidate.project?.toLowerCase().includes(query) ||
        candidate.inn?.toLowerCase().includes(query) ||
        candidate.snils?.toLowerCase().includes(query)
      );
    }

    // Фильтр по проекту
    if (selectedProject !== 'all') {
      filtered = filtered.filter(candidate => 
        candidate.project === selectedProject
      );
    }

    // Фильтр по статусу
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(candidate => 
        candidate.status === selectedStatus
      );
    }

    setFilteredCandidates(filtered);
  }, [candidates, searchQuery, selectedProject, selectedStatus]);

  // Получение уникальных проектов
  const getUniqueProjects = () => {
    const projects = new Set(candidates.map(c => c.project).filter(Boolean));
    return Array.from(projects).sort();
  };

  // Получение уникальных статусов
  const getUniqueStatuses = () => {
    const statuses = new Set(candidates.map(c => c.status).filter(Boolean));
    return Array.from(statuses).sort();
  };

  // Добавление кандидата
  const handleAddCandidate = async (candidateData) => {
    try {
      await controller.createCandidate(candidateData);
      setShowAddModal(false);
      EventBus.emit('notification:success', 'Кандидат добавлен');
    } catch (error) {
      logger.error('Ошибка добавления кандидата', error);
      EventBus.emit('notification:error', 'Не удалось добавить кандидата');
    }
  };

  // Редактирование кандидата
  const handleEditCandidate = async (candidateData) => {
    try {
      await controller.updateCandidate(editingCandidate.id, candidateData);
      setShowEditModal(false);
      setEditingCandidate(null);
      EventBus.emit('notification:success', 'Кандидат обновлен');
    } catch (error) {
      logger.error('Ошибка обновления кандидата', error);
      EventBus.emit('notification:error', 'Не удалось обновить кандидата');
    }
  };

  // Удаление кандидата
  const handleDeleteCandidate = async (candidateId) => {
    try {
      await controller.deleteCandidate(candidateId);
      EventBus.emit('notification:success', 'Кандидат удален');
    } catch (error) {
      logger.error('Ошибка удаления кандидата', error);
      EventBus.emit('notification:error', 'Не удалось удалить кандидата');
    }
  };

  // Массовое удаление
  const handleBulkDelete = async () => {
    if (selectedCandidates.length === 0) return;

    if (window.confirm(`Удалить ${selectedCandidates.length} кандидатов?`)) {
      try {
        for (const id of selectedCandidates) {
          await controller.deleteCandidate(id);
        }
        setSelectedCandidates([]);
        setIsSelectionMode(false);
        EventBus.emit('notification:success', 'Кандидаты удалены');
      } catch (error) {
        logger.error('Ошибка массового удаления', error);
        EventBus.emit('notification:error', 'Не удалось удалить кандидатов');
      }
    }
  };

  // Экспорт в CSV
  const handleExport = async () => {
    try {
      const csv = await controller.exportToCSV(filteredCandidates);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `candidates_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      EventBus.emit('notification:success', 'Кандидаты экспортированы');
    } catch (error) {
      logger.error('Ошибка экспорта', error);
      EventBus.emit('notification:error', 'Не удалось экспортировать кандидатов');
    }
  };

  // Импорт из CSV
  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // TODO: Реализовать импорт
      EventBus.emit('notification:info', 'Импорт будет доступен в следующей версии');
    } catch (error) {
      logger.error('Ошибка импорта', error);
      EventBus.emit('notification:error', 'Не удалось импортировать кандидатов');
    }
  };

  // Отправка сообщения
  const handleSendMessage = async (candidate) => {
    try {
      // TODO: Открыть диалог отправки сообщения
      EventBus.emit('whatsapp:sendMessage', candidate);
    } catch (error) {
      logger.error('Ошибка отправки сообщения', error);
    }
  };

  // Выбор кандидата
  const toggleCandidateSelection = (candidateId) => {
    setSelectedCandidates(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      } else {
        return [...prev, candidateId];
      }
    });
  };

  // Выбрать всех
  const selectAll = () => {
    if (selectedCandidates.length === filteredCandidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(filteredCandidates.map(c => c.id));
    }
  };

  // Синхронизация с Google Sheets
  const handleSyncGoogleSheets = async () => {
    try {
      await controller.syncWithGoogleSheets();
      EventBus.emit('notification:success', 'Синхронизация завершена');
    } catch (error) {
      logger.error('Ошибка синхронизации', error);
      EventBus.emit('notification:error', 'Не удалось синхронизировать с Google Sheets');
    }
  };

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка кандидатов...</p>
      </div>
    );
  }

  return (
    <div className="candidates-page">
      {/* Заголовок страницы */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">Кандидаты</h1>
          <p className="page-subtitle">
            Всего: {candidates.length} | Показано: {filteredCandidates.length}
          </p>
        </div>
        
        <div className="header-actions">
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={20} />
            Добавить кандидата
          </Button>
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
              placeholder="Поиск по имени, телефону, документам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Фильтры */}
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'active' : ''}
          >
            <Filter size={20} />
            Фильтры
          </Button>

          {/* Режим выбора */}
          <Button
            variant={isSelectionMode ? 'primary' : 'secondary'}
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedCandidates([]);
            }}
          >
            <CheckCircle size={20} />
            {isSelectionMode ? 'Отменить выбор' : 'Выбрать'}
          </Button>
        </div>

        <div className="toolbar-right">
          {/* Массовые действия */}
          {isSelectionMode && selectedCandidates.length > 0 && (
            <div className="bulk-actions">
              <span className="selected-count">
                Выбрано: {selectedCandidates.length}
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 size={16} />
                Удалить
              </Button>
            </div>
          )}

          {/* Экспорт/Импорт */}
          <Button
            variant="secondary"
            onClick={handleExport}
          >
            <Download size={20} />
            Экспорт
          </Button>

          <label className="import-button">
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              hidden
            />
            <Button variant="secondary" as="span">
              <Upload size={20} />
              Импорт
            </Button>
          </label>

          {/* Синхронизация */}
          <Button
            variant="secondary"
            onClick={handleSyncGoogleSheets}
          >
            <FileSpreadsheet size={20} />
            Синхронизация
          </Button>
        </div>
      </div>

      {/* Панель фильтров */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="filters-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="filters-content">
              <div className="filter-group">
                <label>Проект:</label>
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
              </div>

              <div className="filter-group">
                <label>Статус:</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Все статусы</option>
                  {getUniqueStatuses().map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedProject('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                }}
              >
                Сбросить фильтры
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Список кандидатов */}
      <div className="candidates-list">
        {isSelectionMode && (
          <div className="selection-header">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={
                  selectedCandidates.length === filteredCandidates.length &&
                  filteredCandidates.length > 0
                }
                onChange={selectAll}
              />
              <span>Выбрать все</span>
            </label>
          </div>
        )}

        {filteredCandidates.length > 0 ? (
          <AnimatePresence>
            {filteredCandidates.map((candidate, index) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`candidate-item ${
                  selectedCandidates.includes(candidate.id) ? 'selected' : ''
                }`}
              >
                {isSelectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedCandidates.includes(candidate.id)}
                    onChange={() => toggleCandidateSelection(candidate.id)}
                    className="candidate-checkbox"
                  />
                )}
                <CandidateView
                  candidate={candidate}
                  onEdit={() => {
                    setEditingCandidate(candidate);
                    setShowEditModal(true);
                  }}
                  onDelete={() => handleDeleteCandidate(candidate.id)}
                  onSendMessage={() => handleSendMessage(candidate)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="empty-state">
            <Users size={64} className="empty-icon" />
            <h3>Нет кандидатов</h3>
            <p>
              {searchQuery || selectedProject !== 'all' || selectedStatus !== 'all'
                ? 'Попробуйте изменить параметры поиска'
                : 'Добавьте первого кандидата'}
            </p>
            {candidates.length === 0 && (
              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={20} />
                Добавить кандидата
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно добавления */}
      {showAddModal && (
        <Modal
          title="Новый кандидат"
          onClose={() => setShowAddModal(false)}
          size="lg"
        >
          <CandidateForm
            onSubmit={handleAddCandidate}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}

      {/* Модальное окно редактирования */}
      {showEditModal && editingCandidate && (
        <Modal
          title="Редактировать кандидата"
          onClose={() => {
            setShowEditModal(false);
            setEditingCandidate(null);
          }}
          size="lg"
        >
          <CandidateForm
            candidate={editingCandidate}
            onSubmit={handleEditCandidate}
            onCancel={() => {
              setShowEditModal(false);
              setEditingCandidate(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default CandidatesPage;
