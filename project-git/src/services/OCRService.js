// src/services/OCRService.js
/**
 * 🔍 Сервис OCR (Optical Character Recognition)
 * @description Распознавание текста на изображениях документов
 */
import ExtensionAPIService from './ExtensionAPIService.js';
import Logger from '../utils/Logger.js';
import Tesseract from 'tesseract.js';

class OCRService {
  constructor() {
    this.logger = new Logger('OCRService');
    this.extensionAPI = ExtensionAPIService;
    this.apiKey = null;
    this.worker = null;
    this.isInitialized = false;
    
    this.initialize();
  }

  /**
   * Инициализация сервиса
   */
  async initialize() {
    try {
      // Получаем API ключ из настроек
      const settings = JSON.parse(localStorage.getItem('hr-assistant-settings') || '{}');
      this.apiKey = settings.ocrApiKey || null;
      
      // Инициализируем Tesseract.js worker
      if (!this.apiKey) {
        await this.initializeTesseract();
      }
      
      this.isInitialized = true;
      this.logger.info('OCR сервис инициализирован');
    } catch (error) {
      this.logger.error('Ошибка инициализации OCR', error);
    }
  }

  /**
   * Инициализация Tesseract.js
   */
  async initializeTesseract() {
    try {
      this.worker = await Tesseract.createWorker({
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            this.logger.debug(`Распознавание: ${progress}%`);
          }
        }
      });
      
      await this.worker.loadLanguage('rus+eng');
      await this.worker.initialize('rus+eng');
      
