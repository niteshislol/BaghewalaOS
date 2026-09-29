import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 64,
  height = 22,
  color = '#4F8FC4',
  className = '',
}) => {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const span = Math.max(max - min, Math.abs(mean) * 0.04) || 1;
  const mid = (min + max) / 2;
  const inner = height - 6;

  const points = data
    .map((v, i) => {
      const x = n === 1 ? width / 2 : (i / (n - 1)) * width;
      const y = height / 2 - ((v - mid) / span) * inner;
      const boundedY = Math.max(3, Math.min(height - 3, y));
      return `${x.toFixed(1)},${boundedY.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`flex-none overflow-visible ${className}`}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
