// src/views/pages/HomePage.jsx
/**
 * 🏠 Домашняя страница
 * @description Приветственная страница приложения
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  Volume2, 
  SendHorizontal, 
  GraduationCap,
  BookOpen,
  Mail,
  HardHat,
  ArrowRight,
  Zap,
  Shield,
  Globe,
  BarChart3
} from 'lucide-react';

// Компоненты
import Button from '@components/common/Button';

// Стили
import './HomePage.css';

/**
 * Домашняя страница
 * @returns {JSX.Element} Домашняя страница
 */
const HomePage = () => {
  const navigate = useNavigate();

  // Функции приложения
  const features = [
    {
      icon: <Users size={32} />,
      title: 'Управление кандидатами',
      description: 'Ведите базу кандидатов, отслеживайте статусы и историю взаимодействий',
      path: '/candidates',
      color: 'primary'
    },
    {
      icon: <Volume2 size={32} />,
      title: 'Молчащие кандидаты',
      description: 'Автоматическое выявление и работа с кандидатами без ответа',
      path: '/silent',
      color: 'warning'
    },
    {
      icon: <HardHat size={32} />,
      title: 'Контроль вахтовиков',
      description: 'Управление контрольными точками и мониторинг вахтовиков',
      path: '/shift-workers',
      color: 'success'
    },
    {
      icon: <GraduationCap size={32} />,
      title: 'Обучение GPT',
      description: 'Чат для обучения ИИ без автоочистки истории',
      path: '/training',
      color: 'info'
    },
    {
      icon: <BookOpen size={32} />,
      title: 'База знаний',
      description: 'Структурированная информация для быстрого доступа',
      path: '/knowledge',
      color: 'secondary'
    },
    {
      icon: <Mail size={32} />,
      title: 'Массовые рассылки',
      description: 'Отправка сообщений группам кандидатов через WhatsApp и SMS',
      path: '/mailings',
      color: 'danger'
    }
  ];

  // Преимущества
  const advantages = [
    {
      icon: <Zap size={24} />,
      title: 'Быстрая работа',
      description: 'Все данные хранятся локально для мгновенного доступа'
    },
    {
      icon: <Shield size={24} />,
      title: 'Безопасность',
      description: 'Ваши данные защищены и не передаются третьим лицам'
    },
    {
      icon: <Globe size={24} />,
      title: 'Интеграции',
      description: 'WhatsApp, Google Sheets, SMS и Telegram в одном месте'
    },
    {
      icon: <BarChart3 size={24} />,
      title: 'Аналитика',
      description: 'Детальная статистика и отчеты по всем процессам'
    }
  ];

  // Анимация элементов
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    }
  };

  return (
    <div className="home-page">
      {/* Герой секция */}
      <motion.section 
        className="hero-section"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="hero-content">
          <h1 className="hero-title">
            Добро пожаловать в <span className="brand">HR Assistant</span>
          </h1>
          <p className="hero-subtitle">
            Современная система управления HR-процессами с интеграцией WhatsApp, 
            автоматизацией рутинных задач и умными уведомлениями
          </p>
          <div className="hero-actions">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/dashboard')}
            >
              Перейти к дашборду
              <ArrowRight size={20} />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/candidates')}
            >
              Управление кандидатами
            </Button>
          </div>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <h3>500+</h3>
            <p>Кандидатов обработано</p>
          </div>
          <div className="stat-card">
            <h3>95%</h3>
            <p>Автоматизации процессов</p>
          </div>
          <div className="stat-card">
            <h3>24/7</h3>
            <p>Мониторинг статусов</p>
          </div>
        </div>
      </motion.section>

      {/* Функции */}
      <section className="features-section">
        <h2 className="section-title">Возможности системы</h2>
        <motion.div 
          className="features-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className={`feature-card feature-${feature.color}`}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(feature.path)}
            >
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <span className="feature-link">
                Перейти <ArrowRight size={16} />
              </span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Преимущества */}
      <section className="advantages-section">
        <h2 className="section-title">Почему HR Assistant?</h2>
        <motion.div 
          className="advantages-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {advantages.map((advantage, index) => (
            <motion.div
              key={index}
              className="advantage-card"
              variants={itemVariants}
            >
              <div className="advantage-icon">
                {advantage.icon}
              </div>
              <h4 className="advantage-title">{advantage.title}</h4>
              <p className="advantage-description">{advantage.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA секция */}
      <motion.section 
        className="cta-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="cta-content">
          <h2>Готовы оптимизировать HR-процессы?</h2>
          <p>
            Начните работу прямо сейчас и убедитесь в эффективности системы
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/settings')}
          >
            Настроить интеграции
          </Button>
        </div>
      </motion.section>
    </div>
  );
};

export default HomePage;
