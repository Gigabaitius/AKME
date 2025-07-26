// src/utils/Logger.js
/**
 * 📝 Система логирования для HR Assistant
 * @description Логгер с уровнями, фильтрацией и сохранением
 */
class Logger {
  constructor(context = 'App') {
    this.context = context;
    this.logs = [];
    this.maxLogs = 1000;
    this.logLevel = this.getLogLevel();
    this.enabledCategories = this.getEnabledCategories();
    
    // Уровни логирования
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      TRACE: 4
    };

    // Цвета для консоли
    this.colors = {
      ERROR: '#ef4444',
      WARN: '#f59e0b',
      INFO: '#3b82f6',
      DEBUG: '#8b5cf6',
      TRACE: '#6b7280'
    };
  }

  /**
   * Получение уровня логирования из настроек
   */
  getLogLevel() {
    const level = import.meta.env.VITE_LOG_LEVEL || 'INFO';
    return this.levels[level.toUpperCase()] ?? this.levels.INFO;
  }

  /**
   * Получение включенных категорий
   */
  getEnabledCategories() {
    const categories = import.meta.env.VITE_LOG_CATEGORIES;
    return categories ? categories.split(',') : ['*'];
  }

  /**
   * Проверка, включена ли категория
   */
  isCategoryEnabled() {
    return this.enabledCategories.includes('*') || 
           this.enabledCategories.includes(this.context);
  }

  /**
   * Базовое логирование
   * @param {string} level - Уровень лога
   * @param {string} message - Сообщение
   * @param {any} data - Дополнительные данные
   */
  log(level, message, data = null) {
    const levelNum = this.levels[level];
    
    // Проверяем уровень и категорию
    if (levelNum > this.logLevel || !this.isCategoryEnabled()) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      level,
      context: this.context,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Добавляем в массив логов
    this.logs.push(logEntry);
    
    // Ограничиваем размер массива
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Выводим в консоль
    if (import.meta.env.VITE_ENABLE_CONSOLE_LOGS !== 'false') {
      this.outputToConsole(logEntry);
    }

    // Сохраняем в localStorage
    this.saveToStorage(logEntry);

    // Отправляем в внешние системы
    this.sendToExternalSystems(logEntry);
  }

  /**
   * Вывод в консоль
   * @param {Object} logEntry - Запись лога
   */
  outputToConsole(logEntry) {
    const { timestamp, level, context, message, data } = logEntry;
    const time = new Date(timestamp).toLocaleTimeString('ru-RU');
    const color = this.colors[level];
    
    const consoleMessage = `%c[${time}] [${level}] [${context}] ${message}`;
    const consoleStyle = `color: ${color}; font-weight: bold;`;
    
    switch (level) {
      case 'ERROR':
        console.error(consoleMessage, consoleStyle, data);
        break;
      case 'WARN':
        console.warn(consoleMessage, consoleStyle, data);
        break;
      case 'DEBUG':
        console.debug(consoleMessage, consoleStyle, data);
        break;
      case 'TRACE':
        console.trace(consoleMessage, consoleStyle, data);
        break;
      default:
        console.log(consoleMessage, consoleStyle, data);
    }
  }

  /**
   * Сохранение в localStorage
   * @param {Object} logEntry - Запись лога
   */
  saveToStorage(logEntry) {
    try {
      const storageKey = 'hr-assistant-logs';
      const stored = localStorage.getItem(storageKey) || '[]';
      const logs = JSON.parse(stored);
      
      logs.push(logEntry);
      
      // Ограничиваем количество логов в storage
      if (logs.length > 500) {
        logs.splice(0, logs.length - 500);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(logs));
    } catch (error) {
      console.error('Ошибка сохранения лога в localStorage:', error);
    }
  }

  /**
   * Отправка в внешние системы
   * @param {Object} logEntry - Запись лога
   */
  sendToExternalSystems(logEntry) {
    // Отправка в Sentry (если настроен)
    if (window.Sentry && logEntry.level === 'ERROR') {
      window.Sentry.captureException(new Error(logEntry.message), {
        extra: logEntry.data,
        tags: {
          context: logEntry.context
        }
      });
    }

    // Отправка в Google Analytics (если настроен)
    if (window.gtag && logEntry.level === 'ERROR') {
      window.gtag('event', 'exception', {
        description: logEntry.message,
        fatal: false,
        custom_map: {
          context: logEntry.context
        }
      });
    }

    // Отправка критических ошибок на сервер
    if (logEntry.level === 'ERROR' && import.meta.env.VITE_ERROR_REPORTING_URL) {
      fetch(import.meta.env.VITE_ERROR_REPORTING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
      }).catch(() => {
        // Игнорируем ошибки отправки логов
      });
    }
  }

  /**
   * Логирование ошибок
   * @param {string} message - Сообщение
   * @param {any} data - Дополнительные данные
   */
  error(message, data = null) {
    this.log('ERROR', message, data);
  }

  /**
   * Логирование предупреждений
   * @param {string} message - Сообщение
   * @param {any} data - Дополнительные данные
   */
  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  /**
   * Логирование информации
   * @param {string} message - Сообщение
   * @param {any} data - Дополнительные данные
   */
  info(message, data = null) {
    this.log('INFO', message, data);
  }

  /**
   * Отладочное логирование
   * @param {string} message - Сообщение
   * @param {any} data - Дополнительные данные
   */
  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }

  /**
   * Трассировка
   * @param {string} message - Сообщение
   * @param {any} data - Дополнительные данные
   */
  trace(message, data = null) {
    this.log('TRACE', message, data);
  }

  /**
   * Группированное логирование
   * @param {string} groupName - Название группы
   * @param {Function} callback - Функция с логами
   */
  group(groupName, callback) {
    if (import.meta.env.VITE_ENABLE_CONSOLE_LOGS !== 'false') {
      console.group(`📁 ${groupName}`);
    }
    
    try {
      callback();
    } finally {
      if (import.meta.env.VITE_ENABLE_CONSOLE_LOGS !== 'false') {
        console.groupEnd();
      }
    }
  }

  /**
   * Измерение времени выполнения
   * @param {string} label - Метка времени
   * @param {Function} callback - Функция для измерения
   */
  async time(label, callback) {
    const startTime = performance.now();
    const timerId = `${this.context}-${label}`;
    
    if (import.meta.env.VITE_ENABLE_CONSOLE_LOGS !== 'false') {
      console.time(timerId);
    }
    
    try {
      const result = await callback();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.debug(`⏱️ ${label} выполнено за ${duration.toFixed(2)}ms`);
      
      if (import.meta.env.VITE_ENABLE_CONSOLE_LOGS !== 'false') {
        console.timeEnd(timerId);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.error(`⏱️ ${label} ошибка после ${duration.toFixed(2)}ms`, error);
      
      if (import.meta.env.VITE_ENABLE_CONSOLE_LOGS !== 'false') {
        console.timeEnd(timerId);
      }
      
      throw error;
    }
  }

  /**
   * Получение всех логов
   * @param {Object} filters - Фильтры
   * @returns {Array} Массив логов
   */
  getLogs(filters = {}) {
    let logs = [...this.logs];

    if (filters.level) {
      logs = logs.filter(log => log.level === filters.level);
    }

    if (filters.context) {
      logs = logs.filter(log => log.context === filters.context);
    }

    if (filters.since) {
      const since = new Date(filters.since);
      logs = logs.filter(log => new Date(log.timestamp) >= since);
    }

    if (filters.until) {
      const until = new Date(filters.until);
      logs = logs.filter(log => new Date(log.timestamp) <= until);
    }

    return logs;
  }

  /**
   * Очистка логов
   * @param {Date} cutoffDate - Дата отсечки
   */
  cleanup(cutoffDate) {
    if (cutoffDate) {
      this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoffDate);
    } else {
      this.logs = [];
    }

    // Очищаем localStorage
    try {
      const storageKey = 'hr-assistant-logs';
      if (cutoffDate) {
        const stored = localStorage.getItem(storageKey) || '[]';
        const logs = JSON.parse(stored);
        const filtered = logs.filter(log => new Date(log.timestamp) > cutoffDate);
        localStorage.setItem(storageKey, JSON.stringify(filtered));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('Ошибка очистки логов в localStorage:', error);
    }
  }

  /**
   * Экспорт логов
   * @param {string} format - Формат экспорта (json, csv, txt)
   * @param {Object} filters - Фильтры
   * @returns {string} Экспортированные логи
   */
  export(format = 'json', filters = {}) {
    const logs = this.getLogs(filters);

    switch (format.toLowerCase()) {
      case 'csv':
        const headers = ['Timestamp', 'Level', 'Context', 'Message', 'Data'];
        const rows = logs.map(log => [
          log.timestamp,
          log.level,
          log.context,
          log.message,
          JSON.stringify(log.data)
        ]);
        return [headers, ...rows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

      case 'txt':
        return logs.map(log => {
          const data = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
          return `${log.timestamp} [${log.level}] [${log.context}] ${log.message}${data}`;
        }).join('\n');

      case 'json':
      default:
        return JSON.stringify(logs, null, 2);
    }
  }

  /**
   * Получение статистики логов
   * @returns {Object} Статистика
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byContext: {},
      recent: {
        lastHour: 0,
        lastDay: 0
      }
    };

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    this.logs.forEach(log => {
      // По уровням
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // По контексту
      stats.byContext[log.context] = (stats.byContext[log.context] || 0) + 1;
      
      // Недавние
      const logTime = new Date(log.timestamp);
      if (logTime >= hourAgo) stats.recent.lastHour++;
      if (logTime >= dayAgo) stats.recent.lastDay++;
    });

    return stats;
  }
}

export default Logger;