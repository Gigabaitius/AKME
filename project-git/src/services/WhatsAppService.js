// src/services/WhatsAppService.js
/**
 * WhatsAppService - интеграция с WhatsApp через Wazzap24 API
 * @description Обработка сообщений, отправка SMS, управление чатами
 */

import { recognizeTextFromImage } from './OCRService';
import { matchProjectByScript } from './ProjectService';

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.REACT_APP_WAZZAP_API_URL || 'https://api.wazzap24.com';
    this.apiKey = process.env.REACT_APP_WAZZAP_API_KEY || '';
    this.isConnected = false;
    this.messageQueue = [];
    this.chatHandlers = new Map();
    
    // Инициализация соединения с расширением браузера
    this.initExtensionConnection();
  }

  /**
   * Инициализация соединения с браузерным расширением
   * @description Устанавливает связь с content script для получения сообщений
   */
  initExtensionConnection() {
    // Слушаем сообщения от расширения браузера
    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data.type) return;
      
      switch (event.data.type) {
        case 'WHATSAPP_MESSAGE_RECEIVED':
          this.handleIncomingMessage(event.data.payload);
          break;
        case 'WHATSAPP_CONNECTED':
          this.isConnected = true;
          this.onConnectionStatusChange(true);
          break;
        case 'WHATSAPP_DISCONNECTED':
          this.isConnected = false;
          this.onConnectionStatusChange(false);
          break;
        case 'WHATSAPP_IMAGE_RECEIVED':
          this.handleImageMessage(event.data.payload);
          break;
        default:
          break;
      }
    });
    
    // Отправляем сигнал готовности расширению
    this.sendToExtension('APP_READY', {});
  }

  /**
   * Отправка сообщения расширению браузера
   * @param {string} type - Тип сообщения
   * @param {Object} payload - Данные сообщения
   */
  sendToExtension(type, payload) {
    window.postMessage({
      type: `HR_ASSISTANT_${type}`,
      payload
    }, '*');
  }

  /**
   * Обработка входящего сообщения
   * @param {Object} messageData - Данные сообщения
   */
  async handleIncomingMessage(messageData) {
    const { chatId, message, contact, timestamp } = messageData;
    
    try {
      // Проверяем, есть ли обработчик для этого чата
      if (this.chatHandlers.has(chatId)) {
        const handler = this.chatHandlers.get(chatId);
        await handler(messageData);
        return;
      }

      // Автоматическая обработка нового контакта
      await this.processNewContact(messageData);
      
    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
    }
  }

  /**
   * Обработка изображения (документов)
   * @param {Object} imageData - Данные изображения
   */
  async handleImageMessage(imageData) {
    const { chatId, imageUrl, imageBlob, contact } = imageData;
    
    try {
      // OCR обработка изображения
      const recognizedText = await recognizeTextFromImage(imageBlob);
      
      if (recognizedText) {
        // Извлекаем паспортные данные
        const passportData = this.extractPassportData(recognizedText);
        
        if (passportData) {
          // Создаем/обновляем кандидата
          await this.createCandidateFromDocument(contact, passportData, chatId);
          
          // Отправляем подтверждение
          await this.sendMessage(chatId, 'Документы получены и обработаны. Спасибо!');
        } else {
          // Не удалось распознать документ
          await this.sendMessage(chatId, 'Не удалось считать документ. Пожалуйста, отправьте более четкое фото.');
        }
      }
      
    } catch (error) {
      console.error('Ошибка обработки изображения:', error);
      await this.sendMessage(chatId, 'Произошла ошибка при обработке документа. Попробуйте еще раз.');
    }
  }

  /**
   * Извлечение паспортных данных из текста
   * @param {string} text - Распознанный текст
   * @returns {Object|null} Паспортные данные или null
   */
  extractPassportData(text) {
    try {
      const data = {};
      
      // Регулярные выражения для извлечения данных
      const patterns = {
        passport: /(\d{2}\s?\d{2})\s?(\d{6})/,
        inn: /(\d{12})/,
        snils: /(\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{2})/,
        fullName: /([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/,
        birthDate: /(\d{2}\.\d{2}\.\d{4})/,
        issueDate: /выдан\s+(\d{2}\.\d{2}\.\d{4})/i,
        issuedBy: /выдан\s+(.+?)(?=\n|\r|$)/i
      };

      // Извлекаем данные по паттернам
      for (const [key, pattern] of Object.entries(patterns)) {
        const match = text.match(pattern);
        if (match) {
          data[key] = key === 'passport' ? `${match[1]} ${match[2]}` : match[1];
        }
      }

      // Проверяем, достаточно ли данных
      if (data.passport || data.inn || data.snils) {
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка извлечения данных:', error);
      return null;
    }
  }

  /**
   * Создание кандидата из документа
   * @param {Object} contact - Контактные данные
   * @param {Object} passportData - Паспортные данные
   * @param {string} chatId - ID чата
   */
  async createCandidateFromDocument(contact, passportData, chatId) {
    const candidateData = {
      name: passportData.fullName || contact.name,
      phone: contact.phone,
      chatId,
      passport: passportData.passport,
      inn: passportData.inn,
      snils: passportData.snils,
      birthDate: passportData.birthDate,
      passportIssueDate: passportData.issueDate,
      passportIssuedBy: passportData.issuedBy,
      status: 'Документы получены',
      lastReply: new Date().toISOString(),
      documentProcessed: true,
      documentError: null
    };

    // Отправляем событие в приложение для создания кандидата
    window.dispatchEvent(new CustomEvent('candidateFromDocument', {
      detail: candidateData
    }));
  }

  /**
   * Обработка нового контакта
   * @param {Object} messageData - Данные сообщения
   */
  async processNewContact(messageData) {
    const { chatId, message, contact } = messageData;
    const candidateData = await this.createCandidateFromDocument(contact, null, chatId);
    if (candidateData) {
      // Отправляем событие в приложение для создания кандидата
      window.dispatchEvent(new CustomEvent('candidateFromDocument', {
        detail: candidateData
      }));
    }
  } 
    /**
     * Отправка сообщения в чат
     * @param {string} chatId - ID чата
     * @param {string} message - Текст сообщения
     */
    async sendMessage(chatId, message) {
        try {
            const response = await fetch(`${this.apiUrl}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({ chatId, message })
            });

            if (!response.ok) {
                throw new Error(`Ошибка отправки сообщения: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            throw error;
        }
    }
}   
// src/services/WhatsAppService.js
/**
 * WhatsAppService - интеграция с WhatsApp через Wazzap24 API
 * @description Обработка сообщений, отправка SMS, управление чатами
 */

import { recognizeTextFromImage } from './OCRService';
import { matchProjectByScript } from './ProjectService';

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.REACT_APP_WAZZAP_API_URL || 'https://api.wazzap24.com';
    this.apiKey = process.env.REACT_APP_WAZZAP_API_KEY || '';
    this.isConnected = false;
    this.messageQueue = [];
    this.chatHandlers = new Map();
    
    // Инициализация соединения с расширением браузера
    this.initExtensionConnection();
  }

  /**
   * Инициализация соединения с браузерным расширением
   * @description Устанавливает связь с content script для получения сообщений
   */
  initExtensionConnection() {
    // Слушаем сообщения от расширения браузера
    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data.type) return;
      
      switch (event.data.type) {
        case 'WHATSAPP_MESSAGE_RECEIVED':
          this.handleIncomingMessage(event.data.payload);
          break;
        case 'WHATSAPP_CONNECTED':
          this.isConnected = true;
          this.onConnectionStatusChange(true);
          break;
        case 'WHATSAPP_DISCONNECTED':
          this.isConnected = false;
          this.onConnectionStatusChange(false);
          break;
        case 'WHATSAPP_IMAGE_RECEIVED':
          this.handleImageMessage(event.data.payload);
          break;
        default:
          break;
      }
    });
    
    // Отправляем сигнал готовности расширению
    this.sendToExtension('APP_READY', {});
  }

  /**
   * Отправка сообщения расширению браузера
   * @param {string} type - Тип сообщения
   * @param {Object} payload - Данные сообщения
   */
  sendToExtension(type, payload) {
    window.postMessage({
      type: `HR_ASSISTANT_${type}`,
      payload
    }, '*');
  }

  /**
   * Обработка входящего сообщения
   * @param {Object} messageData - Данные сообщения
   */
  async handleIncomingMessage(messageData) {
    const { chatId, message, contact, timestamp } = messageData;
    
    try {
      // Проверяем, есть ли обработчик для этого чата
      if (this.chatHandlers.has(chatId)) {
        const handler = this.chatHandlers.get(chatId);
        await handler(messageData);
        return;
      }

      // Автоматическая обработка нового контакта
      await this.processNewContact(messageData);
      
    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
    }
  }

  /**
   * Обработка изображения (документов)
   * @param {Object} imageData - Данные изображения
   */
  async handleImageMessage(imageData) {
    const { chatId, imageUrl, imageBlob, contact } = imageData;
    
    try {
      // OCR обработка изображения
      const recognizedText = await recognizeTextFromImage(imageBlob);
      
      if (recognizedText) {
        // Извлекаем паспортные данные
        const passportData = this.extractPassportData(recognizedText);
        
        if (passportData) {
          // Создаем/обновляем кандидата
          await this.createCandidateFromDocument(contact, passportData, chatId);
          
          // Отправляем подтверждение
          await this.sendMessage(chatId, 'Документы получены и обработаны. Спасибо!');
        } else {
          // Не удалось распознать документ
          await this.sendMessage(chatId, 'Не удалось считать документ. Пожалуйста, отправьте более четкое фото.');
        }
      }
      
    } catch (error) {
      console.error('Ошибка обработки изображения:', error);
      await this.sendMessage(chatId, 'Произошла ошибка при обработке документа. Попробуйте еще раз.');
    }
  }

  /**
   * Извлечение паспортных данных из текста
   * @param {string} text - Распознанный текст
   * @returns {Object|null} Паспортные данные или null
   */
  extractPassportData(text) {
    try {
      const data = {};
      
      // Регулярные выражения для извлечения данных
      const patterns = {
        passport: /(\d{2}\s?\d{2})\s?(\d{6})/,
        inn: /(\d{12})/,
        snils: /(\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{2})/,
        fullName: /([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/,
        birthDate: /(\d{2}\.\d{2}\.\d{4})/,
        issueDate: /выдан\s+(\d{2}\.\d{2}\.\d{4})/i,
        issuedBy: /выдан\s+(.+?)(?=\n|\r|$)/i
      };

      // Извлекаем данные по паттернам
      for (const [key, pattern] of Object.entries(patterns)) {
        const match = text.match(pattern);
        if (match) {
          data[key] = key === 'passport' ? `${match[1]} ${match[2]}` : match[1];
        }
      }

      // Проверяем, достаточно ли данных
      if (data.passport || data.inn || data.snils) {
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка извлечения данных:', error);
      return null;
    }
  }

  /**
   * Создание кандидата из документа
   * @param {Object} contact - Контактные данные
   * @param {Object} passportData - Паспортные данные
   * @param {string} chatId - ID чата
   */
  async createCandidateFromDocument(contact, passportData, chatId) {
    const candidateData = {
      name: passportData.fullName || contact.name,
      phone: contact.phone,
      chatId,
      passport: passportData.passport,
      inn: passportData.inn,
      snils: passportData.snils,
      birthDate: passportData.birthDate,
      passportIssueDate: passportData.issueDate,
      passportIssuedBy: passportData.issuedBy,
      status: 'Документы получены',
      lastReply: new Date().toISOString(),
      documentProcessed: true,
      documentError: null
    };

    // Отправляем событие в приложение для создания кандидата
    window.dispatchEvent(new CustomEvent('candidateFromDocument', {
      detail: candidateData
    }));
  }

  /**
   * Обработка нового контакта
   * @param {Object} messageData - Данные сообщения
   */
  async processNewContact(messageData) {
    const { chatId, message, contact } = messageData;
    
    try {
      // Определяем проект по сообщению
      const project = await matchProjectByScript(message);
      
      // Создаем базового кандидата
      const candidateData = {
        name: contact.name,
        phone: contact.phone,
        chatId,
        project: project?.name || 'Не определен',
        status: 'Новый',
        lastReply: new Date().toISOString(),
        firstMessage: message,
        documentProcessed: false
      };

      // Отправляем событие в приложение
      window.dispatchEvent(new CustomEvent('newCandidate', {
        detail: candidateData
      }));

      // Автоматический ответ на основе проекта
      if (project) {
        await this.sendMessage(chatId, project.autoResponse);
      } else {
        await this.sendMessage(chatId, 'Здравствуйте! Спасибо за ваш интерес. Уточните, пожалуйста, по какой вакансии вы обращаетесь?');
      }
      
    } catch (error) {
      console.error('Ошибка обработки нового контакта:', error);
    }
  }

  /**
   * Отправка сообщения в WhatsApp
   * @param {string} chatId - ID чата
   * @param {string} message - Текст сообщения
   * @returns {Promise<boolean>} Успех отправки
   */
  async sendMessage(chatId, message) {
    try {
      // Отправляем через расширение браузера
      this.sendToExtension('SEND_MESSAGE', { chatId, message });
      
      // Также можно использовать API Wazzap24
      if (this.apiKey) {
        const response = await fetch(`${this.apiUrl}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            chatId,
            text: message
          })
        });
        
        return response.ok;
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      return false;
    }
  }

  /**
   * Отправка массовой рассылки
   * @param {Array} recipients - Список получателей
   * @param {string} message - Текст сообщения
   * @returns {Promise<Object>} Результат рассылки
   */
  async sendBulkMessage(recipients, message) {
    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const recipient of recipients) {
      try {
        const success = await this.sendMessage(recipient.chatId, message);
        if (success) {
          results.sent++;
        } else {
          results.failed++;
        }
        
        // Задержка между сообщениями
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          recipient: recipient.phone,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Получение списка чатов
   * @returns {Promise<Array>} Список чатов
   */
  async getChats() {
    try {
      if (this.apiKey) {
        const response = await fetch(`${this.apiUrl}/chats`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        });
        
        if (response.ok) {
          return await response.json();
        }
      }
      
      // Запрос через расширение
      this.sendToExtension('GET_CHATS', {});
      
      return [];
    } catch (error) {
      console.error('Ошибка получения чатов:', error);
      return [];
    }
  }

  /**
   * Установка обработчика для конкретного чата
   * @param {string} chatId - ID чата
   * @param {Function} handler - Функция обработчик
   */
  setChatHandler(chatId, handler) {
    this.chatHandlers.set(chatId, handler);
  }

  /**
   * Удаление обработчика чата
   * @param {string} chatId - ID чата
   */
  removeChatHandler(chatId) {
    this.chatHandlers.delete(chatId);
  }

  /**
   * Обработчик изменения статуса подключения
   * @param {boolean} connected - Статус подключения
   */
  onConnectionStatusChange(connected) {
    // Отправляем событие в приложение
    window.dispatchEvent(new CustomEvent('whatsappConnectionChange', {
      detail: { connected }
    }));
  }

  /**
   * Автоматическая проверка молчащих кандидатов
   * @description Проверяет кандидатов без ответа более 8 часов
   */
  async checkSilentCandidates() {
    const candidates = JSON.parse(localStorage.getItem('hr-assistant-data') || '{}').candidates || [];
    const now = new Date();
    const silentThreshold = 8 * 60 * 60 * 1000; // 8 часов в миллисекундах

    for (const candidate of candidates) {
      if (candidate.chatId && candidate.lastReply) {
        const lastReplyTime = new Date(candidate.lastReply);
        const timeDiff = now - lastReplyTime;

        // Если молчит более 8 часов и еще не отправляли SMS
        if (timeDiff > silentThreshold && !candidate.silentSmsLast) {
          await this.sendSilentReminderSms(candidate);
        }

        // Если молчит более суток после SMS - переводим на 1-ю линию
        const transferThreshold = 24 * 60 * 60 * 1000; // 24 часа
        if (candidate.silentSmsLast && timeDiff > transferThreshold) {
          window.dispatchEvent(new CustomEvent('transferCandidate', {
            detail: { candidateId: candidate.id }
          }));
        }
      }
    }
  }

  /**
   * Отправка напоминания молчащему кандидату
   * @param {Object} candidate - Данные кандидата
   */
  async sendSilentReminderSms(candidate) {
    const reminderMessage = `Здравствуйте, ${candidate.name}! Мы ждем от вас ответ по поводу вакансии. Пожалуйста, свяжитесь с нами.`;
    
    const success = await this.sendMessage(candidate.chatId, reminderMessage);
    
    if (success) {
      // Обновляем данные кандидата
      window.dispatchEvent(new CustomEvent('updateCandidate', {
        detail: {
          id: candidate.id,
          silentSmsLast: new Date().toISOString(),
          smsAttempts: (candidate.smsAttempts || 0) + 1
        }
      }));
    }
  }

  /**
   * Получение статистики сообщений
   * @returns {Promise<Object>} Статистика
   */
  async getMessageStats() {
    try {
      // Запрос статистики через API или расширение
      this.sendToExtension('GET_STATS', {});
      
      // Возвращаем базовую статистику
      return {
        totalMessages: 0,
        unreadChats: 0,
        botReplies: 0
      };
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      return null;
    }
  }

  /**
   * Инициализация автоматических проверок
   */
  startAutomaticChecks() {
    // Проверка молчащих кандидатов каждые 30 минут
    setInterval(() => {
      this.checkSilentCandidates();
    }, 30 * 60 * 1000);

    // Проверка контрольных точек для вахтовиков каждый час
    setInterval(() => {
      this.checkShiftWorkerCheckpoints();
    }, 60 * 60 * 1000);
  }

  /**
   * Проверка контрольных точек вахтовиков
   */
  async checkShiftWorkerCheckpoints() {
    const shiftWorkers = JSON.parse(localStorage.getItem('hr-assistant-data') || '{}').shiftWorkers || [];
    const now = new Date();
    const deadlineTime = new Date();
    deadlineTime.setHours(15, 0, 0, 0); // 15:00 по МСК

    for (const worker of shiftWorkers) {
      if (worker.chatId && worker.checkpointDate) {
        const checkpointDate = new Date(worker.checkpointDate);
        
        // Если сегодня день контрольной точки и время после 15:00
        if (checkpointDate.toDateString() === now.toDateString() && now > deadlineTime) {
          if (!worker.checkpointResponse) {
            // Уведомляем о пропущенной контрольной точке
            window.dispatchEvent(new CustomEvent('missedCheckpoint', {
              detail: { workerId: worker.id }
            }));
          }
        }
      }
    }
  }
}

// Экспортируем синглтон
export default new WhatsAppService();