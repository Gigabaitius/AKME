// src/views/components/common/ErrorBoundary.jsx
/**
 * 🚨 Компонент обработки ошибок React
 * @description Перехватывает ошибки в дочерних компонентах
 */
import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Logger from '@utils/Logger';
import './ErrorBoundary.css';

const logger = new Logger('ErrorBoundary');

/**
 * Компонент обработки ошибок
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  /**
   * Обновление состояния при ошибке
   * @param {Error} error - Объект ошибки
   * @returns {Object} Новое состояние
   */
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  /**
   * Логирование ошибки
   * @param {Error} error - Объект ошибки
   * @param {Object} errorInfo - Информация об ошибке
   */
  componentDidCatch(error, errorInfo) {
    logger.error('Перехвачена ошибка React:', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Отправка ошибки в систему мониторинга (если настроено)
    if (window.errorReporter) {
      window.errorReporter.captureException(error, {
        extra: errorInfo
      });
    }
  }

  /**
   * Сброс состояния ошибки
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  /**
   * Перезагрузка страницы
   */
  handleReload = () => {
    window.location.reload();
  };

  /**
   * Переход на главную
   */
  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Если передан кастомный компонент ошибки
      if (fallback) {
        return fallback({ error, errorInfo, resetError: this.handleReset });
      }

      // Стандартный экран ошибки
      return (
        <div className="error-boundary">
          <div className="error-container">
            <div className="error-icon">
              <AlertTriangle size={64} />
            </div>

            <h1 className="error-title">Упс! Что-то пошло не так</h1>
            
            <p className="error-message">
              Произошла непредвиденная ошибка. Мы уже работаем над её устранением.
            </p>

            {/* Детали ошибки в режиме разработки */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="error-details">
                <summary>Технические детали</summary>
                <div className="error-stack">
                  <p className="error-name">{error.toString()}</p>
                  <pre>{error.stack}</pre>
                  {errorInfo && (
                    <div className="component-stack">
                      <p>Стек компонентов:</p>
                      <pre>{errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Действия */}
            <div className="error-actions">
              <button
                className="error-button primary"
                onClick={this.handleReset}
              >
                <RefreshCw size={20} />
                Попробовать снова
              </button>

              <button
                className="error-button secondary"
                onClick={this.handleReload}
              >
                Перезагрузить страницу
              </button>

              <button
                className="error-button secondary"
                onClick={this.handleGoHome}
              >
                <Home size={20} />
                На главную
              </button>
            </div>

            {/* Предупреждение о повторных ошибках */}
            {errorCount > 2 && (
              <div className="error-warning">
                <p>
                  Похоже, ошибка повторяется. Попробуйте очистить кэш браузера 
                  или обратитесь в поддержку.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
