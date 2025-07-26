// ===========================
// ИНТЕГРАЦИЯ ВЕБ-ПРИЛОЖЕНИЯ С РАСШИРЕНИЕМ
// ===========================

// src/services/ExtensionAPIService.js
/**
 * Сервис для работы с API через браузерное расширение
 * @description Заменяет все прямые API вызовы на вызовы через расширение
 */
class ExtensionAPIService {
  constructor() {
    this.isExtensionAvailable = false;
    this.api = null;
    this.initPromise = this.initialize();
  }

  /**
   * Инициализация API сервиса
   */
  async initialize() {
    return new Promise((resolve) => {
      // Слушаем готовность API от расширения
      const handleAPIReady = (event) => {
        console.log('🔌 Расширение HR Assistant подключено');
        this.isExtensionAvailable = true;
        this.api = event.detail.api;
        window.removeEventListener('hrAssistantAPIReady', handleAPIReady);
        resolve(true);
      };

      // Также слушаем через postMessage
      const handlePostMessage = (event) => {
        if (event.data.type === 'HR_ASSISTANT_API_READY') {
          this.isExtensionAvailable = true;
          this.api = window.HRAssistantAPI;
          window.removeEventListener('message', handlePostMessage);
          resolve(true);
        }
      };

      window.addEventListener('hrAssistantAPIReady', handleAPIReady);
      window.addEventListener('message', handlePostMessage);

      // Таймаут на случай если расширение не установлено
      setTimeout(() => {
        if (!this.isExtensionAvailable) {
          console.warn('⚠️ Расширение HR Assistant не найдено');
          resolve(false);
        }
      }, 3000);

      // Проверяем, может API уже доступно
      if (window.HRAssistantAPI) {
        this.isExtensionAvailable = true;
        this.api = window.HRAssistantAPI;
        resolve(true);
      }
    });
  }

  /**
   * Проверка доступности расширения
   */
  async ensureExtension() {
    await this.initPromise;
    
    if (!this.isExtensionAvailable) {
      throw new Error('Расширение HR Assistant не установлено или не активно');
    }
  }

  // ===========================
  // GOOGLE SHEETS API
  // ===========================

  /**
   * Аутентификация Google Sheets
   */
  async authenticateGoogleSheets() {
    await this.ensureExtension();
    return await this.api.googleSheets.authenticate();
  }

  /**
   * Создание Google таблицы
   */
  async createGoogleSheet(title, sheets) {
    await this.ensureExtension();
    return await this.api.googleSheets.createSheet({ title, sheets });
  }

  /**
   * Чтение из Google таблицы
   */
  async readGoogleSheet(spreadsheetId, range) {
    await this.ensureExtension();
    return await this.api.googleSheets.readSheet({ spreadsheetId, range });
  }

  /**
   * Запись в Google таблицу
   */
  async writeGoogleSheet(spreadsheetId, range, values) {
    await this.ensureExtension();
    return await this.api.googleSheets.writeSheet({ spreadsheetId, range, values });
  }

  /**
   * Сохранение кандидатов в Google Sheets
   */
  async saveCandidates(candidates) {
    try {
      // Подготавливаем данные для записи
      const headers = ['ID', 'ФИО', 'Телефон', 'Проект', 'Статус', 'ИНН', 'СНИЛС', 'Последний ответ', 'Дата создания'];
      const values = [
        headers,
        ...candidates.map(c => [
          c.id,
          c.name,
          c.phone,
          c.project,
          c.status,
          c.inn || '',
          c.snils || '',
          c.lastReply || '',
          c.createdAt || ''
        ])
      ];

      // Получаем ID таблицы из настроек или создаем новую
      let spreadsheetId = localStorage.getItem('hr-spreadsheet-id');
      
      if (!spreadsheetId) {
        const sheet = await this.createGoogleSheet('HR Assistant - Кандидаты');
        spreadsheetId = sheet.spreadsheetId;
        localStorage.setItem('hr-spreadsheet-id', spreadsheetId);
      }

      // Записываем данные
      await this.writeGoogleSheet(spreadsheetId, 'Кандидаты!A1:I' + (values.length), values);
      
      return { success: true, spreadsheetId };
    } catch (error) {
      console.error('Ошибка сохранения в Google Sheets:', error);
      throw error;
    }
  }

  // ===========================
  // WHATSAPP API
  // ===========================

  /**
   * Отправка сообщения в WhatsApp
   */
  async sendWhatsAppMessage(chatId, message) {
    await this.ensureExtension();
    return await this.api.whatsapp.sendMessage({ chatId, message });
  }

  /**
   * Получение чатов WhatsApp
   */
  async getWhatsAppChats() {
    await this.ensureExtension();
    return await this.api.whatsapp.getChats();
  }

  // ===========================
  // OCR API
  // ===========================

  /**
   * Обработка изображения через OCR
   */
  async processImageOCR(imageData, language = 'rus') {
    await this.ensureExtension();
    return await this.api.ocr.processImage({ imageData, language });
  }

  // ===========================
  // УВЕДОМЛЕНИЯ API
  // ===========================

  /**
   * Показ уведомления браузера
   */
  async showNotification(title, message, icon) {
    await this.ensureExtension();
    return await this.api.notifications.show({ title, message, icon });
  }

  /**
   * Отправка SMS
   */
  async sendSMS(to, message) {
    await this.ensureExtension();
    return await this.api.notifications.sendSMS({ to, message });
  }

  /**
   * Отправка в Telegram
   */
  async sendTelegram(message, chatId) {
    await this.ensureExtension();
    return await this.api.notifications.sendTelegram({ message, chatId });
  }

  // ===========================
  // НАСТРОЙКИ API
  // ===========================

  /**
   * Установка API ключа
   */
  async setApiKey(service, key) {
    await this.ensureExtension();
    return await this.api.settings.setApiKey(service, key);
  }

  /**
   * Получение списка настроенных API
   */
  async getApiKeys() {
    await this.ensureExtension();
    return await this.api.settings.getApiKeys();
  }

  /**
   * Проверка подключений
   */
  async checkConnections() {
    await this.ensureExtension();
    return await this.api.settings.checkConnections();
  }
}

// Экспорт