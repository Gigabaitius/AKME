// src/stores/ShiftWorkerStore.js
/**
 * 🏗️ Хранилище вахтовиков
 * @description Управление данными вахтовиков и контрольных точек
 */
import BaseStore from './BaseStore.js';
import ShiftWorkerModel from '../models/ShiftWorkerModel.js';

class ShiftWorkerStore extends BaseStore {
  constructor() {
    super('shiftWorkers');
  }

  /**
   * Создание нового вахтовика
   * @param {Object} workerData - Данные вахтовика
   * @returns {Promise<ShiftWorkerModel>} Созданный вахтовик
   */
  async create(workerData) {
    const worker = new ShiftWorkerModel(workerData);
    const created = await super.create(worker.toJSON());
    return new ShiftWorkerModel(created);
  }

  /**
   * Получение вахтовика по Chat ID
   * @param {string} chatId - ID чата
   * @returns {Promise<ShiftWorkerModel|null>} Вахтовик или null
   */
  async getByChatId(chatId) {
    const workers = await this.getAll();
    const worker = workers.find(w => w.chatId === chatId);
    return worker ? new ShiftWorkerModel(worker) : null;
  }

  /**
   * Получение вахтовиков по объекту
   * @param {string} object - Название объекта
   * @returns {Promise<Array<ShiftWorkerModel>>} Массив вахтовиков
   */
  async getByObject(object) {
    const workers = await this.getAll({ object });
    return workers.map(w => new ShiftWorkerModel(w));
  }

  /**
   * Получение вахтовиков с просроченными КТ
   * @returns {Promise<Array<ShiftWorkerModel>>} Массив вахтовиков
   */
  async getOverdueCheckpoints() {
    const workers = await this.getAll();
    const now = new Date();
    const deadlineTime = new Date();
    deadlineTime.setHours(15, 0, 0, 0); // 15:00 МСК

    return workers
      .filter(w => {
        if (!w.checkpointDate || w.checkpointStatus !== 'Ожидание') {
          return false;
        }
        
        const checkpointDate = new Date(w.checkpointDate);
        return checkpointDate.toDateString() === now.toDateString() && 
               now > deadlineTime && 
               !w.checkpointResponse;
      })
      .map(w => new ShiftWorkerModel(w));
  }

  /**
   * Получение статистики по вахтовикам
   * @returns {Promise<Object>} Статистика
   */
  async getStatistics() {
    const workers = await this.getAll();
    const now = new Date();
    const today = now.toDateString();

    return {
      total: workers.length,
      active: workers.filter(w => w.status === 'Активен').length,
      onShift: workers.filter(w => w.status === 'На вахте').length,
      onLeave: workers.filter(w => w.status === 'В отпуске').length,
      todayCheckpoints: workers.filter(w => {
        if (!w.checkpointDate) return false;
        return new Date(w.checkpointDate).toDateString() === today;
      }).length,
      overdueCheckpoints: workers.filter(w => {
        if (!w.checkpointDate || w.checkpointStatus !== 'Ожидание') {
          return false;
        }
        const checkpointDate = new Date(w.checkpointDate);
        const deadlineTime = new Date();
        deadlineTime.setHours(15, 0, 0, 0);
        return checkpointDate < now && now > deadlineTime && !w.checkpointResponse;
      }).length
    };
  }

  /**
   * Обновление контрольной точки
   * @param {string} workerId - ID вахтовика
   * @param {Object} checkpointData - Данные КТ
   * @returns {Promise<ShiftWorkerModel>} Обновленный вахтовик
   */
  async updateCheckpoint(workerId, checkpointData) {
    const worker = await this.getById(workerId);
    if (!worker) {
      throw new Error(`Вахтовик с ID ${workerId} не найден`);
    }

    const workerModel = new ShiftWorkerModel(worker);
    
    if (checkpointData.response) {
      workerModel.respondToCheckpoint(checkpointData.response);
    } else if (checkpointData.checkpoint && checkpointData.date) {
      workerModel.setCheckpoint(checkpointData.checkpoint, new Date(checkpointData.date));
    } else if (checkpointData.missed) {
      workerModel.missCheckpoint();
    }

    const updated = await this.update(workerId, workerModel.toJSON());
    return new ShiftWorkerModel(updated);
  }

  /**
   * Получение истории контрольных точек
   * @param {string} workerId - ID вахтовика
   * @returns {Promise<Array>} История КТ
   */
  async getCheckpointHistory(workerId) {
    // В реальном приложении это должно храниться отдельно
    // Пока возвращаем мокированные данные
    return [
      {
        id: 1,
        workerId,
        checkpoint: 'КТ-1',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: 'Ответил',
        response: 'Все в порядке',
        respondedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        workerId,
        checkpoint: 'КТ-2',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'Пропущена',
        response: null,
        respondedAt: null
      }
    ];
  }
}

// Экспортируем синглтон
export default new ShiftWorkerStore();
