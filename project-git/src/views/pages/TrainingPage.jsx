// src/views/pages/TrainingPage.jsx
/**
 * 🤖 Страница обучения GPT
 * @description Чат для обучения ИИ с сохранением истории
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User,
  Download,
  Upload,
  Trash2,
  Save,
  FileText,
  Clock,
  MessageCircle,
  AlertCircle,
  Loader
} from 'lucide-react';

// Компоненты
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';

// Контроллеры и утилиты
import TrainingController from '@controllers/TrainingController';
import EventBus from '@utils/EventBus';
import Logger from '@utils/Logger';
import { formatDate } from '@utils/dateHelpers';

// Стили
import './TrainingPage.css';

const logger = new Logger('TrainingPage');

/**
 * Страница обучения GPT
 * @returns {JSX.Element} Страница обучения
 */
const TrainingPage = () => {
  // Состояние
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [trainingStats, setTrainingStats] = useState({
    totalMessages: 0,
    userMessages: 0,
    botMessages: 0,
    sessionDuration: 0
  });
  
  // Рефы
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Контроллер
  const [controller] = useState(() => new TrainingController());

  // Автопрокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Загрузка истории при монтировании
  useEffect(() => {
    loadChatHistory();
    
    // Подписка на события
    const handleMessageAdded = (message) => {
      setMessages(prev => [...prev, message]);
      updateStats();
    };
    
    const handleHistoryCleared = () => {
      setMessages([]);
      updateStats();
    };

    EventBus.on('training:messageAdded', handleMessageAdded);
    EventBus.on('training:historyCleared', handleHistoryCleared);

    return () => {
      EventBus.off('training:messageAdded', handleMessageAdded);
      EventBus.off('training:historyCleared', handleHistoryCleared);
    };
  }, []);

  // Прокрутка при новых сообщениях
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Загрузка истории чата
  const loadChatHistory = () => {
    const history = controller.getChatHistory();
    setMessages(history);
    updateStats();
  };

  // Обновление статистики
  const updateStats = () => {
    const stats = controller.getTrainingStatistics();
    setTrainingStats(stats);
  };

  // Отправка сообщения
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);
    
    try {
      await controller.sendMessage(message);
    } catch (error) {
      logger.error('Ошибка отправки сообщения', error);
      EventBus.emit('notification:error', 'Не удалось отправить сообщение');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Очистка истории
  const handleClearHistory = () => {
    if (window.confirm('Вы уверены, что хотите очистить всю историю чата?')) {
      controller.clearChatHistory();
      EventBus.emit('notification:success', 'История чата очищена');
    }
  };

  // Экспорт истории
  const handleExportHistory = () => {
    try {
      const csv = controller.exportChatHistory();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `training_history_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      EventBus.emit('notification:success', 'История экспортирована');
    } catch (error) {
      logger.error('Ошибка экспорта', error);
      EventBus.emit('notification:error', 'Не удалось экспортировать историю');
    }
  };

  // Загрузка файла для обучения
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      setIsLoading(true);
      await controller.uploadTrainingFile(file);
      setShowUploadModal(false);
      EventBus.emit('notification:success', 'Файл загружен для обучения');
    } catch (error) {
      logger.error('Ошибка загрузки файла', error);
      EventBus.emit('notification:error', 'Не удалось загрузить файл');
    } finally {
      setIsLoading(false);
    }
  };

  // Сохранение в базу знаний
  const handleSaveToKnowledge = async (message) => {
    try {
      await controller.saveToKnowledgeBase(message);
      EventBus.emit('notification:success', 'Сохранено в базу знаний');
    } catch (error) {
      logger.error('Ошибка сохранения', error);
      EventBus.emit('notification:error', 'Не удалось сохранить в базу знаний');
    }
  };

  // Форматирование сообщения
  const formatMessage = (content) => {
    // Простое форматирование для отображения
    return content
      .split('\n')
      .map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < content.split('\n').length - 1 && <br />}
        </React.Fragment>
      ));
  };

  return (
    <div className="training-page">
      {/* Заголовок */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">Обучение GPT</h1>
          <p className="page-subtitle">
            Чат для обучения ИИ • {messages.length} сообщений
          </p>
        </div>
        
        <div className="header-actions">
          <Button
            variant="secondary"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={20} />
            Загрузить файл
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleExportHistory}
            disabled={messages.length === 0}
          >
            <Download size={20} />
            Экспорт
          </Button>
          
          <Button
            variant="danger"
            onClick={handleClearHistory}
            disabled={messages.length === 0}
          >
            <Trash2 size={20} />
            Очистить
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="training-stats">
        <div className="stat-item">
          <MessageCircle size={20} />
          <span className="stat-value">{trainingStats.totalMessages}</span>
          <span className="stat-label">Всего сообщений</span>
        </div>
        
        <div className="stat-item">
          <User size={20} />
          <span className="stat-value">{trainingStats.userMessages}</span>
          <span className="stat-label">От пользователя</span>
        </div>
        
        <div className="stat-item">
          <Bot size={20} />
          <span className="stat-value">{trainingStats.botMessages}</span>
          <span className="stat-label">От бота</span>
        </div>
        
        <div className="stat-item">
          <Clock size={20} />
          <span className="stat-value">{trainingStats.sessionDuration}</span>
          <span className="stat-label">мин. сессии</span>
        </div>
      </div>

      {/* Чат */}
      <div className="chat-container">
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <Bot size={64} className="empty-icon" />
              <h3>Начните обучение</h3>
              <p>
                Задавайте вопросы и предоставляйте информацию для обучения ИИ.
                История сообщений сохраняется автоматически.
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  className={`message message-${message.type}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="message-avatar">
                    {message.type === 'user' ? (
                      <User size={20} />
                    ) : (
                      <Bot size={20} />
                    )}
                  </div>
                  
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-author">
                        {message.type === 'user' ? 'Вы' : 'GPT Assistant'}
                      </span>
                      <span className="message-time">
                        {formatDate(message.timestamp, 'time')}
                      </span>
                    </div>
                    
                    <div className="message-text">
                      {formatMessage(message.content)}
                    </div>
                    
                    {message.type === 'bot' && (
                      <div className="message-actions">
                        <button
                          className="message-action"
                          onClick={() => handleSaveToKnowledge(message)}
                          title="Сохранить в базу знаний"
                        >
                          <Save size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          
          {isTyping && (
            <motion.div
              className="typing-indicator"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Bot size={20} />
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Форма ввода */}
        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Введите сообщение для обучения..."
              disabled={isLoading}
              className="chat-input"
            />
            
            <Button
              type="submit"
              variant="primary"
              disabled={!inputMessage.trim() || isLoading}
              loading={isLoading}
            >
              <Send size={20} />
            </Button>
          </div>
          
          <div className="input-hint">
            <AlertCircle size={14} />
            <span>
              История сообщений сохраняется и не очищается автоматически
            </span>
          </div>
        </form>
      </div>

      {/* Модальное окно загрузки файла */}
      {showUploadModal && (
        <Modal
          title="Загрузить файл для обучения"
          onClose={() => setShowUploadModal(false)}
          size="md"
        >
          <div className="upload-modal">
            <div className="upload-info">
              <FileText size={48} className="upload-icon" />
              <p>
                Загрузите текстовый файл, PDF или документ с информацией для обучения GPT.
                Поддерживаемые форматы: .txt, .pdf, .doc, .docx
              </p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              hidden
            />
            
            <div className="upload-actions">
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                loading={isLoading}
              >
                <Upload size={20} />
                Выбрать файл
              </Button>
              
              <Button
                variant="secondary"
                onClick={() => setShowUploadModal(false)}
                disabled={isLoading}
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

export default TrainingPage;
