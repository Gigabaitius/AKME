// src/views/components/features/CandidateView.jsx
/**
 * Компонент просмотра кандидата
 * @description View для отображения данных кандидата
 */
import React, { useState, useEffect } from 'react';
import { Edit, Trash2, MessageCircle, FileText, User } from 'lucide-react';
import Button from '../common/button.jsx';
import Modal from '../common/Modal.jsx';
import './CandidateView.css';

/**
 * Компонент карточки кандидата
 * @param {Object} props - Пропсы компонента
 * @param {Object} props.candidate - Данные кандидата
 * @param {Function} props.onEdit - Обработчик редактирования
 * @param {Function} props.onDelete - Обработчик удаления
 * @param {Function} props.onSendMessage - Обработчик отправки сообщения
 * @returns {JSX.Element} Компонент карточки кандидата
 */
const CandidateView = ({ 
  candidate, 
  onEdit, 
  onDelete, 
  onSendMessage,
  expanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  /**
   * Получение класса статуса
   * @param {string} status - Статус кандидата
   * @returns {string} CSS класс
   */
  const getStatusClass = (status) => {
    const statusMap = {
      'Новый': 'status-new',
      'Активен': 'status-active',
      'Молчит': 'status-silent',
      'Передан': 'status-transferred',
      'Доведен': 'status-completed',
      'Отказ': 'status-declined'
    };
    return statusMap[status] || 'status-default';
  };

  /**
   * Получение иконки статуса
   * @param {string} status - Статус кандидата
   * @returns {string} Emoji иконка
   */
  const getStatusIcon = (status) => {
    const iconMap = {
      'Новый': '🆕',
      'Активен': '✅',
      'Молчит': '🔇',
      'Передан': '📤',
      'Доведен': '🎯',
      'Отказ': '❌'
    };
    return iconMap[status] || '❓';
  };

  /**
   * Форматирование даты
   * @param {string} dateString - Строка даты
   * @returns {string} Отформатированная дата
   */
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Обработчик удаления
   */
  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить этого кандидата?')) {
      onDelete(candidate.id);
    }
  };

  return (
    <>
      <div className={`candidate-view ${isExpanded ? 'expanded' : ''}`}>
        <div className="candidate-header">
          <div className="candidate-info">
            <div className="candidate-name">
              <User size={20} />
              <h3>{candidate.name}</h3>
            </div>
            <div className="candidate-contact">
              <span className="phone">{candidate.phone}</span>
              <span className="project">{candidate.project}</span>
            </div>
          </div>
          
          <div className="candidate-status">
            <div className={`status-badge ${getStatusClass(candidate.status)}`}>
              <span className="status-icon">{getStatusIcon(candidate.status)}</span>
              <span className="status-text">{candidate.status}</span>
            </div>
          </div>
        </div>

        <div className="candidate-details">
          <div className="details-grid">
            <div className="detail-item">
              <label>ИНН:</label>
              <span>
                {candidate.inn || (
                  <span className="error-text">не удалось считать документ</span>
                )}
              </span>
            </div>
            
            <div className="detail-item">
              <label>СНИЛС:</label>
              <span>
                {candidate.snils || (
                  <span className="error-text">не удалось считать документ</span>
                )}
              </span>
            </div>
            
            <div className="detail-item">
              <label>Паспорт:</label>
              <span>{candidate.passport || '-'}</span>
            </div>
            
            <div className="detail-item">
              <label>Последний ответ:</label>
              <span>{formatDate(candidate.lastReply)}</span>
            </div>
          </div>

          {candidate.comment && (
            <div className="candidate-comment">
              <label>Комментарий:</label>
              <p>{candidate.comment}</p>
            </div>
          )}

          {isExpanded && (
            <div className="candidate-extended">
              <div className="extended-details">
                <div className="detail-item">
                  <label>Дата создания:</label>
                  <span>{formatDate(candidate.createdAt)}</span>
                </div>
                
                <div className="detail-item">
                  <label>Дата обновления:</label>
                  <span>{formatDate(candidate.updatedAt)}</span>
                </div>
                
                {candidate.silentSince && (
                  <div className="detail-item">
                    <label>Молчит с:</label>
                    <span>{formatDate(candidate.silentSince)}</span>
                  </div>
                )}
                
                {candidate.transferredAt && (
                  <div className="detail-item">
                    <label>Передан на 1-ю:</label>
                    <span>{formatDate(candidate.transferredAt)}</span>
                  </div>
                )}
                
                <div className="detail-item">
                  <label>Попытки SMS:</label>
                  <span>{candidate.smsAttempts || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="candidate-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Свернуть' : 'Развернуть'}
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={() => onEdit(candidate)}
          >
            <Edit size={16} />
            Редактировать
          </Button>
          
          <Button
            variant="info"
            size="sm"
            onClick={() => setShowDetailsModal(true)}
          >
            <FileText size={16} />
            Детали
          </Button>
          
          {candidate.chatId && (
            <Button
              variant="success"
              size="sm"
              onClick={() => onSendMessage(candidate)}
            >
              <MessageCircle size={16} />
              Сообщение
            </Button>
          )}
          
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 size={16} />
            Удалить
          </Button>
        </div>
      </div>

      {showDetailsModal && (
        <Modal
          title={`Детали кандидата: ${candidate.name}`}
          onClose={() => setShowDetailsModal(false)}
          size="lg"
        >
          <CandidateDetailsView candidate={candidate} />
        </Modal>
      )}
    </>
  );
};

/**
 * Компонент детального просмотра кандидата
 * @param {Object} props - Пропсы компонента
 * @param {Object} props.candidate - Данные кандидата
 * @returns {JSX.Element} Детальный вид кандидата
 */
const CandidateDetailsView = ({ candidate }) => {
  return (
    <div className="candidate-details-view">
      <div className="details-section">
        <h4>Личная информация</h4>
        <div className="details-content">
          <div className="detail-row">
            <span className="label">ФИО:</span>
            <span className="value">{candidate.name}</span>
          </div>
          <div className="detail-row">
            <span className="label">Телефон:</span>
            <span className="value">{candidate.phone}</span>
          </div>
          <div className="detail-row">
            <span className="label">Дата рождения:</span>
            <span className="value">{candidate.birthDate || 'Не указана'}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Документы</h4>
        <div className="details-content">
          <div className="detail-row">
            <span className="label">Паспорт:</span>
            <span className="value">{candidate.passport || 'Не указан'}</span>
          </div>
          <div className="detail-row">
            <span className="label">ИНН:</span>
            <span className="value">{candidate.inn || 'Не указан'}</span>
          </div>
          <div className="detail-row">
            <span className="label">СНИЛС:</span>
            <span className="value">{candidate.snils || 'Не указан'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Статус обработки:</span>
            <span className={`value ${candidate.documentProcessed ? 'success' : 'error'}`}>
              {candidate.documentProcessed ? 'Обработаны' : 'Не обработаны'}
            </span>
          </div>
          {candidate.documentError && (
            <div className="detail-row">
              <span className="label">Ошибка OCR:</span>
              <span className="value error">{candidate.documentError}</span>
            </div>
          )}
        </div>
      </div>

      <div className="details-section">
        <h4>Рабочая информация</h4>
        <div className="details-content">
          <div className="detail-row">
            <span className="label">Проект:</span>
            <span className="value">{candidate.project}</span>
          </div>
          <div className="detail-row">
            <span className="label">Статус:</span>
            <span className="value">{candidate.status}</span>
          </div>
          <div className="detail-row">
            <span className="label">Chat ID:</span>
            <span className="value">{candidate.chatId || 'Не связан'}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>История активности</h4>
        <div className="details-content">
          <div className="detail-row">
            <span className="label">Дата создания:</span>
            <span className="value">{new Date(candidate.createdAt).toLocaleString('ru-RU')}</span>
          </div>
          <div className="detail-row">
            <span className="label">Последнее обновление:</span>
            <span className="value">{new Date(candidate.updatedAt).toLocaleString('ru-RU')}</span>
          </div>
          <div className="detail-row">
            <span className="label">Последний ответ:</span>
            <span className="value">
              {candidate.lastReply ? new Date(candidate.lastReply).toLocaleString('ru-RU') : 'Не отвечал'}
            </span>
          </div>
          {candidate.silentSince && (
            <div className="detail-row">
              <span className="label">Молчит с:</span>
              <span className="value">{new Date(candidate.silentSince).toLocaleString('ru-RU')}</span>
            </div>
          )}
          {candidate.transferredAt && (
            <div className="detail-row">
              <span className="label">Передан на 1-ю:</span>
              <span className="value">{new Date(candidate.transferredAt).toLocaleString('ru-RU')}</span>
            </div>
          )}
        </div>
      </div>

      {candidate.comment && (
        <div className="details-section">
          <h4>Комментарии</h4>
          <div className="details-content">
            <div className="comment-content">
              {candidate.comment}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateView;