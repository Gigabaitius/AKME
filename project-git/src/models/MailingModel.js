import BaseModel from './BaseModel';
import ValidationModel from './ValidationModel';

/**
 * Модель для работы с рассылками
 * @extends BaseModel
 */
class MailingModel extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.initializeFields();
  }

  /**
   * Инициализация полей модели
   */
  initializeFields() {
    // Основные поля
    this.id = this.data.id || this.generateId();
    this.name = this.data.name || '';
    this.subject = this.data.subject || '';
    this.content = this.data.content || '';
    this.type = this.data.type || 'email'; // email, sms, whatsapp, telegram
    this.status = this.data.status || 'draft'; // draft, scheduled, sending, sent, cancelled, failed
    
    // Получатели
    this.recipients = {
      type: this.data.recipients?.type || 'all', // all, filter, manual, group
      filters: this.data.recipients?.filters || {},
      manualList: this.data.recipients?.manualList || [],
      groups: this.data.recipients?.groups || [],
      excludeList: this.data.recipients?.excludeList || [],
      totalCount: this.data.recipients?.totalCount || 0,
      categories: this.data.recipients?.categories || []
    };

    // Шаблон и персонализация
    this.template = {
      id: this.data.template?.id || null,
      name: this.data.template?.name || '',
      variables: this.data.template?.variables || {},
      useTemplate: this.data.template?.useTemplate || false
    };

    // Настройки отправки
    this.settings = {
      priority: this.data.settings?.priority || 'normal', // low, normal, high, urgent
      sendAt: this.data.settings?.sendAt || null,
      timezone: this.data.settings?.timezone || 'Europe/Moscow',
      batchSize: this.data.settings?.batchSize || 100,
      delayBetweenBatches: this.data.settings?.delayBetweenBatches || 1000, // ms
      retryOnFail: this.data.settings?.retryOnFail || true,
      maxRetries: this.data.settings?.maxRetries || 3,
      trackOpens: this.data.settings?.trackOpens || true,
      trackClicks: this.data.settings?.trackClicks || true,
      unsubscribeLink: this.data.settings?.unsubscribeLink || true
    };

    // Вложения
    this.attachments = this.data.attachments || [];

    // Статистика
    this.statistics = {
      sent: this.data.statistics?.sent || 0,
      delivered: this.data.statistics?.delivered || 0,
      opened: this.data.statistics?.opened || 0,
      clicked: this.data.statistics?.clicked || 0,
      unsubscribed: this.data.statistics?.unsubscribed || 0,
      bounced: this.data.statistics?.bounced || 0,
      failed: this.data.statistics?.failed || 0,
      pending: this.data.statistics?.pending || 0,
      openRate: this.data.statistics?.openRate || 0,
      clickRate: this.data.statistics?.clickRate || 0,
      bounceRate: this.data.statistics?.bounceRate || 0
    };

    // A/B тестирование
    this.abTest = {
      enabled: this.data.abTest?.enabled || false,
      variants: this.data.abTest?.variants || [],
      testSize: this.data.abTest?.testSize || 10, // процент аудитории
      winnerCriteria: this.data.abTest?.winnerCriteria || 'opens', // opens, clicks
      testDuration: this.data.abTest?.testDuration || 24 // часы
    };

    // История отправок
    this.sendHistory = this.data.sendHistory || [];
    
    // Метаданные
    this.metadata = {
      tags: this.data.metadata?.tags || [],
      campaign: this.data.metadata?.campaign || '',
      source: this.data.metadata?.source || 'manual',
      author: this.data.metadata?.author || '',
      approvedBy: this.data.metadata?.approvedBy || null,
      notes: this.data.metadata?.notes || ''
    };

    // Временные метки
    this.createdAt = this.data.createdAt || new Date().toISOString();
    this.updatedAt = this.data.updatedAt || new Date().toISOString();
    this.sentAt = this.data.sentAt || null;
    this.completedAt = this.data.completedAt || null;
    this.cancelledAt = this.data.cancelledAt || null;
  }

  /**
   * Валидация модели
   */
  validate() {
    const errors = [];

    // Валидация основных полей
    if (!this.name || this.name.trim().length < 3) {
      errors.push({
        field: 'name',
        message: 'Название рассылки должно содержать минимум 3 символа'
      });
    }

    if (this.type === 'email' && (!this.subject || this.subject.trim().length < 3)) {
      errors.push({
        field: 'subject',
        message: 'Тема письма должна содержать минимум 3 символа'
      });
    }

    if (!this.content || this.content.trim().length < 10) {
      errors.push({
        field: 'content',
        message: 'Содержание должно содержать минимум 10 символов'
      });
    }

    // Валидация типа рассылки
    if (!this.isValidType(this.type)) {
      errors.push({
        field: 'type',
        message: 'Недопустимый тип рассылки'
      });
    }

    // Валидация получателей
    if (this.recipients.type === 'manual' && this.recipients.manualList.length === 0) {
      errors.push({
        field: 'recipients',
        message: 'Не указаны получатели'
      });
    }

    // Валидация времени отправки
    if (this.settings.sendAt && new Date(this.settings.sendAt) < new Date()) {
      errors.push({
        field: 'sendAt',
        message: 'Время отправки не может быть в прошлом'
      });
    }

    // Валидация вложений
    const maxAttachmentSize = 25 * 1024 * 1024; // 25MB
    const totalSize = this.attachments.reduce((sum, att) => sum + (att.size || 0), 0);
    if (totalSize > maxAttachmentSize) {
      errors.push({
        field: 'attachments',
        message: 'Общий размер вложений не должен превышать 25MB'
      });
    }

    // Валидация A/B тестирования
    if (this.abTest.enabled) {
      if (this.abTest.variants.length < 2) {
        errors.push({
          field: 'abTest',
          message: 'Для A/B теста необходимо минимум 2 варианта'
        });
      }
      if (this.abTest.testSize < 5 || this.abTest.testSize > 50) {
        errors.push({
          field: 'abTest',
          message: 'Размер тестовой группы должен быть от 5% до 50%'
        });
      }
    }

    this.errors = errors;
    return errors.length === 0;
  }

  /**
   * Проверка допустимости типа рассылки
   */
  isValidType(type) {
    return ['email', 'sms', 'whatsapp', 'telegram'].includes(type);
  }

  /**
   * Проверка допустимости статуса
   */
  isValidStatus(status) {
    return ['draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed'].includes(status);
  }

  /**
   * Добавление получателей
   */
  addRecipients(recipients, type = 'manual') {
    if (type === 'manual') {
      const validRecipients = recipients.filter(r => this.isValidRecipient(r));
      this.recipients.manualList.push(...validRecipients);
      this.recipients.manualList = [...new Set(this.recipients.manualList)]; // Удаляем дубликаты
    } else if (type === 'group') {
      this.recipients.groups.push(...recipients);
      this.recipients.groups = [...new Set(this.recipients.groups)];
    }
    this.updateRecipientCount();
  }

  /**
   * Проверка валидности получателя
   */
  isValidRecipient(recipient) {
    if (this.type === 'email') {
      return ValidationModel.validateEmail(recipient);
    } else if (this.type === 'sms' || this.type === 'whatsapp') {
      return ValidationModel.validatePhone(recipient);
    }
    return true;
  }

  /**
   * Удаление получателя
   */
  removeRecipient(recipient) {
    const index = this.recipients.manualList.indexOf(recipient);
    if (index > -1) {
      this.recipients.manualList.splice(index, 1);
      this.updateRecipientCount();
    }
  }

  /**
   * Добавление в список исключений
   */
  excludeRecipient(recipient) {
    if (!this.recipients.excludeList.includes(recipient)) {
      this.recipients.excludeList.push(recipient);
      this.updateRecipientCount();
    }
  }

  /**
   * Обновление количества получателей
   */
  updateRecipientCount() {
    let count = 0;
    
    if (this.recipients.type === 'all') {
      count = 999999; // Заглушка, должно браться из базы
    } else if (this.recipients.type === 'manual') {
      count = this.recipients.manualList.length;
    } else if (this.recipients.type === 'filter') {
      count = 0; // Должно вычисляться на основе фильтров
    } else if (this.recipients.type === 'group') {
      count = 0; // Должно вычисляться на основе групп
    }
    
    count -= this.recipients.excludeList.length;
    this.recipients.totalCount = Math.max(0, count);
    return this.recipients.totalCount;
  }

  /**
   * Установка фильтров
   */
  setFilters(filters) {
    this.recipients.type = 'filter';
    this.recipients.filters = filters;
    this.updateRecipientCount();
  }

  /**
   * Добавление вложения
   */
  addAttachment(attachment) {
    const maxSize = 10 * 1024 * 1024; // 10MB на файл
    
    if (attachment.size > maxSize) {
      throw new Error('Размер вложения не должен превышать 10MB');
    }
    
    this.attachments.push({
      id: this.generateId(),
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
      url: attachment.url,
      addedAt: new Date().toISOString()
    });
  }

  /**
   * Удаление вложения
   */
  removeAttachment(attachmentId) {
    this.attachments = this.attachments.filter(a => a.id !== attachmentId);
  }

  /**
   * Запланировать отправку
   */
  schedule(sendAt) {
    if (new Date(sendAt) < new Date()) {
      throw new Error('Время отправки не может быть в прошлом');
    }
    
    this.settings.sendAt = sendAt;
    this.status = 'scheduled';
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Начать отправку
   */
  startSending() {
    if (this.status === 'sending' || this.status === 'sent') {
      throw new Error('Рассылка уже отправляется или отправлена');
    }
    
    if (!this.validate()) {
      throw new Error('Рассылка содержит ошибки валидации');
    }
    
    this.status = 'sending';
    this.sentAt = new Date().toISOString();
    this.statistics.pending = this.recipients.totalCount;
  }

  /**
   * Отметить как отправленную
   */
  markAsSent() {
    this.status = 'sent';
    this.completedAt = new Date().toISOString();
    this.calculateStatistics();
  }

  /**
   * Отменить рассылку
   */
  cancel() {
    if (this.status === 'sent') {
      throw new Error('Нельзя отменить отправленную рассылку');
    }
    
    this.status = 'cancelled';
    this.cancelledAt = new Date().toISOString();
  }

  /**
   * Расчет статистики
   */
  calculateStatistics() {
    const total = this.statistics.sent || 1;
    
    this.statistics.openRate = (this.statistics.opened / total) * 100;
    this.statistics.clickRate = (this.statistics.clicked / total) * 100;
    this.statistics.bounceRate = (this.statistics.bounced / total) * 100;
    
    return this.statistics;
  }

  /**
   * Обновление статистики отправки
   */
  updateStatistic(type, increment = 1) {
    const validTypes = ['sent', 'delivered', 'opened', 'clicked', 'unsubscribed', 'bounced', 'failed'];
    
    if (!validTypes.includes(type)) {
      throw new Error('Недопустимый тип статистики');
    }
    
    this.statistics[type] += increment;
    this.statistics.pending = Math.max(0, this.statistics.pending - increment);
    this.calculateStatistics();
  }

  /**
   * Добавление варианта A/B теста
   */
  addABVariant(variant) {
    if (!this.abTest.enabled) {
      this.abTest.enabled = true;
    }
    
    this.abTest.variants.push({
      id: this.generateId(),
      name: variant.name || `Вариант ${this.abTest.variants.length + 1}`,
      subject: variant.subject || this.subject,
      content: variant.content || this.content,
      statistics: {
        sent: 0,
        opened: 0,
        clicked: 0
      }
    });
  }

  /**
   * Клонирование рассылки
   */
  clone() {
    const clonedData = { ...this.data };
    delete clonedData.id;
    clonedData.name = `${this.name} (копия)`;
    clonedData.status = 'draft';
    clonedData.statistics = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      unsubscribed: 0,
      bounced: 0,
      failed: 0,
      pending: 0
    };
    clonedData.sendHistory = [];
    clonedData.sentAt = null;
    clonedData.completedAt = null;
    
    return new MailingModel(clonedData);
  }

  /**
   * Создание из шаблона
   */
  static fromTemplate(template) {
    return new MailingModel({
      name: template.name,
      subject: template.subject,
      content: template.content,
      type: template.type,
      template: {
        id: template.id,
        name: template.name,
        variables: template.variables,
        useTemplate: true
      }
    });
  }

  /**
   * Преобразование в JSON для API
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      subject: this.subject,
      content: this.content,
      type: this.type,
      status: this.status,
      recipients: this.recipients,
      template: this.template,
      settings: this.settings,
      attachments: this.attachments,
      statistics: this.statistics,
      abTest: this.abTest,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      sentAt: this.sentAt,
      completedAt: this.completedAt,
      cancelledAt: this.cancelledAt
    };
  }

  /**
   * Создание из JSON
   */
  static fromJSON(json) {
    return new MailingModel(json);
  }
}

export default MailingModel;
