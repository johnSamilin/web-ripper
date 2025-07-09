import React from 'react';

interface BrutalInputProps {
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  className?: string;
  icon?: React.ReactNode;
}

const BrutalInput: React.FC<BrutalInputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  minLength,
  className = '',
  icon
}) => {
  const baseClasses = 'w-full px-4 py-3 bg-gray-100 border-4 border-black font-mono text-black placeholder-gray-600 focus:bg-yellow-100 focus:border-red-500 transition-all duration-200 font-bold';
  const iconClasses = icon ? 'pl-12' : '';
  const classes = `${baseClasses} ${iconClasses} ${className}`;

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        minLength={minLength}
        className={classes}
      />
      {icon && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-600">
          {icon}
        </div>
      )}
    </div>
  );
};

export default BrutalInput;