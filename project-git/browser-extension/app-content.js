/**
 * App Content Script
 * Мост между HR Assistant приложением и браузерным расширением
 */

(function() {
  'use strict';

  console.log('🔌 HR Assistant App Content Script loaded');

  // ==================== СОСТОЯНИЕ ====================
  const state = {
    isConnected: false,
    extensionId: chrome.runtime.id,
    pendingRequests: new Map(),
    requestTimeout: 30000, // 30 секунд
    reconnectInterval: null,
    messageQueue: []
  };

  // ==================== ИНИЦИАЛИЗАЦИЯ ====================
  function init() {
    // Проверяем подключение к расширению
    checkConnection();
    
    // Устанавливаем мост для коммуникации
    setupBridge();
    
    // Слушаем сообщения от расширения
    listenToExtension();
    
    // Периодическая проверка соединения
    state.reconnectInterval = setInterval(checkConnection, 5000);
    
    // Уведомляем приложение о готовности
    notifyAppReady();
  }

  // ==================== ПРОВЕРКА СОЕДИНЕНИЯ ====================
  function checkConnection() {
    chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Extension connection error:', chrome.runtime.lastError);
        state.isConnected = false;
        notifyConnectionStatus(false);
      } else if (response && response.connected) {
        if (!state.isConnected) {
          console.log('✅ Connected to extension');
          state.isConnected = true;
          notifyConnectionStatus(true);
          processQueuedMessages();
        }
      }
    });
  }

  // ==================== МОСТ ДЛЯ КОММУНИКАЦИИ ====================
  function setupBridge() {
    // Создаем глобальный объект для взаимодействия с приложением
    window.HRAssistantExtension = {
      // Проверка доступности расширения
      isAvailable: () => state.isConnected,
      
      // Отправка сообщения в расширение
      sendMessage: (message) => {
        return sendToExtension(message);
      },
      
      // Подписка на события от расширения
      on: (event, callback) => {
        window.addEventListener(`hr-extension-${event}`, (e) => {
          callback(e.detail);
        });
      },
      
      // Отписка от событий
      off: (event, callback) => {
        window.removeEventListener(`hr-extension-${event}`, callback);
      },
      
      // API методы
      api: {
        // Google Sheets
        connectGoogleSheets: () => sendToExtension({ type: 'CONNECT_GOOGLE' }),
        
        sheetsOperation: (operation, spreadsheetId, range, values) => {
          return sendToExtension({
            type: 'SHEETS_OPERATION',
            data: { operation, spreadsheetId, range, values }
          });
        },
        
        // WhatsApp
        connectWhatsApp: () => sendToExtension({ type: 'CONNECT_WHATSAPP' }),
        
        sendWhatsAppMessage: (phone, message, attachments) => {
          return sendToExtension({
            type: 'SEND_WHATSAPP',
            data: { phone, message, attachments }
          });
        },
        
        getWhatsAppChats: () => sendToExtension({ type: 'GET_WHATSAPP_CHATS' }),
        
        // OCR
        processOCR: (image, language = 'rus') => {
          return sendToExtension({
            type: 'PROCESS_OCR',
            data: { image, language }
          });
        },
        
        // Telegram
        sendTelegramMessage: (chatId, message) => {
          return sendToExtension({
            type: 'SEND_TELEGRAM',
            data: { chatId, message }
          });
        },
        
        // SMS
        sendSMS: (to, body) => {
          return sendToExtension({
            type: 'SEND_SMS',
            data: { to, body }
          });
        },
        
        // Настройки
        updateSettings: (settings) => {
          return sendToExtension({
            type: 'UPDATE_SETTINGS',
            data: settings
          });
        },
        
        getStatus: () => sendToExtension({ type: 'GET_STATUS' }),
        
        clearCache: () => sendToExtension({ type: 'CLEAR_CACHE' })
      },
      
      // Утилиты
      utils: {
        // Проверка конкретного API
        checkAPI: async (apiName) => {
          const status = await sendToExtension({ type: 'GET_STATUS' });
          return status?.status?.apis?.[apiName]?.connected || false;
        },
        
        // Получение версии расширения
        getVersion: async () => {
          const response = await sendToExtension({ type: 'PING' });
          return response?.version;
        },
        
        // Пакетная отправка сообщений
        batchSend: async (messages) => {
          const results = [];
          for (const msg of messages) {
            try {
              const result = await sendToExtension(msg);
              results.push({ success: true, data: result });
            } catch (error) {
              results.push({ success: false, error: error.message });
            }
          }
          return results;
        }
      }
    };
    
    // Делаем объект неизменяемым
    Object.freeze(window.HRAssistantExtension.api);
    Object.freeze(window.HRAssistantExtension.utils);
  }

  // ==================== ОТПРАВКА СООБЩЕНИЙ В РАСШИРЕНИЕ ====================
  function sendToExtension(message) {
    return new Promise((resolve, reject) => {
      if (!state.isConnected) {
        // Добавляем в очередь если не подключено
        state.messageQueue.push({ message, resolve, reject });
        checkConnection(); // Пробуем подключиться
        return;
      }
      
      // Генерируем уникальный ID для запроса
      const requestId = generateRequestId();
      
      // Сохраняем промис для последующего разрешения
      state.pendingRequests.set(requestId, { resolve, reject });
      
      // Устанавливаем таймаут
      setTimeout(() => {
        if (state.pendingRequests.has(requestId)) {
          state.pendingRequests.get(requestId).reject(new Error('Request timeout'));
          state.pendingRequests.delete(requestId);
        }
      }, state.requestTimeout);
      
      // Отправляем сообщение
      chrome.runtime.sendMessage(
        { ...message, requestId },
        (response) => {
          if (chrome.runtime.lastError) {
            const request = state.pendingRequests.get(requestId);
            if (request) {
              request.reject(chrome.runtime.lastError);
              state.pendingRequests.delete(requestId);
            }
          } else {
            const request = state.pendingRequests.get(requestId);
            if (request) {
              request.resolve(response);
              state.pendingRequests.delete(requestId);
            }
          }
        }
      );
    });
  }

  // ==================== ОБРАБОТКА СООБЩЕНИЙ ОТ РАСШИРЕНИЯ ====================
  function listenToExtension() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Message from extension:', message);
      
      // Проверяем, что сообщение от нашего расширения
      if (sender.id !== state.extensionId) {
        return;
      }
      
      // Обрабатываем разные типы сообщений
      switch (message.type) {
        case 'EXTENSION_EVENT':
          handleExtensionEvent(message.event, message.data);
          break;
          
        case 'STATUS_UPDATE':
          handleStatusUpdate(message.data);
          break;
          
        case 'ERROR':
          handleError(message.error);
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
      
      // Отправляем подтверждение
      sendResponse({ received: true });
    });
  }

  // ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
  function handleExtensionEvent(event, data) {
    // Создаем кастомное событие для приложения
    const customEvent = new CustomEvent(`hr-extension-${event}`, {
      detail: data,
      bubbles: true,
      cancelable: true
    });
    
    window.dispatchEvent(customEvent);
    
    // Специальная обработка некоторых событий
    switch (event) {
      case 'whatsapp_message':
        handleWhatsAppMessage(data);
        break;
        
      case 'whatsapp_disconnected':
        handleWhatsAppDisconnected();
        break;
        
      case 'google_token_expired':
        handleGoogleTokenExpired();
        break;
        
      case 'silent_candidates':
        handleSilentCandidates(data);
        break;
    }
  }

  function handleWhatsAppMessage(data) {
    console.log('📱 New WhatsApp message:', data);
    
    // Показываем уведомление если разрешено
    if (Notification.permission === 'granted') {
      new Notification(`Новое сообщение от ${data.name}`, {
        body: data.text,
        icon: '/logo192.png',
        tag: `whatsapp-${data.phone}`
      });
    }
    
    // Обновляем UI через событие
    dispatchAppEvent('new-whatsapp-message', data);
  }

  function handleWhatsAppDisconnected() {
    console.warn('⚠️ WhatsApp disconnected');
    dispatchAppEvent('whatsapp-disconnected', {});
    
    // Показываем уведомление
    showNotification('WhatsApp отключен', 'Пожалуйста, переподключите WhatsApp Web');
  }

  function handleGoogleTokenExpired() {
    console.warn('⚠️ Google token expired');
    dispatchAppEvent('google-token-expired', {});
    
    // Автоматически пробуем обновить токен
    window.HRAssistantExtension.api.connectGoogleSheets()
      .then(() => {
        console.log('✅ Google token refreshed');
        dispatchAppEvent('google-reconnected', {});
      })
      .catch(error => {
        console.error('Failed to refresh Google token:', error);
      });
  }

  function handleSilentCandidates(data) {
    console.log('🔇 Silent candidates detected:', data);
    dispatchAppEvent('silent-candidates-update', data);
    
    // Показываем уведомление если есть кандидаты для передачи
    if (data.transferList && data.transferList.length > 0) {
      showNotification(
        'Требуется передача кандидатов',
        `${data.transferList.length} кандидатов требуют передачи на 1-ю линию`
      );
    }
  }

  function handleStatusUpdate(status) {
    console.log('📊 Status update:', status);
    dispatchAppEvent('extension-status-update', status);
  }

  function handleError(error) {
    console.error('❌ Extension error:', error);
    dispatchAppEvent('extension-error', error);
    
    showNotification('Ошибка расширения', error.message || 'Произошла неизвестная ошибка');
  }

  // ==================== УТИЛИТЫ ====================
  function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function notifyAppReady() {
    dispatchAppEvent('extension-ready', {
      connected: state.isConnected,
      extensionId: state.extensionId
    });
  }

  function notifyConnectionStatus(connected) {
    dispatchAppEvent('extension-connection-status', { connected });
  }

  function dispatchAppEvent(eventName, data) {
    const event = new CustomEvent(`hr-app-${eventName}`, {
      detail: data,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
  }

  function showNotification(title, message) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/logo192.png'
      });
    }
  }

  function processQueuedMessages() {
    if (state.messageQueue.length === 0) return;
    
    console.log(`Processing ${state.messageQueue.length} queued messages`);
    
    const queue = [...state.messageQueue];
    state.messageQueue = [];
    
    queue.forEach(({ message, resolve, reject }) => {
      sendToExtension(message).then(resolve).catch(reject);
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАЗРАБОТКИ ====================
  if (process.env.NODE_ENV === 'development') {
    window.HRAssistantExtension.debug = {
      getState: () => state,
      getPendingRequests: () => Array.from(state.pendingRequests.keys()),
      getQueueLength: () => state.messageQueue.length,
      forceReconnect: () => {
        state.isConnected = false;
        checkConnection();
      },
      simulateMessage: (type, data) => {
        handleExtensionEvent(type, data);
      },
      clearQueue: () => {
        state.messageQueue = [];
      }
    };
  }

  // ==================== ОЧИСТКА ПРИ ВЫГРУЗКЕ ====================
  window.addEventListener('beforeunload', () => {
    if (state.reconnectInterval) {
      clearInterval(state.reconnectInterval);
    }
    
    // Отменяем все pending запросы
    state.pendingRequests.forEach((request) => {
      request.reject(new Error('Page unloading'));
    });
    state.pendingRequests.clear();
  });

  // ==================== ИНЪЕКЦИЯ СТИЛЕЙ ДЛЯ УВЕДОМЛЕНИЙ ====================
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .hr-extension-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 999999;
        max-width: 350px;
        animation: slideIn 0.3s ease-out;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .hr-extension-notification.error {
        border-color: #ef4444;
        background: #fee;
      }
      
      .hr-extension-notification.success {
        border-color: #10b981;
        background: #efe;
      }
      
      .hr-extension-notification.warning {
        border-color: #f59e0b;
        background: #fef3c7;
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== ЗАПУСК ====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  injectStyles();

})();
