import React from 'react';

interface BrutalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BrutalButton: React.FC<BrutalButtonProps> = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = ''
}) => {
  const baseClasses = 'font-black border-4 border-black transition-all duration-200 flex items-center justify-center gap-3 uppercase tracking-wider transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-black hover:bg-red-600 text-white hover:border-yellow-400 disabled:bg-gray-400',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-black',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-black hover:border-yellow-400',
    warning: 'bg-yellow-400 hover:bg-yellow-500 text-black'
  };

  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-4 px-6',
    lg: 'py-6 px-8 text-lg'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
};

export default BrutalButton;