"use client";

import React, { useEffect, useState } from "react";

export interface NumberTickerProps {
  value: number;
  duration?: number;
  delay?: number;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  onComplete?: () => void;
}

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  duration = 1800,
  delay = 0,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
  className = "",
  onComplete,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let animationId: number;

    const startAnimation = () => {
      const startTime = performance.now();
      const startValue = 0;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Smooth easing function: easeOutQuart
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = startValue + (value - startValue) * easeOutQuart;

        setDisplayValue(currentValue);

        if (progress < 1) {
          animationId = requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
          onComplete?.();
        }
      };

      animationId = requestAnimationFrame(animate);
    };

    const timeoutId: number = window.setTimeout(startAnimation, delay);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [value, duration, delay, onComplete]);

  const formatNumber = (num: number): string => {
    return num.toFixed(decimalPlaces).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <span className={`inline-block tabular-nums ${className}`}>
      {prefix}
      {formatNumber(displayValue)}
      {suffix}
    </span>
  );
};

export default NumberTicker;
