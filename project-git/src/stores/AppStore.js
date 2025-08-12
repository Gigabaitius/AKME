import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * Главное хранилище приложения
 */
const useAppStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // ==================== СОСТОЯНИЕ ====================
        
        // Основные настройки приложения
        app: {
          name: 'HR Assistant MVC',
          version: '1.0.0',
          environment: import.meta.env.MODE || 'development',
          isInitialized: false,
          isLoading: false,
          error: null,
          lastSync: null
        },

        // Настройки интерфейса
        ui: {
          theme: 'light',
          language: 'ru',
          sidebarCollapsed: false,
          sidebarWidth: 280,
          compactMode: false,
          showHelpers: true,
          animations: true,
          soundEffects: false,
          itemsPerPage: 20,
          dateFormat: 'DD.MM.YYYY',
          timeFormat: '24h'
        },

        // Состояние расширения
        extension: {
          isInstalled: false,
          isConnected: false,
          version: null,
          lastPing: null,
          apis: {
            whatsapp: { connected: false, lastSync: null },
            google: { connected: false, lastSync: null },
            ocr: { connected: false, apiKey: null },
            telegram: { connected: false, botToken: null },
            sms: { connected: false, provider: null }
          }
        },

        // Текущий пользователь
        user: null,

        // Навигация
        navigation: {
          currentPage: 'dashboard',
          breadcrumbs: [],
          history: [],
          pendingNavigation: null
        },

        // Уведомления
        notifications: {
          unreadCount: 0,
          items: [],
          soundEnabled: true,
          desktopEnabled: false
        },

        // Фильтры и поиск
        filters: {
          global: '',
          candidates: {},
          shiftWorkers: {},
          mailings: {},
          knowledge: {}
        },

        // Модальные окна
        modals: {
          activeModals: [],
          confirmDialog: null
        },

        // Статистика
        statistics: {
          candidates: {
            total: 0,
            active: 0,
            silent: 0,
            transferred: 0
          },
          shiftWorkers: {
            total: 0,
            onShift: 0,
            checkpoints: 0,
            missed: 0
          },
          mailings: {
            total: 0,
            sent: 0,
            scheduled: 0,
            draft: 0
          },
          knowledge: {
            total: 0,
            published: 0,
            draft: 0,
            views: 0
          }
        },

        // Кэш данных
        cache: {
          candidates: new Map(),
          shiftWorkers: new Map(),
          knowledge: new Map(),
          users: new Map()
        },

        // ==================== ДЕЙСТВИЯ ====================

        // Инициализация приложения
        initializeApp: async () => {
          set((state) => {
            state.app.isLoading = true;
            state.app.error = null;
          });

          try {
            // Проверяем расширение
            const extensionStatus = await get().checkExtension();
            
            // Загружаем настройки
            await get().loadSettings();
            
            // Инициализируем сервисы
            await get().initializeServices();
            
            set((state) => {
              state.app.isInitialized = true;
              state.app.isLoading = false;
            });

            return true;
          } catch (error) {
            set((state) => {
              state.app.error = error.message;
              state.app.isLoading = false;
            });
            return false;
          }
        },

        // Проверка расширения
        checkExtension: async () => {
          try {
            const response = await new Promise((resolve) => {
              if (window.chrome?.runtime?.sendMessage) {
                window.chrome.runtime.sendMessage(
                  { type: 'PING' },
                  (response) => {
                    resolve(response || { connected: false });
                  }
                );
              } else {
                resolve({ connected: false });
              }
            });

            set((state) => {
              state.extension.isInstalled = response.connected;
              state.extension.isConnected = response.connected;
              state.extension.version = response.version;
              state.extension.lastPing = new Date().toISOString();
              
              if (response.apis) {
                state.extension.apis = response.apis;
              }
            });

            return response;
          } catch (error) {
            set((state) => {
              state.extension.isInstalled = false;
              state.extension.isConnected = false;
            });
            return { connected: false };
          }
        },

        // Загрузка настроек
        loadSettings: async () => {
          const savedSettings = localStorage.getItem('hr-assistant-settings');
          if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            set((state) => {
              state.ui = { ...state.ui, ...settings.ui };
            });
          }
        },

        // Сохранение настроек
        saveSettings: () => {
          const settings = {
            ui: get().ui
          };
          localStorage.setItem('hr-assistant-settings', JSON.stringify(settings));
        },

        // Инициализация сервисов
        initializeServices: async () => {
          // Здесь будет инициализация различных сервисов
          console.log('Initializing services...');
        },

        // Установка темы
        setTheme: (theme) => {
          set((state) => {
            state.ui.theme = theme;
          });
          document.documentElement.setAttribute('data-theme', theme);
          get().saveSettings();
        },

        // Переключение темы
        toggleTheme: () => {
          const newTheme = get().ui.theme === 'light' ? 'dark' : 'light';
          get().setTheme(newTheme);
        },

        // Установка языка
        setLanguage: (language) => {
          set((state) => {
            state.ui.language = language;
          });
          get().saveSettings();
        },

        // Переключение сайдбара
        toggleSidebar: () => {
          set((state) => {
            state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
          });
          get().saveSettings();
        },

        // Навигация
        navigate: (page, params = {}) => {
          const currentPage = get().navigation.currentPage;
          
          set((state) => {
            state.navigation.history.push(currentPage);
            state.navigation.currentPage = page;
            state.navigation.pendingNavigation = null;
            
            // Ограничиваем историю
            if (state.navigation.history.length > 20) {
              state.navigation.history.shift();
            }
          });

          return { page, params };
        },

        // Возврат назад
        goBack: () => {
          const history = get().navigation.history;
          if (history.length > 0) {
            const previousPage = history[history.length - 1];
            set((state) => {
              state.navigation.history.pop();
              state.navigation.currentPage = previousPage;
            });
          }
        },

        // Установка хлебных крошек
        setBreadcrumbs: (breadcrumbs) => {
          set((state) => {
            state.navigation.breadcrumbs = breadcrumbs;
          });
        },

        // Открытие модального окна
        openModal: (modalId, props = {}) => {
          set((state) => {
            state.modals.activeModals.push({
              id: modalId,
              props,
              openedAt: new Date().toISOString()
            });
          });
        },

        // Закрытие модального окна
        closeModal: (modalId) => {
          set((state) => {
            state.modals.activeModals = state.modals.activeModals.filter(
              m => m.id !== modalId
            );
          });
        },

        // Закрытие всех модальных окон
        closeAllModals: () => {
          set((state) => {
            state.modals.activeModals = [];
            state.modals.confirmDialog = null;
          });
        },

        // Показ диалога подтверждения
        showConfirm: (options) => {
          return new Promise((resolve) => {
            set((state) => {
              state.modals.confirmDialog = {
                ...options,
                resolve
              };
            });
          });
        },

        // Закрытие диалога подтверждения
        closeConfirm: (result = false) => {
          const dialog = get().modals.confirmDialog;
          if (dialog) {
            dialog.resolve(result);
            set((state) => {
              state.modals.confirmDialog = null;
            });
          }
        },

        // Добавление уведомления
        addNotification: (notification) => {
          set((state) => {
            state.notifications.items.unshift({
              id: Date.now(),
              ...notification,
              createdAt: new Date().toISOString(),
              read: false
            });
            
            state.notifications.unreadCount += 1;
            
            // Ограничиваем количество уведомлений
            if (state.notifications.items.length > 100) {
              state.notifications.items = state.notifications.items.slice(0, 100);
            }
          });

          // Воспроизводим звук, если включено
          if (get().notifications.soundEnabled) {
            // Здесь будет код для воспроизведения звука
          }

          // Показываем desktop уведомление, если включено
          if (get().notifications.desktopEnabled && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/logo192.png'
              });
            }
          }
        },

        // Отметить уведомление как прочитанное
        markNotificationAsRead: (notificationId) => {
          set((state) => {
            const notification = state.notifications.items.find(n => n.id === notificationId);
            if (notification && !notification.read) {
              notification.read = true;
              state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - 1);
            }
          });
        },

        // Отметить все уведомления как прочитанные
        markAllNotificationsAsRead: () => {
          set((state) => {
            state.notifications.items.forEach(n => n.read = true);
            state.notifications.unreadCount = 0;
          });
        },

        // Удаление уведомления
        removeNotification: (notificationId) => {
          set((state) => {
            const index = state.notifications.items.findIndex(n => n.id === notificationId);
            if (index > -1) {
              const notification = state.notifications.items[index];
              if (!notification.read) {
                state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - 1);
              }
              state.notifications.items.splice(index, 1);
            }
          });
        },

        // Очистка всех уведомлений
        clearNotifications: () => {
          set((state) => {
            state.notifications.items = [];
            state.notifications.unreadCount = 0;
          });
        },

        // Установка глобального фильтра
        setGlobalFilter: (filter) => {
          set((state) => {
            state.filters.global = filter;
          });
        },

        // Установка фильтра для конкретной сущности
        setFilter: (entity, filters) => {
          set((state) => {
            state.filters[entity] = filters;
          });
        },

        // Очистка фильтров
        clearFilters: (entity = null) => {
          set((state) => {
            if (entity) {
              state.filters[entity] = {};
            } else {
              state.filters = {
                global: '',
                candidates: {},
                shiftWorkers: {},
                mailings: {},
                knowledge: {}
              };
            }
          });
        },

        // Обновление статистики
        updateStatistics: (stats) => {
          set((state) => {
            state.statistics = { ...state.statistics, ...stats };
          });
        },

        // Установка пользователя
        setUser: (user) => {
          set((state) => {
            state.user = user;
          });
        },

        // Выход пользователя
        logout: () => {
          set((state) => {
            state.user = null;
            state.cache.clear();
            state.notifications.items = [];
            state.notifications.unreadCount = 0;
          });
          
          // Очищаем localStorage
          localStorage.removeItem('hr-assistant-auth');
          localStorage.removeItem('hr-assistant-token');
        },

        // Обновление кэша
        updateCache: (entity, id, data) => {
          set((state) => {
            if (!state.cache[entity]) {
              state.cache[entity] = new Map();
            }
            state.cache[entity].set(id, {
              data,
              cachedAt: new Date().toISOString()
            });
          });
        },

        // Получение из кэша
        getFromCache: (entity, id) => {
          const cache = get().cache[entity];
          if (cache && cache.has(id)) {
            const cached = cache.get(id);
            // Проверяем актуальность кэша (5 минут)
            const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
            if (cacheAge < 5 * 60 * 1000) {
              return cached.data;
            }
          }
          return null;
        },

        // Очистка кэша
        clearCache: (entity = null) => {
          set((state) => {
            if (entity) {
              if (state.cache[entity]) {
                state.cache[entity].clear();
              }
            } else {
              Object.values(state.cache).forEach(cache => cache.clear());
            }
          });
        },

        // Сброс состояния
        reset: () => {
          set((state) => {
            // Сохраняем только настройки UI
            const uiSettings = state.ui;
            
            // Сбрасываем все состояние
            Object.keys(state).forEach(key => {
              if (typeof state[key] === 'function') return;
              if (key === 'ui') {
                state[key] = uiSettings;
              } else {
                delete state[key];
              }
            });
            
            // Восстанавливаем начальное состояние
            state.app = {
              name: 'HR Assistant MVC',
              version: '1.0.0',
              environment: import.meta.env.MODE || 'development',
              isInitialized: false,
              isLoading: false,
              error: null,
              lastSync: null
            };
          });
        }
      })),
      {
        name: 'hr-assistant-app-store',
        partialize: (state) => ({
          ui: state.ui,
          user: state.user
        })
      }
    ),
    {
      name: 'AppStore'
    }
  )
);

export { useAppStore };
export default useAppStore;
