// src/controllers/TrainingController.js
/**
 * Контроллер обучения GPT
 * @description Управляет процессом обучения и взаимодействия с GPT
 */
import BaseController from './BaseController.js';
import KnowledgeStore from '../stores/KnowledgeStore.js';
import GoogleSheetsService from '../services/GoogleSheetsService.js';

class TrainingController extends BaseController {
  constructor() {
    super();
    this.knowledgeStore = KnowledgeStore;
    this.chatHistory = [];
    this.isTraining = false;
    
    this.initializeEventListeners();
  }

  /**
   * Инициализация слушателей событий
   */
  initializeEventListeners() {
    this.eventBus.on('training:start', this.startTraining.bind(this));
    this.eventBus.on('training:stop', this.stopTraining.bind(this));
  }

  /**
   * Отправка сообщения для обучения
   * @param {string} message - Сообщение пользователя
   * @returns {Promise<string>} Ответ GPT
   */
  async sendMessage(message) {
    try {
      this.setLoading(true);
      
      // Добавляем сообщение пользователя в историю
      const userMessage = {
        id: this.generateMessageId(),
        type: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString()
      };
      
      this.chatHistory.push(userMessage);
      this.eventBus.emit('training:messageAdded', userMessage);
      
      // Генерируем ответ GPT (имитация)
      const botResponse = await this.generateGPTResponse(message);
      
      const botMessage = {
        id: this.generateMessageId(),
        type: 'bot',
        content: botResponse,
        timestamp: new Date().toISOString()
      };
      
      this.chatHistory.push(botMessage);
      this.eventBus.emit('training:messageAdded', botMessage);
      
      // Сохраняем в базу знаний если это важная информация
      await this.processTrainingMessage(message, botResponse);
      
      return botResponse;
    } catch (error) {
      this.handleError(error, 'sendMessage');
      return 'Извините, произошла ошибка при обработке сообщения.';
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Генерация ответа GPT
   * @param {string} userMessage - Сообщение пользователя
   * @returns {Promise<string>} Ответ
   */
  async generateGPTResponse(userMessage) {
    // Здесь должна быть интеграция с реальным GPT API
    // Пока используем заготовленные ответы
    
    const responses = [
      'Понял, запомнил эту информацию. Что еще нужно изучить?',
      'Спасибо за обучение! Расскажите больше об этом проекте.',
      'Интересно! Как это применяется на практике?',
      'Я обработал эту информацию. Есть еще вопросы по этой теме?',
      'Отлично! Эти знания помогут мне лучше работать с кандидатами.',
      'Понятно. А как часто возникают такие ситуации?',
      'Записал! Какие еще нюансы важно учитывать?',
      'Хорошо, теперь я знаю как отвечать в подобных случаях.',
      'Можете привести конкретный пример такой ситуации?',
      'Понимаю. Сохраню это в базе знаний для будущего использования.'
    ];
    
    // Добавляем задержку для имитации обработки
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Выбираем случайный ответ или генерируем на основе контекста
    if (userMessage.toLowerCase().includes('проект')) {
      return 'Расскажите подробнее об особенностях этого проекта. Какие требования к кандидатам?';
    }
    
    if (userMessage.toLowerCase().includes('документы')) {
      return 'Понял про документы. Что делать если кандидат прислал нечеткие фото документов?';
    }
    
    if (userMessage.toLowerCase().includes('возражение')) {
      return 'Записал это возражение. Как лучше на него отвечать? Можете показать пример диалога?';
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Обработка обучающего сообщения
   * @param {string} userMessage - Сообщение пользователя
   * @param {string} botResponse - Ответ бота
   */
  async processTrainingMessage(userMessage, botResponse) {
    try {
      // Определяем категорию обучения
      const category = this.determineCategory(userMessage);
      
      // Если это важная информация, сохраняем в базу знаний
      if (this.isImportantInfo(userMessage)) {
        await this.saveToKnowledgeBase(userMessage, category);
      }
      
      // Сохраняем диалог для анализа
      await this.saveDialogHistory(userMessage, botResponse);
      
    } catch (error) {
      this.logger.warn('Ошибка обработки обучающего сообщения', error);
    }
  }

  /**
   * Определение категории сообщения
   * @param {string} message - Сообщение
   * @returns {string} Категория
   */
  determineCategory(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('проект') || lowerMessage.includes('вакансия')) {
      return 'Проекты';
    }
    
    if (lowerMessage.includes('документ') || lowerMessage.includes('паспорт')) {
      return 'Документы';
    }
    
    if (lowerMessage.includes('возражение') || lowerMessage.includes('отказ')) {
      return 'Возражения';
    }
    
    if (lowerMessage.includes('скрипт') || lowerMessage.includes('ответ')) {
      return 'Скрипты';
    }
    
    return 'Общее';
  }

  /**
   * Проверка важности информации
   * @param {string} message - Сообщение
   * @returns {boolean} Важна ли информация
   */
  isImportantInfo(message) {
    const importantKeywords = [
      'важно', 'обязательно', 'всегда', 'никогда', 'правило',
      'процедура', 'требование', 'условие', 'стандарт'
    ];
    
    const lowerMessage = message.toLowerCase();
    return importantKeywords.some(keyword => lowerMessage.includes(keyword)) || 
           message.length > 50; // Длинные сообщения обычно содержат важную информацию
  }

  /**
   * Сохранение в базу знаний
   * @param {string} content - Содержание
   * @param {string} category - Категория
   */
  async saveToKnowledgeBase(content, category) {
    try {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      
      const knowledge = {
        title,
        category,
        content,
        source: 'training',
        createdAt: new Date().toISOString()
      };
      
      await this.knowledgeStore.create(knowledge);
      this.eventBus.emit('knowledge:created', knowledge);
      
    } catch (error) {
      this.logger.warn('Ошибка сохранения в базу знаний', error);
    }
  }

  /**
   * Сохранение истории диалога
   * @param {string} userMessage - Сообщение пользователя
   * @param {string} botResponse - Ответ бота
   */
  async saveDialogHistory(userMessage, botResponse) {
    try {
      // Сохраняем в Google Sheets для анализа
      const dialogData = {
        timestamp: new Date().toISOString(),
        userMessage,
        botResponse,
        category: this.determineCategory(userMessage)
      };
      
      await GoogleSheetsService.saveTrainingDialog(dialogData);
      
    } catch (error) {
      this.logger.warn('Ошибка сохранения истории диалога', error);
    }
  }

  /**
   * Очистка истории чата
   */
  clearChatHistory() {
    this.chatHistory = [];
    this.eventBus.emit('training:historyCleared');
    this.eventBus.emit('notification:info', 'История чата очищена');
  }

  /**
   * Получение истории чата
   * @returns {Array} История сообщений
   */
  getChatHistory() {
    return [...this.chatHistory];
  }

  /**
   * Экспорт истории чата
   * @returns {string} CSV контент
   */
  exportChatHistory() {
    const headers = ['Время', 'Тип', 'Сообщение'];
    
    const rows = this.chatHistory.map(msg => [
      new Date(msg.timestamp).toLocaleString('ru-RU'),
      msg.type === 'user' ? 'Пользователь' : 'GPT',
      msg.content.replace(/"/g, '""') // Экранируем кавычки
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => `"${row.join('","')}"`)
    ].join('\n');
  }

  /**
   * Загрузка файла для обучения
   * @param {File} file - Файл
   * @returns {Promise<boolean>} Успех операции
   */
  async uploadTrainingFile(file) {
    try {
      this.setLoading(true);
      
      const content = await this.readFileContent(file);
      
      // Добавляем содержимое файла как сообщение от пользователя
      const message = `Загружен файл: ${file.name}\n\nСодержимое:\n${content}`;
      
      await this.sendMessage(message);
      
      this.eventBus.emit('notification:success', `Файл ${file.name} успешно загружен`);
      return true;
      
    } catch (error) {
      this.handleError(error, 'uploadTrainingFile');
      this.eventBus.emit('notification:error', 'Ошибка загрузки файла');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Чтение содержимого файла
   * @param {File} file - Файл
   * @returns {Promise<string>} Содержимое файла
   */
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Ошибка чтения файла'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Генерация ID сообщения
   * @returns {string} Уникальный ID
   */
  generateMessageId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Запуск режима обучения
   */
  startTraining() {
    this.isTraining = true;
    this.eventBus.emit('training:started');
    this.eventBus.emit('notification:info', 'Режим обучения активирован');
  }

  /**
   * Остановка режима обучения
   */
  stopTraining() {
    this.isTraining = false;
    this.eventBus.emit('training:stopped');
    this.eventBus.emit('notification:info', 'Режим обучения отключен');
  }

  /**
   * Получение статистики обучения
   * @returns {Object} Статистика
   */
  getTrainingStatistics() {
    return {
      totalMessages: this.chatHistory.length,
      userMessages: this.chatHistory.filter(m => m.type === 'user').length,
      botMessages: this.chatHistory.filter(m => m.type === 'bot').length,
      sessionsCount: 1, // Можно расширить для подсчета сессий
      lastActivity: this.chatHistory.length > 0 ? 
        this.chatHistory[this.chatHistory.length - 1].timestamp : null
    };
  }
}

export default TrainingController;