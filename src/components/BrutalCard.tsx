import React from 'react';

interface BrutalCardProps {
  children: React.ReactNode;
  title?: string;
  titleBg?: string;
  className?: string;
  hover?: boolean;
}

const BrutalCard: React.FC<BrutalCardProps> = ({
  children,
  title,
  titleBg = 'bg-red-500',
  className = '',
  hover = false
}) => {
  const hoverClasses = hover ? 'transform hover:scale-105 transition-transform duration-200' : '';
  const cardClasses = `bg-white border-4 border-black shadow-brutal overflow-hidden ${hoverClasses} ${className}`;

  return (
    <div className={cardClasses}>
      {title && (
        <div className={`${titleBg} p-2`}>
          <h2 className="text-white font-black text-center uppercase tracking-wider text-sm">
            {title}
          </h2>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default BrutalCard;