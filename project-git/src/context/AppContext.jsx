// src/context/AppContext.jsx
/**
 * Глобальный контекст приложения
 * @description Управляет состоянием кандидатов, вахтовиков, настроек и интеграций
 */
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'react-toastify';

// Initial state
const initialState = {
  // Кандидаты
  candidates: [],
  silentCandidates: [],
  transferredCandidates: [],
  
  // Вахтовики
  shiftWorkers: [],
  checkpoints: [],
  
  // База знаний
  knowledgeBase: [],
  
  // Чат с GPT
  chatHistory: [],
  
  // Рассылки
  mailings: [],
  
  // Настройки
  settings: {
    googleSheetsConnected: false,
    whatsappConnected: false,
    ocrEnabled: true,
    notificationsEnabled: true
  },
  
  // Статистика
  stats: {
    totalCandidates: 0,
    silentCount: 0,
    transferredCount: 0,
    shiftWorkersCount: 0,
    unreadChats: 0,
    botReplies: 0
  },
  
  // UI состояние
  loading: false,
  error: null
};

// Action types
const ActionTypes = {
  // Кандидаты
  ADD_CANDIDATE: 'ADD_CANDIDATE',
  UPDATE_CANDIDATE: 'UPDATE_CANDIDATE',
  DELETE_CANDIDATE: 'DELETE_CANDIDATE',
  MOVE_TO_SILENT: 'MOVE_TO_SILENT',
  MOVE_TO_TRANSFERRED: 'MOVE_TO_TRANSFERRED',
  
  // Вахтовики
  ADD_SHIFT_WORKER: 'ADD_SHIFT_WORKER',
  UPDATE_SHIFT_WORKER: 'UPDATE_SHIFT_WORKER',
  ADD_CHECKPOINT: 'ADD_CHECKPOINT',
  UPDATE_CHECKPOINT: 'UPDATE_CHECKPOINT',
  
  // База знаний
  ADD_KNOWLEDGE: 'ADD_KNOWLEDGE',
  UPDATE_KNOWLEDGE: 'UPDATE_KNOWLEDGE',
  DELETE_KNOWLEDGE: 'DELETE_KNOWLEDGE',
  
  // Чат
  ADD_CHAT_MESSAGE: 'ADD_CHAT_MESSAGE',
  CLEAR_CHAT_HISTORY: 'CLEAR_CHAT_HISTORY',
  
  // Рассылки
  ADD_MAILING: 'ADD_MAILING',
  
  // Настройки
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  
  // UI
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  UPDATE_STATS: 'UPDATE_STATS'
};

