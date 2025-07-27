// src/services/GoogleSheetsService.js
/**
 * 📊 Сервис интеграции с Google Sheets
 * @description Синхронизация данных с Google Таблицами
 */
import ExtensionAPIService from './ExtensionAPIService.js';
import EventBus from '../utils/EventBus.js';
import Logger from '../utils/Logger.js';

class GoogleSheetsService {
  constructor() {
    this.logger = new Logger('GoogleSheetsService');
    this.extensionAPI = ExtensionAPIService;
    this.spreadsheetId = null;
    this.isConnected = false;
    this.syncInProgress = false;
    
    this.initialize();
  }

  /**
   * Инициализация сервиса
   */
  async initialize() {
    try {
      // Проверяем сохраненные настройки
      const settings = JSON.parse(localStorage.getItem('hr-assistant-settings') || '{}');
      if (settings.googleSheetsConnected && settings.spreadsheetId) {
        this.spreadsheetId = settings.spreadsheetId;
        this.isConnected = await this.checkConnection();
      }
      
      this.logger.info('Google Sheets сервис инициализирован');
    } catch (error) {
      this.logger.error('Ошибка инициализации', error);
    }
  }

  /**
   * Проверка подключения
   * @returns {Promise<boolean>} Статус подключения
   */
  async checkConnection() {
    try {
      if (!this.extensionAPI.isConnected()) {
        return false;
      }
      
      const result = await this.extensionAPI.checkGoogleSheetsAuth();
      return result.connected;
    } catch (error) {
      this.logger.error('Ошибка проверки подключения', error);
      return false;
    }
  }

  /**
   * Создание новой таблицы
   * @param {string} title - Название таблицы
   * @returns {Promise<string>} ID созданной таблицы
   */
  async createSpreadsheet(title = 'HR Assistant Data') {
    try {
      const result = await this.extensionAPI.createGoogleSheet({
        title,
        sheets: [
          { name: 'Кандидаты', headers: this.getCandidateHeaders() },
          { name: 'Вахтовики', headers: this.getShiftWorkerHeaders() },
          { name: 'База знаний', headers: this.getKnowledgeHeaders() },
          { name: 'История обучения', headers: this.getTrainingHeaders() },
          { name: 'Рассылки', headers: this.getMailingHeaders() }
        ]
      });
      
      if (result.success) {
        this.spreadsheetId = result.spreadsheetId;
        this.saveSpreadsheetId(result.spreadsheetId);
        this.logger.info(`Создана таблица: ${result.spreadsheetId}`);
        return result.spreadsheetId;
      } else {
        throw new Error(result.error || 'Не удалось создать таблицу');
      }
    } catch (error) {
      this.logger.error('Ошибка создания таблицы', error);
      throw error;
    }
  }

  /**
   * Сохранение ID таблицы
   * @param {string} spreadsheetId - ID таблицы
   */
  saveSpreadsheetId(spreadsheetId) {
    const settings = JSON.parse(localStorage.getItem('hr-assistant-settings') || '{}');
    settings.spreadsheetId = spreadsheetId;
    localStorage.setItem('hr-assistant-settings', JSON.stringify(settings));
  }

  /**
   * Получение заголовков для кандидатов
   * @returns {Array} Массив заголовков
   */
  getCandidateHeaders() {
    return [
      'ID',
      'Дата создания',
      'Дата обновления',
      'ФИО',
      'Телефон',
      'Email',
      'Проект',
      'Статус',
      'ИНН',
      'СНИЛС',
      'Паспорт',
      'Дата рождения',
      'Место рождения',
      'Адрес регистрации',
      'Дата выдачи паспорта',
      'Кем выдан паспорт',
      'Последний ответ',
      'Комментарий',
      'Теги',
      'Источник'
    ];
  }

  /**
   * Получение заголовков для вахтовиков
   * @returns {Array} Массив заголовков
   */
  getShiftWorkerHeaders() {
    return [
      'ID',
      'Дата создания',
      'Дата обновления',
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
      'График вахты'
    ];
  }

  /**
   * Получение заголовков для базы знаний
   * @returns {Array} Массив заголовков
   */
  getKnowledgeHeaders() {
    return [
      'ID',
      'Дата создания',
      'Дата обновления',
      'Заголовок',
      'Категория',
      'Содержание',
      'Теги',
      'Источник',
      'Версия',
      'Просмотры',
      'Полезно',
      'Не полезно'
    ];
  }

  /**
   * Получение заголовков для истории обучения
   * @returns {Array} Массив заголовков
   */
  getTrainingHeaders() {
    return [
      'ID',
      'Время',
      'Тип',
      'Автор',
      'Сообщение',
      'Категория'
    ];
  }

