import React from 'react';

const BackgroundElements: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-10 left-10 w-20 h-20 border-4 border-red-500 rotate-45 opacity-20"></div>
      <div className="absolute top-32 right-20 w-16 h-16 bg-yellow-400 rotate-12 opacity-30"></div>
      <div className="absolute bottom-20 left-1/4 w-24 h-24 border-4 border-blue-600 opacity-25"></div>
      <div className="absolute top-1/2 right-10 w-12 h-12 bg-red-500 rotate-45 opacity-40"></div>
      <div className="absolute bottom-32 right-1/3 w-8 h-8 bg-black opacity-60"></div>
      <div className="absolute top-20 left-1/2 w-6 h-6 bg-yellow-400 rotate-45"></div>
    </div>
  );
};

export default BackgroundElements;