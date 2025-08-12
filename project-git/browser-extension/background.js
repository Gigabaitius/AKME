/**
 * Background Service Worker - API Hub для HR Assistant
 * Централизованная точка для всех API интеграций
 */

// ==================== СОСТОЯНИЕ ====================
const state = {
  connections: {
    app: null,
    whatsapp: null
  },
  apis: {
    whatsapp: { connected: false, lastSync: null, tabId: null },
    google: { connected: false, token: null, lastSync: null },
    ocr: { connected: false, apiKey: null },
    telegram: { connected: false, botToken: null, chatId: null },
    sms: { connected: false, provider: null, credentials: null }
  },
  queue: {
    messages: [],
    processing: false
  },
  cache: new Map(),
  settings: {}
};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🚀 HR Assistant Extension installed:', details.reason);
  
  // Загружаем настройки
  await loadSettings();
  
  // Устанавливаем периодические задачи
  setupAlarms();
  
  // Проверяем WhatsApp при установке
  checkWhatsAppConnection();
  
  // Показываем уведомление
  if (details.reason === 'install') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'HR Assistant Extension',
      message: 'Расширение успешно установлено! Откройте приложение для настройки.'
    });
  }
});

// ==================== КОММУНИКАЦИЯ С ПРИЛОЖЕНИЕМ ====================
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  // Проверяем, что сообщение от нашего приложения
  if (!isAllowedOrigin(sender.origin)) {
    sendResponse({ error: 'Unauthorized origin' });
    return;
  }

  handleAppMessage(request, sendResponse);
  return true; // Асинхронный ответ
});

// Обработка сообщений от приложения
async function handleAppMessage(request, sendResponse) {
  console.log('📨 Message from app:', request.type);

  try {
    switch (request.type) {
      case 'PING':
        sendResponse({
          connected: true,
          version: chrome.runtime.getManifest().version,
          apis: getApisStatus()
        });
        break;

      case 'GET_STATUS':
        sendResponse({
          success: true,
          status: getExtensionStatus()
        });
        break;

      case 'CONNECT_GOOGLE':
        const googleAuth = await connectGoogleSheets();
        sendResponse(googleAuth);
        break;

      case 'CONNECT_WHATSAPP':
        const whatsappStatus = await connectWhatsApp();
        sendResponse(whatsappStatus);
        break;

      case 'SEND_WHATSAPP':
        const sendResult = await sendWhatsAppMessage(request.data);
        sendResponse(sendResult);
        break;

      case 'GET_WHATSAPP_CHATS':
        const chats = await getWhatsAppChats();
        sendResponse(chats);
        break;

      case 'PROCESS_OCR':
        const ocrResult = await processOCR(request.data);
        sendResponse(ocrResult);
        break;

      case 'SHEETS_OPERATION':
        const sheetsResult = await performSheetsOperation(request.data);
        sendResponse(sheetsResult);
        break;

      case 'SEND_TELEGRAM':
        const telegramResult = await sendTelegramMessage(request.data);
        sendResponse(telegramResult);
        break;

      case 'SEND_SMS':
        const smsResult = await sendSMS(request.data);
        sendResponse(smsResult);
        break;

      case 'UPDATE_SETTINGS':
        await updateSettings(request.data);
        sendResponse({ success: true });
        break;

      case 'CLEAR_CACHE':
        state.cache.clear();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Unknown error' 
    });
  }
}

