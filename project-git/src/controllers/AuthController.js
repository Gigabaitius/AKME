// src/controllers/AuthController.js
/**
 * 🔐 Контроллер авторизации
 * @description Управление авторизацией и интеграциями
 */
import BaseController from './BaseController.js';
import ExtensionAPIService from '../services/ExtensionAPIService.js';

class AuthController extends BaseController {
  constructor() {
    super();
    this.extensionAPI = ExtensionAPIService;
    this.googleAuth = null;
    this.initializeEventListeners();
  }

  /**
   * Инициализация слушателей событий
   */
  initializeEventListeners() {
    this.eventBus.on('auth:logout', this.logout.bind(this));
    this.eventBus.on('auth:checkStatus', this.checkAuthStatus.bind(this));
  }

  /**
   * Проверка статуса авторизации
   * @returns {Promise<Object>} Статус авторизации
   */
  async checkAuthStatus() {
    try {
      const status = {
        isAuthenticated: true, // В MVP версии всегда авторизованы
        googleSheetsConnected: false,
        whatsappConnected: false,
        telegramConnected: false,
        extensionConnected: false
      };

      // Проверяем подключение расширения
      status.extensionConnected = await this.extensionAPI.isConnected();

      if (status.extensionConnected) {
        // Проверяем статус интеграций через расширение
        const integrations = await this.extensionAPI.getIntegrationStatus();
        status.googleSheetsConnected = integrations.googleSheets || false;
        status.whatsappConnected = integrations.whatsapp || false;
        status.telegramConnected = integrations.telegram || false;
      }

      this.eventBus.emit('auth:statusUpdated', status);
      return status;
    } catch (error) {
      this.handleError(error, 'checkAuthStatus');
      return {
        isAuthenticated: true,
        googleSheetsConnected: false,
        whatsappConnected: false,
        telegramConnected: false,
        extensionConnected: false
      };
    }
  }

