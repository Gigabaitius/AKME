// src/controllers/ShiftWorkerController.js
/**
 * 🏗️ Контроллер вахтовиков
 * @description Управление вахтовиками и контрольными точками
 */
import BaseController from './BaseController.js';
import ShiftWorkerModel from '../models/ShiftWorkerModel.js';
import ShiftWorkerStore from '../stores/ShiftWorkerStore.js';
import WhatsAppService from '../services/WhatsAppService.js';
import NotificationService from '../services/NotificationService.js';

class ShiftWorkerController extends BaseController {
  constructor() {
    super();
    this.store = ShiftWorkerStore;
    this.whatsAppService = WhatsAppService;
    this.notificationService = NotificationService;
    
    this.initializeEventListeners();
  }

  /**
   * Инициализация слушателей событий
   */
  initializeEventListeners() {
    // Слушаем события контрольных точек
    this.eventBus.on('shiftWorkers:checkDeadlines', this.checkAllDeadlines.bind(this));
    this.eventBus.on('checkpoint:response', this.handleCheckpointResponse.bind(this));
  }

  /**
   * Получение всех вахтовиков
   * @returns {Promise<Object>} Вахтовики и статистика
   */
  async getAllShiftWorkers() {
    try {
      this.setLoading(true);
      const workers = await this.store.getAll();
      const stats = await this.store.getStatistics();
      
      // Проверяем просроченные КТ для каждого
      const workersWithStatus = workers.map(worker => {
        const model = new ShiftWorkerModel(worker);
        return {
          ...worker,
          isCheckpointOverdue: model.isCheckpointOverdue()
        };
      });
      
      this.eventBus.emit('shiftWorkers:loaded', { workers: workersWithStatus, stats });
      
      return { workers: workersWithStatus, stats };
    } catch (error) {
      this.handleError(error, 'getAllShiftWorkers');
      return { workers: [], stats: {} };
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Создание нового вахтовика
   * @param {Object} workerData - Данные вахтовика
   * @returns {Promise<ShiftWorkerModel>} Созданный вахтовик
   */
  async createShiftWorker(workerData) {
    try {
      this.setLoading(true);
      
      // Создаем модель для валидации
      const worker = new ShiftWorkerModel(workerData);
      
      // Валидация
      worker.validate();
      
      // Сохраняем в хранилище
      const created = await this.store.create(worker);
      
      this.eventBus.emit('shiftWorker:created', created);
      this.eventBus.emit('notification:success', `Вахтовик ${created.name} добавлен`);
      
      return created;
    } catch (error) {
      this.handleError(error, 'createShiftWorker');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Обновление вахтовика
   * @param {string} workerId - ID вахтовика
   * @param {Object} updates - Обновления
   * @returns {Promise<ShiftWorkerModel>} Обновленный вахтовик
   */
  async updateShiftWorker(workerId, updates) {
    try {
      this.setLoading(true);
      
      const existing = await this.store.getById(workerId);
      if (!existing) {
        throw new Error('Вахтовик не найден');
      }
      
      // Создаем модель с обновлениями
      const updated = new ShiftWorkerModel({ ...existing, ...updates });
      updated.validate();
      
      // Сохраняем
      const result = await this.store.update(workerId, updated.toJSON());
      
      this.eventBus.emit('shiftWorker:updated', result);
      this.eventBus.emit('notification:success', 'Данные вахтовика обновлены');
      
      return result;
    } catch (error) {
      this.handleError(error, 'updateShiftWorker');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Удаление вахтовика
   * @param {string} workerId - ID вахтовика
   * @returns {Promise<boolean>} Успех операции
   */
  async deleteShiftWorker(workerId) {
    try {
      this.setLoading(true);
      
      const success = await this.store.delete(workerId);
      
      if (success) {
        this.eventBus.emit('shiftWorker:deleted', workerId);
        this.eventBus.emit('notification:success', 'Вахтовик удален');
      }
      
      return success;
    } catch (error) {
      this.handleError(error, 'deleteShiftWorker');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Установка контрольной точки
   * @param {string} workerId - ID вахтовика
   * @param {string} checkpoint - Название КТ
   * @param {Date} date - Дата КТ
   * @returns {Promise<ShiftWorkerModel>} Обновленный вахтовик
   */
  async setCheckpoint(workerId, checkpoint, date) {
    try {
      this.setLoading(true);
      
      const updated = await this.store.updateCheckpoint(workerId, {
        checkpoint,
        date
      });
      
      this.logger.info(`Установлена КТ "${checkpoint}" для вахтовика ${updated.name}`);
      
      // Отправляем уведомление вахтовику
      if (updated.chatId) {
        await this.sendCheckpointNotification(updated);
      }
      
      this.eventBus.emit('checkpoint:set', { workerId, checkpoint, date });
      this.eventBus.emit('notification:success', 'Контрольная точка установлена');
      
      return updated;
    } catch (error) {
      this.handleError(error, 'setCheckpoint');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Отправка уведомления о КТ
   * @param {ShiftWorkerModel} worker - Вахтовик
   */
  async sendCheckpointNotification(worker) {
    try {
      const message = `Здравствуйте, ${worker.name}!

Установлена контрольная точка: ${worker.currentCheckpoint}
Дата: ${new Date(worker.checkpointDate).toLocaleDateString('ru-RU')}

Пожалуйста, не забудьте подтвердить прохождение КТ до 15:00 МСК.

С уважением,
СО`;

      await this.whatsAppService.sendMessage(worker.chatId, message);
      this.logger.info(`Отправлено уведомление о КТ вахтовику ${worker.name}`);
    } catch (error) {
      this.logger.error('Ошибка отправки уведомления о КТ', error);
    }
  }

  /**
   * Отправка напоминания о КТ
   * @param {string} workerId - ID вахтовика
   * @returns {Promise<boolean>} Успех отправки
   */
  async sendCheckpointReminder(workerId) {
    try {
      this.setLoading(true);
      
      const worker = await this.store.getById(workerId);
      if (!worker || !worker.chatId) {
        throw new Error('Вахтовик не найден или нет Chat ID');
      }
      
      const message = `${worker.name}, напоминаем о контрольной точке "${worker.currentCheckpoint}"!

Осталось времени до дедлайна: ${this.getTimeUntilDeadline()}

Пожалуйста, подтвердите прохождение КТ.`;

      const success = await this.whatsAppService.sendMessage(worker.chatId, message);
      
      if (success) {
        this.eventBus.emit('notification:success', 'Напоминание отправлено');
      }
      
      return success;
    } catch (error) {
      this.handleError(error, 'sendCheckpointReminder');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Обработка ответа на КТ
   * @param {Object} data - Данные ответа
   */
  async handleCheckpointResponse(data) {
    try {
      const { workerId, response } = data;
      
      const updated = await this.store.updateCheckpoint(workerId, { response });
      
      this.logger.info(`Получен ответ на КТ от ${updated.name}: ${response}`);
      
      // Уведомляем СО
      this.notificationService.showSuccess(
        `${updated.name} ответил на КТ: ${response}`
      );
      
      this.eventBus.emit('checkpoint:responded', { workerId, response });
      
    } catch (error) {
      this.handleError(error, 'handleCheckpointResponse');
    }
  }

  /**
   * Проверка всех дедлайнов КТ
   */
  async checkAllDeadlines() {
    try {
      const overdueWorkers = await this.store.getOverdueCheckpoints();
      
      for (const worker of overdueWorkers) {
        // Отмечаем КТ как пропущенную
        await this.store.updateCheckpoint(worker.id, { missed: true });
        
        // Уведомляем СО
        this.notificationService.showMissedCheckpointNotification(worker);
        
        // Отправляем событие
        this.eventBus.emit('missedCheckpoint', { workerId: worker.id });
        
        this.logger.warn(`Пропущена КТ вахтовика ${worker.name}`);
      }
      
      if (overdueWorkers.length > 0) {
        this.eventBus.emit('notification:error', 
          `Пропущено ${overdueWorkers.length} контрольных точек!`
        );
      }
      
    } catch (error) {
      this.handleError(error, 'checkAllDeadlines');
    }
  }

  /**
   * Получение времени до дедлайна
   * @returns {string} Время до дедлайна
   */
  getTimeUntilDeadline() {
    const now = new Date();
    const deadline = new Date();
    deadline.setHours(15, 0, 0, 0); // 15:00 МСК
    
    if (now > deadline) {
      return 'Дедлайн истек';
    }
    
    const diff = deadline - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours} ч. ${minutes} мин.`;
  }

  /**
   * Получение истории КТ вахтовика
   * @param {string} workerId - ID вахтовика
   * @returns {Promise<Array>} История КТ
   */
  async getCheckpointHistory(workerId) {
    try {
      const history = await this.store.getCheckpointHistory(workerId);
      return history;
    } catch (error) {
      this.handleError(error, 'getCheckpointHistory');
      return [];
    }
  }

  /**
   * Массовая установка КТ
   * @param {Array} workerIds - ID вахтовиков
   * @param {string} checkpoint - Название КТ
   * @param {Date} date - Дата КТ
   * @returns {Promise<Object>} Результат операции
   */
  async setBulkCheckpoints(workerIds, checkpoint, date) {
    try {
      this.setLoading(true);
      
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };
      
      for (const workerId of workerIds) {
        try {
          await this.setCheckpoint(workerId, checkpoint, date);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            workerId,
            error: error.message
          });
        }
      }
      
      this.eventBus.emit('notification:info', 
        `Установлено КТ: ${results.success}, ошибок: ${results.failed}`
      );
      
      return results;
    } catch (error) {
      this.handleError(error, 'setBulkCheckpoints');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Экспорт данных вахтовиков
   * @returns {Promise<string>} CSV данные
   */
  async exportToCSV() {
    try {
      const workers = await this.store.getAll();
      
      const headers = [
        'ID',
        'ФИО',
        'Телефон',
        'Объект',
        'Должность',
        'Статус',
        'Текущая КТ',
        'Дата КТ',
        'Статус КТ',
        'Ответ на КТ',
        'Комментарий СО',
        'Дата создания'
      ];
      
      const rows = workers.map(w => [
        w.id,
        w.name,
        w.phone,
        w.object,
        w.position || '',
        w.status,
        w.currentCheckpoint || '',
        w.checkpointDate ? new Date(w.checkpointDate).toLocaleDateString('ru-RU') : '',
        w.checkpointStatus || '',
        w.checkpointResponse || '',
        w.soComment || '',
        new Date(w.createdAt).toLocaleDateString('ru-RU')
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      return csvContent;
    } catch (error) {
      this.handleError(error, 'exportToCSV');
      return '';
    }
  }
}

export default ShiftWorkerController;
