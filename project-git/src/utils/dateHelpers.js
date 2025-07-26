// src/utils/dateHelpers.js
/**
 * 📅 Утилиты для работы с датами
 * @description Вспомогательные функции для форматирования и обработки дат
 */

/**
 * Форматирование даты
 * @param {Date|string} date - Дата для форматирования
 * @param {string} format - Формат вывода
 * @returns {string} Отформатированная дата
 */
export const formatDate = (date, format = 'default') => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  
  // Проверка валидности даты
  if (isNaN(dateObj.getTime())) {
    return '-';
  }
  
  switch (format) {
    case 'default':
      return dateObj.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
    case 'full':
      return dateObj.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
    case 'time':
      return dateObj.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
    case 'relative':
      return getRelativeTimeString(dateObj);
      
    case 'short':
      return dateObj.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short'
      });
      
    case 'iso':
      return dateObj.toISOString();
      
    default:
      return dateObj.toLocaleDateString('ru-RU');
  }
};

/**
 * Получение относительного времени
 * @param {Date} date - Дата
 * @returns {string} Относительное время
 */
export const getRelativeTimeString = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'только что';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${pluralize(diffInMinutes, 'минута', 'минуты', 'минут')} назад`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${pluralize(diffInHours, 'час', 'часа', 'часов')} назад`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${pluralize(diffInDays, 'день', 'дня', 'дней')} назад`;
  }
  
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} ${pluralize(weeks, 'неделя', 'недели', 'недель')} назад`;
  }
  
  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} ${pluralize(months, 'месяц', 'месяца', 'месяцев')} назад`;
  }
  
  const years = Math.floor(diffInDays / 365);
  return `${years} ${pluralize(years, 'год', 'года', 'лет')} назад`;
};

/**
 * Проверка, является ли дата сегодняшней
 * @param {Date|string} date - Дата для проверки
 * @returns {boolean} True, если дата сегодняшняя
 */
export const isToday = (date) => {
  const today = new Date();
  const compareDate = new Date(date);
  
  return today.toDateString() === compareDate.toDateString();
};

/**
 * Проверка, является ли дата вчерашней
 * @param {Date|string} date - Дата для проверки
 * @returns {boolean} True, если дата вчерашняя
 */
export const isYesterday = (date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const compareDate = new Date(date);
  
  return yesterday.toDateString() === compareDate.toDateString();
};

/**
 * Получение начала дня
 * @param {Date|string} date - Дата
 * @returns {Date} Начало дня
 */
export const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Получение конца дня
 * @param {Date|string} date - Дата
 * @returns {Date} Конец дня
 */
export const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Добавление дней к дате
 * @param {Date|string} date - Исходная дата
 * @param {number} days - Количество дней
 * @returns {Date} Новая дата
 */
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Вычитание дней из даты
 * @param {Date|string} date - Исходная дата
 * @param {number} days - Количество дней
 * @returns {Date} Новая дата
 */
export const subtractDays = (date, days) => {
  return addDays(date, -days);
};

/**
 * Получение разницы в днях между датами
 * @param {Date|string} date1 - Первая дата
 * @param {Date|string} date2 - Вторая дата
 * @returns {number} Разница в днях
 */
export const getDaysDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Проверка, прошла ли дата
 * @param {Date|string} date - Дата для проверки
 * @returns {boolean} True, если дата в прошлом
 */
export const isPast = (date) => {
  return new Date(date) < new Date();
};

/**
 * Проверка, является ли дата будущей
 * @param {Date|string} date - Дата для проверки
 * @returns {boolean} True, если дата в будущем
 */
export const isFuture = (date) => {
  return new Date(date) > new Date();
};

/**
 * Форматирование диапазона дат
 * @param {Date|string} startDate - Начальная дата
 * @param {Date|string} endDate - Конечная дата
 * @returns {string} Отформатированный диапазон
 */
export const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Если даты в одном дне
  if (start.toDateString() === end.toDateString()) {
    return `${formatDate(start, 'default')} ${formatDate(start, 'time')} - ${formatDate(end, 'time')}`;
  }
  
  // Если даты в одном месяце
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;
  }
  
  // Разные месяцы
  return `${formatDate(start, 'short')} - ${formatDate(end, 'short')}`;
};

/**
 * Парсинг даты из строки
 * @param {string} dateString - Строка с датой
 * @returns {Date|null} Распарсенная дата или null
 */
export const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // Попытка распарсить различные форматы
  const formats = [
    /(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{4})-(\d{2})-(\d{2})/,   // YYYY-MM-DD
  ];
  
  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      if (format === formats[2]) {
        // YYYY-MM-DD
        return new Date(match[1], match[2] - 1, match[3]);
      } else {
        // DD.MM.YYYY или DD/MM/YYYY
        return new Date(match[3], match[2] - 1, match[1]);
      }
    }
  }
  
  // Попытка стандартного парсинга
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Склонение числительных
 * @param {number} number - Число
 * @param {string} one - Форма для 1
 * @param {string} two - Форма для 2-4
 * @param {string} five - Форма для 5-0
 * @returns {string} Правильная форма
 */
function pluralize(number, one, two, five) {
  const n = Math.abs(number);
  const n10 = n % 10;
  const n100 = n % 100;
  
  if (n10 === 1 && n100 !== 11) {
    return one;
  }
  
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) {
    return two;
  }
  
  return five;
}

// Экспорт всех функций
export default {
  formatDate,
  getRelativeTimeString,
  isToday,
  isYesterday,
  startOfDay,
  endOfDay,
  addDays,
  subtractDays,
  getDaysDifference,
  isPast,
  isFuture,
  formatDateRange,
  parseDate
};
