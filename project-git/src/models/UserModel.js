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
        username: this.data.integrations?.telegra
