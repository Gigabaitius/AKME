// src/models/CandidateModel.js
/**
 * 👤 Модель кандидата
 * @description Представляет кандидата в системе HR
 */
import BaseModel from './BaseModel';
import ValidationModel from './ValidationModel';

class CandidateModel extends BaseModel {
  initialize(data) {
    // Основные данные
    this.name = data.name || '';
    this.phone = data.phone || '';
    this.email = data.email || '';
    this.project = data.project || '';
    
    // Документы
    this.inn = data.inn || null;
    this.snils = data.snils || null;
    this.passport = data.passport || null;
    this.birthDate = data.birthDate || null;
    this.passportIssueDate = data.passportIssueDate || null;
    this.passportIssuedBy = data.passportIssuedBy || null;
    this.birthPlace = data.birthPlace || null;
    this.registrationAddress = data.registrationAddress || null;
    
    // Статус и активность
    this.status = data.status || 'Новый';
    this.lastReply = data.lastReply || null;
    this.lastActivity = data.lastActivity || null;
    this.chatId = data.chatId || null;
    
    // Обработка документов
    this.documentProcessed = data.documentProcessed || false;
    this.documentError = data.documentError || null;
    this.documentQuality = data.documentQuality || null;
    this.ocrAttempts = data.ocrAttempts || 0;
    
    // Поля для молчащих кандидатов
    this.silentSince = data.silentSince || null;
    this.smsAttempts = data.smsAttempts || 0;
    this.lastSmsDate = data.lastSmsDate || null;
    this.transferredAt = data.transferredAt || null;
    this.transferReason = data.transferReason || null;
    
    // Дополнительная информация
    this.comment = data.comment || '';
    this.tags = data.tags || [];
    this.priority = data.priority || 'normal';
    this.source = data.source || 'manual';
    
    // Статистика
    this.stats = {
      messagesCount: 0,
      documentsUploaded: 0,
      responseTime: null,
      ...data.stats
    };
  }

  validate() {
    super.validate();
    
    const validator = new ValidationModel();
    
    if (!validator.isRequired(this.name)) {
      throw new Error('ФИО обязательно для заполнения');
    }
    
    if (!validator.isRequired(this.phone)) {
      throw new Error('Телефон обязателен для заполнения');
    }
    
    if (!validator.isPhone(this.phone)) {
      throw new Error('Некорректный формат телефона');
    }
    
    if (this.email && !validator.isEmail(this.email)) {
      throw new Error('Некорректный формат email');
    }
    
    if (this.inn && !validator.isINN(this.inn)) {
      throw new Error('Некорректный формат ИНН');
    }
    
    if (this.snils && !validator.isSNILS(this.snils)) {
      throw new Error('Некорректный формат СНИЛС');
    }
    
    if (this.birthDate && !validator.isValidAge(this.birthDate, 16, 70)) {
      throw new Error('Некорректный возраст кандидата');
    }
    
    if (!this.isValidStatus(this.status)) {
      throw new Error(`Недопустимый статус: ${this.status}`);
    }
    
    if (!this.isValidPriority(this.priority)) {
      throw new Error(`Недопустимый приоритет: ${this.priority}`);
    }
  }

  /**
   * Проверка валидности статуса
   * @param {string} status - Статус для проверки
   * @returns {boolean} Валиден ли статус
   */
  isValidStatus(status) {
    const validStatuses = [
      'Новый', 'Активен', 'Молчит', 'Передан', 
      'Доведен', 'Отказ', 'Архив', 'Заблокирован'
    ];
    return validStatuses.includes(status);
  }

  /**
   * Проверка валидности приоритета
   * @param {string} priority - Приоритет для проверки
   * @returns {boolean} Валиден ли приоритет
   */
  isValidPriority(priority) {
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    return validPriorities.includes(priority);
  }

  /**
   * Проверка, молчит ли кандидат
   * @param {number} hours - Количество часов (по умолчанию 8)
   * @returns {boolean} Молчит ли кандидат
   */
  isSilent(hours = 8) {
    if (!this.lastReply || this.status === 'Молчит') return false;
    
    const now = new Date();
    const lastReply = new Date(this.lastReply);
    const diffHours = (now - lastReply) / (1000 * 60 * 60);
    
    return diffHours >= hours && this.status === 'Активен';
  }

