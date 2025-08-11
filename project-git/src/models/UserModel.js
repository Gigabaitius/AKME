import BaseModel from './BaseModel';
import ValidationModel from './ValidationModel';

/**
 * Модель пользователя системы
 * @extends BaseModel
 */
class UserModel extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.initializeFields();
  }

  /**
   * Инициализация полей модели
   */
  initializeFields() {
    // Основные данные
    this.id = this.data.id || this.generateId();
    this.email = this.data.email || '';
    this.username = this.data.username || '';
    this.firstName = this.data.firstName || '';
    this.lastName = this.data.lastName || '';
    this.middleName = this.data.middleName || '';
    this.phone = this.data.phone || '';
    this.avatar = this.data.avatar || null;
    
    // Роли и права доступа
    this.role = this.data.role || 'user'; // admin, manager, hr, recruiter, user
    this.permissions = this.data.permissions || this.getDefaultPermissions();
    this.department = this.data.department || '';
    this.position = this.data.position || '';
    
    // Статус и активность
    this.status = this.data.status || 'pending'; // pending, active, inactive, blocked, deleted
    this.isOnline = this.data.isOnline || false;
    this.lastActivity = this.data.lastActivity || null;
    this.lastLogin = this.data.lastLogin || null;
    
    // Настройки
    this.settings = {
      theme: this.data.settings?.theme || 'light',
      language: this.data.settings?.language || 'ru',
      timezone: this.data.settings?.timezone || 'Europe/Moscow',
      notifications: {
        email: this.data.settings?.notifications?.email ?? true,
        push: this.data.settings?.notifications?.push ?? true,
        sms: this.data.settings?.notifications?.sms ?? false,
        telegram: this.data.settings?.notifications?.telegram ?? false,
        whatsapp: this.data.settings?.notifications?.whatsapp ?? false
      },
      privacy: {
        showEmail: this.data.settings?.privacy?.showEmail ?? false,
        showPhone: this.data.settings?.privacy?.showPhone ?? false,
        showActivity: this.data.settings?.privacy?.showActivity ?? true
      },
      interface: {
        sidebarCollapsed: this.data.settings?.interface?.sidebarCollapsed ?? false,
        compactMode: this.data.settings?.interface?.compactMode ?? false,
        showHelpers: this.data.settings?.interface?.showHelpers ?? true,
        itemsPerPage: this.data.settings?.interface?.itemsPerPage ?? 20
      }
    };
    
    // Интеграции
    this.integrations = {
      google: {
        connected: this.data.integrations?.google?.connected ?? false,
        email: this.data.integrations?.google?.email || null,
        refreshToken: this.data.integrations?.google?.refreshToken || null,
        scopes: this.data.integrations?.google?.scopes || []
      },
      telegram: {
        connected: this.data.integrations?.telegram?.connected ?? false,
        chatId: this.data.integrations?.telegram?.chatId || null,
        username: this.data.integrations?.telegram?.username || null
      },
      whatsapp: {
        connected: this.data.integrations?.whatsapp?.connected ?? false,
        number: this.data.integrations?.whatsapp?.number || null
      }
    };
    
    // Статистика
    this.statistics = {
      candidatesAdded: this.data.statistics?.candidatesAdded || 0,
      candidatesProcessed: this.data.statistics?.candidatesProcessed || 0,
      mailingSent: this.data.statistics?.mailingSent || 0,
      tasksCompleted: this.data.statistics?.tasksCompleted || 0,
      averageResponseTime: this.data.statistics?.averageResponseTime || 0,
      rating: this.data.statistics?.rating || 0,
      loginCount: this.data.statistics?.loginCount || 0,
      activityScore: this.data.statistics?.activityScore || 0
    };
    
    // Безопасность
    this.security = {
      passwordHash: this.data.security?.passwordHash || null,
      passwordChangedAt: this.data.security?.passwordChangedAt || null,
      twoFactorEnabled: this.data.security?.twoFactorEnabled ?? false,
      twoFactorSecret: this.data.security?.twoFactorSecret || null,
      sessions: this.data.security?.sessions || [],
      loginAttempts: this.data.security?.loginAttempts || 0,
      lockedUntil: this.data.security?.lockedUntil || null,
      recoveryEmail: this.data.security?.recoveryEmail || null,
      securityQuestions: this.data.security?.securityQuestions || []
    };
    
    // Метаданные
    this.metadata = {
      registrationSource: this.data.metadata?.registrationSource || 'web',
      referrer: this.data.metadata?.referrer || null,
      tags: this.data.metadata?.tags || [],
      notes: this.data.metadata?.notes || '',
      customFields: this.data.metadata?.customFields || {}
    };
    
    // Временные метки
    this.createdAt = this.data.createdAt || new Date().toISOString();
    this.updatedAt = this.data.updatedAt || new Date().toISOString();
    this.emailVerifiedAt = this.data.emailVerifiedAt || null;
    this.phoneVerifiedAt = this.data.phoneVerifiedAt || null;
    this.deletedAt = this.data.deletedAt || null;
  }

  /**
   * Получение полного имени
   */
  get fullName() {
    const parts = [this.lastName, this.firstName, this.middleName].filter(Boolean);
    return parts.join(' ') || this.username || this.email;
  }

  /**
   * Получение короткого имени
   */
  get shortName() {
    if (this.firstName && this.lastName) {
      return `${this.lastName} ${this.firstName[0]}.`;
    }
    return this.username || this.email.split('@')[0];
  }

  /**
   * Получение инициалов
   */
  get initials() {
    const first = this.firstName?.[0] || '';
    const last = this.lastName?.[0] || '';
    return (first + last).toUpperCase() || this.email[0].toUpperCase();
  }

  /**
   * Валидация модели
   */
  validate() {
    const errors = [];

    // Валидация email
    if (!ValidationModel.validateEmail(this.email)) {
      errors.push({
        field: 'email',
        message: 'Некорректный email адрес'
      });
    }

    // Валидация username
    if (this.username && !this.isValidUsername(this.username)) {
      errors.push({
        field: 'username',
        message: 'Username должен содержать только буквы, цифры и символы _ -'
      });
    }

    // Валидация телефона
    if (this.phone && !ValidationModel.validatePhone(this.phone)) {
      errors.push({
        field: 'phone',
        message: 'Некорректный номер телефона'
      });
    }

    // Валидация роли
    if (!this.isValidRole(this.role)) {
      errors.push({
        field: 'role',
        message: 'Недопустимая роль пользователя'
      });
    }

    // Валидация статуса
    if (!this.isValidStatus(this.status)) {
      errors.push({
        field: 'status',
        message: 'Недопустимый статус пользователя'
      });
    }

    this.errors = errors;
    return errors.length === 0;
  }

  /**
   * Проверка валидности username
   */
  isValidUsername(username) {
    return /^[a-zA-Z0-9_-]{3,20}$/.test(username);
  }

  /**
   * Проверка валидности роли
   */
  isValidRole(role) {
    return ['admin', 'manager', 'hr', 'recruiter', 'user'].includes(role);
  }

  /**
   * Проверка валидности статуса
   */
  isValidStatus(status) {
    return ['pending', 'active', 'inactive', 'blocked', 'deleted'].includes(status);
  }

  /**
   * Получение прав доступа по умолчанию для роли
   */
  getDefaultPermissions() {
    const permissionsByRole = {
      admin: ['*'], // Все права
      manager: [
        'candidates.view', 'candidates.edit', 'candidates.delete',
        'mailings.view', 'mailings.create', 'mailings.send',
        'knowledge.view', 'knowledge.edit',
        'reports.view', 'reports.export',
        'users.view', 'users.edit'
      ],
      hr: [
        'candidates.view', 'candidates.edit', 'candidates.create',
        'mailings.view', 'mailings.create',
        'knowledge.view', 'knowledge.create',
        'reports.view'
      ],
      recruiter: [
        'candidates.view', 'candidates.create', 'candidates.edit',
        'knowledge.view',
        'reports.view'
      ],
      user: [
        'candidates.view',
        'knowledge.view'
      ]
    };

    return permissionsByRole[this.role] || [];
  }

  /**
   * Проверка наличия права доступа
   */
  hasPermission(permission) {
    if (this.permissions.includes('*')) return true;
    return this.permissions.includes(permission);
  }

  /**
   * Добавление права доступа
   */
  addPermission(permission) {
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission);
    }
  }

  /**
   * Удаление права доступа
   */
  removePermission(permission) {
    this.permissions = this.permissions.filter(p => p !== permission);
  }

  /**
   * Установка роли
   */
  setRole(role) {
    if (!this.isValidRole(role)) {
      throw new Error('Недопустимая роль');
    }
    this.role = role;
    this.permissions = this.getDefaultPermissions();
  }

  /**
   * Активация пользователя
   */
  activate() {
    if (this.status === 'deleted') {
      throw new Error('Нельзя активировать удаленного пользователя');
    }
    this.status = 'active';
    this.emailVerifiedAt = this.emailVerifiedAt || new Date().toISOString();
  }

  /**
   * Блокировка пользователя
   */
  block(reason = '', duration = null) {
    this.status = 'blocked';
    this.security.lockedUntil = duration ? 
      new Date(Date.now() + duration).toISOString() : null;
    
    if (reason) {
      this.metadata.notes = `Заблокирован: ${reason}\n${this.metadata.notes}`;
    }
  }

  /**
   * Разблокировка пользователя
   */
  unblock() {
    if (this.status === 'blocked') {
      this.status = 'active';
      this.security.lockedUntil = null;
      this.security.loginAttempts = 0;
    }
  }

  /**
   * Мягкое удаление пользователя
   */
  softDelete() {
    this.status = 'deleted';
    this.deletedAt = new Date().toISOString();
  }

  /**
   * Восстановление удаленного пользователя
   */
  restore() {
    if (this.status === 'deleted') {
      this.status = 'inactive';
      this.deletedAt = null;
    }
  }

  /**
   * Обновление последней активности
   */
  updateActivity() {
    this.lastActivity = new Date().toISOString();
    this.isOnline = true;
  }

  /**
   * Обновление статистики входов
   */
  recordLogin(ip = null, userAgent = null) {
    this.lastLogin = new Date().toISOString();
    this.statistics.loginCount += 1;
    this.security.loginAttempts = 0;
    
    // Добавляем сессию
    this.security.sessions.push({
      id: this.generateId(),
      ip,
      userAgent,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    });
    
    // Ограничиваем количество сессий
    if (this.security.sessions.length > 10) {
      this.security.sessions = this.security.sessions.slice(-10);
    }
  }

  /**
   * Запись неудачной попытки входа
   */
  recordFailedLogin() {
    this.security.loginAttempts += 1;
    
    // Блокировка после 5 неудачных попыток
    if (this.security.loginAttempts >= 5) {
      this.block('Превышено количество попыток входа', 30 * 60 * 1000); // 30 минут
    }
  }

  /**
   * Включение двухфакторной аутентификации
   */
  enable2FA(secret) {
    this.security.twoFactorEnabled = true;
    this.security.twoFactorSecret = secret;
  }

  /**
   * Отключение двухфакторной аутентификации
   */
  disable2FA() {
    this.security.twoFactorEnabled = false;
    this.security.twoFactorSecret = null;
  }

  /**
   * Подключение интеграции
   */
  connectIntegration(type, data) {
    if (!this.integrations[type]) {
      throw new Error(`Неизвестный тип интеграции: ${type}`);
    }
    
    this.integrations[type] = {
      ...this.integrations[type],
      ...data,
      connected: true,
      connectedAt: new Date().toISOString()
    };
  }

  /**
   * Отключение интеграции
   */
  disconnectIntegration(type) {
    if (this.integrations[type]) {
      this.integrations[type].connected = false;
      this.integrations[type].disconnectedAt = new Date().toISOString();
    }
  }

  /**
   * Обновление настроек
   */
  updateSettings(settings) {
    this.settings = {
      ...this.settings,
      ...settings,
      notifications: {
        ...this.settings.notifications,
        ...settings.notifications
      },
      privacy: {
        ...this.settings.privacy,
        ...settings.privacy
      },
      interface: {
        ...this.settings.interface,
        ...settings.interface
      }
    };
  }

  /**
   * Расчет рейтинга активности
   */
  calculateActivityScore() {
    const weights = {
      candidatesAdded: 2,
      candidatesProcessed: 3,
      mailingSent: 1,
      tasksCompleted: 2,
      loginCount: 0.1
    };
    
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (this.statistics[key] || 0) * weight;
    }
    
    // Учитываем последнюю активность
    const daysSinceActivity = this.lastActivity ? 
      (Date.now() - new Date(this.lastActivity).getTime()) / (1000 * 60 * 60 * 24) : 999;
    
    if (daysSinceActivity < 1) score *= 1.5;
    else if (daysSinceActivity < 7) score *= 1.2;
    else if (daysSinceActivity > 30) score *= 0.5;
    
    this.statistics.activityScore = Math.round(score);
    return this.statistics.activityScore;
  }

  /**
   * Проверка необходимости смены пароля
   */
  shouldChangePassword() {
    if (!this.security.passwordChangedAt) return true;
    
    const daysSinceChange = 
      (Date.now() - new Date(this.security.passwordChangedAt).getTime()) / 
      (1000 * 60 * 60 * 24);
    
    return daysSinceChange > 90; // Требуем смену каждые 90 дней
  }

  /**
   * Преобразование в JSON для API
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
      shortName: this.shortName,
      initials: this.initials,
      firstName: this.firstName,
      lastName: this.lastName,
      middleName: this.middleName,
      phone: this.phone,
      avatar: this.avatar,
      role: this.role,
      permissions: this.permissions,
      department: this.department,
      position: this.position,
      status: this.status,
      isOnline: this.isOnline,
      lastActivity: this.lastActivity,
      lastLogin: this.lastLogin,
      settings: this.settings,
      integrations: {
        google: { connected: this.integrations.google.connected },
        telegram: { connected: this.integrations.telegram.connected },
        whatsapp: { connected: this.integrations.whatsapp.connected }
      },
      statistics: this.statistics,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      emailVerifiedAt: this.emailVerifiedAt,
      phoneVerifiedAt: this.phoneVerifiedAt
    };
  }

  /**
   * Создание из JSON
   */
  static fromJSON(json) {
    return new UserModel(json);
  }
}

export default UserModel;
