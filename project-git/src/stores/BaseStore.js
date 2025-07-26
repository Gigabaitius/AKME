// src/stores/BaseStore.js
/**
 * Базовое хранилище
 * @description Общая логика для всех хранилищ данных
 */
import EventBus from '../utils/EventBus.js';
import Logger from '../utils/Logger.js';

class BaseStore {
  constructor(storeName) {
    this.storeName = storeName;
    this.data = new Map();
    this.eventBus = EventBus;
    this.logger = new Logger(`${storeName}Store`);
    
    this.loadFromLocalStorage();
  }

  /**
   * Загрузка данных из localStorage
   */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(`hr-assistant-${this.storeName}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.forEach(item => {
          this.data.set(item.id, item);
        });
        this.logger.info(`Загружено ${this.data.size} записей из localStorage`);
      }
    } catch (error) {
      this.logger.error('Ошибка загрузки из localStorage', error);
    }
  }

  /**
   * Сохранение данных в localStorage
   */
  saveToLocalStorage() {
    try {
      const dataArray = Array.from(this.data.values());
      localStorage.setItem(`hr-assistant-${this.storeName}`, JSON.stringify(dataArray));
    } catch (error) {
      this.logger.error('Ошибка сохранения в localStorage', error);
    }
  }

  /**
   * Создание записи
   * @param {Object} item - Элемент для создания
   * @returns {Promise<Object>} Созданный элемент
   */
  async create(item) {
    try {
      const id = item.id || this.generateId();
      const itemWithId = { ...item, id };
      
      this.data.set(id, itemWithId);
      this.saveToLocalStorage();
      
      this.eventBus.emit(`${this.storeName}:created`, itemWithId);
      this.logger.info(`Создан элемент ${id}`);
      
      return itemWithId;
    } catch (error) {
      this.logger.error('Ошибка создания элемента', error);
      throw error;
    }
  }

  /**
   * Получение всех записей
   * @param {Object} filters - Фильтры
   * @returns {Promise<Array>} Массив элементов
   */
  async getAll(filters = {}) {
    try {
      let items = Array.from(this.data.values());
      
      // Применяем фильтры
      if (Object.keys(filters).length > 0) {
        items = items.filter(item => {
          return Object.entries(filters).every(([key, value]) => {
            if (!value) return true;
            return item[key] && item[key].toString().toLowerCase().includes(value.toLowerCase());
          });
        });
      }
      
      return items;
    } catch (error) {
      this.logger.error('Ошибка получения элементов', error);
      throw error;
    }
  }

  /**
   * Получение записи по ID
   * @param {string} id - ID элемента
   * @returns {Promise<Object|null>} Элемент или null
   */
  async getById(id) {
    return this.data.get(id) || null;
  }

  /**
   * Обновление записи
   * @param {string} id - ID элемента
   * @param {Object} updates - Обновления
   * @returns {Promise<Object|null>} Обновленный элемент
   */
  async update(id, updates) {
    try {
      const existing = this.data.get(id);
      if (!existing) {
        throw new Error(`Элемент с ID ${id} не найден`);
      }
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      this.data.set(id, updated);
      this.saveToLocalStorage();
      
      this.eventBus.emit(`${this.storeName}:updated`, updated);
      this.logger.info(`Обновлен элемент ${id}`);
      
      return updated;
    } catch (error) {
      this.logger.error('Ошибка обновления элемента', error);
      throw error;
    }
  }

  /**
   * Удаление записи
   * @param {string} id - ID элемента
   * @returns {Promise<boolean>} Успех операции
   */
  async delete(id) {
    try {
      const existed = this.data.has(id);
      if (existed) {
        this.data.delete(id);
        this.saveToLocalStorage();
        
        this.eventBus.emit(`${this.storeName}:deleted`, id);
        this.logger.info(`Удален элемент ${id}`);
      }
      
      return existed;
    } catch (error) {
      this.logger.error('Ошибка удаления элемента', error);
      throw error;
    }
  }

  /**
   * Очистка всех данных
   */
  async clear() {
    this.data.clear();
    this.saveToLocalStorage();
    this.eventBus.emit(`${this.storeName}:cleared`);
    this.logger.info('Хранилище очищено');
  }

  /**
   * Генерация уникального ID
   * @returns {string} Уникальный идентификатор
   */
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Получение количества записей
   * @returns {number} Количество записей
   */
  count() {
    return this.data.size;
  }

  /**
   * Поиск записей
   * @param {Function} predicate - Функция поиска
   * @returns {Array} Найденные элементы
   */
  find(predicate) {
    return Array.from(this.data.values()).filter(predicate);
  }
}

export default BaseStore;