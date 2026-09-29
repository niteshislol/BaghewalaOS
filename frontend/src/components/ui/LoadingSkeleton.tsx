import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
  type?: 'card' | 'table' | 'kpis' | 'chart';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows = 4,
  className = '',
  type = 'card',
}) => {
  if (type === 'kpis') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4 animate-pulse">
            <div className="h-3 w-24 bg-border-subtle rounded mb-3"></div>
            <div className="h-7 w-20 bg-border-subtle rounded mb-2"></div>
            <div className="h-3 w-32 bg-border-subtle rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={`bg-surface border border-border rounded-xl p-4 animate-pulse ${className}`}>
        <div className="h-8 bg-surface-secondary rounded mb-4"></div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-border-subtle">
            <div className="h-4 w-1/3 bg-border-subtle rounded"></div>
            <div className="h-4 w-1/6 bg-border-subtle rounded"></div>
            <div className="h-4 w-1/6 bg-border-subtle rounded"></div>
            <div className="h-4 w-1/3 bg-border-subtle rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className={`bg-surface border border-border rounded-xl p-6 animate-pulse ${className}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="h-5 w-48 bg-border-subtle rounded"></div>
          <div className="h-4 w-28 bg-border-subtle rounded"></div>
        </div>
        <div className="h-64 bg-surface-secondary rounded flex items-center justify-center">
          <span className="text-xs text-ink-muted">Synthesizing Digital Twin Telemetry...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface border border-border rounded-xl p-6 animate-pulse ${className}`}>
      <div className="h-5 w-1/3 bg-border-subtle rounded mb-4"></div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 bg-border-subtle rounded w-full"></div>
        ))}
      </div>
    </div>
  );
};