// ==================== GOOGLE SHEETS API ====================
async function connectGoogleSheets() {
  try {
    // Используем Chrome Identity API для OAuth
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });

    // Сохраняем токен
    state.apis.google.token = token;
    state.apis.google.connected = true;
    state.apis.google.lastSync = new Date().toISOString();
    
    await saveSettings();

    // Получаем информацию о пользователе
    const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());

    return {
      success: true,
      connected: true,
      user: userInfo,
      token: token
    };
  } catch (error) {
    console.error('Google Sheets connection error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function performSheetsOperation(data) {
  const { operation, spreadsheetId, range, values } = data;
  const token = state.apis.google.token;

  if (!token) {
    throw new Error('Google Sheets not connected');
  }

  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  
  try {
    let response;
    
    switch (operation) {
      case 'read':
        response = await fetch(`${baseUrl}/values/${range}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        break;

      case 'write':
        response = await fetch(`${baseUrl}/values/${range}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values })
        });
        break;

      case 'append':
        response = await fetch(`${baseUrl}/values/${range}:append?valueInputOption=USER_ENTERED`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values })
        });
        break;

      case 'clear':
        response = await fetch(`${baseUrl}/values/${range}:clear`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        break;

      case 'create':
        response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: { title: data.title || 'HR Assistant Data' },
            sheets: data.sheets || [{ properties: { title: 'Candidates' } }]
          })
        });
        break;

      default:
        throw new Error('Unknown operation');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Sheets API error');
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Sheets operation error:', error);
    
    // Если токен истек, пробуем обновить
    if (error.message.includes('401')) {
      await refreshGoogleToken();
      return performSheetsOperation(data); // Повторяем операцию
    }
    
    throw error;
  }
}

async function refreshGoogleToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token: state.apis.google.token }, () => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          state.apis.google.connected = false;
          reject(chrome.runtime.lastError);
        } else {
          state.apis.google.token = token;
          resolve(token);
        }
      });
    });
  });
}

// ==================== WHATSAPP INTEGRATION ====================
async function connectWhatsApp() {
  try {
    // Ищем вкладку с WhatsApp Web
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    
    if (tabs.length === 0) {
      // Открываем WhatsApp Web в новой вкладке
      const tab = await chrome.tabs.create({ url: 'https://web.whatsapp.com' });
      state.apis.whatsapp.tabId = tab.id;
      
      return {
        success: true,
        message: 'WhatsApp Web открыт. Пожалуйста, войдите в аккаунт.',
        tabId: tab.id
      };
    }
    
    // Проверяем соединение с существующей вкладкой
    const tab = tabs[0];
    state.apis.whatsapp.tabId = tab.id;
    
    // Отправляем ping в content script
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    
    if (response && response.connected) {
      state.apis.whatsapp.connected = true;
      state.apis.whatsapp.lastSync = new Date().toISOString();
      await saveSettings();
      
      return {
        success: true,
        connected: true,
        tabId: tab.id
      };
    }
    
    return {
      success: false,
      message: 'WhatsApp Web не готов. Проверьте авторизацию.'
    };
  } catch (error) {
    console.error('WhatsApp connection error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function sendWhatsAppMessage(data) {
  const { phone, message, attachments } = data;
  
  if (!state.apis.whatsapp.connected || !state.apis.whatsapp.tabId) {
    throw new Error('WhatsApp not connected');
  }

  try {
    const response = await chrome.tabs.sendMessage(state.apis.whatsapp.tabId, {
      type: 'SEND_MESSAGE',
      data: { phone, message, attachments }
    });
    
    return response;
  } catch (error) {
    // Пробуем переподключиться
    await connectWhatsApp();
    throw new Error('WhatsApp connection lost. Please reconnect.');
  }
}

async function getWhatsAppChats() {
  if (!state.apis.whatsapp.connected || !state.apis.whatsapp.tabId) {
    throw new Error('WhatsApp not connected');
  }

  try {
    const response = await chrome.tabs.sendMessage(state.apis.whatsapp.tabId, {
      type: 'GET_CHATS'
    });
    
    return response;
  } catch (error) {
    console.error('Error getting WhatsApp chats:', error);
    throw error;
  }
}

// Слушаем сообщения от WhatsApp content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.tab?.url?.includes('web.whatsapp.com')) {
    handleWhatsAppMessage(request, sendResponse);
    return true;
  }
});

