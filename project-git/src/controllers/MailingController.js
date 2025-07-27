// src/controllers/MailingController.js
/**
 * 📧 Контроллер рассылок
 * @description Управление массовыми рассылками через WhatsApp, SMS и Telegram
 */
import BaseController from './BaseController.js';
import CandidateStore from '../stores/CandidateStore.js';
import ShiftWorkerStore from '../stores/ShiftWorkerStore.js';
import ExtensionAPIService from '../services/ExtensionAPIService.js';

class MailingController extends BaseController {
  constructor() {
    super();
    this.candidateStore = CandidateStore;
    this.shiftWorkerStore = ShiftWorkerStore;
    this.extensionAPI = ExtensionAPIService;
    this.mailingHistory = this.loadMailingHistory();
    
    this.initializeEventListeners();
  }

  /**
   * Инициализация слушателей событий
   */
  initializeEventListeners() {
    this.eventBus.on('mailing:send', this.sendMailing.bind(this));
    this.eventBus.on('mailing:schedule', this.scheduleMailing.bind(this));
  }

  /**
   * Загрузка истории рассылок
   * @returns {Array} История рассылок
   */
  loadMailingHistory() {
    try {
      const stored = localStorage.getItem('hr-assistant-mailing-history');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      this.logger.error('Ошибка загрузки истории рассылок', error);
      return [];
    }
  }

  /**
   * Сохранение истории рассылок
   */
  saveMailingHistory() {
    try {
      localStorage.setItem('hr-assistant-mailing-history', JSON.stringify(this.mailingHistory));
    } catch (error) {
      this.logger.error('Ошибка сохранения истории рассылок', error);
    }
  }

