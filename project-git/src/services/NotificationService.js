// src/services/NotificationService.js
/**
 * 🔔 Сервис уведомлений
 * @description Управление всеми типами уведомлений в приложении
 */
import EventBus from '../utils/EventBus.js';
import Logger from '../utils/Logger.js';

class NotificationService {
  constructor() {
    this.logger = new Logger('NotificationService');
    this.notificationQueue = [];
    this.permission = 'default';
    this.soundEnabled = true;
    this.notificationSound = null;
    
    this.initialize();
  }

  /**
   * Инициализация сервиса
   */
  async initialize() {
    try {
      // Проверяем поддержку уведомлений
      if ('Notification' in window) {
        this.permission = Notification.permission;
        
        // Запрашиваем разрешение если нужно
        if (this.permission === 'default') {
          await this.requestPermission();
        }
      }
      
      // Загружаем звук уведомлений
      this.loadNotificationSound();
      
      // Подписываемся на события
      this.setupEventListeners();
      
      this.logger.info('Сервис уведомлений инициализирован');
    } catch (error) {
      this.logger.error('Ошибка инициализации', error);
    }
  }

  /**
   * Запрос разрешения на уведомления
   */
  async requestPermission() {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        this.permission = permission;
        this.logger.info(`Разрешение на уведомления: ${permission}`);
        return permission;
      }
      return 'denied';
    } catch (error) {
      this.logger.error('Ошибка запроса разрешения', error);
      return 'denied';
    }
  }

  /**
   * Настройка слушателей событий
   */
  setupEventListeners() {
    // Слушаем события уведомлений
    EventBus.on('notification:show', this.show.bind(this));
    EventBus.on('notification:success', (message) => this.showSuccess(message));
    EventBus.on('notification:error', (message) => this.showError(message));
    EventBus.on('notification:warning', (message) => this.showWarning(message));
    EventBus.on('notification:info', (message) => this.showInfo(message));
    
    // Настройки
    EventBus.on('settings:soundEnabled', (enabled) => {
      this.soundEnabled = enabled;
    });
  }

  /**
   * Загрузка звука уведомлений
   */
  loadNotificationSound() {
    try {
      this.notificationSound = new Audio('/sounds/notification.mp3');
      this.notificationSound.volume = 0.5;
    } catch (error) {
      this.logger.warn('Не удалось загрузить звук уведомлений', error);
    }
  }

  /**
   * Воспроизведение звука
   */
  playSound() {
    if (this.soundEnabled && this.notificationSound) {
      try {
        this.notificationSound.play().catch(error => {
          this.logger.warn('Не удалось воспроизвести звук', error);
        });
      } catch (error) {
        this.logger.warn('Ошибка воспроизведения звука', error);
      }
    }
  }

  /**
   * Показать уведомление
   * @param {Object} notification - Данные уведомления
   */
  show(notification) {
    const {
      type = 'info',
      title = 'HR Assistant',
      message,
      duration = 5000,
      actions = [],
      data = {},
      desktop = true,
      sound = true
    } = notification;

    // Добавляем в очередь
    const notificationData = {
      id: Date.now().toString(),
      type,
      title,
      message,
      duration,
      actions,
      data,
      timestamp: new Date()
    };
    
    this.notificationQueue.push(notificationData);
    
    // Эмитим событие для UI
    EventBus.emit('notification:added', notificationData);
    
    // Показываем desktop уведомление
    if (desktop && this.permission === 'granted') {
      this.showDesktopNotification(notificationData);
    }
    
    // Воспроизводим звук
    if (sound) {
      this.playSound();
    }
    
    // Автоудаление через указанное время
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notificationData.id);
      }, duration);
    }
    
    return notificationData.id;
  }

  /**
   * Показать desktop уведомление
   * @param {Object} notificationData - Данные уведомления
   */
  showDesktopNotification(notificationData) {
    try {
      const { title, message, type, data } = notificationData;
      
      const notification = new Notification(title, {
        body: message,
        icon: this.getIconForType(type),
        badge: '/icons/badge.png',
        tag: notificationData.id,
        data,
        requireInteraction: false
      });
      
      // Обработка клика
      notification.onclick = () => {
        window.focus();
        this.handleNotificationClick(notificationData);
        notification.close();
      };
      
      // Автозакрытие
      if (notificationData.duration > 0) {
        setTimeout(() => notification.close(), notificationData.duration);
      }
      
    } catch (error) {
      this.logger.error('Ошибка показа desktop уведомления', error);
    }
  }

  /**
   * Получение иконки по типу
   * @param {string} type - Тип уведомления
   * @returns {string} Путь к иконке
   */
  getIconForType(type) {
    const icons = {
      success: '/icons/success.png',
      error: '/icons/error.png',
      warning: '/icons/warning.png',
      info: '/icons/info.png'
    };
    return icons[type] || icons.info;
  }

  /**
   * Обработка клика по уведомлению
   * @param {Object} notificationData - Данные уведомления
   */
  handleNotificationClick(notificationData) {
    EventBus.emit('notification:clicked', notificationData);
    
    // Выполняем действие если есть
    if (notificationData.data.action) {
      EventBus.emit(notificationData.data.action, notificationData.data);
    }
  }

  /**
   * Удаление уведомления
   * @param {string} id - ID уведомления
   */
  removeNotification(id) {
    this.notificationQueue = this.notificationQueue.filter(n => n.id !== id);
    EventBus.emit('notification:removed', id);
  }

  /**
   * Показать уведомление об успехе
   * @param {string} message - Сообщение
   * @param {Object} options - Дополнительные опции
   */
  showSuccess(message, options = {}) {
    return this.show({
      type: 'success',
      message,
      duration: 3000,
      ...options
    });
  }

  /**
   * Показать уведомление об ошибке
   * @param {string} message - Сообщение
   * @param {Object} options - Дополнительные опции
   */
  showError(message, options = {}) {
    return this.show({
      type: 'error',
      message,
      duration: 5000,
      ...options
    });
  }

  /**
   * Показать предупреждение
   * @param {string} message - Сообщение
   * @param {Object} options - Дополнительные опции
   */
  showWarning(message, options = {}) {
    return this.show({
      type: 'warning',
      message,
      duration: 4000,
      ...options
    });
  }

  /**
   * Показать информационное уведомление
   * @param {string} message - Сообщение
   * @param {Object} options - Дополнительные опции
   */
  showInfo(message, options = {}) {
    return this.show({
      type: 'info',
      message,
      duration: 3000,
      ...options
    });
  }

  /**
   * Показать уведомление о новом кандидате
   * @param {Object} candidate - Данные кандидата
   */
  showNewCandidateNotification(candidate) {
    this.show({
      type: 'info',
      title: 'Новый кандидат',
      message: `${candidate.name} - ${candidate.project}`,
      data: {
        action: 'navigation:candidates',
        candidateId: candidate.id
      }
    });
  }

  /**
   * Показать уведомление о молчащем кандидате
   * @param {Object} candidate - Данные кандидата
   */
  showSilentCandidateNotification(candidate) {
    this.show({
      type: 'warning',
      title: 'Кандидат молчит',
      message: `${candidate.name} не отвечает более 8 часов`,
      data: {
        action: 'navigation:silent',
        candidateId: candidate.id
      }
    });
  }

  /**
   * Показать уведомление о пропущенной КТ
   * @param {Object} worker - Данные вахтовика
   */
  showMissedCheckpointNotification(worker) {
    this.show({
      type: 'error',
      title: 'Пропущена контрольная точка',
      message: `${worker.name} не ответил на КТ`,
      duration: 0, // Не закрывать автоматически
      data: {
        action: 'navigation:shift-workers',
        workerId: worker.id
      }
    });
  }

  /**
   * Показать уведомление о новом сообщении
   * @param {Object} message - Данные сообщения
   */
  showNewMessageNotification(message) {
    this.show({
      type: 'info',
      title: 'Новое сообщение WhatsApp',
      message: `${message.senderName}: ${message.preview}`,
      data: {
        action: 'whatsapp:openChat',
        chatId: message.chatId
      }
    });
  }

  /**
   * Получение всех уведомлений
   * @returns {Array} Массив уведомлений
   */
  getAllNotifications() {
    return [...this.notificationQueue];
  }

  /**
   * Очистка всех уведомлений
   */
  clearAll() {
    this.notificationQueue = [];
    EventBus.emit('notification:clearedAll');
  }

  /**
   * Отметить уведомление как прочитанное
   * @param {string} id - ID уведомления
   */
  markAsRead(id) {
    const notification = this.notificationQueue.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      EventBus.emit('notification:read', id);
    }
  }

  /**
   * Отметить все как прочитанные
   */
  markAllAsRead() {
    this.notificationQueue.forEach(n => {
      n.read = true;
    });
    EventBus.emit('notifications:allRead');
  }

  /**
   * Получение количества непрочитанных
   * @returns {number} Количество непрочитанных
   */
  getUnreadCount() {
    return this.notificationQueue.filter(n => !n.read).length;
  }

  /**
   * Проверка доступности уведомлений
   * @returns {boolean} Доступны ли уведомления
   */
  isAvailable() {
    return 'Notification' in window;
  }

  /**
   * Проверка разрешения
   * @returns {boolean} Есть ли разрешение
   */
  hasPermission() {
    return this.permission === 'granted';
  }
}

// Экспортируем синглтон
export default new NotificationService();