      this.logger.info('Tesseract.js инициализирован');
    } catch (error) {
      this.logger.error('Ошибка инициализации Tesseract', error);
      throw error;
    }
  }

  /**
   * Распознавание текста на изображении
   * @param {string|Blob|File} image - Изображение для распознавания
   * @param {Object} options - Опции распознавания
   * @returns {Promise<Object>} Результат распознавания
   */
  async recognizeText(image, options = {}) {
    try {
      // Если есть API ключ, используем OCR.space через расширение
      if (this.apiKey && this.extensionAPI.isConnected()) {
        return await this.recognizeWithOCRSpace(image, options);
      }
      
      // Иначе используем Tesseract.js
      return await this.recognizeWithTesseract(image, options);
    } catch (error) {
      this.logger.error('Ошибка распознавания текста', error);
      throw error;
    }
  }

  /**
   * Распознавание через OCR.space API
   * @param {string|Blob|File} image - Изображение
   * @param {Object} options - Опции
   * @returns {Promise<Object>} Результат
   */
  async recognizeWithOCRSpace(image, options) {
    try {
      this.logger.info('Распознавание через OCR.space API');
      
      // Конвертируем изображение в base64
      const base64 = await this.imageToBase64(image);
      
      // Отправляем через расширение
      const result = await this.extensionAPI.processImageOCR({
        image: base64,
        apiKey: this.apiKey,
        language: options.language || 'rus',
        detectOrientation: true,
        scale: true,
        isTable: options.isTable || false
      });
      
      if (result.success) {
        return {
          text: result.text,
          confidence: result.confidence || 0,
          data: result.parsedData || {},
          source: 'ocr.space'
        };
      } else {
        throw new Error(result.error || 'Ошибка OCR.space');
      }
    } catch (error) {
      this.logger.error('Ошибка OCR.space', error);
      // Fallback на Tesseract
      return await this.recognizeWithTesseract(image, options);
    }
  }

  /**
   * Распознавание через Tesseract.js
   * @param {string|Blob|File} image - Изображение
   * @param {Object} options - Опции
   * @returns {Promise<Object>} Результат
   */
  async recognizeWithTesseract(image, options) {
    try {
      this.logger.info('Распознавание через Tesseract.js');
      
      if (!this.worker) {
        await this.initializeTesseract();
      }
      
      // Распознаем текст
      const { data } = await this.worker.recognize(image);
      
      return {
        text: data.text,
        confidence: data.confidence,
        data: this.parseDocumentData(data.text),
        source: 'tesseract'
      };
    } catch (error) {
      this.logger.error('Ошибка Tesseract', error);
      throw error;
    }
  }

  /**
   * Преобразование изображения в base64
   * @param {string|Blob|File} image - Изображение
   * @returns {Promise<string>} Base64 строка
   */
  async imageToBase64(image) {
    return new Promise((resolve, reject) => {
      if (typeof image === 'string') {
        // Если это уже base64 или URL
        if (image.startsWith('data:')) {
          resolve(image);
          return;
        }
        
        // Загружаем изображение
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = reject;
        img.src = image;
      } else if (image instanceof Blob || image instanceof File) {
        // Читаем файл
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(image);
      } else {
        reject(new Error('Неподдерживаемый формат изображения'));
      }
    });
  }

  /**
   * Парсинг данных документа из текста
   * @param {string} text - Распознанный текст
   * @returns {Object} Извлеченные данные
   */
  parseDocumentData(text) {
    const data = {};
    
    // Очищаем текст
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // ИНН
    const innMatch = cleanText.match(/ИНН[:\s]*(\d{10,12})/i);
    if (innMatch) {
      data.inn = innMatch[1];
    }
    
    // СНИЛС
    const snilsMatch = cleanText.match(/СНИЛС[:\s]*([\d\s-]+)/i);
    if (snilsMatch) {
      data.snils = snilsMatch[1].replace(/\s+/g, '');
    }
    
    // Паспорт
    const passportMatch = cleanText.match(/(?:серия\s*и\s*номер|паспорт)[:\s]*(\d{4})\s*(\d{6})/i);
    if (passportMatch) {
      data.passport = `${passportMatch[1]} ${passportMatch[2]}`;
    }
    
    // ФИО
    const fioMatch = cleanText.match(/(?:фио|фамилия\s*имя\s*отчество)[:\s]*([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/i);
    if (fioMatch) {
      data.name = fioMatch[1];
    }
    
    // Дата рождения
    const birthDateMatch = cleanText.match(/(?:дата\s*рождения|родился)[:\s]*(\d{1,2})[.\s](\d{1,2})[.\s](\d{4})/i);
    if (birthDateMatch) {
      data.birthDate = `${birthDateMatch[3]}-${birthDateMatch[2].padStart(2, '0')}-${birthDateMatch[1].padStart(2, '0')}`;
    }
    
    // Место рождения
    const birthPlaceMatch = cleanText.match(/(?:место\s*рождения)[:\s]*([^,\n]+)/i);
    if (birthPlaceMatch) {
      data.birthPlace = birthPlaceMatch[1].trim();
    }
    
    // Кем выдан
    const issuedByMatch = cleanText.match(/(?:выдан|кем\s*выдан)[:\s]*([^,\n]+(?:МВД|ОВД|УФМС)[^,\n]*)/i);
    if (issuedByMatch) {
      data.passportIssuedBy = issuedByMatch[1].trim();
    }
    
    // Дата выдачи
    const issueDateMatch = cleanText.match(/(?:дата\s*выдачи|выдан)[:\s]*(\d{1,2})[.\s](\d{1,2})[.\s](\d{4})/i);
    if (issueDateMatch) {
      data.passportIssueDate = `${issueDateMatch[3]}-${issueDateMatch[2].padStart(2, '0')}-${issueDateMatch[1].padStart(2, '0')}`;
    }
    
    // Адрес регистрации
    const addressMatch = cleanText.match(/(?:адрес\s*регистрации|зарегистрирован|прописан)[:\s]*([^,\n]+)/i);
    if (addressMatch) {
      data.registrationAddress = addressMatch[1].trim();
    }
    
    return data;
  }

  /**
   * Распознавание паспорта
   * @param {string|Blob|File} image - Изображение паспорта
   * @returns {Promise<Object>} Данные паспорта
   */
  async recognizePassport(image) {
    try {
      const result = await this.recognizeText(image, { isTable: true });
      
      // Дополнительная обработка для паспорта
      const passportData = {
        ...result.data,
        documentType: 'passport',
        confidence: result.confidence
      };
      
      // Валидация данных
      this.validatePassportData(passportData);
      
      return passportData;
    } catch (error) {
      this.logger.error('Ошибка распознавания паспорта', error);
      throw error;
    }
  }

  /**
   * Распознавание ИНН
   * @param {string|Blob|File} image - Изображение ИНН
   * @returns {Promise<Object>} Данные ИНН
   */
  async recognizeINN(image) {
    try {
      const result = await this.recognizeText(image);
      
      // Извлекаем только ИНН
      const innMatch = result.text.match(/\d{10,12}/);
      if (!innMatch) {
        throw new Error('ИНН не найден на изображении');
      }
      
      return {
        inn: innMatch[0],
        documentType: 'inn',
        confidence: result.confidence
      };
    } catch (error) {
      this.logger.error('Ошибка распознавания ИНН', error);
      throw error;
    }
  }

  /**
   * Распознавание СНИЛС
   * @param {string|Blob|File} image - Изображение СНИЛС
   * @returns {Promise<Object>} Данные СНИЛС
   */
  async recognizeSNILS(image) {
    try {
      const result = await this.recognizeText(image);
      
      // Извлекаем СНИЛС
      const snilsMatch = result.text.match(/(\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{2})/);
      if (!snilsMatch) {
        throw new Error('СНИЛС не найден на изображении');
      }
      
      return {
        snils: snilsMatch[1].replace(/[-\s]/g, ''),
        documentType: 'snils',
        confidence: result.confidence
      };
    } catch (error) {
      this.logger.error('Ошибка распознавания СНИЛС', error);
      throw error;
    }
  }

  /**
   * Валидация данных паспорта
   * @param {Object} data - Данные для валидации
   * @throws {Error} Ошибка валидации
   */
  validatePassportData(data) {
    const errors = [];
    
    if (!data.passport || !/^\d{4}\s?\d{6}$/.test(data.passport.replace(/\s/g, ''))) {
      errors.push('Неверный формат серии и номера паспорта');
    }
    
    if (!data.name || data.name.split(' ').length < 2) {
      errors.push('ФИО должно содержать минимум фамилию и имя');
    }
    
    if (!data.birthDate) {
      errors.push('Дата рождения не найдена');
    }
    
    if (errors.length > 0) {
      throw new Error(`Ошибки валидации: ${errors.join(', ')}`);
    }
  }

  /**
   * Проверка качества изображения
   * @param {string|Blob|File} image - Изображение
   * @returns {Promise<Object>} Оценка качества
   */
  async checkImageQuality(image) {
    try {
      // Создаем временное изображение для анализа
      const img = new Image();
      const src = typeof image === 'string' ? image : URL.createObjectURL(image);
      
      return new Promise((resolve) => {
        img.onload = () => {
          const quality = {
            width: img.width,
            height: img.height,
            resolution: img.width * img.height,
            isGoodQuality: img.width >= 800 && img.height >= 600,
            recommendations: []
          };
          
          if (img.width < 800 || img.height < 600) {
            quality.recommendations.push('Изображение слишком маленькое. Минимум 800x600');
          }
          
          if (img.width > 4000 || img.height > 4000) {
            quality.recommendations.push('Изображение слишком большое. Рекомендуется уменьшить');
          }
          
          // Очищаем URL если создавали
          if (typeof image !== 'string') {
            URL.revokeObjectURL(src);
          }
          
          resolve(quality);
        };
        
        img.src = src;
      });
    } catch (error) {
      this.logger.error('Ошибка проверки качества', error);
      throw error;
    }
  }

  /**
   * Уничтожение сервиса
   */
  async destroy() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// Экспортируем синглтон
export default new OCRService();
