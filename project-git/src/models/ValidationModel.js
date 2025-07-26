// src/models/ValidationModel.js
/**
 * Модель валидации
 * @description Содержит методы для валидации различных типов данных
 */
class ValidationModel {
  /**
   * Проверка обязательного поля
   * @param {any} value - Значение для проверки
   * @returns {boolean} Заполнено ли поле
   */
  isRequired(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
  }

  /**
   * Валидация телефона
   * @param {string} phone - Номер телефона
   * @returns {boolean} Корректен ли номер
   */
  isPhone(phone) {
    const phoneRegex = /^\+?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Валидация ИНН
   * @param {string} inn - ИНН
   * @returns {boolean} Корректен ли ИНН
   */
  isINN(inn) {
    if (!inn || inn.length !== 12) return false;
    
    const checkDigits = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    let sum = 0;
    
    for (let i = 0; i < 10; i++) {
      sum += parseInt(inn[i]) * checkDigits[i];
    }
    
    const checksum1 = sum % 11 % 10;
    
    if (parseInt(inn[10]) !== checksum1) return false;
    
    const checkDigits2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    sum = 0;
    
    for (let i = 0; i < 11; i++) {
      sum += parseInt(inn[i]) * checkDigits2[i];
    }
    
    const checksum2 = sum % 11 % 10;
    
    return parseInt(inn[11]) === checksum2;
  }

  /**
   * Валидация СНИЛС
   * @param {string} snils - СНИЛС
   * @returns {boolean} Корректен ли СНИЛС
   */
  isSNILS(snils) {
    const cleaned = snils.replace(/\D/g, '');
    
    if (cleaned.length !== 11) return false;
    
    if (/^(\d)\1{10}$/.test(cleaned)) return false;
    
    const digits = cleaned.slice(0, 9).split('').map(Number);
    const checksum = parseInt(cleaned.slice(9, 11));
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * (9 - i);
    }
    
    let control;
    if (sum < 100) {
      control = sum;
    } else if (sum > 101) {
      control = sum % 101;
      if (control < 100) {
        control = control;
      } else {
        control = 0;
      }
    } else {
      control = 0;
    }
    
    return control === checksum;
  }

  /**
   * Валидация email
   * @param {string} email - Email
   * @returns {boolean} Корректен ли email
   */
  isEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Валидация даты
   * @param {string} date - Дата в формате ISO
   * @returns {boolean} Корректна ли дата
   */
  isDate(date) {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
  }

  /**
   * Валидация возраста
   * @param {string} birthDate - Дата рождения
   * @param {number} minAge - Минимальный возраст
   * @param {number} maxAge - Максимальный возраст
   * @returns {boolean} Подходящий ли возраст
   */
  isValidAge(birthDate, minAge = 18, maxAge = 65) {
    const birth = new Date(birthDate);
    const now = new Date();
    const age = Math.floor((now - birth) / (365.25 * 24 * 60 * 60 * 1000));
    
    return age >= minAge && age <= maxAge;
  }
}

export default ValidationModel;