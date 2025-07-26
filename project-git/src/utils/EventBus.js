// src/utils/EventBus.js
/**
 * 📡 Шина событий для связи между MVC компонентами
 * @description Реализует паттерн Observer для декаплинга компонентов
 */
class EventBus {
  constructor() {
    this.events = new Map();
    this.maxListeners = 100;
    this.debug = import.meta.env.VITE_NODE_ENV === 'development';
  }

  /**
   * Подписка на событие
   * @param {string} eventName - Название события
   * @param {Function} callback - Функция обратного вызова
   * @param {Object} options - Опции подписки
   */
  on(eventName, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('Callback должен быть функцией');
    }

    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const callbacks = this.events.get(eventName);
    
    // Проверяем лимит слушателей
    if (callbacks.length >= this.maxListeners) {
      console.warn(`Превышен лимит слушателей для события ${eventName}: ${this.maxListeners}`);
    }

    const listener = {
      callback,
      once: options.once || false,
      id: Date.now() + Math.random()
    };

    callbacks.push(listener);

    if (this.debug) {
      console.debug(`📡 EventBus: добавлен слушатель для "${eventName}"`);
    }

    // Возвращаем функцию для отписки
    return () => this.off(eventName, callback);
  }

  /**
   * Одноразовая подписка на событие
   * @param {string} eventName - Название события
   * @param {Function} callback - Функция обратного вызова
   */
  once(eventName, callback) {
    return this.on(eventName, callback, { once: true });
  }

  /**
   * Отписка от события
   * @param {string} eventName - Название события
   * @param {Function} callback - Функция для удаления
   */
  off(eventName, callback) {
    if (!this.events.has(eventName)) return;

    const callbacks = this.events.get(eventName);
    const index = callbacks.findIndex(listener => listener.callback === callback);

    if (index > -1) {
      callbacks.splice(index, 1);
      
      if (this.debug) {
        console.debug(`📡 EventBus: удален слушатель для "${eventName}"`);
      }

      // Удаляем массив если он пустой
      if (callbacks.length === 0) {
        this.events.delete(eventName);
      }
    }
  }

  /**
   * Генерация события
   * @param {string} eventName - Название события
   * @param {any} data - Данные события
   * @param {Object} options - Опции генерации
   */
  emit(eventName, data, options = {}) {
    if (!this.events.has(eventName)) {
      if (this.debug) {
        console.debug(`📡 EventBus: нет слушателей для "${eventName}"`);
      }
      return;
    }

    const callbacks = [...this.events.get(eventName)]; // Копия для безопасности
    const results = [];

    if (this.debug) {
      console.debug(`📡 EventBus: генерация "${eventName}" для ${callbacks.length} слушателей`, data);
    }

    callbacks.forEach(listener => {
      try {
        const result = listener.callback(data);
        results.push(result);

        // Удаляем одноразовые слушатели
        if (listener.once) {
          this.off(eventName, listener.callback);
        }
      } catch (error) {
        console.error(`Ошибка в обработчике события ${eventName}:`, error);
        
        // В режиме разработки пробрасываем ошибку
        if (import.meta.env.VITE_NODE_ENV === 'development') {
          throw error;
        }
      }
    });

    return results;
  }

  /**
   * Асинхронная генерация события
   * @param {string} eventName - Название события
   * @param {any} data - Данные события
   */
  async emitAsync(eventName, data) {
    if (!this.events.has(eventName)) return [];

    const callbacks = [...this.events.get(eventName)];
    const results = [];

    for (const listener of callbacks) {
      try {
        const result = await listener.callback(data);
        results.push(result);

        if (listener.once) {
          this.off(eventName, listener.callback);
        }
      } catch (error) {
        console.error(`Ошибка в асинхронном обработчике события ${eventName}:`, error);
        results.push({ error });
      }
    }

    return results;
  }

  /**
   * Удаление всех слушателей
   * @param {string} eventName - Название события (опционально)
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this.events.delete(eventName);
      if (this.debug) {
        console.debug(`📡 EventBus: удалены все слушатели для "${eventName}"`);
      }
    } else {
      this.events.clear();
      if (this.debug) {
        console.debug(`📡 EventBus: удалены все слушатели`);
      }
    }
  }

  /**
   * Получение количества слушателей
   * @param {string} eventName - Название события
   * @returns {number} Количество слушателей
   */
  listenerCount(eventName) {
    return this.events.has(eventName) ? this.events.get(eventName).length : 0;
  }

  /**
   * Получение списка событий
   * @returns {Array} Список названий событий
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Установка максимального количества слушателей
   * @param {number} n - Максимальное количество
   */
  setMaxListeners(n) {
    this.maxListeners = n;
  }

  /**
   * Включение/отключение отладки
   * @param {boolean} enabled - Включить отладку
   */
  setDebug(enabled) {
    this.debug = enabled;
  }

  /**
   * Статистика по событиям
   * @returns {Object} Статистика
   */
  getStats() {
    const stats = {
      totalEvents: this.events.size,
      totalListeners: 0,
      events: {}
    };

    this.events.forEach((listeners, eventName) => {
      stats.totalListeners += listeners.length;
      stats.events[eventName] = listeners.length;
    });

    return stats;
  }
}

// Экспорт синглтона
export default new EventBus();