  /**
   * Создание новой рассылки
   * @param {Object} mailingData - Данные рассылки
   * @returns {Promise<Object>} Созданная рассылка
   */
  async createMailing(mailingData) {
    try {
      this.setLoading(true);
      
      const mailing = {
        id: this.generateId(),
        ...mailingData,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sent: 0,
        failed: 0,
        total: 0
      };

      // Получаем получателей
      const recipients = await this.getRecipients(mailing);
      mailing.total = recipients.length;
      mailing.recipients = recipients;

      this.mailingHistory.push(mailing);
      this.saveMailingHistory();

      this.eventBus.emit('mailing:created', mailing);
      this.eventBus.emit('notification:success', 'Рассылка создана');

      return mailing;
    } catch (error) {
      this.handleError(error, 'createMailing');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Получение получателей рассылки
   * @param {Object} mailing - Данные рассылки
   * @returns {Promise<Array>} Список получателей
   */
  async getRecipients(mailing) {
    const recipients = [];
    
    try {
      // Кандидаты
      if (mailing.targetGroups.includes('candidates')) {
        const candidates = await this.candidateStore.getAll();
        const filtered = this.filterByStatus(candidates, mailing.candidateStatuses);
        
        filtered.forEach(candidate => {
          if (candidate.chatId || candidate.phone) {
            recipients.push({
              id: candidate.id,
              name: candidate.name,
              type: 'candidate',
              chatId: candidate.chatId,
              phone: candidate.phone,
              project: candidate.project,
              status: candidate.status
            });
          }
        });
      }

      // Молчащие кандидаты
      if (mailing.targetGroups.includes('silent')) {
        const silentCandidates = await this.candidateStore.getSilentCandidates();
        
        silentCandidates.forEach(candidate => {
          if (candidate.phone && !recipients.find(r => r.id === candidate.id)) {
            recipients.push({
              id: candidate.id,
              name: candidate.name,
              type: 'silent',
              phone: candidate.phone,
              silentHours: this.calculateSilentHours(candidate.silentSince)
            });
          }
        });
      }

      // Вахтовики
      if (mailing.targetGroups.includes('shiftWorkers')) {
        const shiftWorkers = await this.shiftWorkerStore.getAll();
        
        shiftWorkers.forEach(worker => {
          if (worker.chatId || worker.phone) {
            recipients.push({
              id: worker.id,
              name: worker.name,
              type: 'shiftWorker',
              chatId: worker.chatId,
              phone: worker.phone,
              object: worker.object,
              status: worker.status
            });
          }
        });
      }

      // Фильтрация по проектам
      if (mailing.projects && mailing.projects.length > 0) {
        return recipients.filter(r => 
          mailing.projects.includes(r.project) || 
          mailing.projects.includes(r.object)
        );
      }

      return recipients;
    } catch (error) {
      this.logger.error('Ошибка получения получателей', error);
      return recipients;
    }
  }

  /**
   * Фильтрация по статусам
   * @param {Array} items - Элементы для фильтрации
   * @param {Array} statuses - Разрешенные статусы
   * @returns {Array} Отфильтрованные элементы
   */
  filterByStatus(items, statuses) {
    if (!statuses || statuses.length === 0) {
      return items;
    }
    return items.filter(item => statuses.includes(item.status));
  }

  /**
   * Расчет часов молчания
   * @param {string} silentSince - Дата начала молчания
   * @returns {number} Часы молчания
   */
  calculateSilentHours(silentSince) {
    if (!silentSince) return 0;
    const now = new Date();
    const silentDate = new Date(silentSince);
    return Math.floor((now - silentDate) / (1000 * 60 * 60));
  }

  /**
   * Отправка рассылки
   * @param {string} mailingId - ID рассылки
   * @returns {Promise<Object>} Результат отправки
   */
  async sendMailing(mailingId) {
    try {
      this.setLoading(true);
      
      const mailing = this.mailingHistory.find(m => m.id === mailingId);
      if (!mailing) {
        throw new Error('Рассылка не найдена');
      }

      if (mailing.status === 'sent') {
        throw new Error('Рассылка уже отправлена');
      }

      // Обновляем статус
      mailing.status = 'sending';
      mailing.startedAt = new Date().toISOString();
      this.saveMailingHistory();

      const results = {
        sent: 0,
        failed: 0,
        errors: []
      };

      // Отправляем сообщения
      for (const recipient of mailing.recipients) {
        try {
          const message = this.personalizeMessage(mailing.message, recipient);
          
          let success = false;
          
          // WhatsApp приоритетнее
          if (recipient.chatId && mailing.channels.includes('whatsapp')) {
            success = await this.sendWhatsAppMessage(recipient.chatId, message);
          }
          // SMS как запасной вариант
          else if (recipient.phone && mailing.channels.includes('sms')) {
            success = await this.sendSMS(recipient.phone, message);
          }
          // Telegram (если есть)
          else if (recipient.telegramId && mailing.channels.includes('telegram')) {
            success = await this.sendTelegramMessage(recipient.telegramId, message);
          }

          if (success) {
            results.sent++;
            mailing.sent++;
          } else {
            results.failed++;
            mailing.failed++;
            results.errors.push({
              recipient: recipient.name,
              error: 'Не удалось отправить сообщение'
            });
          }

          // Задержка между сообщениями
          await this.delay(1000);
          
          // Обновляем прогресс
          this.eventBus.emit('mailing:progress', {
            mailingId,
            sent: results.sent,
            failed: results.failed,
            total: mailing.recipients.length
          });

        } catch (error) {
          results.failed++;
          mailing.failed++;
          results.errors.push({
            recipient: recipient.name,
            error: error.message
          });
        }
      }

      // Завершаем рассылку
      mailing.status = 'sent';
      mailing.completedAt = new Date().toISOString();
      this.saveMailingHistory();

      this.eventBus.emit('mailing:completed', { mailingId, results });
      this.eventBus.emit('notification:success', 
        `Рассылка завершена. Отправлено: ${results.sent}, Ошибок: ${results.failed}`
      );

      return results;

    } catch (error) {
      this.handleError(error, 'sendMailing');
      
      // Обновляем статус на ошибку
      const mailing = this.mailingHistory.find(m => m.id === mailingId);
      if (mailing) {
        mailing.status = 'error';
        mailing.error = error.message;
        this.saveMailingHistory();
      }
      
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Персонализация сообщения
   * @param {string} template - Шаблон сообщения
   * @param {Object} recipient - Получатель
   * @returns {string} Персонализированное сообщение
   */
  personalizeMessage(template, recipient) {
    let message = template;
    
    // Заменяем переменные
    message = message.replace(/\{name\}/g, recipient.name || 'Кандидат');
    message = message.replace(/\{project\}/g, recipient.project || recipient.object || '');
    message = message.replace(/\{status\}/g, recipient.status || '');
    
    // Добавляем специальные переменные для молчащих
    if (recipient.type === 'silent' && recipient.silentHours) {
      const hours = recipient.silentHours;
      const days = Math.floor(hours / 24);
      const hoursText = days > 0 ? `${days} дней` : `${hours} часов`;
      message = message.replace(/\{silentTime\}/g, hoursText);
    }
    
    return message;
  }

  /**
   * Отправка WhatsApp сообщения
   * @param {string} chatId - ID чата
   * @param {string} message - Сообщение
   * @returns {Promise<boolean>} Успех отправки
   */
  async sendWhatsAppMessage(chatId, message) {
    try {
      const result = await this.extensionAPI.sendWhatsAppMessage(chatId, message);
      return result.success;
    } catch (error) {
      this.logger.error('Ошибка отправки WhatsApp', error);
      return false;
    }
  }

  /**
   * Отправка SMS
   * @param {string} phone - Телефон
   * @param {string} message - Сообщение
   * @returns {Promise<boolean>} Успех отправки
   */
  async sendSMS(phone, message) {
    try {
      const result = await this.extensionAPI.sendSMS(phone, message);
      return result.success;
    } catch (error) {
      this.logger.error('Ошибка отправки SMS', error);
      return false;
    }
  }

  /**
   * Отправка Telegram сообщения
   * @param {string} telegramId - ID пользователя в Telegram
   * @param {string} message - Сообщение
   * @returns {Promise<boolean>} Успех отправки
   */
  async sendTelegramMessage(telegramId, message) {
    try {
      const result = await this.extensionAPI.sendTelegramMessage(telegramId, message);
      return result.success;
    } catch (error) {
      this.logger.error('Ошибка отправки Telegram', error);
      return false;
    }
  }

  /**
   * Получение истории рассылок
   * @returns {Array} История рассылок
   */
  getMailingHistory() {
    return this.mailingHistory.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  /**
   * Получение статистики рассылок
   * @returns {Object} Статистика
   */
  getMailingStatistics() {
    const total = this.mailingHistory.length;
    const sent = this.mailingHistory.filter(m => m.status === 'sent').length;
    const totalRecipients = this.mailingHistory.reduce((sum, m) => sum + (m.total || 0), 0);
    const totalSent = this.mailingHistory.reduce((sum, m) => sum + (m.sent || 0), 0);
    const totalFailed = this.mailingHistory.reduce((sum, m) => sum + (m.failed || 0), 0);
    
    return {
      total,
      sent,
      draft: total - sent,
      totalRecipients,
      totalSent,
      totalFailed,
      successRate: totalRecipients > 0 ? Math.round((totalSent / totalRecipients) * 100) : 0
    };
  }

  /**
   * Удаление рассылки
   * @param {string} mailingId - ID рассылки
   * @returns {boolean} Успех удаления
   */
  deleteMailing(mailingId) {
    try {
      const index = this.mailingHistory.findIndex(m => m.id === mailingId);
      if (index !== -1) {
        this.mailingHistory.splice(index, 1);
        this.saveMailingHistory();
        this.eventBus.emit('mailing:deleted', mailingId);
        this.eventBus.emit('notification:success', 'Рассылка удалена');
        return true;
      }
      return false;
    } catch (error) {
      this.handleError(error, 'deleteMailing');
      return false;
    }
  }

  /**
   * Генерация ID
   * @returns {string} Уникальный ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Задержка
   * @param {number} ms - Миллисекунды
   * @returns {Promise} Promise для ожидания
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default MailingController;
