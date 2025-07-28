// src/views/pages/KnowledgePage.jsx
/**
 * 📚 Страница базы знаний
 * @description Управление базой знаний для обучения GPT
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Tag,
  Folder,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ExternalLink,
  Star,
  Hash
} from 'lucide-react';

// Компоненты
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

// Хранилище и утилиты
import KnowledgeStore from '@stores/KnowledgeStore';
import EventBus from '@utils/EventBus';
import Logger from '@utils/Logger';
import { formatDate } from '@utils/dateHelpers';

// Стили
import './KnowledgePage.css';

const logger = new Logger('KnowledgePage');

/**
 * Страница базы знаний
 * @returns {JSX.Element} Страница базы знаний
 */
const KnowledgePage = () => {
  // Состояние
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    categories: 0,
    totalViews: 0,
    recentlyAdded: 0
  });

  // Загрузка данных базы знаний
  const loadKnowledge = useCallback(async () => {
    try {
      setIsLoading(true);
      const items = await KnowledgeStore.getAll();
      setKnowledgeItems(items);
      setFilteredItems(items);
      
      // Загружаем категории
      const allCategories = KnowledgeStore.getCategories();
      setCategories(allCategories);
      
      // Получаем статистику
      const statistics = await KnowledgeStore.getStatistics();
      setStats(statistics);
    } catch (error) {
      logger.error('Ошибка загрузки базы знаний', error);
      EventBus.emit('notification:error', 'Не удалось загрузить базу знаний');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Эффект загрузки при монтировании
  useEffect(() => {
    loadKnowledge();

    // Подписка на события
    const handleKnowledgeCreated = () => loadKnowledge();
    const handleKnowledgeUpdated = () => loadKnowledge();
    const handleKnowledgeDeleted = () => loadKnowledge();

    EventBus.on('knowledge:created', handleKnowledgeCreated);
    EventBus.on('knowledge:updated', handleKnowledgeUpdated);
    EventBus.on('knowledge:deleted', handleKnowledgeDeleted);

    return () => {
      EventBus.off('knowledge:created', handleKnowledgeCreated);
      EventBus.off('knowledge:updated', handleKnowledgeUpdated);
      EventBus.off('knowledge:deleted', handleKnowledgeDeleted);
    };
  }, [loadKnowledge]);

  // Поиск и фильтрация
  useEffect(() => {
    const performSearch = async () => {
      let items = [...knowledgeItems];

      // Поиск
      if (searchQuery) {
        items = await KnowledgeStore.search(searchQuery);
      }

      // Фильтр по категории
      if (selectedCategory !== 'all') {
        items = items.filter(item => item.category === selectedCategory);
      }

      // Сортировка
      switch (sortBy) {
        case 'recent':
          items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'popular':
          items.sort((a, b) => (b.views || 0) - (a.views || 0));
          break;
        case 'rating':
          items.sort((a, b) => {
            const ratingA = (a.helpful || 0) / ((a.helpful || 0) + (a.notHelpful || 0) + 1);
            const ratingB = (b.helpful || 0) / ((b.helpful || 0) + (b.notHelpful || 0) + 1);
            return ratingB - ratingA;
          });
          break;
        case 'alphabetical':
          items.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
          break;
        default:
          break;
      }

      setFilteredItems(items);
    };

    performSearch();
  }, [knowledgeItems, searchQuery, selectedCategory, sortBy]);

  // Добавление записи
  const handleAddKnowledge = async (data) => {
    try {
      await KnowledgeStore.create(data);
      setShowAddModal(false);
      EventBus.emit('notification:success', 'Запись добавлена в базу знаний');
      loadKnowledge();
    } catch (error) {
      logger.error('Ошибка добавления записи', error);
      EventBus.emit('notification:error', 'Не удалось добавить запись');
    }
  };

  // Редактирование записи
  const handleEditKnowledge = async (data) => {
    try {
      await KnowledgeStore.update(editingItem.id, data);
      setShowEditModal(false);
      setEditingItem(null);
      EventBus.emit('notification:success', 'Запись обновлена');
      loadKnowledge();
    } catch (error) {
      logger.error('Ошибка обновления записи', error);
      EventBus.emit('notification:error', 'Не удалось обновить запись');
    }
  };

  // Удаление записи
  const handleDeleteKnowledge = async (id) => {
    if (window.confirm('Удалить эту запись из базы знаний?')) {
      try {
        await KnowledgeStore.delete(id);
        EventBus.emit('notification:success', 'Запись удалена');
        loadKnowledge();
      } catch (error) {
        logger.error('Ошибка удаления записи', error);
        EventBus.emit('notification:error', 'Не удалось удалить запись');
      }
    }
  };

  // Просмотр записи
  const handleViewKnowledge = async (item) => {
    try {
      // Увеличиваем счетчик просмотров
      await KnowledgeStore.incrementViews(item.id);
      setViewingItem({ ...item, views: (item.views || 0) + 1 });
      setShowViewModal(true);
    } catch (error) {
      logger.error('Ошибка просмотра записи', error);
    }
  };

  // Голосование за полезность
  const handleVote = async (id, isHelpful) => {
    try {
      await KnowledgeStore.vote(id, isHelpful);
      EventBus.emit('notification:success', 'Спасибо за оценку!');
      loadKnowledge();
    } catch (error) {
      logger.error('Ошибка голосования', error);
    }
  };

  // Копирование в буфер обмена
  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      EventBus.emit('notification:success', 'Скопировано в буфер обмена');
    }).catch(error => {
      logger.error('Ошибка копирования', error);
    });
  };

  // Экспорт базы знаний
  const handleExport = async () => {
    try {
      const exportData = await KnowledgeStore.export();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `knowledge_base_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      EventBus.emit('notification:success', 'База знаний экспортирована');
    } catch (error) {
      logger.error('Ошибка экспорта', error);
      EventBus.emit('notification:error', 'Не удалось экспортировать базу знаний');
    }
  };

  // Импорт базы знаний
  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await KnowledgeStore.import(data);
      
      EventBus.emit('notification:success', 
        `Импортировано: ${result.imported}, пропущено: ${result.skipped}`
      );
      loadKnowledge();
    } catch (error) {
      logger.error('Ошибка импорта', error);
      EventBus.emit('notification:error', 'Не удалось импортировать базу знаний');
    }
  };

  // Компонент карточки знания
  const KnowledgeCard = ({ item }) => {
    const rating = item.helpful + item.notHelpful > 0
      ? Math.round((item.helpful / (item.helpful + item.notHelpful)) * 100)
      : null;

    return (
      <motion.div
        className="knowledge-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        onClick={() => handleViewKnowledge(item)}
      >
        <div className="card-header">
          <div className="card-category">
            <Folder size={16} />
            <span>{item.category}</span>
          </div>
          <div className="card-stats">
            <span className="views">
              <Eye size={14} />
              {item.views || 0}
            </span>
            {rating !== null && (
              <span className="rating">
                <ThumbsUp size={14} />
                {rating}%
              </span>
            )}
          </div>
        </div>

        <h3 className="card-title">{item.title}</h3>
        
        <p className="card-content">
          {item.content.length > 150 
            ? item.content.substring(0, 150) + '...'
            : item.content
          }
        </p>

        {item.tags && item.tags.length > 0 && (
          <div className="card-tags">
            {item.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="tag">
                <Tag size={12} />
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="tag more">+{item.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="card-footer">
          <span className="date">
            <Clock size={14} />
            {formatDate(item.createdAt, 'relative')}
          </span>
          <div className="card-actions" onClick={e => e.stopPropagation()}>
            <button
              className="action-button"
              onClick={() => {
                setEditingItem(item);
                setShowEditModal(true);
              }}
              title="Редактировать"
            >
              <Edit size={16} />
            </button>
            <button
              className="action-button"
              onClick={() => handleCopyToClipboard(item.content)}
              title="Копировать"
            >
              <Copy size={16} />
            </button>
            <button
              className="action-button danger"
              onClick={() => handleDeleteKnowledge(item.id)}
              title="Удалить"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка базы знаний...</p>
      </div>
    );
  }

  return (
    <div className="knowledge-page">
      {/* Заголовок страницы */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <BookOpen size={32} />
            База знаний
          </h1>
          <p className="page-subtitle">
            Структурированная информация для обучения GPT • {stats.total} записей
          </p>
        </div>
        
        <div className="header-actions">
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={20} />
            Добавить запись
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="knowledge-stats">
        <div className="stat-card">
          <BookOpen size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Всего записей</span>
          </div>
        </div>
        
        <div className="stat-card">
          <Folder size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.categories}</span>
            <span className="stat-label">Категорий</span>
          </div>
        </div>
        
        <div className="stat-card">
          <Eye size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.totalViews}</span>
            <span className="stat-label">Просмотров</span>
          </div>
        </div>
        
        <div className="stat-card">
          <Star size={24} />
          <div className="stat-content">
            <span className="stat-value">{Math.round(stats.avgRating * 100)}%</span>
            <span className="stat-label">Средний рейтинг</span>
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
              placeholder="Поиск по заголовку, содержимому, тегам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Фильтры */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все категории</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="recent">Новые</option>
            <option value="popular">Популярные</option>
            <option value="rating">По рейтингу</option>
            <option value="alphabetical">По алфавиту</option>
          </select>
        </div>

        <div className="toolbar-right">
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
              accept=".json"
              onChange={handleImport}
              hidden
            />
            <Button variant="secondary" as="span">
              <Upload size={20} />
              Импорт
            </Button>
          </label>
        </div>
      </div>

      {/* Список записей */}
      <div className="knowledge-grid">
        {filteredItems.length > 0 ? (
          <AnimatePresence>
            {filteredItems.map(item => (
              <KnowledgeCard key={item.id} item={item} />
            ))}
          </AnimatePresence>
        ) : (
          <div className="empty-state">
            <BookOpen size={64} className="empty-icon" />
            <h3>База знаний пуста</h3>
            <p>
              {searchQuery || selectedCategory !== 'all'
                ? 'Попробуйте изменить параметры поиска'
                : 'Добавьте первую запись в базу знаний'}
            </p>
            {knowledgeItems.length === 0 && (
              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={20} />
                Добавить запись
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно добавления */}
      {showAddModal && (
        <Modal
          title="Новая запись в базе знаний"
          onClose={() => setShowAddModal(false)}
          size="lg"
        >
          <KnowledgeForm
            categories={categories}
            onSubmit={handleAddKnowledge}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}

      {/* Модальное окно редактирования */}
      {showEditModal && editingItem && (
        <Modal
          title="Редактировать запись"
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          size="lg"
        >
          <KnowledgeForm
            item={editingItem}
            categories={categories}
            onSubmit={handleEditKnowledge}
            onCancel={() => {
              setShowEditModal(false);
              setEditingItem(null);
            }}
          />
        </Modal>
      )}

      {/* Модальное окно просмотра */}
      {showViewModal && viewingItem && (
        <Modal
          title={viewingItem.title}
          onClose={() => {
            setShowViewModal(false);
            setViewingItem(null);
          }}
          size="lg"
        >
          <div className="knowledge-view">
            <div className="view-header">
              <div className="view-category">
                <Folder size={20} />
                <span>{viewingItem.category}</span>
              </div>
              <div className="view-stats">
                <span>
                  <Eye size={16} />
                  {viewingItem.views} просмотров
                </span>
                <span>
                  <Clock size={16} />
                  {formatDate(viewingItem.createdAt, 'full')}
                </span>
              </div>
            </div>

            <div className="view-content">
              <p>{viewingItem.content}</p>
            </div>

            {viewingItem.tags && viewingItem.tags.length > 0 && (
              <div className="view-tags">
                {viewingItem.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    <Tag size={16} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {viewingItem.source && (
              <div className="view-source">
                <span className="source-label">Источник:</span>
                <span className="source-value">{viewingItem.source}</span>
              </div>
            )}

            <div className="view-actions">
              <div className="vote-section">
                <span>Была ли эта информация полезной?</span>
                <div className="vote-buttons">
                  <button
                    className="vote-button helpful"
                    onClick={() => handleVote(viewingItem.id, true)}
                  >
                    <ThumbsUp size={20} />
                    Да ({viewingItem.helpful || 0})
                  </button>
                  <button
                    className="vote-button not-helpful"
                    onClick={() => handleVote(viewingItem.id, false)}
                  >
                    <ThumbsDown size={20} />
                    Нет ({viewingItem.notHelpful || 0})
                  </button>
                </div>
              </div>

              <div className="action-buttons">
                <Button
                  variant="secondary"
                  onClick={() => handleCopyToClipboard(viewingItem.content)}
                >
                  <Copy size={20} />
                  Копировать
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setViewingItem(null);
                    setShowViewModal(false);
                    setEditingItem(viewingItem);
                    setShowEditModal(true);
                  }}
                >
                  <Edit size={20} />
                  Редактировать
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

/**
 * Форма записи базы знаний
 */
const KnowledgeForm = ({ item, categories, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: item?.title || '',
    category: item?.category || '',
    content: item?.content || '',
    tags: item?.tags?.join(', ') || '',
    source: item?.source || ''
  });
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Подготавливаем данные
    const data = {
      ...formData,
      category: showNewCategory ? newCategory : formData.category,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };
    
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="knowledge-form">
      <div className="form-group">
        <label>Заголовок *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder="Краткий заголовок записи"
          required
        />
      </div>

      <div className="form-group">
        <label>Категория *</label>
        <div className="category-selector">
          {!showNewCategory ? (
            <>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required
              >
                <option value="">Выберите категорию</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowNewCategory(true)}
              >
                <Plus size={16} />
                Новая
              </Button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Название новой категории"
                required
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowNewCategory(false);
                  setNewCategory('');
                }}
              >
                Отмена
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Содержание *</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({...formData, content: e.target.value})}
          placeholder="Подробное описание или инструкция..."
          rows={8}
          required
        />
      </div>

      <div className="form-group">
        <label>Теги</label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({...formData, tags: e.target.value})}
          placeholder="Теги через запятую (например: hr, кандидаты, инструкция)"
        />
      </div>

      <div className="form-group">
        <label>Источник</label>
        <input
          type="text"
          value={formData.source}
          onChange={(e) => setFormData({...formData, source: e.target.value})}
          placeholder="Откуда взята информация (опционально)"
        />
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary">
          {item ? 'Сохранить изменения' : 'Добавить запись'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
};

export default KnowledgePage;
