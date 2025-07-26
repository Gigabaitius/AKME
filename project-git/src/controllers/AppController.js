// src/controllers/AppController.js
/**
 * Главный контроллер приложения
 * @description Координирует работу всех контроллеров и управляет приложением
 */
import BaseController from './BaseController.js';
import CandidateController from './CandidateController.js';
import TrainingController from './TrainingController.js';
import AuthController from './AuthController.js';
import MailingController from './MailingController.js';
import WhatsAppService from '../services/WhatsAppService.js';
import NotificationService from '../services/NotificationService.js';
import Router from '../utils/Router.js';

class AppController extends BaseController {
  constructor() {
    super();
    
    // Инициализация контроллеров
    this.candidateController = new CandidateController();
    this.trainingController = new TrainingController();
    this.authController = new AuthController();
    this.mailingController = new MailingController();
    
    // Сервисы
    this.whatsAppService = WhatsAppService;
    this.notificationService = NotificationService;
    this.router = new Router();
    
    // Состояние приложения
    this.isInitialized = false;
    this.currentUser = null;
    this.settings = this.loadSettings();
    
    this.initializeApp();
  }

  /**
   * Инициализация приложения
   */
  async initializeApp() {
    try {
      this.setLoading(true);
      this.logger.info('Инициализация HR Assistant...');
      
      // Инициализация сервисов
      await this.initializeServices();
      
      // Настройка маршрутизации
      this.setupRouting();
      
      // Запуск автоматических процессов
      this.startAutomaticProcesses();
      
      // Настройка обработчиков событий
      this.setupEventHandlers();
      
      this.isInitialized = true;
      this.eventBus.emit('app:initialized');
      this.logger.info('Приложение успешно инициализировано');
      
    } catch (error) {
      this.handleError(error, 'initializeApp');
      this.eventBus.emit('app:initError', error);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Инициализация сервисов
   */
  async initializeServices() {
    // WhatsApp Service
    if (this.settings.whatsappEnabled) {
      await this.whatsAppService.initialize();
    }
    
    // Notification Service
    await this.notificationService.initialize();
    
    // Проверяем подключение к Google Sheets
    if (this.settings.googleSheetsEnabled) {
      await this.authController.checkGoogleSheetsConnection();
    }
  }

  /**
   * Настройка маршрутизации
   */
  setupRouting() {
    // Определяем маршруты
    const routes = {
      '/': () => this.navigateToPage('dashboard'),
      '/dashboard': () => this.navigateToPage('dashboard'),
      '/candidates': () => this.navigateToPage('candidates'),
      '/candidates/:id': (id) => this.navigateToPage('candidates', { candidateId: id }),
      '/shift-workers': () => this.navigateToPage('shift-workers'),
      '/training': () => this.navigateToPage('training'),
      '/knowledge': () => this.navigateToPage('knowledge'),
      '/mailings': () => this.navigateToPage('mailings'),
      '/settings': () => this.navigateToPage('settings')
    };
    
    // Настраиваем роутер
    this.router.configure(routes);
    this.router.start();
  }

  /**
   * Навигация к странице
   * @param {string} page - Название страницы
   * @param {Object} params - Параметры страницы
   */
  navigateToPage(page, params = {}) {
    this.eventBus.emit('navigation:change', { page, params });
  }

  /**
   * Запуск автоматических процессов
   */
  startAutomaticProcesses() {
    // Проверка молчащих кандидатов каждые 30 минут
    setInterval(() => {
      this.candidateController.checkSilentCandidates();
    }, 30 * 60 * 1000);

    // Проверка контрольных точек каждый час
    setInterval(() => {
      this.checkShiftWorkerDeadlines();
    }, 60 * 60 * 1000);

    // Синхронизация с Google Sheets каждые 15 минут
    if (this.settings.googleSheetsEnabled) {
      setInterval(() => {
        this.syncWithGoogleSheets();
      }, 15 * 60 * 1000);
    }

    // Очистка логов каждые 24 часа
    setInterval(() => {
      this.cleanupLogs();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Настройка обработчиков событий
   */
  setupEventHandlers() {
    // Глобальные события
    this.eventBus.on('error', this.handleGlobalError.bind(this));
    this.eventBus.on('notification:show', this.showNotification.bind(this));
    
    // События от контроллеров
    this.eventBus.on('candidate:statusChanged', this.onCandidateStatusChanged.bind(this));
    this.eventBus.on('training:messageAdded', this.onTrainingMessage.bind(this));
    
    // События от WhatsApp
    this.eventBus.on('whatsapp:connected', this.onWhatsAppConnected.bind(this));
    this.eventBus.on('whatsapp:disconnected', this.onWhatsAppDisconnected.bind(this));
    
    // События браузера
    window.addEventListener('beforeunload', this.onAppUnload.bind(this));
    window.addEventListener('online', this.onAppOnline.bind(this));
    window.addEventListener('offline', this.onAppOffline.bind(this));
  }

  /**
   * Обработчик глобальных ошибок
   * @param {Object} errorData - Данные ошибки
   */
  handleGlobalError(errorData) {
    this.logger.error('Глобальная ошибка', errorData);
    this.notificationService.showError(errorData.message);
    
    // Отправляем телеметрию (если настроено)
    if (this.settings.telemetryEnabled) {
      this.sendTelemetry('error', errorData);
    }
  }

  /**
   * Показ уведомления
   * @param {Object} notification - Данные уведомления
   */
  showNotification(notification) {
    this.notificationService.show(notification);
  }

  /**
   * Обработчик изменения статуса кандидата
   * @param {Object} candidate - Кандидат
   */
  onCandidateStatusChanged(candidate) {
    this.logger.info(`Статус кандидата ${candidate.name} изменен на ${candidate.status}`);
    
    // Обновляем статистику
    this.updateDashboardStats();
    
    // Уведомляем пользователя
    this.notificationService.show({
      type: 'info',
      message: `Кандидат ${candidate.name} переведен в статус "${candidate.status}"`
    });
  }

  /**
   * Обработчик сообщения в обучении
   * @param {Object} message - Сообщение
   */
  onTrainingMessage(message) {
    this.logger.info('Новое сообщение в обучении', message);
    
    // Обновляем статистику обучения
    this.updateTrainingStats();
  }

  /**
   * Подключение к WhatsApp
   */
  onWhatsAppConnected() {
    this.settings.whatsappConnected = true;
    this.saveSettings();
    this.notificationService.showSuccess('WhatsApp подключен');
    this.eventBus.emit('app:settingsChanged', this.settings);
  }

  /**
   * Отключение от WhatsApp
   */
  onWhatsAppDisconnected() {
    this.settings.whatsappConnected = false;
    this.saveSettings();
    this.notificationService.showWarning('WhatsApp отключен');
    this.eventBus.emit('app:settingsChanged', this.settings);
  }

  /**
   * Проверка дедлайнов вахтовиков
   */
  async checkShiftWorkerDeadlines() {
    try {
      // Логика проверки контрольных точек
      const now = new Date();
      const deadlineTime = new Date();
      deadlineTime.setHours(15, 0, 0, 0); // 15:00 МСК

      if (now > deadlineTime) {
        // Проверяем просроченные КТ
        this.eventBus.emit('shiftWorkers:checkDeadlines');
      }
    } catch (error) {
      this.logger.error('Ошибка проверки дедлайнов', error);
    }
  }

  /**
   * Синхронизация с Google Sheets
   */
  async syncWithGoogleSheets() {
    try {
      if (!this.settings.googleSheetsConnected) return;
      
      await this.candidateController.syncWithGoogleSheets();
      this.logger.info('Синхронизация с Google Sheets выполнена');
    } catch (error) {
      this.logger.warn('Ошибка синхронизации с Google Sheets', error);
    }
  }

  /**
   * Очистка старых логов
   */
  cleanupLogs() {
    try {
      // Очищаем логи старше 7 дней
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      
      this.logger.cleanup(cutoffDate);
      this.logger.info('Очистка логов выполнена');
    } catch (error) {
      this.logger.error('Ошибка очистки логов', error);
    }
  }

  /**
   * Обновление статистики дашборда
   */
  async updateDashboardStats() {
    try {
      const stats = await this.candidateController.getStatistics();
      this.eventBus.emit('dashboard:statsUpdated', stats);
    } catch (error) {
      this.logger.error('Ошибка обновления статистики', error);
    }
  }

  /**
   * Обновление статистики обучения
   */
  updateTrainingStats() {
    const stats = this.trainingController.getTrainingStatistics();
    this.eventBus.emit('training:statsUpdated', stats);
  }

  /**
   * Получение текущих настроек
   * @returns {Object} Настройки приложения
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Обновление настроек
   * @param {Object} newSettings - Новые настройки
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.eventBus.emit('app:settingsChanged', this.settings);
  }

  /**
   * Загрузка настроек
   * @returns {Object} Настройки
   */
  loadSettings() {
    try {
      const stored = localStorage.getItem('hr-assistant-settings');
      return stored ? JSON.parse(stored) : this.getDefaultSettings();
    } catch (error) {
      this.logger.error('Ошибка загрузки настроек', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Сохранение настроек
   */
  saveSettings() {
    try {
      localStorage.setItem('hr-assistant-settings', JSON.stringify(this.settings));
    } catch (error) {
      this.logger.error('Ошибка сохранения настроек', error);
    }
  }

  /**
   * Настройки по умолчанию
   * @returns {Object} Настройки по умолчанию
   */
  getDefaultSettings() {
    return {
      // Интеграции
      whatsappEnabled: true,
      whatsappConnected: false,
      googleSheetsEnabled: true,
      googleSheetsConnected: false,
      
      // Уведомления
      notificationsEnabled: true,
      soundNotifications: true,
      
      // Автоматические процессы
      autoCheckSilent: true,
      autoTransferToFirst: true,
      autoSyncSheets: true,
      
      // Интерфейс
      theme: 'light',
      language: 'ru',
      
      // Логирование и телеметрия
      loggingEnabled: true,
      telemetryEnabled: false,
      
      // Таймауты (в часах)
      silentTimeout: 8,
      transferTimeout: 24,
      
      // Рабочее время
      workingHours: {
        start: 9,
        end: 18,
        timezone: 'Europe/Moscow'
      }
    };
  }

  /**
   * Отправка телеметрии
   * @param {string} event - Тип события
   * @param {Object} data - Данные события
   */
  sendTelemetry(event, data) {
    if (!this.settings.telemetryEnabled) return;
    
    try {
      // Здесь можно добавить отправку телеметрии на сервер
      this.logger.info('Телеметрия', { event, data });
    } catch (error) {
      this.logger.error('Ошибка отправки телеметрии', error);
    }
  }

  /**
   * Обработчик выгрузки приложения
   */
  onAppUnload() {
    this.logger.info('Выгрузка приложения');
    
    // Сохраняем текущее состояние
    this.saveSettings();
    
    // Уничтожаем контроллеры
    this.candidateController.destroy();
    this.trainingController.destroy();
    this.authController.destroy();
    this.mailingController.destroy();
  }

  /**
   * Приложение онлайн
   */
  onAppOnline() {
    this.logger.info('Приложение онлайн');
    this.notificationService.showSuccess('Соединение восстановлено');
    
    // Возобновляем синхронизацию
    if (this.settings.googleSheetsEnabled) {
      this.syncWithGoogleSheets();
    }
  }

  /**
   * Приложение офлайн
   */
  onAppOffline() {
    this.logger.info('Приложение офлайн');
    this.notificationService.showWarning('Нет соединения с интернетом');
  }

  /**
   * Экспорт всех данных
   * @returns {Promise<Object>} Экспортированные данные
   */
  async exportAllData() {
    try {
      const candidates = await this.candidateController.getAllCandidates();
      const chatHistory = this.trainingController.getChatHistory();
      const settings = this.getSettings();
      
      return {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {
          candidates,
          chatHistory,
          settings
        }
      };
    } catch (error) {
      this.handleError(error, 'exportAllData');
      return null;
    }
  }

  /**
   * Импорт данных
   * @param {Object} importData - Данные для импорта
   * @returns {Promise<boolean>} Успех операции
   */
  async importData(importData) {
    try {
      if (!importData.version || !importData.data) {
        throw new Error('Неверный формат данных для импорта');
      }
      
      const { candidates, chatHistory, settings } = importData.data;
      
      // Импортируем кандидатов
      if (candidates && Array.isArray(candidates)) {
        for (const candidate of candidates) {
          await this.candidateController.createCandidate(candidate);
        }
      }
      
      // Импортируем историю чата
      if (chatHistory && Array.isArray(chatHistory)) {
        // Логика импорта истории чата
      }
      
      // Импортируем настройки
      if (settings) {
        this.updateSettings(settings);
      }
      
      this.notificationService.showSuccess('Данные успешно импортированы');
      return true;
      
    } catch (error) {
      this.handleError(error, 'importData');
      this.notificationService.showError('Ошибка импорта данных');
      return false;
    }
  }
}

// ===========================
// UTILITIES
// ===========================