/**
 * Reducer для управления состоянием
 * @param {Object} state - Текущее состояние
 * @param {Object} action - Действие для выполнения
 * @returns {Object} Новое состояние
 */
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.ADD_CANDIDATE:
      return {
        ...state,
        candidates: [...state.candidates, { ...action.payload, id: Date.now() }]
      };
      
    case ActionTypes.UPDATE_CANDIDATE:
      return {
        ...state,
        candidates: state.candidates.map(candidate =>
          candidate.id === action.payload.id ? { ...candidate, ...action.payload } : candidate
        )
      };
      
    case ActionTypes.DELETE_CANDIDATE:
      return {
        ...state,
        candidates: state.candidates.filter(candidate => candidate.id !== action.payload)
      };
      
    case ActionTypes.MOVE_TO_SILENT:
      const candidateToSilent = state.candidates.find(c => c.id === action.payload);
      return {
        ...state,
        candidates: state.candidates.filter(c => c.id !== action.payload),
        silentCandidates: [...state.silentCandidates, {
          ...candidateToSilent,
          silentSince: new Date().toISOString(),
          smsAttempts: 0
        }]
      };
      
    case ActionTypes.MOVE_TO_TRANSFERRED:
      const candidateToTransfer = state.silentCandidates.find(c => c.id === action.payload);
      return {
        ...state,
        silentCandidates: state.silentCandidates.filter(c => c.id !== action.payload),
        transferredCandidates: [...state.transferredCandidates, {
          ...candidateToTransfer,
          transferredAt: new Date().toISOString()
        }]
      };
      
    case ActionTypes.ADD_SHIFT_WORKER:
      return {
        ...state,
        shiftWorkers: [...state.shiftWorkers, { ...action.payload, id: Date.now() }]
      };
      
    case ActionTypes.UPDATE_SHIFT_WORKER:
      return {
        ...state,
        shiftWorkers: state.shiftWorkers.map(worker =>
          worker.id === action.payload.id ? { ...worker, ...action.payload } : worker
        )
      };
      
    case ActionTypes.ADD_CHECKPOINT:
      return {
        ...state,
        checkpoints: [...state.checkpoints, { ...action.payload, id: Date.now() }]
      };
      
    case ActionTypes.UPDATE_CHECKPOINT:
      return {
        ...state,
        checkpoints: state.checkpoints.map(checkpoint =>
          checkpoint.id === action.payload.id ? { ...checkpoint, ...action.payload } : checkpoint
        )
      };
      
    case ActionTypes.ADD_KNOWLEDGE:
      return {
        ...state,
        knowledgeBase: [...state.knowledgeBase, {
          ...action.payload,
          id: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      };
      
    case ActionTypes.UPDATE_KNOWLEDGE:
      return {
        ...state,
        knowledgeBase: state.knowledgeBase.map(knowledge =>
          knowledge.id === action.payload.id ? {
            ...knowledge,
            ...action.payload,
            updatedAt: new Date().toISOString()
          } : knowledge
        )
      };
      
    case ActionTypes.DELETE_KNOWLEDGE:
      return {
        ...state,
        knowledgeBase: state.knowledgeBase.filter(knowledge => knowledge.id !== action.payload)
      };
      
    case ActionTypes.ADD_CHAT_MESSAGE:
      return {
        ...state,
        chatHistory: [...state.chatHistory, {
          ...action.payload,
          id: Date.now(),
          timestamp: new Date().toISOString()
        }]
      };
      
    case ActionTypes.CLEAR_CHAT_HISTORY:
      return {
        ...state,
        chatHistory: []
      };
      
    case ActionTypes.ADD_MAILING:
      return {
        ...state,
        mailings: [...state.mailings, {
          ...action.payload,
          id: Date.now(),
          createdAt: new Date().toISOString()
        }]
      };
      
    case ActionTypes.UPDATE_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
      
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
      
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
      
    case ActionTypes.UPDATE_STATS:
      return {
        ...state,
        stats: { ...state.stats, ...action.payload }
      };
      
    default:
      return state;
  }
}

// Create context
const AppContext = createContext();

