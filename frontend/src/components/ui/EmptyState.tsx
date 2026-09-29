import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are no active parameters or events matching the selected filter criteria.',
  icon: Icon = Inbox,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`bg-surface border border-border border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center ${className}`}>
      <div className="w-12 h-12 rounded-lg bg-surface-secondary border border-border flex items-center justify-center text-ink-muted mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-heading font-semibold text-base text-ink mb-1">
        {title}
      </h3>
      <p className="text-xs text-ink-secondary max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="h-9 px-4 rounded-lg bg-petroleum hover:bg-petroleum-hover text-white text-xs font-semibold tracking-wide transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
