import React from 'react';
import { Loader2 } from 'lucide-react';
import '../styles/components/PageLoader.css';

interface PageLoaderProps {
  message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ 
  message = "Loading your learning adventure..." 
}) => {
  return (
    <div className="page-loader">
      <div className="page-loader__content">
        <div className="page-loader__icon-container">
          <Loader2 className="page-loader__spinner" size={60} />
        </div>
        <p className="page-loader__message">{message}</p>
      </div>
    </div>
  );
}; 