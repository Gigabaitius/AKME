// src/views/components/features/ExtensionSetup.jsx
/**
 * 🔌 Компонент настройки браузерного расширения
 * @description Модальное окно для установки и настройки расширения
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Chrome,
  Settings,
  Link,
  ArrowRight,
  X
} from 'lucide-react';

// Компоненты
import Button from '../common/Button';

// Стили
import './ExtensionSetup.css';

/**
 * Компонент настройки расширения
 * @param {Object} props - Пропсы компонента
 * @param {Function} props.onComplete - Обработчик завершения настройки
 * @param {Function} props.onSkip - Обработчик пропуска
 * @returns {JSX.Element} Модальное окно настройки
 */
const ExtensionSetup = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isExtensionDetected, setIsExtensionDetected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Проверка наличия расширения
  useEffect(() => {
    const checkExtension = () => {
      setIsChecking(true);
      
      // Проверяем наличие API от расширения
      setTimeout(() => {
        const hasExtension = window.HRAssistantAPI !== undefined;
        setIsExtensionDetected(hasExtension);
        setIsChecking(false);
        
        if (hasExtension) {
          setCurrentStep(3);
        }
      }, 1000);
    };

    checkExtension();
    
    // Слушаем сообщения от расширения
    const handleMessage = (event) => {
      if (event.data.type === 'HR_ASSISTANT_EXTENSION_READY') {
        setIsExtensionDetected(true);
        setCurrentStep(3);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Шаги установки
  const steps = [
    {
      id: 1,
      title: 'Установите расширение',
      description: 'Скачайте и установите браузерное расширение HR Assistant',
      icon: <Download size={48} />,
      action: (
        <div className="step-actions">
          <Button
            variant="primary"
            onClick={() => {
              // Открываем страницу с расширением
              window.open('/browser-extension/README.md', '_blank');
              setCurrentStep(2);
            }}
          >
            <Chrome size={20} />
            Скачать расширение
          </Button>
          <p className="step-note">
            Поддерживается Chrome, Edge, Brave и другие Chromium-браузеры
          </p>
        </div>
      )
    },
    {
      id: 2,
      title: 'Активируйте расширение',
      description: 'Следуйте инструкциям для установки расширения',
      icon: <Settings size={48} />,
      content: (
        <div className="installation-guide">
          <ol>
            <li>
              <strong>Откройте chrome://extensions/</strong>
              <p>Скопируйте и вставьте в адресную строку браузера</p>
            </li>
            <li>
              <strong>Включите "Режим разработчика"</strong>
              <p>Переключатель находится в правом верхнем углу</p>
            </li>
            <li>
              <strong>Нажмите "Загрузить распакованное"</strong>
              <p>Выберите папку browser-extension из архива</p>
            </li>
            <li>
              <strong>Проверьте установку</strong>
              <p>Иконка HR Assistant должна появиться в панели расширений</p>
            </li>
          </ol>
        </div>
      ),
      action: (
        <Button
          variant="primary"
          onClick={() => window.location.reload()}
          disabled={isChecking}
        >
          {isChecking ? 'Проверка...' : 'Проверить подключение'}
        </Button>
      )
    },
    {
      id: 3,
      title: 'Расширение подключено!',
      description: 'Теперь вы можете использовать все функции HR Assistant',
      icon: <CheckCircle size={48} className="success-icon" />,
      content: (
        <div className="features-list">
          <h4>Доступные функции:</h4>
          <ul>
            <li>
              <Link size={16} />
              <span>WhatsApp интеграция - автоматическая обработка сообщений</span>
            </li>
            <li>
              <Link size={16} />
              <span>Google Sheets - синхронизация данных кандидатов</span>
            </li>
            <li>
              <Link size={16} />
              <span>OCR - распознавание документов из чатов</span>
            </li>
            <li>
              <Link size={16} />
              <span>Уведомления - SMS и Telegram оповещения</span>
            </li>
          </ul>
        </div>
      ),
      action: (
        <Button
          variant="primary"
          onClick={onComplete}
        >
          Начать работу
          <ArrowRight size={20} />
        </Button>
      )
    }
  ];

  const currentStepData = steps.find(step => step.id === currentStep);

  return (
    <div className="extension-setup-overlay">
      <motion.div
        className="extension-setup-modal"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {/* Заголовок */}
        <div className="setup-header">
          <h2>Настройка HR Assistant</h2>
          <button
            className="setup-close"
            onClick={onSkip}
            aria-label="Закрыть"
          >
            <X size={24} />
          </button>
        </div>

        {/* Прогресс */}
        <div className="setup-progress">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`progress-step ${
                currentStep >= step.id ? 'active' : ''
              } ${currentStep === step.id ? 'current' : ''}`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-line" />
            </div>
          ))}
        </div>

        {/* Контент шага */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            className="setup-content"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="step-icon">{currentStepData.icon}</div>
            <h3 className="step-title">{currentStepData.title}</h3>
            <p className="step-description">{currentStepData.description}</p>
            
            {currentStepData.content && (
              <div className="step-content">
                {currentStepData.content}
              </div>
            )}
            
            <div className="step-footer">
              {currentStepData.action}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Предупреждение */}
        {!isExtensionDetected && currentStep > 1 && !isChecking && (
          <div className="setup-warning">
            <AlertCircle size={20} />
            <span>
              Расширение не обнаружено. Убедитесь, что оно установлено и активировано.
            </span>
          </div>
        )}

        {/* Пропустить */}
        <div className="setup-skip">
          <button
            className="skip-button"
            onClick={onSkip}
          >
            Настроить позже
          </button>
          <p className="skip-note">
            Вы можете настроить расширение позже в разделе "Настройки"
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ExtensionSetup;