function handleWhatsAppMessage(request, sendResponse) {
  switch (request.type) {
    case 'WHATSAPP_READY':
      state.apis.whatsapp.connected = true;
      state.apis.whatsapp.lastSync = new Date().toISOString();
      saveSettings();
      sendResponse({ success: true });
      break;

    case 'NEW_MESSAGE':
      // Пересылаем в приложение
      forwardToApp('whatsapp_message', request.data);
      sendResponse({ success: true });
      break;

    case 'STATUS_UPDATE':
      state.apis.whatsapp = { ...state.apis.whatsapp, ...request.data };
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

// ==================== OCR PROCESSING ====================
async function processOCR(data) {
  const { image, language = 'rus', engine = 'tesseract' } = data;
  
  if (engine === 'ocr.space' && state.apis.ocr.apiKey) {
    // Используем OCR.space API
    const formData = new FormData();
    formData.append('base64Image', image);
    formData.append('language', language);
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    
    try {
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'apikey': state.apis.ocr.apiKey
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage);
      }
      
      return {
        success: true,
        text: result.ParsedResults[0].ParsedText,
        confidence: result.ParsedResults[0].TextOverlay?.Lines?.[0]?.Words?.[0]?.Confidence || 0
      };
    } catch (error) {
      console.error('OCR.space error:', error);
      // Fallback to Tesseract
    }
  }
  
  // Используем Tesseract.js через приложение
  return {
    success: false,
    message: 'Use Tesseract.js in the app'
  };
}

// ==================== TELEGRAM API ====================
async function sendTelegramMessage(data) {
  const { chatId, message, parseMode = 'HTML' } = data;
  const botToken = state.apis.telegram.botToken;
  
  if (!botToken) {
    throw new Error('Telegram bot not configured');
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId || state.apis.telegram.chatId,
        text: message,
        parse_mode: parseMode
      })
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.description || 'Telegram API error');
    }
    
    return { success: true, messageId: result.result.message_id };
  } catch (error) {
    console.error('Telegram send error:', error);
    throw error;
  }
}

// ==================== SMS (TWILIO) ====================
async function sendSMS(data) {
  const { to, body } = data;
  const { accountSid, authToken, from } = state.apis.sms.credentials || {};
  
  if (!accountSid || !authToken) {
    throw new Error('SMS provider not configured');
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: from,
          To: to,
          Body: body
        })
      }
    );
    
    const result = await response.json();
    
    if (result.error_code) {
      throw new Error(result.error_message || 'SMS sending failed');
    }
    
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS send error:', error);
    throw error;
  }
}

// ==================== УТИЛИТЫ ====================
function isAllowedOrigin(origin) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];
  return allowedOrigins.includes(origin);
}

function getExtensionStatus() {
  return {
    version: chrome.runtime.getManifest().version,
    apis: getApisStatus(),
    queue: {
      pending: state.queue.messages.length,
      processing: state.queue.processing
    },
    cache: {
      size: state.cache.size
    }
  };
}

function getApisStatus() {
  return {
    whatsapp: {
      connected: state.apis.whatsapp.connected,
      lastSync: state.apis.whatsapp.lastSync
    },
    google: {
      connected: state.apis.google.connected,
      lastSync: state.apis.google.lastSync
    },
    ocr: {
      connected: !!state.apis.ocr.apiKey
    },
    telegram: {
      connected: !!state.apis.telegram.botToken
    },
    sms: {
      connected: !!state.apis.sms.credentials
    }
  };
}

async function forwardToApp(type, data) {
  // Отправляем сообщение в приложение
  const tabs = await chrome.tabs.query({ 
    url: ['http://localhost:3000/*', 'http://localhost:5173/*']
  });
  
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'EXTENSION_EVENT',
      event: type,
      data: data
    });
  }
}

