import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 1000;
    const startValue = displayValue;
    const endValue = value || 0;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      
      setDisplayValue(startValue + (endValue - startValue) * ease);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <motion.span 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-block tabular-nums"
    >
      {Number(displayValue).toFixed(decimals)}
    </motion.span>
  );
};

export default AnimatedNumber;
