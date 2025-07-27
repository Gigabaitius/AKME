// src/views/pages/SettingsPage.jsx
/**
 * ⚙️ Страница настроек
 * @description Управление настройками приложения и интеграциями
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon,
  Link,
  Unlink,
  Check,
  X,
  AlertCircle,
  Save,
  Moon,
  Sun,
  Globe,
  Bell,
  Shield,
  Database,
  Download,
  Upload,
  Trash2,
  Key,
  MessageCircle,
  FileSpreadsheet,
  Send,
  Bot
} from 'lucide-react';

// Компоненты
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

// Контроллеры и утилиты
import AppController from '@controllers/AppController';
import AuthController from '@controllers/AuthController';
import EventBus from '@utils/EventBus';
import Logger from '@utils/Logger';

// Стили
import './SettingsPage.css';

const logger = new Logger('SettingsPage');

/**
 * Страница настроек
 * @returns {JSX.Element} Страница настроек
 */
const SettingsPage = () => {
  // Состояние
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'ru',
    notifications: {
      enabled: true,
      sound: true,
      desktop: true,
      email: false
    },
    autoSave: true,
    autoSync: true,
    googleSheetsConnected: false,
    whatsappConnected: false,
    telegramConnected: false,
    twilioConnected: false,
    ocrApiKey: '',
    telegramBotToken: '',
    twilioCredentials: {
      accountSid: '',
      authToken: '',
      phoneNumber: ''
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [showTelegramSetup, setShowTelegramSetup] = useState(false);
  const [showTwilioSetup, setShowTwilioSetup] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Контроллеры
  const [appController] = useState(() => new AppController());
  const [authController] = useState(() => new AuthController());

  // Загрузка настроек при монтировании
  useEffect(() => {
    loadSettings();
    checkIntegrationStatus();

    // Подписка на изменения настроек
    const handleSettingsChanged = (newSettings) => {
      setSettings(prev => ({ ...prev, ...newSettings }));
    };

    EventBus.on('app:settingsChanged', handleSettingsChanged);
    return () => EventBus.off('app:settingsChanged', handleSettingsChanged);
  }, []);

  // Загрузка настроек
  const loadSettings = () => {
    const currentSettings = appController.getSettings();
    setSettings(prev => ({ ...prev, ...currentSettings }));
  };

  // Проверка статуса интеграций
  const checkIntegrationStatus = async () => {
    try {
      const status = await authController.checkAuthStatus();
      setSettings(prev => ({
        ...prev,
        googleSheetsConnected: status.googleSheetsConnected,
        whatsappConnected: status.whatsappConnected,
        telegramConnected: status.telegramConnected
      }));
    } catch (error) {
      logger.error('Ошибка проверки интеграций', error);
    }
  };

  // Изменение настройки
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Изменение вложенной настройки
  const handleNestedSettingChange = (parent, key, value) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [key]: value
      }
    }));
  };

  // Сохранение настроек
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await appController.updateSettings(settings);
      EventBus.emit('notification:success', 'Настройки сохранены');
    } catch (error) {
      logger.error('Ошибка сохранения настроек', error);
      EventBus.emit('notification:error', 'Не удалось сохранить настройки');
    } finally {
      setIsSaving(false);
    }
  };

  // Подключение Google Sheets
  const handleConnectGoogleSheets = async () => {
    try {
      setIsLoading(true);
      const success = await authController.connectGoogleSheets();
      if (success) {
        setSettings(prev => ({ ...prev, googleSheetsConnected: true }));
      }
    } catch (error) {
      logger.error('Ошибка подключения Google Sheets', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Отключение Google Sheets
  const handleDisconnectGoogleSheets = async () => {
    if (window.confirm('Отключить Google Sheets?')) {
      try {
        setIsLoading(true);
        await authController.disconnectGoogleSheets();
        setSettings(prev => ({ ...prev, googleSheetsConnected: false }));
      } catch (error) {
        logger.error('Ошибка отключения Google Sheets', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Подключение Telegram
  const handleConnectTelegram = async () => {
    try {
      setIsLoading(true);
      const success = await authController.connectTelegram(settings.telegramBotToken);
      if (success) {
        setSettings(prev => ({ ...prev, telegramConnected: true }));
        setShowTelegramSetup(false);
      }
    } catch (error) {
      logger.error('Ошибка подключения Telegram', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Подключение Twilio
  const handleConnectTwilio = async () => {
    try {
      setIsLoading(true);
      const success = await authController.connectTwilio(settings.twilioCredentials);
      if (success) {
        setSettings(prev => ({ ...prev, twilioConnected: true }));
        setShowTwilioSetup(false);
      }
    } catch (error) {
      logger.error('Ошибка подключения Twilio', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Экспорт данных
  const handleExportData = async () => {
    try {
      setIsLoading(true);
      const data = await appController.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `hr-assistant-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      EventBus.emit('notification:success', 'Данные экспортированы');
      setShowExportModal(false);
    } catch (error) {
      logger.error('Ошибка экспорта', error);
      EventBus.emit('notification:error', 'Не удалось экспортировать данные');
    } finally {
      setIsLoading(false);
    }
  };

  // Импорт данных
  const handleImportData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);
      
      await appController.importData(data);
      EventBus.emit('notification:success', 'Данные импортированы');
      setShowImportModal(false);
      
      // Перезагрузка страницы для обновления данных
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      logger.error('Ошибка импорта', error);
      EventBus.emit('notification:error', 'Не удалось импортировать данные');
    } finally {
      setIsLoading(false);
    }
  };

  // Очистка всех данных
  const handleClearAllData = async () => {
    if (window.confirm('Вы уверены? Все данные будут удалены безвозвратно!')) {
      if (window.confirm('Это действие нельзя отменить. Продолжить?')) {
        try {
          setIsLoading(true);
          await appController.clearAllData();
          EventBus.emit('notification:success', 'Все данные очищены');
          
          // Перезагрузка страницы
          setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
          logger.error('Ошибка очистки данных', error);
          EventBus.emit('notification:error', 'Не удалось очистить данные');
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  // Вкладки настроек
  const tabs = [
    { id: 'general', label: 'Общие', icon: <SettingsIcon size={20} /> },
    { id: 'integrations', label: 'Интеграции', icon: <Link size={20} /> },
    { id: 'notifications', label: 'Уведомления', icon: <Bell size={20} /> },
    { id: 'data', label: 'Данные', icon: <Database size={20} /> },
    { id: 'security', label: 'Безопасность', icon: <Shield size={20} /> }
  ];

  return (
    <div className="settings-page">
      {/* Заголовок */}
      <div className="page-header">
        <h1 className="page-title">Настройки</h1>
        <p className="page-subtitle">
          Управление приложением и интеграциями
        </p>
      </div>

      {/* Вкладки */}
      <div className="settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      <div className="settings-content">
        {/* Общие настройки */}
        {activeTab === 'general' && (
          <motion.div
            className="settings-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="section-title">Общие настройки</h2>
            
            <div className="setting-item">
              <div className="setting-info">
                <h3>Тема оформления</h3>
                <p>Выберите светлую или темную тему</p>
              </div>
              <div className="setting-control">
                <div className="theme-selector">
                  <button
                    className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('theme', 'light')}
                  >
                    <Sun size={20} />
                    Светлая
                  </button>
                  <button
                    className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('theme', 'dark')}
                  >
                    <Moon size={20} />
                    Темная
                  </button>
                </div>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h3>Язык интерфейса</h3>
                <p>Выберите язык приложения</p>
              </div>
              <div className="setting-control">
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="setting-select"
                >
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h3>Автосохранение</h3>
                <p>Автоматически сохранять изменения</p>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.autoSave}
                    onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h3>Автосинхронизация</h3>
                <p>Синхронизировать с Google Sheets автоматически</p>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.autoSync}
                    onChange={(e) => handleSettingChange('autoSync', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {/* Интеграции */}
        {activeTab === 'integrations' && (
          <motion.div
            className="settings-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="section-title">Интеграции</h2>
            
            {/* Google Sheets */}
            <div className="integration-card">
              <div className="integration-header">
                <div className="integration-info">
                  <FileSpreadsheet size={32} className="integration-icon" />
                  <div>
                    <h3>Google Sheets</h3>
                    <p>Синхронизация данных с таблицами</p>
                  </div>
                </div>
                <div className={`integration-status ${settings.googleSheetsConnected ? 'connected' : 'disconnected'}`}>
                  {settings.googleSheetsConnected ? (
                    <>
                      <Check size={16} /> Подключено
                    </>
                  ) : (
                    <>
                      <X size={16} /> Не подключено
                    </>
                  )}
                </div>
              </div>
              <div className="integration-actions">
                {settings.googleSheetsConnected ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDisconnectGoogleSheets}
                    loading={isLoading}
                  >
                    <Unlink size={16} />
                    Отключить
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConnectGoogleSheets}
                    loading={isLoading}
                  >
                    <Link size={16} />
                    Подключить
                  </Button>
                )}
              </div>
            </div>

            {/* WhatsApp */}
            <div className="integration-card">
              <div className="integration-header">
                <div className="integration-info">
                  <MessageCircle size={32} className="integration-icon" />
                  <div>
                    <h3>WhatsApp</h3>
                    <p>Автоматическая обработка сообщений</p>
                  </div>
                </div>
                <div className={`integration-status ${settings.whatsappConnected ? 'connected' : 'disconnected'}`}>
                  {settings.whatsappConnected ? (
                    <>
                      <Check size={16} /> Подключено
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} /> Откройте WhatsApp Web
                    </>
                  )}
                </div>
              </div>
              <div className="integration-note">
                <AlertCircle size={16} />
                <span>
                  WhatsApp подключается автоматически при открытии WhatsApp Web в браузере
                </span>
              </div>
            </div>

            {/* Telegram */}
            <div className="integration-card">
              <div className="integration-header">
                <div className="integration-info">
                  <Send size={32} className="integration-icon" />
                  <div>
                    <h3>Telegram Bot</h3>
                    <p>Уведомления через Telegram</p>
                  </div>
                </div>
                <div className={`integration-status ${settings.telegramConnected ? 'connected' : 'disconnected'}`}>
                  {settings.telegramConnected ? (
                    <>
                      <Check size={16} /> Подключено
                    </>
                  ) : (
                    <>
                      <X size={16} /> Не подключено
                    </>
                  )}
                </div>
              </div>
              <div className="integration-actions">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowTelegramSetup(true)}
                >
                  <Bot size={16} />
                  Настроить бота
                </Button>
              </div>
            </div>

            {/* Twilio SMS */}
            <div className="integration-card">
              <div className="integration-header">
                <div className="integration-info">
                  <MessageCircle size={32} className="integration-icon" />
                  <div>
                    <h3>Twilio SMS</h3>
                    <p>SMS уведомления для молчащих кандидатов</p>
                  </div>
                </div>
                <div className={`integration-status ${settings.twilioConnected ? 'connected' : 'disconnected'}`}>
                  {settings.twilioConnected ? (
                    <>
                      <Check size={16} /> Подключено
                    </>
                  ) : (
                    <>
                      <X size={16} /> Не подключено
                    </>
                  )}
                </div>
              </div>
              <div className="integration-actions">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowTwilioSetup(true)}
                >
                  <Key size={16} />
                  Настроить Twilio
                </Button>
              </div>
            </div>

            {/* OCR */}
            <div className="integration-card">
              <div className="integration-header">
                <div className="integration-info">
                  <FileSpreadsheet size={32} className="integration-icon" />
                  <div>
                    <h3>OCR распознавание</h3>
                    <p>Автоматическое чтение документов</p>
                  </div>
                </div>
              </div>
              <div className="integration-form">
                <input
                  type="text"
                  placeholder="API ключ OCR.space (опционально)"
                  value={settings.ocrApiKey}
                  onChange={(e) => handleSettingChange('ocrApiKey', e.target.value)}
                  className="setting-input"
                />
                <p className="input-hint">
                  Без ключа используется бесплатный Tesseract.js
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Уведомления */}
        {activeTab === 'notifications' && (
          <motion.div
            className="settings-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="section-title">Уведомления</h2>
            
            <div className="setting-item">
              <div className="setting-info">
                <h3>Уведомления включены</h3>
                <p>Получать уведомления о важных событиях</p>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.enabled}
                    onChange={(e) => handleNestedSettingChange('notifications', 'enabled', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h3>Звуковые уведомления</h3>
                <p>Воспроизводить звук при уведомлении</p>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.sound}
                    onChange={(e) => handleNestedSettingChange('notifications', 'sound', e.target.checked)}
                    disabled={!settings.notifications.enabled}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h3>Уведомления на рабочем столе</h3>
                <p>Показывать системные уведомления</p>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.desktop}
                    onChange={(e) => handleNestedSettingChange('notifications', 'desktop', e.target.checked)}
                    disabled={!settings.notifications.enabled}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h3>Email уведомления</h3>
                <p>Отправлять важные уведомления на email</p>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications.email}
                    onChange={(e) => handleNestedSettingChange('notifications', 'email', e.target.checked)}
                    disabled={!settings.notifications.enabled}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {/* Данные */}
        {activeTab === 'data' && (
          <motion.div
            className="settings-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="section-title">Управление данными</h2>
            
            <div className="data-actions">
              <div className="data-card">
                <Download size={48} className="data-icon" />
                <h3>Экспорт данных</h3>
                <p>Сохранить все данные в файл</p>
                <Button
                  variant="primary"
                  onClick={() => setShowExportModal(true)}
                >
                  <Download size={20} />
                  Экспортировать
                </Button>
              </div>

              <div className="data-card">
                <Upload size={48} className="data-icon" />
                <h3>Импорт данных</h3>
                <p>Восстановить данные из файла</p>
                <Button
                  variant="primary"
                  onClick={() => setShowImportModal(true)}
                >
                  <Upload size={20} />
                  Импортировать
                </Button>
              </div>

              <div className="data-card danger">
                <Trash2 size={48} className="data-icon" />
                <h3>Очистить все данные</h3>
                <p>Удалить все данные безвозвратно</p>
                <Button
                  variant="danger"
                  onClick={handleClearAllData}
                >
                  <Trash2 size={20} />
                  Очистить
                </Button>
              </div>
            </div>

            <div className="data-info">
              <h3>Информация о хранилище</h3>
              <div className="storage-stats">
                <div className="stat-item">
                  <span className="stat-label">Кандидатов:</span>
                  <span className="stat-value">
                    {JSON.parse(localStorage.getItem('hr-assistant-candidates') || '[]').length}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Вахтовиков:</span>
                  <span className="stat-value">
                    {JSON.parse(localStorage.getItem('hr-assistant-shiftWorkers') || '[]').length}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">База знаний:</span>
                  <span className="stat-value">
                    {JSON.parse(localStorage.getItem('hr-assistant-knowledge') || '[]').length}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Размер данных:</span>
                  <span className="stat-value">
                    {(new Blob([JSON.stringify(localStorage)]).size / 1024).toFixed(2)} KB
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Безопасность */}
        {activeTab === 'security' && (
          <motion.div
            className="settings-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="section-title">Безопасность</h2>
            
            <div className="security-info">
              <Shield size={48} className="security-icon" />
              <h3>Защита данных</h3>
              <p>
                Все данные хранятся локально в вашем браузере и не передаются на внешние серверы.
                API ключи защищены и хранятся только в браузерном расширении.
              </p>
            </div>

            <div className="security-features">
              <div className="feature-item">
                <Check size={20} className="feature-icon" />
                <span>Локальное хранение данных</span>
              </div>
              <div className="feature-item">
                <Check size={20} className="feature-icon" />
                <span>Шифрование API ключей</span>
              </div>
              <div className="feature-item">
                <Check size={20} className="feature-icon" />
                <span>OAuth авторизация для Google</span>
              </div>
              <div className="feature-item">
                <Check size={20} className="feature-icon" />
                <span>Безопасная передача данных</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Кнопка сохранения */}
      <div className="settings-footer">
        <Button
          variant="primary"
          onClick={handleSaveSettings}
          loading={isSaving}
          disabled={isSaving}
        >
          <Save size={20} />
          Сохранить настройки
        </Button>
      </div>

      {/* Модальные окна */}
      
      {/* Настройка Telegram */}
      {showTelegramSetup && (
        <Modal
          title="Настройка Telegram бота"
          onClose={() => setShowTelegramSetup(false)}
          size="md"
        >
          <div className="integration-setup">
            <div className="setup-instructions">
              <h4>Как создать бота:</h4>
              <ol>
                <li>Откройте @BotFather в Telegram</li>
                <li>Отправьте команду /newbot</li>
                <li>Следуйте инструкциям</li>
                <li>Скопируйте токен бота</li>
              </ol>
            </div>
            
            <div className="setup-form">
              <input
                type="text"
                placeholder="Вставьте токен бота"
                value={settings.telegramBotToken}
                onChange={(e) => handleSettingChange('telegramBotToken', e.target.value)}
                className="setting-input"
              />
              
              <div className="form-actions">
                <Button
                  variant="primary"
                  onClick={handleConnectTelegram}
                  loading={isLoading}
                  disabled={!settings.telegramBotToken}
                >
                  Подключить
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowTelegramSetup(false)}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Настройка Twilio */}
      {showTwilioSetup && (
        <Modal
          title="Настройка Twilio SMS"
          onClose={() => setShowTwilioSetup(false)}
          size="md"
        >
          <div className="integration-setup">
            <div className="setup-instructions">
              <h4>Данные из консоли Twilio:</h4>
              <p>Получите бесплатно $15 на <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer">twilio.com</a></p>
            </div>
            
            <div className="setup-form">
              <input
                type="text"
                placeholder="Account SID"
                value={settings.twilioCredentials.accountSid}
                onChange={(e) => handleNestedSettingChange('twilioCredentials', 'accountSid', e.target.value)}
                className="setting-input"
              />
              
              <input
                type="password"
                placeholder="Auth Token"
                value={settings.twilioCredentials.authToken}
                onChange={(e) => handleNestedSettingChange('twilioCredentials', 'authToken', e.target.value)}
                className="setting-input"
              />
              
              <input
                type="tel"
                placeholder="Twilio Phone Number (+1234567890)"
                value={settings.twilioCredentials.phoneNumber}
                onChange={(e) => handleNestedSettingChange('twilioCredentials', 'phoneNumber', e.target.value)}
                className="setting-input"
              />
              
              <div className="form-actions">
                <Button
                  variant="primary"
                  onClick={handleConnectTwilio}
                  loading={isLoading}
                  disabled={
                    !settings.twilioCredentials.accountSid ||
                    !settings.twilioCredentials.authToken ||
                    !settings.twilioCredentials.phoneNumber
                  }
                >
                  Подключить
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowTwilioSetup(false)}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Экспорт данных */}
      {showExportModal && (
        <Modal
          title="Экспорт данных"
          onClose={() => setShowExportModal(false)}
          size="sm"
        >
          <div className="export-modal">
            <p>
              Все данные будут сохранены в JSON файл. 
              Вы сможете восстановить их позже через импорт.
            </p>
            <div className="modal-actions">
              <Button
                variant="primary"
                onClick={handleExportData}
                loading={isLoading}
              >
                <Download size={20} />
                Скачать файл
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowExportModal(false)}
              >
                Отмена
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Импорт данных */}
      {showImportModal && (
        <Modal
          title="Импорт данных"
          onClose={() => setShowImportModal(false)}
          size="sm"
        >
          <div className="import-modal">
            <p>
              Выберите файл резервной копии для восстановления данных.
              Текущие данные будут заменены!
            </p>
            
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              hidden
              id="import-file"
            />
            
            <div className="modal-actions">
              <label htmlFor="import-file">
                <Button as="span" variant="primary" loading={isLoading}>
                  <Upload size={20} />
                  Выбрать файл
                </Button>
              </label>
              <Button
                variant="secondary"
                onClick={() => setShowImportModal(false)}
              >
                Отмена
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SettingsPage;
