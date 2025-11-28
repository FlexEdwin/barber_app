import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toast = {
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    info: (message, duration) => addToast(message, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(({ id, message, type, duration }) => (
          <Toast 
            key={id} 
            message={message} 
            type={type} 
            duration={duration}
            onClose={() => removeToast(id)} 
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const Toast = ({ message, type, duration, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration > 0) {
      const interval = setInterval(() => {
        setProgress(prev => Math.max(0, prev - (100 / (duration / 50))));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [duration]);

  const config = {
    success: {
      icon: CheckCircle,
      borderColor: 'border-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      iconColor: 'text-green-500',
      progressColor: 'bg-green-500',
    },
    error: {
      icon: XCircle,
      borderColor: 'border-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      iconColor: 'text-red-500',
      progressColor: 'bg-red-500',
    },
    warning: {
      icon: AlertCircle,
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-500',
      progressColor: 'bg-yellow-500',
    },
    info: {
      icon: Info,
      borderColor: 'border-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-500',
      progressColor: 'bg-blue-500',
    },
  };

  const { icon: Icon, borderColor, textColor, iconColor, progressColor } = config[type];

  return (
    <div className={`relative overflow-hidden bg-white border-l-4 ${borderColor} rounded-lg shadow-premium p-4 min-w-[300px] animate-slide-down`}>
      <div className="flex items-start gap-3">
        <Icon className={`${iconColor} flex-shrink-0`} size={20} />
        <p className={`${textColor} text-sm font-medium flex-1`}>{message}</p>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div 
            className={`h-full ${progressColor} transition-all duration-50 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default Toast;
