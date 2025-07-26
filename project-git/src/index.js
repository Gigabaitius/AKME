// src/index.js
/**
 * 🚀 HR Assistant - Точка входа приложения
 * @description Инициализация React приложения с MVC архитектурой
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Импорт глобальных стилей
import '@styles/globals.css';
import '@styles/variables.css';
import '@styles/themes.css';
import '@styles/components.css';
import '@styles/animations.css';
import '@styles/responsive.css';

// Импорт полифиллов для старых браузеров
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Конфигурация логирования
import Logger from '@utils/Logger';
const logger = new Logger('App');

// Обработка ошибок React
const ErrorBoundary = React.lazy(() => import('@components/common/ErrorBoundary'));

// Инициализация приложения
const initializeApp = async () => {
  try {
    logger.info('🚀 Инициализация HR Assistant...');
    
    // Проверяем поддержку браузера
    if (!window.Promise || !window.fetch || !window.localStorage) {
      throw new Error('Браузер не поддерживается. Обновите браузер до последней версии.');
    }
    
    // Устанавливаем метаданные приложения
    document.title = import.meta.env.VITE_APP_NAME || 'HR Assistant';
    
    // Создаем корневой элемент React
    const container = document.getElementById('root');
    if (!container) {
      throw new Error('Корневой элемент #root не найден');
    }
    
    const root = createRoot(container);
    
    // Уведомляем о готовности
    if (window.hrAssistantReady) {
      window.hrAssistantReady();
    }
    
    // Рендерим приложение
    root.render(
      <React.StrictMode>
        <React.Suspense fallback={
          <div className="app-loading">
            <div className="loading-spinner"></div>
            <p>Загрузка компонентов...</p>
          </div>
        }>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </React.Suspense>
      </React.StrictMode>
    );
    
    logger.info('✅ HR Assistant успешно инициализирован');
    
    // Аналитика инициализации (если включена)
    if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
      // TODO: Добавить аналитику
    }
    
  } catch (error) {
    logger.error('❌ Ошибка инициализации приложения:', error);
    
    // Показываем пользователю сообщение об ошибке
    const container = document.getElementById('root');
    if (container) {
      container.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          padding: 2rem;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          color: #991b1b;
        ">
          <h1>⚠️ Ошибка запуска приложения</h1>
          <p style="margin: 1rem 0; max-width: 500px; line-height: 1.6;">
            ${error.message}
          </p>
          <button onclick="window.location.reload()" style="
            padding: 0.75rem 1.5rem;
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
          ">
            🔄 Перезагрузить страницу
          </button>
          <details style="margin-top: 2rem; max-width: 600px;">
            <summary style="cursor: pointer; margin-bottom: 1rem;">Техническая информация</summary>
            <pre style="
              background: rgba(0,0,0,0.1);
              padding: 1rem;
              border-radius: 0.5rem;
              text-align: left;
              overflow: auto;
              font-size: 0.8rem;
            ">${error.stack || error.message}</pre>
          </details>
        </div>
      `;
    }
  }
};

// Ожидаем загрузки DOM и запускаем приложение
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Обработка глобальных ошибок
window.addEventListener('error', (event) => {
  logger.error('Глобальная ошибка:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Необработанное отклонение Promise:', event.reason);
});

// Экспорт для тестирования
export { initializeApp };