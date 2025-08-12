/**
 * WhatsApp Web Content Script
 * Интеграция с WhatsApp Web для HR Assistant
 */

(function() {
  'use strict';

  console.log('🟢 WhatsApp Content Script loaded');

  // ==================== СОСТОЯНИЕ ====================
  const state = {
    isReady: false,
    observer: null,
    messageQueue: [],
    processedMessages: new Set(),
    lastActivity: null,
    silentCandidates: new Map(), // Отслеживание молчащих кандидатов
    checkInterval: null
  };

  // ==================== ИНИЦИАЛИЗАЦИЯ ====================
  function init() {
    // Ждем загрузки WhatsApp Web
    waitForWhatsApp().then(() => {
      console.log('✅ WhatsApp Web ready');
      state.isReady = true;
      
      // Уведомляем background script
      chrome.runtime.sendMessage({
        type: 'WHATSAPP_READY'
      });
      
      // Начинаем мониторинг
      startMonitoring();
      
      // Отслеживаем молчащих кандидатов
      startSilentTracking();
    });
  }

  // ==================== ОЖИДАНИЕ ЗАГРУЗКИ WHATSAPP ====================
  function waitForWhatsApp() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        // Проверяем наличие основных элементов WhatsApp
        const app = document.querySelector('#app');
        const sidePanel = document.querySelector('[data-testid="chat-list"]');
        const mainPanel = document.querySelector('main');
        
        if (app && (sidePanel || mainPanel)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
      
      // Таймаут 30 секунд
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 30000);
    });
  }

  // ==================== МОНИТОРИНГ СООБЩЕНИЙ ====================
  function startMonitoring() {
    // Наблюдаем за новыми сообщениями
    observeMessages();
    
    // Наблюдаем за изменениями в чатах
    observeChats();
    
    // Периодическая проверка состояния
    setInterval(checkStatus, 10000);
  }

  function observeMessages() {
    // Находим контейнер с сообщениями
    const messageContainer = document.querySelector('[data-testid="conversation-panel-messages"]');
    
    if (!messageContainer) {
      // Повторяем попытку через секунду
      setTimeout(observeMessages, 1000);
      return;
    }
    
    // Создаем MutationObserver для отслеживания новых сообщений
    state.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            processNewMessage(node);
          }
        });
      });
    });
    
    // Начинаем наблюдение
    state.observer.observe(messageContainer, {
      childList: true,
      subtree: true
    });
  }

  function processNewMessage(element) {
    // Ищем сообщения
    const messageElements = element.querySelectorAll('[data-testid="msg-container"]');
    
    messageElements.forEach((msgElement) => {
      const messageId = msgElement.getAttribute('data-id');
      
      // Проверяем, обработано ли уже это сообщение
      if (messageId && !state.processedMessages.has(messageId)) {
        state.processedMessages.add(messageId);
        
        // Извлекаем данные сообщения
        const messageData = extractMessageData(msgElement);
        
        if (messageData) {
          // Отправляем в background script
          chrome.runtime.sendMessage({
            type: 'NEW_MESSAGE',
            data: messageData
          });
          
          // Обновляем tracking молчащих
          updateSilentTracking(messageData.phone);
        }
      }
    });
  }

  function extractMessageData(msgElement) {
    try {
      // Определяем тип сообщения (входящее/исходящее)
      const isIncoming = msgElement.querySelector('[data-testid="msg-dblcheck"]') === null;
      
      // Извлекаем текст сообщения
      const textElement = msgElement.querySelector('[data-testid="msg-text"]');
      const text = textElement ? textElement.innerText : '';
      
      // Извлекаем время
      const timeElement = msgElement.querySelector('[data-testid="msg-meta"] span');
      const time = timeElement ? timeElement.innerText : new Date().toISOString();
      
      // Получаем информацию о чате
      const chatInfo = getCurrentChatInfo();
      
      return {
        id: msgElement.getAttribute('data-id'),
        phone: chatInfo.phone,
        name: chatInfo.name,
        text: text,
        time: time,
        isIncoming: isIncoming,
        hasMedia: msgElement.querySelector('[data-testid="media-content"]') !== null,
        hasDocument: msgElement.querySelector('[data-testid="document-content"]') !== null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error extracting message data:', error);
      return null;
    }
  }

  function getCurrentChatInfo() {
    try {
      // Получаем заголовок чата
      const headerElement = document.querySelector('header [data-testid="conversation-header"]');
      const titleElement = headerElement?.querySelector('span[title]');
      const name = titleElement?.title || 'Unknown';
      
      // Пытаемся извлечь номер телефона
      const phoneMatch = name.match(/\+?\d{10,}/);
      const phone = phoneMatch ? phoneMatch[0] : name;
      
      return { name, phone };
    } catch (error) {
      console.error('Error getting chat info:', error);
      return { name: 'Unknown', phone: 'Unknown' };
    }
  }

  // ==================== ОТПРАВКА СООБЩЕНИЙ ====================
  async function sendMessage(phone, message, attachments = []) {
    try {
      // Нормализуем номер телефона
      const normalizedPhone = normalizePhone(phone);
      
      // Открываем чат
      await openChat(normalizedPhone);
      
      // Ждем загрузки чата
      await waitForChatLoad();
      
      // Если есть вложения, отправляем их
      if (attachments.length > 0) {
        await sendAttachments(attachments);
      }
      
      // Отправляем текстовое сообщение
      if (message) {
        await typeAndSendMessage(message);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  function normalizePhone(phone) {
    // Удаляем все нецифровые символы
    let normalized = phone.replace(/\D/g, '');
    
    // Добавляем код страны если его нет
    if (!normalized.startsWith('7') && normalized.length === 10) {
      normalized = '7' + normalized;
    }
    
    return normalized;
  }

  async function openChat(phone) {
    // Используем WhatsApp Web URL схему
    const url = `https://web.whatsapp.com/send?phone=${phone}`;
    
    // Проверяем, не открыт ли уже нужный чат
    const currentChat = getCurrentChatInfo();
    if (currentChat.phone.includes(phone)) {
      return;
    }
    
    // Открываем новый чат
    window.location.href = url;
    
    // Ждем загрузки
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  async function waitForChatLoad() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const inputField = document.querySelector('[data-testid="conversation-compose-box-input"]');
        if (inputField) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
      
      // Таймаут 10 секунд
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  }

  async function typeAndSendMessage(message) {
    // Находим поле ввода
    const inputField = document.querySelector('[data-testid="conversation-compose-box-input"]');
    
    if (!inputField) {
      throw new Error('Input field not found');
    }
    
    // Фокусируемся на поле
    inputField.focus();
    
    // Вставляем текст (эмулируем ввод)
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
    });
    
    // Устанавливаем текст
    inputField.innerHTML = message.replace(/\n/g, '<br>');
    inputField.dispatchEvent(inputEvent);
    
    // Небольшая задержка
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Находим и нажимаем кнопку отправки
    const sendButton = document.querySelector('[data-testid="compose-btn-send"]');
    if (sendButton) {
      sendButton.click();
    } else {
      // Альтернативный метод - нажатие Enter
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      inputField.dispatchEvent(enterEvent);
    }
  }

  async function sendAttachments(attachments) {
    // Находим кнопку прикрепления файлов
    const attachButton = document.querySelector('[data-testid="clip"]');
    
    if (!attachButton) {
      console.warn('Attach button not found');
      return;
    }
    
    attachButton.click();
    
    // Ждем открытия меню
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Здесь должна быть логика загрузки файлов
    // Это сложно реализовать через content script из-за ограничений безопасности
    console.log('Attachment upload not fully implemented');
  }

  // ==================== ПОЛУЧЕНИЕ СПИСКА ЧАТОВ ====================
  function getChats() {
    try {
      const chatElements = document.querySelectorAll('[data-testid="cell-frame-container"]');
      const chats = [];
      
      chatElements.forEach((chatElement) => {
        const titleElement = chatElement.querySelector('[data-testid="cell-frame-title"] span[title]');
        const lastMessageElement = chatElement.querySelector('[data-testid="last-msg-status"]');
        const timeElement = chatElement.querySelector('[data-testid="cell-frame-secondary"] > span');
        const unreadElement = chatElement.querySelector('[data-testid="icon-unread-count"]');
        
        if (titleElement) {
          chats.push({
            name: titleElement.title,
            lastMessage: lastMessageElement?.innerText || '',
            time: timeElement?.innerText || '',
            unreadCount: unreadElement ? parseInt(unreadElement.innerText) || 0 : 0,
            phone: extractPhoneFromName(titleElement.title)
          });
        }
      });
      
      return chats;
    } catch (error) {
      console.error('Error getting chats:', error);
      return [];
    }
  }

  function extractPhoneFromName(name) {
    const phoneMatch = name.match(/\+?\d{10,}/);
    return phoneMatch ? phoneMatch[0] : name;
  }

  // ==================== ОТСЛЕЖИВАНИЕ МОЛЧАЩИХ КАНДИДАТОВ ====================
  function startSilentTracking() {
    // Проверяем молчащих каждые 30 минут
    state.checkInterval = setInterval(checkSilentCandidates, 30 * 60 * 1000);
    
    // Первая проверка через минуту
    setTimeout(checkSilentCandidates, 60000);
  }

  function updateSilentTracking(phone) {
    state.silentCandidates.set(phone, {
      lastActivity: new Date().toISOString(),
      messageCount: (state.silentCandidates.get(phone)?.messageCount || 0) + 1
    });
  }

  function checkSilentCandidates() {
    const now = new Date();
    const silentThreshold = 8 * 60 * 60 * 1000; // 8 часов
    const transferThreshold = 18.5; // 18:30
    
    const silentList = [];
    const transferList = [];
    
    state.silentCandidates.forEach((data, phone) => {
      const lastActivity = new Date(data.lastActivity);
      const timeSinceActivity = now - lastActivity;
      
      if (timeSinceActivity > silentThreshold) {
        silentList.push({
          phone,
          lastActivity: data.lastActivity,
          hoursAgo: Math.floor(timeSinceActivity / (60 * 60 * 1000))
        });
        
        // Проверяем, нужно ли передать на 1-ю линию
        const currentHour = now.getHours() + now.getMinutes() / 60;
        if (currentHour >= transferThreshold) {
          transferList.push({
            phone,
            reason: 'После 18:30, молчит более 8 часов'
          });
        }
      }
    });
    
    // Отправляем информацию в background script
    if (silentList.length > 0) {
      chrome.runtime.sendMessage({
        type: 'SILENT_CANDIDATES',
        data: { silentList, transferList }
      });
    }
  }

  // ==================== ОБРАБОТКА ЧАТОВ ====================
  function observeChats() {
    const chatList = document.querySelector('[data-testid="chat-list"]');
    
    if (!chatList) {
      setTimeout(observeChats, 1000);
      return;
    }
    
    const chatObserver = new MutationObserver(() => {
      // Обновляем список чатов при изменениях
      const chats = getChats();
      
      // Отправляем обновление в background
      chrome.runtime.sendMessage({
        type: 'CHATS_UPDATE',
        data: chats
      });
    });
    
    chatObserver.observe(chatList, {
      childList: true,
      subtree: true
    });
  }

  // ==================== ПРОВЕРКА СТАТУСА ====================
  function checkStatus() {
    const isLoggedIn = document.querySelector('[data-testid="default-user"]') !== null;
    const isConnected = document.querySelector('[data-testid="chat-list"]') !== null;
    
    chrome.runtime.sendMessage({
      type: 'STATUS_UPDATE',
      data: {
        isLoggedIn,
        isConnected,
        lastCheck: new Date().toISOString()
      }
    });
  }

  // ==================== ОБРАБОТКА СООБЩЕНИЙ ОТ BACKGROUND ====================
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message from background:', request.type);
    
    switch (request.type) {
      case 'PING':
        sendResponse({ 
          connected: state.isReady,
          chatsCount: getChats().length
        });
        break;
        
      case 'SEND_MESSAGE':
        sendMessage(request.data.phone, request.data.message, request.data.attachments)
          .then(sendResponse);
        return true; // Асинхронный ответ
        
      case 'GET_CHATS':
        sendResponse({ 
          success: true, 
          chats: getChats() 
        });
        break;
        
      case 'GET_CHAT_HISTORY':
        getChatHistory(request.data.phone)
          .then(sendResponse);
        return true;
        
      case 'SEARCH_MESSAGES':
        searchMessages(request.data.query)
          .then(sendResponse);
        return true;
        
      case 'MARK_AS_READ':
        markChatAsRead(request.data.phone)
          .then(sendResponse);
        return true;
        
      default:
        sendResponse({ error: 'Unknown command' });
    }
  });

  // ==================== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ====================
  async function getChatHistory(phone) {
    try {
      await openChat(phone);
      await waitForChatLoad();
      
      const messages = [];
      const messageElements = document.querySelectorAll('[data-testid="msg-container"]');
      
      messageElements.forEach((element) => {
        const messageData = extractMessageData(element);
        if (messageData) {
          messages.push(messageData);
        }
      });
      
      return { success: true, messages };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function searchMessages(query) {
    try {
      // Открываем поиск
      const searchButton = document.querySelector('[data-testid="icon-search"]');
      if (searchButton) {
        searchButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Вводим запрос
        const searchInput = document.querySelector('[data-testid="search-input"]');
        if (searchInput) {
          searchInput.value = query;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Собираем результаты
          const results = [];
          // ... логика сбора результатов
          
          return { success: true, results };
        }
      }
      
      return { success: false, error: 'Search not available' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function markChatAsRead(phone) {
    try {
      await openChat(phone);
      // WhatsApp автоматически отмечает сообщения как прочитанные при открытии чата
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== АВТОМАТИЗАЦИЯ РУТИННЫХ ЗАДАЧ ====================
  function setupAutomation() {
    // Автоответы на типовые вопросы
    const autoResponses = {
      'график работы': 'Наш график работы: Пн-Пт с 9:00 до 18:00. Суббота и воскресенье - выходные дни.',
      'вакансия': 'Спасибо за интерес к нашей компании! Пожалуйста, отправьте ваше резюме для рассмотрения.',
      'зарплата': 'Вопросы заработной платы обсуждаются индивидуально на собеседовании.',
      'контакты': 'Вы можете связаться с нами по телефону +7 (XXX) XXX-XX-XX или написать на email hr@company.ru'
    };
    
    // Можно добавить логику автоответов
  }

  // ==================== ЭКСПОРТ ДАННЫХ ====================
  function exportChatData() {
    const chats = getChats();
    const exportData = {
      timestamp: new Date().toISOString(),
      chatsCount: chats.length,
      chats: chats,
      silentCandidates: Array.from(state.silentCandidates.entries()).map(([phone, data]) => ({
        phone,
        ...data
      }))
    };
    
    return exportData;
  }

  // ==================== ОЧИСТКА ПРИ ВЫГРУЗКЕ ====================
  window.addEventListener('beforeunload', () => {
    if (state.observer) {
      state.observer.disconnect();
    }
    if (state.checkInterval) {
      clearInterval(state.checkInterval);
    }
    
    // Уведомляем background script
    chrome.runtime.sendMessage({
      type: 'WHATSAPP_DISCONNECTED'
    });
  });

  // ==================== ЗАПУСК ====================
  init();

})();
