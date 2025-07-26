// src/models/ShiftWorkerModel.js
/**
 * Модель вахтовика
 * @description Представляет вахтового работника
 */
import BaseModel from './BaseModel.js';
import ValidationModel from './ValidationModel.js';

class ShiftWorkerModel extends BaseModel {
  constructor(data = {}) {
    super(data);
    
    // Основные данные
    this.name = data.name || '';
    this.phone = data.phone || '';
    this.object = data.object || '';
    this.project = data.project || '';
    
    // Контрольные точки
    this.currentCheckpoint = data.currentCheckpoint || null;
    this.checkpointDate = data.checkpointDate || null;
    this.checkpointResponse = data.checkpointResponse || null;
    this.checkpointStatus = data.checkpointStatus || 'Ожидание';
    
    // Вахтовые данные
    this.shiftStartDate = data.shiftStartDate || null;
    this.shiftEndDate = data.shiftEndDate || null;
    this.isOnShift = data.isOnShift || false;
    
    // Специальные даты
    this.fiveDaysBeforeEnd = data.fiveDaysBeforeEnd || null;
    this.returnConfirmed = data.returnConfirmed || null;
    this.returnDate = data.returnDate || null;
    
    // Комментарии СО
    this.soComment = data.soComment || '';
    this.contactAttempts = data.contactAttempts || 0;
    
    this.validate();
  }

  /**
   * Валидация вахтовика
   * @throws {Error} Ошибка валидации
   */
  validate() {
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
    
    if (!validator.isRequired(this.object)) {
      throw new Error('Объект обязателен для заполнения');
    }
  }

  /**
   * Установка контрольной точки
   * @param {string} checkpoint - Название КТ
   * @param {Date} date - Дата КТ
   */
  setCheckpoint(checkpoint, date) {
    this.currentCheckpoint = checkpoint;
    this.checkpointDate = date.toISOString();
    this.checkpointStatus = 'Ожидание';
    this.checkpointResponse = null;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Ответ на контрольную точку
   * @param {string} response - Ответ работника
   */
  respondToCheckpoint(response) {
    this.checkpointResponse = response;
    this.checkpointStatus = 'Ответил';
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Пропуск контрольной точки
   */
  missCheckpoint() {
    this.checkpointStatus = 'Пропущена';
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Проверка просрочки КТ
   * @returns {boolean} Просрочена ли КТ
   */
  isCheckpointOverdue() {
    if (!this.checkpointDate || this.checkpointStatus !== 'Ожидание') {
      return false;
    }
    
    const now = new Date();
    const deadline = new Date();
    deadline.setHours(15, 0, 0, 0); // 15:00 МСК
    
    const checkpointDate = new Date(this.checkpointDate);
    
    return checkpointDate.toDateString() === now.toDateString() && now > deadline;
  }

  /**
   * Установка периода вахты
   * @param {Date} startDate - Дата начала
   * @param {Date} endDate - Дата окончания
   */
  setShiftPeriod(startDate, endDate) {
    this.shiftStartDate = startDate.toISOString();
    this.shiftEndDate = endDate.toISOString();
    this.isOnShift = true;
    
    // Вычисляем дату "за 5 дней до конца"
    const fiveDaysBefore = new Date(endDate);
    fiveDaysBefore.setDate(fiveDaysBefore.getDate() - 5);
    this.fiveDaysBeforeEnd = fiveDaysBefore.toISOString();
    
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Подтверждение возвращения
   * @param {Date} returnDate - Дата возвращения
   */
  confirmReturn(returnDate) {
    this.returnConfirmed = new Date().toISOString();
    this.returnDate = returnDate.toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Отказ от возвращения
   * @param {string} reason - Причина отказа
   */
  declineReturn(reason) {
    this.returnConfirmed = null;
    this.returnDate = null;
    this.addSOComment(`Отказ от возвращения: ${reason}`);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Добавление комментария СО
   * @param {string} comment - Комментарий
   */
  addSOComment(comment) {
    const timestamp = new Date().toLocaleString('ru-RU');
    const newComment = `[${timestamp}] ${comment}`;
    this.soComment = this.soComment ? `${this.soComment}\n${newComment}` : newComment;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Попытка связаться
   * @param {boolean} success - Удалось ли связаться
   * @param {string} comment - Комментарий к попытке
   */
  contactAttempt(success, comment = '') {
    this.contactAttempts++;
    
    if (success) {
      this.addSOComment(`Связь установлена. ${comment}`);
    } else {
      this.addSOComment(`Не удалось связаться. ${comment}`);
    }
  }

  /**
   * Проверка, нужно ли уведомление за 5 дней
   * @returns {boolean} Нужно ли уведомление
   */
  needsFiveDayNotification() {
    if (!this.fiveDaysBeforeEnd || this.returnConfirmed) {
      return false;
    }
    
    const now = new Date();
    const notificationDate = new Date(this.fiveDaysBeforeEnd);
    
    return now >= notificationDate;
  }
}

export default ShiftWorkerModel;