  /**
   * Нужно ли передавать на 1-ю линию
   * @returns {boolean} Нужно ли передавать
   */
  shouldTransfer() {
    if (!this.silentSince || this.status !== 'Молчит') return false;
    
    const now = new Date();
    const silentSince = new Date(this.silentSince);
    
    // Проверяем, прошло ли время до 18:30 следующего дня
    const nextDay = new Date(silentSince);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(18, 30, 0, 0);
    
    return now >= nextDay;
  }

  /**
   * Изменение статуса
   * @param {string} newStatus - Новый статус
   * @param {string} reason - Причина изменения
   * @param {string} changedBy - Кто изменил
   */
  changeStatus(newStatus, reason = '', changedBy = 'system') {
    if (!this.isValidStatus(newStatus)) {
      throw new Error(`Недопустимый статус: ${newStatus}`);
    }
    
    const oldStatus = this.status;
    this.status = newStatus;
    
    // Логика для специальных статусов
    if (newStatus === 'Молчит' && !this.silentSince) {
      this.silentSince = new Date().toISOString();
    }
    
    if (newStatus === 'Передан' && !this.transferredAt) {
      this.transferredAt = new Date().toISOString();
      this.transferReason = reason;
    }
    
    if (newStatus === 'Активен' && oldStatus === 'Молчит') {
      this.silentSince = null;
    }
    
    if (newStatus === 'Доведен') {
      this.completedAt = new Date().toISOString();
    }
    
    // Обновляем модель
    this.update({
      status: newStatus,
      statusHistory: (this.statusHistory || []).concat({
        from: oldStatus,
        to: newStatus,
        reason,
        timestamp: new Date().toISOString(),
        changedBy
      })
    }, changedBy);
    
    this.logger.info(`Статус изменен: ${oldStatus} → ${newStatus}`, {
      candidateId: this.id,
      reason,
      changedBy
    });
  }

  /**
   * Обновление последней активности
   * @param {string} activityType - Тип активности
   * @param {Object} data - Дополнительные данные
   */
  updateActivity(activityType, data = {}) {
    this.lastActivity = new Date().toISOString();
    
    if (activityType === 'reply') {
      this.lastReply = this.lastActivity;
      this.stats.messagesCount++;
    }
    
    // Добавляем в историю активности
    if (!this.activityHistory) {
      this.activityHistory = [];
    }
    
    this.activityHistory.push({
      type: activityType,
      timestamp: this.lastActivity,
      data
    });
    
    // Ограничиваем размер истории
    if (this.activityHistory.length > 100) {
      this.activityHistory = this.activityHistory.slice(-100);
    }
    
    this.update({ lastActivity: this.lastActivity });
  }

  /**
   * Добавление комментария
   * @param {string} comment - Комментарий
   * @param {string} author - Автор комментария
   */
  addComment(comment, author = 'system') {
    const timestamp = new Date().toISOString();
    const newComment = `[${new Date().toLocaleString('ru-RU')}] ${author}: ${comment}`;
    
    this.comment = this.comment ? `${this.comment}\n${newComment}` : newComment;
    
    this.update({ comment: this.comment }, author);
  }

  /**
   * Обновление данных из OCR
   * @param {Object} ocrData - Данные из OCR
   * @param {number} quality - Качество распознавания (0-100)
   */
  updateFromOCR(ocrData, quality = null) {
    const updates = {};
    
    if (ocrData.fullName && !this.name) {
      updates.name = ocrData.fullName;
    }
    
    if (ocrData.passport) {
      updates.passport = ocrData.passport;
    }
    
    if (ocrData.inn) {
      updates.inn = ocrData.inn;
    }
    
    if (ocrData.snils) {
      updates.snils = ocrData.snils;
    }
    
    if (ocrData.birthDate) {
      updates.birthDate = ocrData.birthDate;
    }
    
    if (ocrData.issueDate) {
      updates.passportIssueDate = ocrData.issueDate;
    }
    
    if (ocrData.issuedBy) {
      updates.passportIssuedBy = ocrData.issuedBy;
    }
    
    if (ocrData.birthPlace) {
      updates.birthPlace = ocrData.birthPlace;
    }
    
    updates.documentProcessed = true;
    updates.documentError = null;
    updates.documentQuality = quality;
    updates.ocrAttempts = this.ocrAttempts + 1;
    
    this.update(updates);
    this.updateActivity('ocr_processed', { quality, extractedFields: Object.keys(updates) });
    
    this.logger.info('Данные обновлены из OCR', {
      candidateId: this.id,
      quality,
      extractedFields: Object.keys(updates)
    });
  }

