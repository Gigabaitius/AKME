// src/stores/KnowledgeStore.js
/**
 * 📚 Хранилище базы знаний
 * @description Управление записями базы знаний для обучения GPT
 */
import BaseStore from './BaseStore.js';

class KnowledgeStore extends BaseStore {
  constructor() {
    super('knowledge');
    this.categories = new Set();
    this.loadCategories();
  }

  /**
   * Загрузка категорий из localStorage
   */
  loadCategories() {
    try {
      const stored = localStorage.getItem('hr-assistant-knowledge-categories');
      if (stored) {
        this.categories = new Set(JSON.parse(stored));
      } else {
        // Предустановленные категории
        this.categories = new Set([
          'Общие вопросы',
          'Документы',
          'Процессы',
          'Проекты',
          'Контакты',
          'Инструкции',
          'FAQ',
          'Шаблоны ответов'
        ]);
        this.saveCategories();
      }
    } catch (error) {
      this.logger.error('Ошибка загрузки категорий', error);
    }
  }

  /**
   * Сохранение категорий
   */
  saveCategories() {
    try {
      localStorage.setItem(
        'hr-assistant-knowledge-categories', 
        JSON.stringify(Array.from(this.categories))
      );
    } catch (error) {
      this.logger.error('Ошибка сохранения категорий', error);
    }
  }

  /**
   * Создание записи в базе знаний
   * @param {Object} knowledge - Данные записи
   * @returns {Promise<Object>} Созданная запись
   */
  async create(knowledge) {
    const item = {
      ...knowledge,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      views: 0,
      helpful: 0,
      notHelpful: 0
    };

    // Добавляем категорию если её нет
    if (item.category && !this.categories.has(item.category)) {
      this.categories.add(item.category);
      this.saveCategories();
    }

    return super.create(item);
  }

  /**
   * Поиск по базе знаний
   * @param {string} query - Поисковый запрос
   * @returns {Promise<Array>} Найденные записи
   */
  async search(query) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const allItems = await this.getAll();
    const searchTerm = query.toLowerCase().trim();
    
    // Простой поиск по заголовку, содержимому и тегам
    const results = allItems.filter(item => {
      const titleMatch = item.title?.toLowerCase().includes(searchTerm);
      const contentMatch = item.content?.toLowerCase().includes(searchTerm);
      const tagsMatch = item.tags?.some(tag => 
        tag.toLowerCase().includes(searchTerm)
      );
      const categoryMatch = item.category?.toLowerCase().includes(searchTerm);
      
      return titleMatch || contentMatch || tagsMatch || categoryMatch;
    });

    // Сортировка по релевантности (простая версия)
    return results.sort((a, b) => {
      // Приоритет точному совпадению в заголовке
      const aExactTitle = a.title?.toLowerCase() === searchTerm;
      const bExactTitle = b.title?.toLowerCase() === searchTerm;
      if (aExactTitle && !bExactTitle) return -1;
      if (!aExactTitle && bExactTitle) return 1;
      
      // Затем по количеству просмотров
      return (b.views || 0) - (a.views || 0);
    });
  }

  /**
   * Получение записей по категории
   * @param {string} category - Категория
   * @returns {Promise<Array>} Записи категории
   */
  async getByCategory(category) {
    return this.getAll({ category });
  }

  /**
   * Получение популярных записей
   * @param {number} limit - Количество записей
   * @returns {Promise<Array>} Популярные записи
   */
  async getPopular(limit = 10) {
    const items = await this.getAll();
    return items
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, limit);
  }

  /**
   * Получение последних записей
   * @param {number} limit - Количество записей
   * @returns {Promise<Array>} Последние записи
   */
  async getRecent(limit = 10) {
    const items = await this.getAll();
    return items
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  /**
   * Увеличение счетчика просмотров
   * @param {string} id - ID записи
   * @returns {Promise<Object>} Обновленная запись
   */
  async incrementViews(id) {
    const item = await this.getById(id);
    if (item) {
      return this.update(id, { views: (item.views || 0) + 1 });
    }
    return null;
  }

  /**
   * Голосование за полезность
   * @param {string} id - ID записи
   * @param {boolean} isHelpful - Полезно или нет
   * @returns {Promise<Object>} Обновленная запись
   */
  async vote(id, isHelpful) {
    const item = await this.getById(id);
    if (item) {
      const updates = isHelpful
        ? { helpful: (item.helpful || 0) + 1 }
        : { notHelpful: (item.notHelpful || 0) + 1 };
      return this.update(id, updates);
    }
    return null;
  }

  /**
   * Получение всех категорий
   * @returns {Array<string>} Массив категорий
   */
  getCategories() {
    return Array.from(this.categories).sort();
  }

  /**
   * Добавление категории
   * @param {string} category - Название категории
   */
  addCategory(category) {
    if (category && !this.categories.has(category)) {
      this.categories.add(category);
      this.saveCategories();
    }
  }

  /**
   * Удаление категории
   * @param {string} category - Название категории
   */
  removeCategory(category) {
    this.categories.delete(category);
    this.saveCategories();
  }

  /**
   * Получение статистики базы знаний
   * @returns {Promise<Object>} Статистика
   */
  async getStatistics() {
    const items = await this.getAll();
    
    const categoryCounts = {};
    items.forEach(item => {
      const cat = item.category || 'Без категории';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    return {
      total: items.length,
      categories: this.categories.size,
      totalViews: items.reduce((sum, item) => sum + (item.views || 0), 0),
      avgRating: items.length > 0 
        ? items.reduce((sum, item) => {
            const total = (item.helpful || 0) + (item.notHelpful || 0);
            const rating = total > 0 ? (item.helpful || 0) / total : 0;
            return sum + rating;
          }, 0) / items.length 
        : 0,
      categoryCounts,
      recentlyAdded: items.filter(item => {
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return new Date(item.createdAt) > dayAgo;
      }).length
    };
  }

  /**
   * Экспорт базы знаний
   * @returns {Promise<Object>} Данные для экспорта
   */
  async export() {
    const items = await this.getAll();
    const categories = this.getCategories();
    
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      categories,
      items: items.map(item => ({
        ...item,
        // Исключаем технические поля
        id: undefined,
        updatedAt: undefined,
        views: undefined,
        helpful: undefined,
        notHelpful: undefined
      }))
    };
  }

  /**
   * Импорт базы знаний
   * @param {Object} data - Данные для импорта
   * @returns {Promise<Object>} Результат импорта
   */
  async import(data) {
    try {
      let imported = 0;
      let skipped = 0;

      // Импорт категорий
      if (data.categories && Array.isArray(data.categories)) {
        data.categories.forEach(cat => this.addCategory(cat));
      }

      // Импорт записей
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          // Проверяем дубликаты по заголовку
          const existing = await this.getAll({ title: item.title });
          if (existing.length === 0) {
            await this.create(item);
            imported++;
          } else {
            skipped++;
          }
        }
      }

      return { imported, skipped, total: imported + skipped };
    } catch (error) {
      this.logger.error('Ошибка импорта базы знаний', error);
      throw error;
    }
  }
}

// Экспортируем синглтон
export default new KnowledgeStore();
