// src/models/BaseModel.js
/**
 * 🏗️ Базовая модель для всех сущностей
 * @description Общая логика для всех моделей данных
 */
import ValidationModel from './ValidationModel';
import Logger from '@utils/Logger';

class BaseModel {
  constructor(data = {}) {
    this.logger = new Logger(this.constructor.name);
    
    // Основные поля
    this.id = data.id || this.generateId();
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.version = data.version || 1;
    this.isDeleted = data.isDeleted || false;
    
    // Метаданные
    this.metadata = {
      source: data.metadata?.source || 'manual',
      createdBy: data.metadata?.createdBy || 'system',
      lastModifiedBy: data.metadata?.lastModifiedBy || 'system',
      ...data.metadata
    };

    // Инициализация и валидация
    this.initialize(data);
    this.validate();
  }

  /**
   * Инициализация модели (переопределяется в дочерних классах)
   * @param {Object} data - Исходные данные
   */
  initialize(data) {
    // Переопределяется в дочерних классах
  }

  /**
   * Генерация уникального ID
   * @returns {string} Уникальный идентификатор
   */
  generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${random}`;
  }

  /**
   * Валидация модели (переопределяется в дочерних классах)
   * @throws {Error} Ошибка валидации
   */
  validate() {
    if (!this.id) {
      throw new Error('ID обязателен для всех моделей');
    }
    
    if (!this.createdAt || !this.isValidDate(this.createdAt)) {
      throw new Error('Некорректная дата создания');
    }
  }

  /**
   * Проверка корректности даты
   * @param {string} dateString - Строка даты
   * @returns {boolean} Корректна ли дата
   */
  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Обновление модели
   * @param {Object} data - Новые данные
   * @param {string} modifiedBy - Кто изменил
   */
  update(data, modifiedBy = 'system') {
    const oldData = this.toJSON();
    
    // Применяем изменения
    Object.assign(this, data);
    
    // Обновляем метаданные
    this.updatedAt = new Date().toISOString();
    this.version++;
    this.metadata.lastModifiedBy = modifiedBy;
    
    // Валидируем после обновления
    this.validate();
    
    // Логируем изменения
    this.logger.debug('Модель обновлена', {
      id: this.id,
      changes: this.getChanges(oldData, this.toJSON()),
      modifiedBy
    });
  }

  /**
   * Получение изменений между двумя состояниями
   * @param {Object} oldData - Старые данные
   * @param {Object} newData - Новые данные
   * @returns {Object} Объект изменений
   */
  getChanges(oldData, newData) {
    const changes = {};
    
    Object.keys(newData).forEach(key => {
      if (key === 'updatedAt' || key === 'version') return;
      
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes[key] = {
          from: oldData[key],
          to: newData[key]
        };
      }
    });
    
    return changes;
  }

  /**
   * Мягкое удаление
   * @param {string} deletedBy - Кто удалил
   */
  delete(deletedBy = 'system') {
    this.isDeleted = true;
    this.metadata.deletedAt = new Date().toISOString();
    this.metadata.deletedBy = deletedBy;
    this.update({}, deletedBy);
    
    this.logger.info('Модель удалена (мягкое удаление)', {
      id: this.id,
      deletedBy
    });
  }

  /**
   * Восстановление после удаления
   * @param {string} restoredBy - Кто восстановил
   */
  restore(restoredBy = 'system') {
    this.isDeleted = false;
    delete this.metadata.deletedAt;
    delete this.metadata.deletedBy;
    this.update({}, restoredBy);
    
    this.logger.info('Модель восстановлена', {
      id: this.id,
      restoredBy
    });
  }

  /**
   * Клонирование модели
   * @returns {BaseModel} Клон модели
   */
  clone() {
    const data = this.toJSON();
    delete data.id; // Новый ID будет сгенерирован
    delete data.createdAt;
    delete data.updatedAt;
    data.version = 1;
    
    return new this.constructor(data);
  }

  /**
   * Сериализация в JSON
   * @returns {Object} JSON представление модели
   */
  toJSON() {
    const json = {};
    
    Object.keys(this).forEach(key => {
      if (typeof this[key] !== 'function' && !key.startsWith('_')) {
        json[key] = this[key];
      }
    });
    
    return JSON.parse(JSON.stringify(json));
  }

  /**
   * Создание модели из JSON
   * @param {Object} json - JSON данные
   * @returns {BaseModel} Экземпляр модели
   */
  static fromJSON(json) {
    return new this(json);
  }

  /**
   * Получение схемы модели
   * @returns {Object} Схема модели
   */
  static getSchema() {
    return {
      id: { type: 'string', required: true },
      createdAt: { type: 'string', format: 'date-time', required: true },
      updatedAt: { type: 'string', format: 'date-time', required: true },
      version: { type: 'number', required: true },
      isDeleted: { type: 'boolean', required: true },
      metadata: { type: 'object', required: true }
    };
  }

  /**
   * Проверка равенства двух моделей
   * @param {BaseModel} other - Другая модель
   * @returns {boolean} Равны ли модели
   */
  equals(other) {
    if (!other || !(other instanceof BaseModel)) {
      return false;
    }
    
    return this.id === other.id && 
           this.version === other.version &&
           this.updatedAt === other.updatedAt;
  }

  /**
   * Получение возраста модели
   * @returns {number} Возраст в миллисекундах
   */
  getAge() {
    return Date.now() - new Date(this.createdAt).getTime();
  }

  /**
   * Проверка, была ли модель изменена после указанной даты
   * @param {string|Date} date - Дата для сравнения
   * @returns {boolean} Была ли изменена
   */
  isModifiedAfter(date) {
    const compareDate = date instanceof Date ? date : new Date(date);
    return new Date(this.updatedAt) > compareDate;
  }
}

export default BaseModel;