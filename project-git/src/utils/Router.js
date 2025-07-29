// src/utils/Router.js
/**
 * 🧭 Простой роутер для навигации
 * @description Управление маршрутизацией в приложении
 */
import EventBus from './EventBus.js';
import Logger from './Logger.js';

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.logger = new Logger('Router');
    this.history = [];
    this.maxHistorySize = 50;
  }

  /**
   * Конфигурация маршрутов
   * @param {Object} routes - Объект маршрутов
   */
  configure(routes) {
    this.routes = routes;
    this.logger.info('Роутер сконфигурирован', Object.keys(routes));
  }

  /**
   * Начало отслеживания маршрутов
   */
  start() {
    // Слушаем изменения URL
    window.addEventListener('popstate', this.handlePopState.bind(this));
    
    // Перехватываем клики по ссылкам
    document.addEventListener('click', this.handleLinkClick.bind(this));
    
    // Обрабатываем текущий маршрут
    this.navigate(window.location.pathname);
    
    this.logger.info('Роутер запущен');
  }

  /**
   * Навигация к маршруту
   * @param {string} path - Путь для навигации
   * @param {Object} params - Параметры маршрута
   * @param {boolean} replace - Заменить текущий маршрут в истории
   */
  navigate(path, params = {}, replace = false) {
    try {
      // Нормализуем путь
      path = this.normalizePath(path);
      
      // Проверяем, не тот же ли это маршрут
      if (this.currentRoute === path && !params.force) {
        return;
      }
      
      // Ищем обработчик маршрута
      const handler = this.findRouteHandler(path);
      
      if (handler) {
        // Сохраняем в историю
        if (!replace) {
          this.addToHistory(path, params);
        }
        
        // Обновляем URL
        if (window.location.pathname !== path) {
          if (replace) {
            window.history.replaceState({ path, params }, '', path);
          } else {
            window.history.pushState({ path, params }, '', path);
          }
        }
        
        // Сохраняем текущий маршрут
        this.currentRoute = path;
        
        // Извлекаем параметры из URL
        const routeParams = this.extractParams(path, handler.pattern);
        const mergedParams = { ...routeParams, ...params };
        
        // Вызываем обработчик
        handler.handler(mergedParams);
        
        // Эмитим событие навигации
        EventBus.emit('router:navigated', { path, params: mergedParams });
        
        this.logger.info(`Навигация: ${path}`, mergedParams);
      } else {
        // Маршрут не найден
        this.handleNotFound(path);
      }
    } catch (error) {
      this.logger.error('Ошибка навигации', error);
      EventBus.emit('router:error', { path, error });
    }
  }

  /**
   * Поиск обработчика маршрута
   * @param {string} path - Путь
   * @returns {Object|null} Обработчик маршрута
   */
  findRouteHandler(path) {
    // Сначала ищем точное совпадение
    if (this.routes[path]) {
      return {
        handler: this.routes[path],
        pattern: path
      };
    }
    
    // Затем ищем с параметрами
    for (const [pattern, handler] of Object.entries(this.routes)) {
      if (this.matchRoute(path, pattern)) {
        return { handler, pattern };
      }
    }
    
    return null;
  }

  /**
   * Проверка соответствия маршрута паттерну
   * @param {string} path - Путь
   * @param {string} pattern - Паттерн маршрута
   * @returns {boolean} Соответствует ли маршрут
   */
  matchRoute(path, pattern) {
    // Преобразуем паттерн в регулярное выражение
    // /users/:id -> /users/([^/]+)
    const regexPattern = pattern
      .replace(/:[^/]+/g, '([^/]+)')
      .replace(/\//g, '\\/');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Извлечение параметров из URL
   * @param {string} path - Путь
   * @param {string} pattern - Паттерн маршрута
   * @returns {Object} Параметры
   */
  extractParams(path, pattern) {
    const params = {};
    
    // Получаем имена параметров из паттерна
    const paramNames = [];
    const paramRegex = /:([^/]+)/g;
    let match;
    
    while ((match = paramRegex.exec(pattern)) !== null) {
      paramNames.push(match[1]);
    }
    
    // Извлекаем значения параметров
    const regexPattern = pattern
      .replace(/:[^/]+/g, '([^/]+)')
      .replace(/\//g, '\\/');
    
    const regex = new RegExp(`^${regexPattern}$`);
    const values = path.match(regex);
    
    if (values) {
      paramNames.forEach((name, index) => {
        params[name] = values[index + 1];
      });
    }
    
    return params;
  }

  /**
   * Обработка перехода по истории браузера
   * @param {PopStateEvent} event - Событие popstate
   */
  handlePopState(event) {
    const state = event.state || {};
    const path = state.path || window.location.pathname;
    const params = state.params || {};
    
    this.navigate(path, { ...params, fromHistory: true }, true);
  }

  /**
   * Обработка кликов по ссылкам
   * @param {MouseEvent} event - Событие клика
   */
  handleLinkClick(event) {
    // Ищем ближайшую ссылку
    const link = event.target.closest('a');
    
    if (!link) return;
    
    // Проверяем, что это внутренняя ссылка
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#')) {
      return;
    }
    
    // Проверяем специальные атрибуты
    if (link.hasAttribute('data-router-ignore') || 
        link.hasAttribute('download') ||
        link.hasAttribute('target')) {
      return;
    }
    
    // Предотвращаем стандартное поведение
    event.preventDefault();
    
    // Навигируем
    this.navigate(href);
  }

  /**
   * Обработка несуществующего маршрута
   * @param {string} path - Путь
   */
  handleNotFound(path) {
    this.logger.warn(`Маршрут не найден: ${path}`);
    
    // Пробуем найти обработчик 404
    if (this.routes['*'] || this.routes['/404']) {
      const handler = this.routes['*'] || this.routes['/404'];
      handler({ path });
    } else {
      // Эмитим событие
      EventBus.emit('router:notFound', { path });
    }
  }

  /**
   * Навигация назад
   */
  back() {
    window.history.back();
  }

  /**
   * Навигация вперед
   */
  forward() {
    window.history.forward();
  }

  /**
   * Перезагрузка текущего маршрута
   */
  reload() {
    this.navigate(this.currentRoute, { force: true });
  }

  /**
   * Получение текущего маршрута
   * @returns {string} Текущий маршрут
   */
  getCurrentRoute() {
    return this.currentRoute || window.location.pathname;
  }

  /**
   * Получение параметров запроса
   * @returns {URLSearchParams} Параметры запроса
   */
  getQueryParams() {
    return new URLSearchParams(window.location.search);
  }

  /**
   * Обновление параметров запроса
   * @param {Object} params - Новые параметры
   * @param {boolean} replace - Заменить историю
   */
  updateQueryParams(params, replace = false) {
    const url = new URL(window.location);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });
    
    const newPath = url.pathname + url.search;
    
    if (replace) {
      window.history.replaceState(null, '', newPath);
    } else {
      window.history.pushState(null, '', newPath);
    }
  }

  /**
   * Добавление в историю
   * @param {string} path - Путь
   * @param {Object} params - Параметры
   */
  addToHistory(path, params) {
    this.history.push({
      path,
      params,
      timestamp: new Date()
    });
    
    // Ограничиваем размер истории
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Получение истории навигации
   * @returns {Array} История
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Очистка истории
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Нормализация пути
   * @param {string} path - Путь
   * @returns {string} Нормализованный путь
   */
  normalizePath(path) {
    // Убираем двойные слеши
    path = path.replace(/\/+/g, '/');
    
    // Убираем конечный слеш (кроме корня)
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    // Добавляем начальный слеш
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    return path;
  }

  /**
   * Проверка активности маршрута
   * @param {string} path - Путь для проверки
   * @returns {boolean} Активен ли маршрут
   */
  isActive(path) {
    const normalizedPath = this.normalizePath(path);
    const currentPath = this.getCurrentRoute();
    
    // Точное совпадение
    if (normalizedPath === currentPath) {
      return true;
    }
    
    // Проверка вложенности (для меню)
    if (currentPath.startsWith(normalizedPath + '/')) {
      return true;
    }
    
    return false;
  }

  /**
   * Генерация URL с параметрами
   * @param {string} path - Путь
   * @param {Object} params - Параметры
   * @returns {string} Полный URL
   */
  generateUrl(path, params = {}) {
    let url = path;
    
    // Заменяем параметры в пути
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `:${key}`;
      if (url.includes(placeholder)) {
        url = url.replace(placeholder, value);
        delete params[key];
      }
    });
    
    // Добавляем оставшиеся параметры как query string
    const remainingParams = Object.entries(params)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    if (remainingParams) {
      url += '?' + remainingParams;
    }
    
    return url;
  }

  /**
   * Остановка роутера
   */
  stop() {
    window.removeEventListener('popstate', this.handlePopState);
    document.removeEventListener('click', this.handleLinkClick);
    this.logger.info('Роутер остановлен');
  }
}

export default Router;