  /**
   * Получение заголовков для рассылок
   * @returns {Array} Массив заголовков
   */
  getMailingHeaders() {
    return [
      'ID',
      'Дата создания',
      'Название',
      'Сообщение',
      'Целевые группы',
      'Каналы',
      'Статус',
      'Всего получателей',
      'Отправлено',
      'Ошибок',
      'Дата отправки'
    ];
  }

  /**
   * Синхронизация кандидатов
   * @param {Array} candidates - Массив кандидатов
   * @returns {Promise<Object>} Результат синхронизации
   */
  async syncCandidates(candidates) {
    try {
      if (!this.isConnected || !this.spreadsheetId) {
        throw new Error('Google Sheets не подключен');
      }
      
      this.logger.info(`Синхронизация ${candidates.length} кандидатов`);
      
      // Преобразуем данные в формат таблицы
      const rows = candidates.map(candidate => [
        candidate.id,
        candidate.createdAt,
        candidate.updatedAt,
        candidate.name,
        candidate.phone,
        candidate.email || '',
        candidate.project,
        candidate.status,
        candidate.inn || '',
        candidate.snils || '',
        candidate.passport || '',
        candidate.birthDate || '',
        candidate.birthPlace || '',
        candidate.registrationAddress || '',
        candidate.passportIssueDate || '',
        candidate.passportIssuedBy || '',
        candidate.lastReply || '',
        candidate.comment || '',
        (candidate.tags || []).join(', '),
        candidate.source || 'manual'
      ]);
      
      // Отправляем данные
      const result = await this.extensionAPI.updateGoogleSheet({
        spreadsheetId: this.spreadsheetId,
        range: 'Кандидаты!A2:T',
        values: rows,
        clearFirst: true
      });
      
      if (result.success) {
        this.logger.info(`Синхронизировано ${result.updatedRows} строк`);
        EventBus.emit('googleSheets:syncCompleted', {
          type: 'candidates',
          count: result.updatedRows
        });
        return result;
      } else {
        throw new Error(result.error || 'Ошибка синхронизации');
      }
    } catch (error) {
      this.logger.error('Ошибка синхронизации кандидатов', error);
      throw error;
    }
  }

  /**
   * Синхронизация вахтовиков
   * @param {Array} shiftWorkers - Массив вахтовиков
   * @returns {Promise<Object>} Результат синхронизации
   */
  async syncShiftWorkers(shiftWorkers) {
    try {
      if (!this.isConnected || !this.spreadsheetId) {
        throw new Error('Google Sheets не подключен');
      }
      
      const rows = shiftWorkers.map(worker => [
        worker.id,
        worker.createdAt,
        worker.updatedAt,
        worker.name,
        worker.phone,
        worker.object,
        worker.position || '',
        worker.status,
        worker.currentCheckpoint || '',
        worker.checkpointDate || '',
        worker.checkpointStatus || '',
        worker.checkpointResponse || '',
        worker.soComment || '',
        worker.shiftSchedule || ''
      ]);
      
      const result = await this.extensionAPI.updateGoogleSheet({
        spreadsheetId: this.spreadsheetId,
        range: 'Вахтовики!A2:N',
        values: rows,
        clearFirst: true
      });
      
      if (result.success) {
        this.logger.info(`Синхронизировано ${result.updatedRows} вахтовиков`);
        EventBus.emit('googleSheets:syncCompleted', {
          type: 'shiftWorkers',
          count: result.updatedRows
        });
        return result;
      } else {
        throw new Error(result.error || 'Ошибка синхронизации');
      }
    } catch (error) {
      this.logger.error('Ошибка синхронизации вахтовиков', error);
      throw error;
    }
  }

  /**
   * Синхронизация базы знаний
   * @param {Array} knowledge - Массив записей базы знаний
   * @returns {Promise<Object>} Результат синхронизации
   */
  async syncKnowledge(knowledge) {
    try {
      if (!this.isConnected || !this.spreadsheetId) {
        throw new Error('Google Sheets не подключен');
      }
      
      const rows = knowledge.map(item => [
        item.id,
        item.createdAt,
        item.updatedAt,
        item.title,
        item.category,
        item.content,
        (item.tags || []).join(', '),
        item.source || '',
        item.version || 1,
        item.views || 0,
        item.helpful || 0,
        item.notHelpful || 0
      ]);
      
      const result = await this.extensionAPI.updateGoogleSheet({
        spreadsheetId: this.spreadsheetId,
        range: 'База знаний!A2:L',
        values: rows,
        clearFirst: true
      });
      
      if (result.success) {
        this.logger.info(`Синхронизировано ${result.updatedRows} записей базы знаний`);
        return result;
      } else {
        throw new Error(result.error || 'Ошибка синхронизации');
      }
    } catch (error) {
      this.logger.error('Ошибка синхронизации базы знаний', error);
      throw error;
    }
  }

