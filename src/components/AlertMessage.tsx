import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface AlertMessageProps {
  type: 'success' | 'error';
  title?: string;
  message: string;
}

const AlertMessage: React.FC<AlertMessageProps> = ({ type, title, message }) => {
  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-green-100' : 'bg-red-100';
  const borderColor = isSuccess ? 'border-green-500' : 'border-red-500';
  const textColor = isSuccess ? 'text-green-700' : 'text-red-700';
  const titleColor = isSuccess ? 'text-green-800' : 'text-red-800';
  const iconColor = isSuccess ? 'text-green-600' : 'text-red-600';
  const Icon = isSuccess ? CheckCircle : XCircle;

  return (
    <div className={`border-4 ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div>
          {title && (
            <p className={`text-sm font-black ${titleColor} uppercase`}>{title}</p>
          )}
          <p className={`text-sm font-bold ${textColor}`}>{message}</p>
        </div>
      </div>
    </div>
  );
};

export default AlertMessage;