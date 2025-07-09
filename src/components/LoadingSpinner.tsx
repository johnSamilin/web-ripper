import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  text = 'LOADING...', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center gap-4">
      <Loader2 className={`${sizeClasses[size]} animate-spin`} />
      <span className="font-black text-xl uppercase tracking-wider">{text}</span>
    </div>
  );
};

export default LoadingSpinner;