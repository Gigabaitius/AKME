// src/config/routes.js
/**
 * 🗺️ Конфигурация маршрутов приложения
 * @description Определение всех маршрутов и их параметров
 */

import { 
  LayoutDashboard, 
  Users, 
  Volume2, 
  SendHorizontal, 
  GraduationCap,
  BookOpen,
  Mail,
  Settings,
  HardHat,
  Home
} from 'lucide-react';

/**
 * Массив маршрутов приложения
 */
export const routes = [
  {
    path: '/',
    name: 'home',
    title: 'Главная',
    icon: Home,
    component: 'HomePage',
    exact: true,
    showInMenu: false
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    title: 'Дашборд',
    icon: LayoutDashboard,
    component: 'DashboardPage',
    exact: true,
    showInMenu: true,
    requiresAuth: true
  },
  {
    path: '/candidates',
    name: 'candidates',
    title: 'Кандидаты',
    icon: Users,
    component: 'CandidatesPage',
    exact: true,
    showInMenu: true,
    requiresAuth: true,
    children: [
      {
        path: '/candidates/new',
        name: 'candidates-new',
        title: 'Новый кандидат',
        component: 'CandidateFormPage',
        exact: true,
        showInMenu: false,
        requiresAuth: true
      },
      {
        path: '/candidates/:id',
        name: 'candidate-details',
        title: 'Детали кандидата',
        component: 'CandidateDetailsPage',
        exact: true,
        showInMenu: false,
        requiresAuth: true
      }
    ]
  },
  {
    path: '/silent',
    name: 'silent',
    title: 'Молчащие',
    icon: Volume2,
    component: 'SilentPage',
    exact: true,
    showInMenu: true,
    requiresAuth: true,
    parent: 'candidates'
  },
  {
    path: '/transferred',
    name: 'transferred',
    title: 'Переданные',
    icon: SendHorizontal,
    component: 'TransferredPage',
    exact: true,
    showInMenu: true,
    requiresAuth: true,
    parent: 'candidates'
  },
  {
    path: '/shift-workers',
    name: 'shift-workers',
    title: 'Вахтовики',
    icon: HardHat,
    component: 'ShiftWorkersPage',
    exact: true,
    showInMenu: true,
    requiresAuth: true,
    children: [
      {
        path: '/shift-workers/new',
        name: 'shift-worker-new',
        title: 'Новый вахтовик',
        component: 'ShiftWorkerFormPage',
        exact: true,
        showInMenu: false,
        requiresAuth: true
      },
      {
        path: '/shift-workers/:id',
        name: 'shift-worker-details',
        title: 'Детали вахтовика',
        component: 'ShiftWorkerDetailsPage',
        exact: true,
        showInMenu: false,
        requiresAuth: true
      }
    ]
  },
  {
    path: '/training',
    name: 'training',
    title: 'Обучение GPT',
    icon: GraduationCap,
    component: 'TrainingPage',
    exact: true,
    showInMenu: true,
    requiresAuth: true
  },
  {
    path: '/knowledge',
    name: 'knowledge',
    title: 'База знаний',
    icon: BookOpen,
    component: 'KnowledgePage',
    exact: true,
    showInMenu: true,
    requiresAuth: true,
    children: [
      {
        path: '/knowledge/new',
        name: 'knowledge-new',
        title: 'Новая запись',
        component: 'KnowledgeFormPage',
        exact: true,
        showInMenu: false,
        requiresAuth: true
      },
      {
        path: '/knowledge/:id',
        name: 'knowledge-details',
        title: 'Детали записи',
        component: 'KnowledgeDetailsPage',
        exact: true,
        showInMenu: false,
        requiresAuth: true
      }
    ]
  },
  {
    path: '/mailings',
    name: 'mailings',
    title: 'Рассылки',
    icon: Mail,
    component: 'MailingsPage',
    exact: true,
    showInMenu: true,
    requiresAuth: true,
    children: [
      {
        path: '/mailings/new',
        name: 'mailing-new',
        title: 'Новая рассылка',
        component: 'MailingFormPage',
        exact: true,
        showInMenu: false,
        requiresAuth: true
      },
      {
        path: '/mailings/:id',
        name: 'mailing-details',
        title: 'Детали рассылки',
        component: 'MailingDetailsPage',
        exact: true,
        showInMenu: false,
        requiresAuth: true
      }
    ]
  },
  {
    path: '/settings',
    name: 'settings',
    title: 'Настройки',
    icon: Settings,
    component: 'SettingsPage',
    exact: true,
    showInMenu: true,
    requiresAuth: true
  }
];

/**
 * Получение маршрута по имени
 * @param {string} name - Имя маршрута
 * @returns {Object|null} Объект маршрута или null
 */
export const getRouteByName = (name) => {
  const findRoute = (routes) => {
    for (const route of routes) {
      if (route.name === name) {
        return route;
      }
      if (route.children) {
        const found = findRoute(route.children);
        if (found) return found;
      }
    }
    return null;
  };
  
  return findRoute(routes);
};

/**
 * Получение маршрута по пути
 * @param {string} path - Путь маршрута
 * @returns {Object|null} Объект маршрута или null
 */
export const getRouteByPath = (path) => {
  const findRoute = (routes) => {
    for (const route of routes) {
      if (route.path === path) {
        return route;
      }
      if (route.children) {
        const found = findRoute(route.children);
        if (found) return found;
      }
    }
    return null;
  };
  
  return findRoute(routes);
};

/**
 * Получение всех маршрутов для меню
 * @returns {Array} Массив маршрутов для отображения в меню
 */
export const getMenuRoutes = () => {
  return routes.filter(route => route.showInMenu && !route.parent);
};

/**
 * Получение дочерних маршрутов
 * @param {string} parentName - Имя родительского маршрута
 * @returns {Array} Массив дочерних маршрутов
 */
export const getChildRoutes = (parentName) => {
  return routes.filter(route => route.parent === parentName && route.showInMenu);
};

/**
 * Проверка требования авторизации для маршрута
 * @param {string} path - Путь маршрута
 * @returns {boolean} Требуется ли авторизация
 */
export const requiresAuth = (path) => {
  const route = getRouteByPath(path);
  return route ? route.requiresAuth : false;
};

/**
 * Генерация хлебных крошек для маршрута
 * @param {string} path - Текущий путь
 * @returns {Array} Массив хлебных крошек
 */
export const generateBreadcrumbs = (path) => {
  const breadcrumbs = [];
  const parts = path.split('/').filter(Boolean);
  
  let currentPath = '';
  for (const part of parts) {
    currentPath += `/${part}`;
    const route = getRouteByPath(currentPath);
    
    if (route) {
      breadcrumbs.push({
        path: route.path,
        title: route.title,
        name: route.name
      });
    }
  }
  
  return breadcrumbs;
};

/**
 * Экспорт по умолчанию
 */
export default {
  routes,
  getRouteByName,
  getRouteByPath,
  getMenuRoutes,
  getChildRoutes,
  requiresAuth,
  generateBreadcrumbs
};
