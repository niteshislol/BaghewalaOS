import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Data Acquisition Error',
  message = 'Unable to reconcile telemetry with physics solver engine. Please verify SCADA bus connection and retry.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`bg-surface border border-status-crit/30 border-l-4 border-l-status-crit rounded-xl p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-status-crit-bg text-status-crit shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading font-semibold text-sm text-ink mb-1">
            {title}
          </h3>
          <p className="text-xs text-ink-secondary leading-relaxed mb-4">
            {message}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-secondary text-ink text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Query</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