  /**
   * Подключение к Google Sheets
   * @returns {Promise<boolean>} Успех подключения
   */
  async connectGoogleSheets() {
    try {
      this.setLoading(true);
      this.logger.info('Подключение к Google Sheets...');

      // Проверяем наличие расширения
      if (!await this.extensionAPI.isConnected()) {
        throw new Error('Расширение HR Assistant не подключено');
      }

      // Запускаем OAuth авторизацию через расширение
      const result = await this.extensionAPI.authenticateGoogleSheets();

      if (result.success) {
        this.googleAuth = result.auth;
        this.eventBus.emit('auth:googleSheetsConnected');
        this.eventBus.emit('notification:success', 'Google Sheets успешно подключен');
        
        // Сохраняем статус
        const settings = JSON.parse(localStorage.getItem('hr-assistant-settings') || '{}');
        settings.googleSheetsConnected = true;
        localStorage.setItem('hr-assistant-settings', JSON.stringify(settings));
        
        return true;
      } else {
        throw new Error(result.error || 'Ошибка авторизации');
      }
    } catch (error) {
      this.handleError(error, 'connectGoogleSheets');
      this.eventBus.emit('notification:error', 'Не удалось подключить Google Sheets');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Отключение от Google Sheets
   * @returns {Promise<boolean>} Успех отключения
   */
  async disconnectGoogleSheets() {
    try {
      this.setLoading(true);
      
      // Отзываем токен через расширение
      await this.extensionAPI.revokeGoogleAuth();
      
      this.googleAuth = null;
      this.eventBus.emit('auth:googleSheetsDisconnected');
      this.eventBus.emit('notification:info', 'Google Sheets отключен');
      
      // Обновляем настройки
      const settings = JSON.parse(localStorage.getItem('hr-assistant-settings') || '{}');
      settings.googleSheetsConnected = false;
      localStorage.setItem('hr-assistant-settings', JSON.stringify(settings));
      
      return true;
    } catch (error) {
      this.handleError(error, 'disconnectGoogleSheets');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Проверка подключения к Google Sheets
   * @returns {Promise<boolean>} Статус подключения
   */
  async checkGoogleSheetsConnection() {
    try {
      if (!this.googleAuth) {
        const settings = JSON.parse(localStorage.getItem('hr-assistant-settings') || '{}');
        if (!settings.googleSheetsConnected) {
          return false;
        }
      }

      // Проверяем через расширение
      const status = await this.extensionAPI.checkGoogleSheetsAuth();
      
      if (!status.connected) {
        // Токен истек или отозван
        const settings = JSON.parse(localStorage.getItem('hr-assistant-settings') || '{}');
        settings.googleSheetsConnected = false;
        localStorage.setItem('hr-assistant-settings', JSON.stringify(settings));
        
        this.eventBus.emit('auth:googleSheetsDisconnected');
      }

      return status.connected;
    } catch (error) {
      this.logger.warn('Ошибка проверки Google Sheets', error);
      return false;
    }
  }

  /**
   * Подключение WhatsApp
   * @returns {Promise<boolean>} Успех подключения
   */
  async connectWhatsApp() {
    try {
      this.setLoading(true);
      
      // WhatsApp подключается автоматически через расширение
      const status = await this.extensionAPI.getWhatsAppStatus();
      
      if (status.connected) {
        this.eventBus.emit('auth:whatsappConnected');
        this.eventBus.emit('notification:success', 'WhatsApp подключен');
        return true;
      } else {
        this.eventBus.emit('notification:warning', 
          'Откройте WhatsApp Web в новой вкладке для автоматического подключения'
        );
        return false;
      }
    } catch (error) {
      this.handleError(error, 'connectWhatsApp');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Подключение Telegram бота
   * @param {string} botToken - Токен бота
   * @returns {Promise<boolean>} Успех подключения
   */
  async connectTelegram(botToken) {
    try {
      this.setLoading(true);
      
      if (!botToken) {
        throw new Error('Токен бота не указан');
      }

      // Проверяем токен через расширение
      const result = await this.extensionAPI.connectTelegramBot(botToken);
      
      if (result.success) {
        this.eventBus.emit('auth:telegramConnected');
        this.eventBus.emit('notification:success', 'Telegram бот подключен');
        
        // Сохраняем в настройках
        const settings = JSON.parse(localStorage.getItem('hr-assistant-settings') || '{}');
        settings.telegramConnected = true;
        localStorage.setItem('hr-assistant-settings', JSON.stringify(settings));
        
        return true;
      } else {
        throw new Error(result.error || 'Неверный токен бота');
      }
    } catch (error) {
      this.handleError(error, 'connectTelegram');
      this.eventBus.emit('notification:error', 'Не удалось подключить Telegram бота');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Подключение Twilio SMS
   * @param {Object} credentials - Данные для подключения
   * @returns {Promise<boolean>} Успех подключения
   */
  async connectTwilio(credentials) {
    try {
      this.setLoading(true);
      
      const { accountSid, authToken, phoneNumber } = credentials;
      
      if (!accountSid || !authToken || !phoneNumber) {
        throw new Error('Заполните все поля');
      }

      // Проверяем через расширение
      const result = await this.extensionAPI.connectTwilio({
        accountSid,
        authToken,
        phoneNumber
      });
      
      if (result.success) {
        this.eventBus.emit('auth:twilioConnected');
        this.eventBus.emit('notification:success', 'Twilio SMS подключен');
        
        // Сохраняем статус (но не credentials!)
        const settings = JSON.parse(localStorage.getItem('hr-assistant-settings') || '{}');
        settings.twilioConnected = true;
        localStorage.setItem('hr-assistant-settings', JSON.stringify(settings));
        
        return true;
      } else {
        throw new Error(result.error || 'Неверные данные Twilio');
      }
    } catch (error) {
      this.handleError(error, 'connectTwilio');
      this.eventBus.emit('notification:error', 'Не удалось подключить Twilio');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Выход из системы
   */
  async logout() {
    try {
      this.setLoading(true);
      this.logger.info('Выход из системы...');
      
      // Отключаем все интеграции
      await this.disconnectGoogleSheets();
      
      // Очищаем локальные данные
      localStorage.removeItem('hr-assistant-settings');
      localStorage.removeItem('hr-assistant-data');
      
      // Уведомляем о выходе
      this.eventBus.emit('auth:loggedOut');
      
      // Перезагружаем страницу
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      this.handleError(error, 'logout');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Получение информации о текущем пользователе
   * @returns {Object} Данные пользователя
   */
  getCurrentUser() {
    // В MVP версии возвращаем заглушку
    return {
      id: '1',
      name: 'HR Manager',
      email: 'hr@company.com',
      role: 'admin',
      avatar: null
    };
  }

  /**
   * Обновление профиля пользователя
   * @param {Object} updates - Обновления профиля
   * @returns {Promise<Object>} Обновленный профиль
   */
  async updateProfile(updates) {
    try {
      this.setLoading(true);
      
      // В MVP версии просто сохраняем в localStorage
      const currentUser = this.getCurrentUser();
      const updatedUser = { ...currentUser, ...updates };
      
      localStorage.setItem('hr-assistant-user', JSON.stringify(updatedUser));
      
      this.eventBus.emit('auth:profileUpdated', updatedUser);
      this.eventBus.emit('notification:success', 'Профиль обновлен');
      
      return updatedUser;
    } catch (error) {
      this.handleError(error, 'updateProfile');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }
}

export default AuthController;