/**
 * Provider компонент для глобального состояния
 * @param {Object} props - Пропсы компонента
 * @param {ReactNode} props.children - Дочерние компоненты
 * @returns {JSX.Element} Provider компонент
 */
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Загрузка данных из localStorage при инициализации
  useEffect(() => {
    const loadData = () => {
      try {
        const savedData = localStorage.getItem('hr-assistant-data');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          // Восстанавливаем состояние из localStorage
          Object.keys(parsedData).forEach(key => {
            if (parsedData[key] && Array.isArray(parsedData[key])) {
              parsedData[key].forEach(item => {
                if (key === 'candidates') {
                  dispatch({ type: ActionTypes.ADD_CANDIDATE, payload: item });
                } else if (key === 'knowledgeBase') {
                  dispatch({ type: ActionTypes.ADD_KNOWLEDGE, payload: item });
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      }
    };

    loadData();
  }, []);

  // Сохранение данных в localStorage при изменении состояния
  useEffect(() => {
    const saveData = () => {
      try {
        const dataToSave = {
          candidates: state.candidates,
          silentCandidates: state.silentCandidates,
          transferredCandidates: state.transferredCandidates,
          shiftWorkers: state.shiftWorkers,
          knowledgeBase: state.knowledgeBase,
          chatHistory: state.chatHistory,
          settings: state.settings
        };
        localStorage.setItem('hr-assistant-data', JSON.stringify(dataToSave));
      } catch (error) {
        console.error('Ошибка сохранения данных:', error);
      }
    };

    saveData();
  }, [state]);

  // Обновление статистики
  useEffect(() => {
    const updateStats = () => {
      const stats = {
        totalCandidates: state.candidates.length,
        silentCount: state.silentCandidates.length,
        transferredCount: state.transferredCandidates.length,
        shiftWorkersCount: state.shiftWorkers.length,
        unreadChats: Math.floor(Math.random() * 50) + 10, // TODO: Реальная интеграция
        botReplies: state.chatHistory.filter(msg => msg.type === 'bot').length
      };
      
      dispatch({ type: ActionTypes.UPDATE_STATS, payload: stats });
    };

    updateStats();
  }, [state.candidates, state.silentCandidates, state.transferredCandidates, state.shiftWorkers, state.chatHistory]);

  // Action creators
  const actions = {
    // Кандидаты
    addCandidate: (candidate) => {
      dispatch({ type: ActionTypes.ADD_CANDIDATE, payload: candidate });
      toast.success('Кандидат добавлен');
    },
    
    updateCandidate: (candidate) => {
      dispatch({ type: ActionTypes.UPDATE_CANDIDATE, payload: candidate });
      toast.success('Кандидат обновлен');
    },
    
    deleteCandidate: (candidateId) => {
      dispatch({ type: ActionTypes.DELETE_CANDIDATE, payload: candidateId });
      toast.success('Кандидат удален');
    },
    
    moveCandidateToSilent: (candidateId) => {
      dispatch({ type: ActionTypes.MOVE_TO_SILENT, payload: candidateId });
      toast.warning('Кандидат перемещен в "Молчат"');
    },
    
    moveCandidateToTransferred: (candidateId) => {
      dispatch({ type: ActionTypes.MOVE_TO_TRANSFERRED, payload: candidateId });
      toast.warning('Кандидат передан на 1-ю линию');
    },
    
    // Вахтовики
    addShiftWorker: (worker) => {
      dispatch({ type: ActionTypes.ADD_SHIFT_WORKER, payload: worker });
      toast.success('Вахтовик добавлен');
    },
    
    updateShiftWorker: (worker) => {
      dispatch({ type: ActionTypes.UPDATE_SHIFT_WORKER, payload: worker });
      toast.success('Данные вахтовика обновлены');
    },
    
    // База знаний
    addKnowledge: (knowledge) => {
      dispatch({ type: ActionTypes.ADD_KNOWLEDGE, payload: knowledge });
      toast.success('Знание добавлено в базу');
    },
    
    updateKnowledge: (knowledge) => {
      dispatch({ type: ActionTypes.UPDATE_KNOWLEDGE, payload: knowledge });
      toast.success('Знание обновлено');
    },
    
    deleteKnowledge: (knowledgeId) => {
      dispatch({ type: ActionTypes.DELETE_KNOWLEDGE, payload: knowledgeId });
      toast.success('Знание удалено');
    },
    
    // Чат
    addChatMessage: (message) => {
      dispatch({ type: ActionTypes.ADD_CHAT_MESSAGE, payload: message });
    },
    
    clearChatHistory: () => {
      dispatch({ type: ActionTypes.CLEAR_CHAT_HISTORY });
      toast.info('История чата очищена');
    },
    
    // Рассылки
    addMailing: (mailing) => {
      dispatch({ type: ActionTypes.ADD_MAILING, payload: mailing });
      toast.success('Рассылка отправлена');
    },
    
    // Настройки
    updateSettings: (settings) => {
      dispatch({ type: ActionTypes.UPDATE_SETTINGS, payload: settings });
      toast.success('Настройки обновлены');
    },
    
    // UI
    setLoading: (loading) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
    },
    
    setError: (error) => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error });
      if (error) {
        toast.error(error);
      }
    }
  };

  const value = {
    state,
    dispatch,
    actions
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook для использования контекста приложения
 * @returns {Object} Состояние и действия приложения
 */
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext должен использоваться внутри AppProvider');
  }
  return context;
}