  /**
   * Установка ошибки OCR
   * @param {string} error - Текст ошибки
   */
  setOCRError(error) {
    this.update({
      documentProcessed: false,
      documentError: error,
      ocrAttempts: this.ocrAttempts + 1
    });
    
    this.updateActivity('ocr_error', { error });
    
    this.logger.warn('Ошибка OCR обработки', {
      candidateId: this.id,
      error,
      attempts: this.ocrAttempts
    });
  }

  /**
   * Добавление тега
   * @param {string} tag - Тег для добавления
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.update({ tags: this.tags });
    }
  }

  /**
   * Удаление тега
   * @param {string} tag - Тег для удаления
   */
  removeTag(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    this.update({ tags: this.tags });
  }

  /**
   * Установка приоритета
   * @param {string} priority - Новый приоритет
   */
  setPriority(priority) {
    if (!this.isValidPriority(priority)) {
      throw new Error(`Недопустимый приоритет: ${priority}`);
    }
    
    this.update({ priority });
  }

  /**
   * Получение времени ответа
   * @returns {number|null} Время ответа в минутах
   */
  getResponseTime() {
    if (!this.lastReply || !this.createdAt) return null;
    
    const created = new Date(this.createdAt);
    const replied = new Date(this.lastReply);
    
    return Math.round((replied - created) / (1000 * 60));
  }

  /**
   * Проверка на дубликат
   * @param {CandidateModel} other - Другой кандидат
   * @returns {boolean} Является ли дубликатом
   */
  isDuplicateOf(other) {
    if (!other || !(other instanceof CandidateModel)) return false;
    
    // Проверяем по телефону
    const cleanPhone1 = this.phone.replace(/\D/g, '');
    const cleanPhone2 = other.phone.replace(/\D/g, '');
    
    if (cleanPhone1 === cleanPhone2) return true;
    
    // Проверяем по ИНН
    if (this.inn && other.inn && this.inn === other.inn) return true;
    
    // Проверяем по СНИЛС
    if (this.snils && other.snils && this.snils === other.snils) return true;
    
    // Проверяем по паспорту
    if (this.passport && other.passport && this.passport === other.passport) return true;
    
    return false;
  }

  /**
   * Получение прогресса заполнения профиля
   * @returns {Object} Прогресс заполнения
   */
  getCompletionProgress() {
    const fields = [
      'name', 'phone', 'email', 'project',
      'inn', 'snils', 'passport', 'birthDate'
    ];
    
    const completed = fields.filter(field => this[field]).length;
    const total = fields.length;
    const percentage = Math.round((completed / total) * 100);
    
    return {
      completed,
      total,
      percentage,
      missingFields: fields.filter(field => !this[field])
    };
  }

  /**
   * Экспорт в формат для API
   * @returns {Object} Данные для API
   */
  toAPIFormat() {
    return {
      id: this.id,
      name: this.name,
      phone: this.phone,
      email: this.email,
      project: this.project,
      status: this.status,
      documents: {
        inn: this.inn,
        snils: this.snils,
        passport: this.passport,
        birthDate: this.birthDate,
        processed: this.documentProcessed,
        quality: this.documentQuality
      },
      activity: {
        lastReply: this.lastReply,
        lastActivity: this.lastActivity,
        responseTime: this.getResponseTime()
      },
      metadata: {
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        source: this.source,
        priority: this.priority,
        tags: this.tags
      }
    };
  }

  /**
   * Получение схемы модели кандидата
   * @returns {Object} Схема модели
   */
  static getSchema() {
    return {
      ...super.getSchema(),
      name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
      phone: { type: 'string', required: true, pattern: '^\\+?[0-9\\s\\-\\(\\)]{10,} '},
      email: { type: 'string', format: 'email' },
      project: { type: 'string', required: true },
      inn: { type: 'string', pattern: '^\\d{12}' },
      snils: { type: 'string', pattern: '^\\d{3}-\\d{3}-\\d{3} \\d{2}' },
      passport: { type: 'string', pattern: '^\\d{4} \\d{6}' },
      status: { 
        type: 'string', 
        enum: ['Новый', 'Активен', 'Молчит', 'Передан', 'Доведен', 'Отказ', 'Архив', 'Заблокирован']
      },
      priority: {
        type: 'string',
        enum: ['low', 'normal', 'high', 'urgent']
      },
      tags: { type: 'array', items: { type: 'string' } }
    };
  }
}

export default CandidateModel;