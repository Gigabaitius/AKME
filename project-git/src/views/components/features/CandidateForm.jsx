// src/views/components/features/CandidateForm.jsx
/**
 * 📝 Форма кандидата
 * @description Компонент для добавления и редактирования кандидатов
 */
import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  Briefcase, 
  FileText,
  Calendar,
  MapPin,
  Hash,
  Save,
  X
} from 'lucide-react';

// Компоненты
import Button from '../common/Button';

// Модели и валидация
import ValidationModel from '@models/ValidationModel';

// Стили
import './CandidateForm.css';

const validator = new ValidationModel();

/**
 * Форма кандидата
 * @param {Object} props - Пропсы компонента
 * @param {Object} props.candidate - Данные кандидата для редактирования
 * @param {Function} props.onSubmit - Обработчик отправки формы
 * @param {Function} props.onCancel - Обработчик отмены
 * @returns {JSX.Element} Форма кандидата
 */
const CandidateForm = ({ candidate, onSubmit, onCancel }) => {
  const isEditMode = !!candidate;

  // Состояние формы
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    project: '',
    inn: '',
    snils: '',
    passport: '',
    birthDate: '',
    passportIssueDate: '',
    passportIssuedBy: '',
    birthPlace: '',
    registrationAddress: '',
    comment: '',
    status: 'Новый'
  });

  // Состояние ошибок
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Инициализация данных при редактировании
  useEffect(() => {
    if (candidate) {
      setFormData({
        name: candidate.name || '',
        phone: candidate.phone || '',
        email: candidate.email || '',
        project: candidate.project || '',
        inn: candidate.inn || '',
        snils: candidate.snils || '',
        passport: candidate.passport || '',
        birthDate: candidate.birthDate ? candidate.birthDate.split('T')[0] : '',
        passportIssueDate: candidate.passportIssueDate ? candidate.passportIssueDate.split('T')[0] : '',
        passportIssuedBy: candidate.passportIssuedBy || '',
        birthPlace: candidate.birthPlace || '',
        registrationAddress: candidate.registrationAddress || '',
        comment: candidate.comment || '',
        status: candidate.status || 'Новый'
      });
    }
  }, [candidate]);

  // Изменение поля формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Валидация формы
  const validateForm = () => {
    const newErrors = {};

    // Обязательные поля
    if (!validator.isRequired(formData.name)) {
      newErrors.name = 'ФИО обязательно для заполнения';
    }

    if (!validator.isRequired(formData.phone)) {
      newErrors.phone = 'Телефон обязателен для заполнения';
    } else if (!validator.isPhone(formData.phone)) {
      newErrors.phone = 'Неверный формат телефона';
    }

    if (!validator.isRequired(formData.project)) {
      newErrors.project = 'Проект обязателен для заполнения';
    }

    // Опциональные поля с валидацией формата
    if (formData.email && !validator.isEmail(formData.email)) {
      newErrors.email = 'Неверный формат email';
    }

    if (formData.inn && !validator.isINN(formData.inn)) {
      newErrors.inn = 'Неверный формат ИНН';
    }

    if (formData.snils && !validator.isSNILS(formData.snils)) {
      newErrors.snils = 'Неверный формат СНИЛС';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Подготавливаем данные
      const dataToSubmit = {
        ...formData,
        // Преобразуем даты в ISO формат
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
        passportIssueDate: formData.passportIssueDate ? new Date(formData.passportIssueDate).toISOString() : null,
        // Обновляем временные метки
        updatedAt: new Date().toISOString()
      };

      if (!isEditMode) {
        dataToSubmit.createdAt = new Date().toISOString();
      }

      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error('Ошибка отправки формы:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Форматирование телефона
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 1) return numbers;
    if (numbers.length <= 4) return `+${numbers.slice(0, 1)} ${numbers.slice(1)}`;
    if (numbers.length <= 7) return `+${numbers.slice(0, 1)} ${numbers.slice(1, 4)} ${numbers.slice(4)}`;
    if (numbers.length <= 9) return `+${numbers.slice(0, 1)} ${numbers.slice(1, 4)} ${numbers.slice(4, 7)}-${numbers.slice(7)}`;
    return `+${numbers.slice(0, 1)} ${numbers.slice(1, 4)} ${numbers.slice(4, 7)}-${numbers.slice(7, 9)}-${numbers.slice(9, 11)}`;
  };

  // Обработка изменения телефона
  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  return (
    <form className="candidate-form" onSubmit={handleSubmit}>
      {/* Основная информация */}
      <div className="form-section">
        <h3 className="section-title">Основная информация</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="name" className="required">
              <User size={16} />
              ФИО
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Иванов Иван Иванович"
              className={errors.name ? 'error' : ''}
              required
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="required">
              <Phone size={16} />
              Телефон
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="+7 999 123-45-67"
              className={errors.phone ? 'error' : ''}
              required
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={16} />
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ivanov@example.com"
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="project" className="required">
              <Briefcase size={16} />
              Проект
            </label>
            <input
              type="text"
              id="project"
              name="project"
              value={formData.project}
              onChange={handleChange}
              placeholder="Название проекта"
              className={errors.project ? 'error' : ''}
              required
            />
            {errors.project && <span className="error-message">{errors.project}</span>}
          </div>
        </div>
      </div>

      {/* Документы */}
      <div className="form-section">
        <h3 className="section-title">Документы</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="passport">
              <FileText size={16} />
              Паспорт
            </label>
            <input
              type="text"
              id="passport"
              name="passport"
              value={formData.passport}
              onChange={handleChange}
              placeholder="1234 567890"
            />
          </div>

          <div className="form-group">
            <label htmlFor="inn">
              <Hash size={16} />
              ИНН
            </label>
            <input
              type="text"
              id="inn"
              name="inn"
              value={formData.inn}
              onChange={handleChange}
              placeholder="123456789012"
              maxLength="12"
              className={errors.inn ? 'error' : ''}
            />
            {errors.inn && <span className="error-message">{errors.inn}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="snils">
              <Hash size={16} />
              СНИЛС
            </label>
            <input
              type="text"
              id="snils"
              name="snils"
              value={formData.snils}
              onChange={handleChange}
              placeholder="123-456-789 00"
              className={errors.snils ? 'error' : ''}
            />
            {errors.snils && <span className="error-message">{errors.snils}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="birthDate">
              <Calendar size={16} />
              Дата рождения
            </label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* Паспортные данные */}
      <div className="form-section">
        <h3 className="section-title">Паспортные данные</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="passportIssueDate">
              <Calendar size={16} />
              Дата выдачи
            </label>
            <input
              type="date"
              id="passportIssueDate"
              name="passportIssueDate"
              value={formData.passportIssueDate}
              onChange={handleChange}
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="passportIssuedBy">
              <FileText size={16} />
              Кем выдан
            </label>
            <input
              type="text"
              id="passportIssuedBy"
              name="passportIssuedBy"
              value={formData.passportIssuedBy}
              onChange={handleChange}
              placeholder="ОВД района..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="birthPlace">
              <MapPin size={16} />
              Место рождения
            </label>
            <input
              type="text"
              id="birthPlace"
              name="birthPlace"
              value={formData.birthPlace}
              onChange={handleChange}
              placeholder="г. Москва"
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="registrationAddress">
              <MapPin size={16} />
              Адрес регистрации
            </label>
            <input
              type="text"
              id="registrationAddress"
              name="registrationAddress"
              value={formData.registrationAddress}
              onChange={handleChange}
              placeholder="г. Москва, ул. Ленина, д. 1, кв. 1"
            />
          </div>
        </div>
      </div>

      {/* Дополнительная информация */}
      <div className="form-section">
        <h3 className="section-title">Дополнительная информация</h3>
        
        <div className="form-group">
          <label htmlFor="status">
            Статус
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="Новый">Новый</option>
            <option value="Активен">Активен</option>
            <option value="Молчит">Молчит</option>
            <option value="Передан">Передан</option>
            <option value="Доведен">Доведен</option>
            <option value="Отказ">Отказ</option>
          </select>
        </div>

        <div className="form-group full-width">
          <label htmlFor="comment">
            Комментарий
          </label>
          <textarea
            id="comment"
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            placeholder="Дополнительная информация о кандидате..."
            rows={4}
          />
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="form-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X size={20} />
          Отмена
        </Button>
        
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          <Save size={20} />
          {isEditMode ? 'Сохранить изменения' : 'Добавить кандидата'}
        </Button>
      </div>
    </form>
  );
};

export default CandidateForm;
