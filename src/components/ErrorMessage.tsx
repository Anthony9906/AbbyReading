import React from 'react';
import { AlertTriangle } from 'lucide-react';
import '../styles/components/ErrorMessage.css';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  onRetry 
}) => {
  return (
    <div className="error-container">
      <div className="error-content">
        <AlertTriangle className="error-icon" size={40} />
        <h2 className="error-title">Oops! Something went wrong</h2>
        <p className="error-message">{message}</p>
        {onRetry && (
          <button className="error-retry-button" onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}; 