// src/controllers/CandidateController.js
/**
 * Контроллер кандидатов
 * @description Управляет логикой работы с кандидатами
 */
import BaseController from './BaseController.js';
import CandidateModel from '../models/CandidateModel.js';
import CandidateStore from '../stores/CandidateStore.js';
import WhatsAppService from '../services/WhatsAppService.js';
import OCRService from '../services/OCRService.js';
import GoogleSheetsService from '../services/GoogleSheetsService.js';

class CandidateController extends BaseController {
  constructor() {
    super();
    this.store = CandidateStore;
    this.whatsAppService = WhatsAppService;
    this.ocrService = OCRService;
    this.googleSheetsService = GoogleSheetsService;
    
    this.initializeEventListeners();
  }

  /**
   * Инициализация слушателей событий
   */
  initializeEventListeners() {
    // Слушаем события от WhatsApp
    this.eventBus.on('whatsapp:newMessage', this.handleWhatsAppMessage.bind(this));
    this.eventBus.on('whatsapp:imageReceived', this.handleImageMessage.bind(this));
    
    // Слушаем события автоматической обработки
    this.eventBus.on('candidate:checkSilent', this.checkSilentCandidates.bind(this));
  }

  /**
   * Получение всех кандидатов
   * @param {Object} filters - Фильтры
   * @returns {Promise<Array>} Список кандидатов
   */
  async getAllCandidates(filters = {}) {
    try {
      this.setLoading(true);
      const candidates = await this.store.getAll(filters);
      this.eventBus.emit('candidates:loaded', candidates);
      return candidates;
    } catch (error) {
      this.handleError(error, 'getAllCandidates');
      return [];
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Получение кандидата по ID
   * @param {string} id - ID кандидата
   * @returns {Promise<CandidateModel|null>} Кандидат
   */
  async getCandidateById(id) {
    try {
      return await this.store.getById(id);
    } catch (error) {
      this.handleError(error, 'getCandidateById');
      return null;
    }
  }

  /**
   * Создание нового кандидата
   * @param {Object} data - Данные кандидата
   * @returns {Promise<CandidateModel|null>} Созданный кандидат
   */
  async createCandidate(data) {
    try {
      this.setLoading(true);
      
      // Создаем модель кандидата
      const candidate = new CandidateModel(data);
      
      // Сохраняем в хранилище
      const savedCandidate = await this.store.create(candidate);
      
      // Синхронизируем с Google Sheets
      await this.syncWithGoogleSheets();
      
      // Уведомляем об успешном создании
      this.eventBus.emit('candidate:created', savedCandidate);
      this.eventBus.emit('notification:success', 'Кандидат успешно добавлен');
      
      return savedCandidate;
    } catch (error) {
      this.handleError(error, 'createCandidate');
      this.eventBus.emit('notification:error', 'Ошибка при создании кандидата');
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Обновление кандидата
   * @param {string} id - ID кандидата
   * @param {Object} data - Новые данные
   * @returns {Promise<CandidateModel|null>} Обновленный кандидат
   */
  async updateCandidate(id, data) {
    try {
      this.setLoading(true);
      
      const candidate = await this.store.getById(id);
      if (!candidate) {
        throw new Error('Кандидат не найден');
      }
      
      // Обновляем модель
      candidate.update(data);
      
      // Сохраняем изменения
      const updatedCandidate = await this.store.update(id, candidate);
      
      // Синхронизируем с Google Sheets
      await this.syncWithGoogleSheets();
      
      this.eventBus.emit('candidate:updated', updatedCandidate);
      this.eventBus.emit('notification:success', 'Кандидат обновлен');
      
      return updatedCandidate;
    } catch (error) {
      this.handleError(error, 'updateCandidate');
      this.eventBus.emit('notification:error', 'Ошибка при обновлении кандидата');
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Удаление кандидата
   * @param {string} id - ID кандидата
   * @returns {Promise<boolean>} Успех операции
   */
  async deleteCandidate(id) {
    try {
      this.setLoading(true);
      
      const success = await this.store.delete(id);
      
      if (success) {
        await this.syncWithGoogleSheets();
        this.eventBus.emit('candidate:deleted', id);
        this.eventBus.emit('notification:success', 'Кандидат удален');
      }
      
      return success;
    } catch (error) {
      this.handleError(error, 'deleteCandidate');
      this.eventBus.emit('notification:error', 'Ошибка при удалении кандидата');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Обработка сообщения из WhatsApp
   * @param {Object} messageData - Данные сообщения
   */
  async handleWhatsAppMessage(messageData) {
    try {
      const { chatId, message, contact } = messageData;
      
      // Ищем существующего кандидата
      let candidate = await this.store.getByChatId(chatId);
      
      if (!candidate) {
        // Создаем нового кандидата
        candidate = await this.createCandidateFromMessage(contact, message, chatId);
      } else {
        // Обновляем время последнего ответа
        candidate.lastReply = new Date().toISOString();
        await this.store.update(candidate.id, candidate);
      }
      
      // Проверяем статус и обновляем при необходимости
      this.updateCandidateStatus(candidate);
      
    } catch (error) {
      this.handleError(error, 'handleWhatsAppMessage');
    }
  }

  /**
   * Создание кандидата из сообщения WhatsApp
   * @param {Object} contact - Контактные данные
   * @param {string} message - Текст сообщения
   * @param {string} chatId - ID чата
   * @returns {Promise<CandidateModel>} Созданный кандидат
   */
  async createCandidateFromMessage(contact, message, chatId) {
    // Определяем проект по содержанию сообщения
    const project = await this.determineProject(message);
    
    const candidateData = {
      name: contact.name,
      phone: contact.phone,
      chatId,
      project: project?.name || 'Не определен',
      status: 'Новый',
      lastReply: new Date().toISOString(),
      comment: `Первое сообщение: ${message.slice(0, 100)}...`
    };
    
    return await this.createCandidate(candidateData);
  }

  /**
   * Обработка изображения из WhatsApp
   * @param {Object} imageData - Данные изображения
   */
  async handleImageMessage(imageData) {
    try {
      const { chatId, imageBlob, contact } = imageData;
      
      // Обрабатываем изображение через OCR
      const ocrResult = await this.ocrService.recognizeText(imageBlob);
      
      if (ocrResult) {
        const extractedData = this.ocrService.extractPassportData(ocrResult);
        
        if (extractedData) {
          // Находим кандидата по chatId
          let candidate = await this.store.getByChatId(chatId);
          
          if (!candidate) {
            // Создаем нового кандидата
            candidate = await this.createCandidateFromMessage(contact, 'Отправил документы', chatId);
          }
          
          // Обновляем данными из документа
          candidate.updateFromOCR(extractedData);
          await this.store.update(candidate.id, candidate);
          
          // Отправляем подтверждение
          await this.whatsAppService.sendMessage(chatId, 'Документы получены и обработаны. Спасибо!');
          
          this.eventBus.emit('candidate:documentsProcessed', candidate);
        } else {
          // Не удалось обработать документ
          const candidate = await this.store.getByChatId(chatId);
          if (candidate) {
            candidate.setOCRError('Не удалось считать документ');
            await this.store.update(candidate.id, candidate);
          }
          
          await this.whatsAppService.sendMessage(chatId, 'Не удалось считать документ. Отправьте более четкое фото.');
        }
      }
      
    } catch (error) {
      this.handleError(error, 'handleImageMessage');
    }
  }

  /**
   * Проверка молчащих кандидатов
   */
  async checkSilentCandidates() {
    try {
      const candidates = await this.store.getAll();
      
      for (const candidate of candidates) {
        if (candidate.isSilent() && candidate.status !== 'Молчит') {
          // Переводим в статус "Молчит"
          candidate.changeStatus('Молчит');
          await this.store.update(candidate.id, candidate);
          
          // Отправляем напоминание
          await this.sendSilentReminder(candidate);
        }
        
        if (candidate.shouldTransfer() && candidate.status !== 'Передан') {
          // Переводим на 1-ю линию
          candidate.changeStatus('Передан');
          await this.store.update(candidate.id, candidate);
          
          this.eventBus.emit('candidate:transferred', candidate);
        }
      }
    } catch (error) {
      this.handleError(error, 'checkSilentCandidates');
    }
  }

  /**
   * Отправка напоминания молчащему кандидату
   * @param {CandidateModel} candidate - Кандидат
   */
  async sendSilentReminder(candidate) {
    try {
      const reminderMessage = `Здравствуйте, ${candidate.name}! Мы ждем от вас ответ по поводу вакансии "${candidate.project}". Пожалуйста, свяжитесь с нами.`;
      
      const success = await this.whatsAppService.sendMessage(candidate.chatId, reminderMessage);
      
      if (success) {
        candidate.smsAttempts++;
        candidate.addComment(`Отправлено напоминание: ${new Date().toLocaleString('ru-RU')}`);
        await this.store.update(candidate.id, candidate);
      }
    } catch (error) {
      this.handleError(error, 'sendSilentReminder');
    }
  }

  /**
   * Определение проекта по сообщению
   * @param {string} message - Текст сообщения
   * @returns {Promise<Object|null>} Проект
   */
  async determineProject(message) {
    // Логика определения проекта по ключевым словам
    const projects = [
      {
        name: 'Строительство',
        keywords: ['строительство', 'стройка', 'строитель', 'монтаж', 'бетон']
      },
      {
        name: 'Нефтегаз',
        keywords: ['нефть', 'газ', 'нефтегаз', 'буровая', 'месторождение']
      },
      {
        name: 'Логистика',
        keywords: ['логистика', 'склад', 'водитель', 'доставка']
      }
    ];
    
    const lowerMessage = message.toLowerCase();
    
    for (const project of projects) {
      const hasKeyword = project.keywords.some(keyword => 
        lowerMessage.includes(keyword)
      );
      
      if (hasKeyword) {
        return project;
      }
    }
    
    return null;
  }

  /**
   * Обновление статуса кандидата
   * @param {CandidateModel} candidate - Кандидат
   */
  async updateCandidateStatus(candidate) {
    let newStatus = candidate.status;
    
    if (candidate.isSilent() && candidate.status === 'Активен') {
      newStatus = 'Молчит';
    } else if (candidate.shouldTransfer() && candidate.status === 'Молчит') {
      newStatus = 'Передан';
    } else if (candidate.lastReply && candidate.status === 'Молчит') {
      newStatus = 'Активен';
    }
    
    if (newStatus !== candidate.status) {
      candidate.changeStatus(newStatus);
      await this.store.update(candidate.id, candidate);
      this.eventBus.emit('candidate:statusChanged', candidate);
    }
  }

  /**
   * Синхронизация с Google Sheets
   */
  async syncWithGoogleSheets() {
    try {
      const candidates = await this.store.getAll();
      await this.googleSheetsService.saveCandidates(candidates);
    } catch (error) {
      this.logger.warn('Не удалось синхронизировать с Google Sheets', error);
    }
  }

  /**
   * Экспорт кандидатов в CSV
   * @returns {Promise<string>} CSV контент
   */
  async exportToCSV() {
    try {
      const candidates = await this.store.getAll();
      const headers = ['ID', 'ФИО', 'Телефон', 'Проект', 'Статус', 'Последний ответ'];
      
      const rows = candidates.map(c => [
        c.id,
        c.name,
        c.phone,
        c.project,
        c.status,
        c.lastReply ? new Date(c.lastReply).toLocaleDateString('ru-RU') : ''
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

  /**
   * Получение статистики кандидатов
   * @returns {Promise<Object>} Статистика
   */
  async getStatistics() {
    try {
      const candidates = await this.store.getAll();
      
      return {
        total: candidates.length,
        active: candidates.filter(c => c.status === 'Активен').length,
        silent: candidates.filter(c => c.status === 'Молчит').length,
        transferred: candidates.filter(c => c.status === 'Передан').length,
        completed: candidates.filter(c => c.status === 'Доведен').length,
        withDocuments: candidates.filter(c => c.documentProcessed).length
      };
    } catch (error) {
      this.handleError(error, 'getStatistics');
      return {};
    }
  }
}

export default CandidateController;