  /**
   * Сохранение диалога обучения
   * @param {Object} dialogData - Данные диалога
   * @returns {Promise<Object>} Результат сохранения
   */
  async saveTrainingDialog(dialogData) {
    try {
      if (!this.isConnected || !this.spreadsheetId) {
        throw new Error('Google Sheets не подключен');
      }
      
      const row = [
        dialogData.id || Date.now().toString(),
        dialogData.timestamp,
        dialogData.type || 'message',
        dialogData.author || 'user',
        dialogData.userMessage || dialogData.message,
        dialogData.category || 'general'
      ];
      
      const result = await this.extensionAPI.appendToGoogleSheet({
        spreadsheetId: this.spreadsheetId,
        range: 'История обучения!A:F',
        values: [row]
      });
      
      if (result.success) {
        this.logger.info('Диалог сохранен в Google Sheets');
        return result;
      } else {
        throw new Error(result.error || 'Ошибка сохранения');
      }
    } catch (error) {
      this.logger.error('Ошибка сохранения диалога', error);
      throw error;
    }
  }

  /**
   * Полная синхронизация всех данных
   * @param {Object} allData - Все данные для синхронизации
   * @returns {Promise<Object>} Результат синхронизации
   */
  async syncAllData(allData) {
    if (this.syncInProgress) {
      throw new Error('Синхронизация уже выполняется');
    }
    
    this.syncInProgress = true;
    const results = {
      candidates: null,
      shiftWorkers: null,
      knowledge: null,
      errors: []
    };
    
    try {
      // Создаем таблицу если её нет
      if (!this.spreadsheetId) {
        await this.createSpreadsheet();
      }
      
      // Синхронизируем кандидатов
      if (allData.candidates && allData.candidates.length > 0) {
        try {
          results.candidates = await this.syncCandidates(allData.candidates);
        } catch (error) {
          results.errors.push({ type: 'candidates', error: error.message });
        }
      }
      
      // Синхронизируем вахтовиков
      if (allData.shiftWorkers && allData.shiftWorkers.length > 0) {
        try {
          results.shiftWorkers = await this.syncShiftWorkers(allData.shiftWorkers);
        } catch (error) {
          results.errors.push({ type: 'shiftWorkers', error: error.message });
        }
      }
      
      // Синхронизируем базу знаний
      if (allData.knowledge && allData.knowledge.length > 0) {
        try {
          results.knowledge = await this.syncKnowledge(allData.knowledge);
        } catch (error) {
          results.errors.push({ type: 'knowledge', error: error.message });
        }
      }
      
      EventBus.emit('googleSheets:fullSyncCompleted', results);
      this.logger.info('Полная синхронизация завершена', results);
      
      return results;
    } catch (error) {
      this.logger.error('Ошибка полной синхронизации', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Получение данных из таблицы
   * @param {string} range - Диапазон ячеек
   * @returns {Promise<Array>} Данные из таблицы
   */
  async getSheetData(range) {
    try {
      if (!this.isConnected || !this.spreadsheetId) {
        throw new Error('Google Sheets не подключен');
      }
      
      const result = await this.extensionAPI.getGoogleSheetData({
        spreadsheetId: this.spreadsheetId,
        range
      });
      
      if (result.success) {
        return result.values || [];
      } else {
        throw new Error(result.error || 'Ошибка получения данных');
      }
    } catch (error) {
      this.logger.error('Ошибка получения данных из таблицы', error);
      throw error;
    }
  }

  /**
   * Открытие таблицы в браузере
   */
  openSpreadsheet() {
    if (this.spreadsheetId) {
      const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit`;
      window.open(url, '_blank');
    } else {
      this.logger.warn('ID таблицы не установлен');
    }
  }

  /**
   * Отключение от Google Sheets
   */
  async disconnect() {
    this.isConnected = false;
    this.spreadsheetId = null;
    
    const settings = JSON.parse(localStorage.getItem('hr-assistant-settings') || '{}');
    delete settings.spreadsheetId;
    settings.googleSheetsConnected = false;
    localStorage.setItem('hr-assistant-settings', JSON.stringify(settings));
    
    this.logger.info('Отключено от Google Sheets');
  }
}

// Экспортируем синглтон
export default new GoogleSheetsService();
