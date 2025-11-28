import React from 'react';

export const LoadingSkeleton = ({ className = '' }) => {
  return (
    <div className={`shimmer animate-shimmer rounded ${className}`} />
  );
};

export const SkeletonCard = () => {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
      <div className="flex items-center gap-3">
        <LoadingSkeleton className="h-12 w-20" />
        <LoadingSkeleton className="h-6 w-24" />
      </div>
      <div className="space-y-2">
        <LoadingSkeleton className="h-4 w-full" />
        <LoadingSkeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
};

export const SkeletonGrid = ({ cols = 3, rows = 3 }) => {
  return (
    <div className={`grid grid-cols-${cols} gap-3`}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
};

export const SkeletonList = ({ items = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