// ==================== ПЕРИОДИЧЕСКИЕ ЗАДАЧИ ====================
function setupAlarms() {
  // Проверка соединений каждые 5 минут
  chrome.alarms.create('checkConnections', { periodInMinutes: 5 });
  
  // Очистка кэша каждый час
  chrome.alarms.create('clearCache', { periodInMinutes: 60 });
  
  // Обработка очереди каждые 30 секунд
  chrome.alarms.create('processQueue', { periodInMinutes: 0.5 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case 'checkConnections':
      checkAllConnections();
      break;
    case 'clearCache':
      clearOldCache();
      break;
    case 'processQueue':
      processMessageQueue();
      break;
  }
});

async function checkAllConnections() {
  // Проверяем WhatsApp
  if (state.apis.whatsapp.tabId) {
    try {
      await chrome.tabs.get(state.apis.whatsapp.tabId);
    } catch {
      state.apis.whatsapp.connected = false;
      state.apis.whatsapp.tabId = null;
    }
  }
  
  // Проверяем Google токен
  if (state.apis.google.token) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        headers: { Authorization: `Bearer ${state.apis.google.token}` }
      });
      if (!response.ok) {
        await refreshGoogleToken();
      }
    } catch {
      state.apis.google.connected = false;
    }
  }
}

function checkWhatsAppConnection() {
  chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
    if (tabs.length > 0) {
      state.apis.whatsapp.tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'PING' }, (response) => {
        if (response && response.connected) {
          state.apis.whatsapp.connected = true;
          state.apis.whatsapp.lastSync = new Date().toISOString();
        }
      });
    }
  });
}

function clearOldCache() {
  const maxAge = 60 * 60 * 1000; // 1 час
  const now = Date.now();
  
  for (const [key, value] of state.cache.entries()) {
    if (now - value.timestamp > maxAge) {
      state.cache.delete(key);
    }
  }
}

async function processMessageQueue() {
  if (state.queue.processing || state.queue.messages.length === 0) {
    return;
  }
  
  state.queue.processing = true;
  
  try {
    while (state.queue.messages.length > 0) {
      const message = state.queue.messages.shift();
      await processQueuedMessage(message);
      
      // Задержка между сообщениями
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } finally {
    state.queue.processing = false;
  }
}

async function processQueuedMessage(message) {
  try {
    switch (message.type) {
      case 'whatsapp':
        await sendWhatsAppMessage(message.data);
        break;
      case 'telegram':
        await sendTelegramMessage(message.data);
        break;
      case 'sms':
        await sendSMS(message.data);
        break;
    }
  } catch (error) {
    console.error('Error processing queued message:', error);
    // Можно добавить повторную попытку
  }
}

// ==================== НАСТРОЙКИ ====================
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings', 'apis'], (result) => {
      if (result.settings) {
        state.settings = result.settings;
      }
      if (result.apis) {
        state.apis = { ...state.apis, ...result.apis };
      }
      resolve();
    });
  });
}

async function saveSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      settings: state.settings,
      apis: state.apis
    }, resolve);
  });
}

async function updateSettings(newSettings) {
  state.settings = { ...state.settings, ...newSettings };
  
  // Обновляем API credentials если есть
  if (newSettings.apis) {
    state.apis = { ...state.apis, ...newSettings.apis };
  }
  
  await saveSettings();
}

// ==================== ОБРАБОТКА ЗАКРЫТИЯ ВКЛАДОК ====================
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === state.apis.whatsapp.tabId) {
    state.apis.whatsapp.connected = false;
    state.apis.whatsapp.tabId = null;
    forwardToApp('whatsapp_disconnected', {});
  }
});

// ==================== ЭКСПОРТ ДЛЯ POPUP ====================
// Делаем некоторые функции доступными для popup.js
window.extensionAPI = {
  getStatus: getExtensionStatus,
  getApisStatus: getApisStatus,
  connectGoogle: connectGoogleSheets,
  connectWhatsApp: connectWhatsApp,
  updateSettings: updateSettings
};

console.log('✅ HR Assistant Extension Background Service Worker loaded');
