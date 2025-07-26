// src/controllers/BaseController.js
/**
 * Базовый контроллер
 * @description Общая логика для всех контроллеров
 */
import EventBus from '../utils/EventBus.js';
import Logger from '../utils/Logger.js';

class BaseController {
  constructor() {
    this.eventBus = EventBus;
    this.logger = new Logger(this.constructor.name);
    this.isLoading = false;
    this.errors = [];
  }

  /**
   * Обработка ошибок
   * @param {Error} error - Ошибка
   * @param {string} context - Контекст ошибки
   */
  handleError(error, context = '') {
    this.logger.error(`${context}: ${error.message}`, error);
    this.errors.push({ message: error.message, context, timestamp: new Date() });
    this.eventBus.emit('error', { message: error.message, context });
  }

  /**
   * Установка состояния загрузки
   * @param {boolean} loading - Состояние загрузки
   */
  setLoading(loading) {
    this.isLoading = loading;
    this.eventBus.emit('loading', { controller: this.constructor.name, loading });
  }

  /**
   * Очистка ошибок
   */
  clearErrors() {
    this.errors = [];
  }

  /**
   * Валидация данных
   * @param {Object} data - Данные для валидации
   * @param {Object} rules - Правила валидации
   * @returns {boolean} Результат валидации
   */
  validate(data, rules) {
    // Базовая валидация, переопределяется в дочерних классах
    return true;
  }

  /**
   * Уничтожение контроллера
   */
  destroy() {
    this.eventBus.removeAllListeners();
    this.logger = null;
  }
}

export default BaseController;
