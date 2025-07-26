/ src/App.js
/**
 * 🚀 Главный компонент HR Assistant приложения
 * @description Инициализация MVC архитектуры и основной роутинг
 */
import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// MVC Components
import AppController from '@controllers/AppController';
import MainTemplate from '@components/templates/MainTemplate';
import ErrorBoundary from '@components/common/ErrorBoundary';
import LoadingScreen from '@components/common/LoadingScreen';

// Pages (Lazy Loading)
const DashboardPage = React.lazy(() => import('@pages/DashboardPage'));
const HomePage = React.lazy(() => import('@pages/HomePage'));
const CandidatesPage = React.lazy(() => import('@pages/CandidatesPage'));
const ShiftWorkersPage = React.lazy(() => import('@pages/ShiftWorkersPage'));
const SilentPage = React.lazy(() => import('@pages/SilentPage'));
const TransferredPage = React.lazy(() => import('@pages/TransferredPage'));
const TrainingPage = React.lazy(() => import('@pages/TrainingPage'));
const KnowledgePage = React.lazy(() => import('@pages/KnowledgePage'));
const MailingsPage = React.lazy(() => import('@pages/MailingsPage'));
const SettingsPage = React.lazy(() => import('@pages/SettingsPage'));

// Utilities
import EventBus from '@utils/EventBus';
import Logger from '@utils/Logger';
import { routes } from '@config/routes';

// Styles
import '@styles/globals.css';

const logger = new Logger('App');

/**
 * Главный компонент приложения
 * @returns {JSX.Element} HR Assistant приложение
 */
function App() {
  const [appController] = useState(() => new AppController());
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [settings, setSettings] = useState(appController.getSettings());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Подписываемся на события приложения
    const handleAppInitialized = () => {
      setIsInitialized(true);
      setIsLoading(false);
      logger.info('✅ Приложение инициализировано');
    };

    const handleNavigationChange = ({ page }) => {
      setCurrentPage(page);
      logger.debug(`📍 Навигация: ${page}`);
    };

    const handleSettingsChanged = (newSettings) => {
      setSettings(newSettings);
      logger.debug('⚙️ Настройки обновлены');
    };

    const handleLoadingChange = ({ loading }) => {
      setIsLoading(loading);
    };

    const handleError = ({ message, context }) => {
      setError({ message, context, timestamp: new Date() });
      toast.error(message);
      logger.error(`❌ Ошибка ${context}:`, message);
    };

    const handleSuccess = (message) => {
      toast.success(message);
    };

    const handleWarning = (message) => {
      toast.warning(message);
    };

    const handleInfo = (message) => {
      toast.info(message);
    };

    // Подписки на события
    EventBus.on('app:initialized', handleAppInitialized);
    EventBus.on('navigation:change', handleNavigationChange);
    EventBus.on('app:settingsChanged', handleSettingsChanged);
    EventBus.on('loading', handleLoadingChange);
    EventBus.on('error', handleError);
    EventBus.on('notification:success', handleSuccess);
    EventBus.on('notification:warning', handleWarning);
    EventBus.on('notification:info', handleInfo);

    // Cleanup
    return () => {
      EventBus.off('app:initialized', handleAppInitialized);
      EventBus.off('navigation:change', handleNavigationChange);
      EventBus.off('app:settingsChanged', handleSettingsChanged);
      EventBus.off('loading', handleLoadingChange);
      EventBus.off('error', handleError);
      EventBus.off('notification:success', handleSuccess);
      EventBus.off('notification:warning', handleWarning);
      EventBus.off('notification:info', handleInfo);
    };
  }, [appController]);

  // Добавляем data-app атрибут для обнаружения расширением
  useEffect(() => {
    document.body.setAttribute('data-app', 'hr-assistant');
    document.body.className = `theme-${settings.theme} lang-${settings.language}`;
  }, [settings.theme, settings.language]);

  // Обработка ошибок загрузки страниц
  const PageErrorFallback = ({ error, resetError }) => (
    <div className="page-error">
      <h2>Ошибка загрузки страницы</h2>
      <p>{error.message}</p>
      <button onClick={resetError}>Попробовать снова</button>
    </div>
  );

  // Компонент загрузки страницы
  const PageLoading = () => (
    <div className="page-loading">
      <div className="loading-spinner"></div>
      <p>Загрузка страницы...</p>
    </div>
  );

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <div className={`app ${settings.theme}`} data-app="hr-assistant">
        <Router>
          <MainTemplate
            currentPage={currentPage}
            settings={settings}
            isLoading={isLoading}
            appController={appController}
            error={error}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Suspense fallback={<PageLoading />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={
                      <ErrorBoundary fallback={PageErrorFallback}>
                        <DashboardPage />
                      </ErrorBoundary>
                    } />
                    <Route path="/home" element={
                      <ErrorBoundary fallback={PageErrorFallback}>
                        <HomePage />
                      </ErrorBoundary>
                    } />
                    <Route path="/candidates" element={
                      <ErrorBoundary fallback={PageErrorFallback}>
                        <CandidatesPage />
                      </ErrorBoundary>
                    } />
                    <Route path="/shift-workers" element={
                      <ErrorBoundary fallback={PageErrorFallback}>
                        <ShiftWorkersPage />
                      </ErrorBoundary>
                    } />
                    <Route path="/silent" element={
                      <ErrorBoundary fallback={PageErrorFallback}>
                        <SilentPage />
                      </ErrorBoundary>
                    } />
                    <Route path="/transferred" element={
                      <ErrorBoundary fallback={PageErrorFallback}>
                        <TransferredPage />
                      </ErrorBoundary>
                    } />
                    <Route path="/training" element={
                      <ErrorBoundary fallback={PageErrorFallback}>
                        <TrainingPage />
                      </ErrorBoundary>
                    } />
                    <Route path="/knowledge" element={
                      <ErrorBoundary fallback={PageErrorFallback}>
                        <KnowledgePage />
                      </ErrorBoundary>
                    } />
                    <Route path="/mailings" element={
                      <ErrorBoundary fallback={PageErrorFallback}>
                        <MailingsPage />
                      </ErrorBoundary>
                    } />
                    <Route path="/settings" element={
                      <ErrorBoundary fallback={PageErrorFallback}>
                        <SettingsPage />
                      </ErrorBoundary>
                    } />
                    <Route path="*" element={
                      <div className="page-not-found">
                        <h1>404 - Страница не найдена</h1>
                        <p>Запрашиваемая страница не существует.</p>
                        <button onClick={() => window.history.back()}>Назад</button>
                      </div>
                    } />
                  </Routes>
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </MainTemplate>
        </Router>

        {/* Toast уведомления */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: settings.theme === 'dark' ? '#1f2937' : '#ffffff',
              color: settings.theme === 'dark' ? '#f3f4f6' : '#1f2937',
              border: '1px solid',
              borderColor: settings.theme === 'dark' ? '#374151' : '#e5e7eb',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;