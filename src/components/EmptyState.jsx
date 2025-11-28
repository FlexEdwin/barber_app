import React from 'react';

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = '' 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {Icon && (
        <div className="mb-4 text-gray-300">
          <Icon size={64} strokeWidth={1.5} />
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
