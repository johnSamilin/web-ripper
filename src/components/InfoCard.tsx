import React from 'react';

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBg?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ 
  icon, 
  title, 
  description, 
  iconBg = 'bg-red-500' 
}) => {
  return (
    <div className="bg-white border-4 border-black p-4 flex items-center gap-4 shadow-brutal transform hover:translate-x-1 hover:translate-y-1 transition-transform duration-200">
      <div className={`w-12 h-12 ${iconBg} border-2 border-black flex items-center justify-center flex-shrink-0 transform rotate-12`}>
        {icon}
      </div>
      <div>
        <h3 className="font-black text-black text-sm uppercase tracking-wide">{title}</h3>
        <p className="text-xs font-bold text-gray-700 uppercase">{description}</p>
      </div>
    </div>
  );
};

export default InfoCard;