// src/stores/CandidateStore.js
/**
 * Хранилище кандидатов
 * @description Специализированное хранилище для кандидатов
 */
import BaseStore from './BaseStore.js';
import CandidateModel from '../models/CandidateModel.js';

class CandidateStore extends BaseStore {
  constructor() {
    super('candidates');
  }

  /**
   * Создание кандидата
   * @param {Object|CandidateModel} candidateData - Данные кандидата
   * @returns {Promise<CandidateModel>} Созданный кандидат
   */
  async create(candidateData) {
    const candidate = candidateData instanceof CandidateModel 
      ? candidateData 
      : new CandidateModel(candidateData);
    
    return await super.create(candidate.toJSON());
  }

  /**
   * Получение кандидата по chatId
   * @param {string} chatId - ID чата
   * @returns {Promise<CandidateModel|null>} Кандидат
   */
  async getByChatId(chatId) {
    const candidates = Array.from(this.data.values());
    const found = candidates.find(c => c.chatId === chatId);
    return found ? new CandidateModel(found) : null;
  }

  /**
   * Получение кандидатов по статусу
   * @param {string} status - Статус
   * @returns {Promise<Array>} Массив кандидатов
   */
  async getByStatus(status) {
    const candidates = await this.getAll();
    return candidates.filter(c => c.status === status);
  }

  /**
   * Получение молчащих кандидатов
   * @returns {Promise<Array>} Молчащие кандидаты
   */
  async getSilentCandidates() {
    const candidates = await this.getAll();
    return candidates.filter(c => {
      const candidate = new CandidateModel(c);
      return candidate.isSilent();
    });
  }

  /**
   * Получение кандидатов для передачи
   * @returns {Promise<Array>} Кандидаты для передачи
   */
  async getCandidatesForTransfer() {
    const candidates = await this.getAll();
    return candidates.filter(c => {
      const candidate = new CandidateModel(c);
      return candidate.shouldTransfer();
    });
  }

  /**
   * Поиск кандидатов по телефону
   * @param {string} phone - Номер телефона
   * @returns {Promise<Array>} Найденные кандидаты
   */
  async searchByPhone(phone) {
    const candidates = await this.getAll();
    const cleanPhone = phone.replace(/\D/g, '');
    
    return candidates.filter(c => {
      const candidatePhone = c.phone.replace(/\D/g, '');
      return candidatePhone.includes(cleanPhone);
    });
  }

  /**
   * Получение статистики кандидатов
   * @returns {Promise<Object>} Статистика
   */
  async getStatistics() {
    const candidates = await this.getAll();
    
    const stats = {
      total: candidates.length,
      byStatus: {},
      byProject: {},
      withDocuments: 0,
      recentActivity: 0
    };

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    candidates.forEach(c => {
      // Статистика по статусам
      stats.byStatus[c.status] = (stats.byStatus[c.status] || 0) + 1;
      
      // Статистика по проектам
      stats.byProject[c.project] = (stats.byProject[c.project] || 0) + 1;
      
      // Кандидаты с документами
      if (c.documentProcessed) {
        stats.withDocuments++;
      }
      
      // Недавняя активность
      if (c.lastReply && new Date(c.lastReply) > dayAgo) {
        stats.recentActivity++;
      }
    });

    return stats;
  }
}

export default new CandidateStore();

// ===========================
// VIEW LAYER
// ===========================