import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { formatCurrencyBRL } from '../utils/purchaseHelpers';

interface AnimatedCurrencyProps {
  value: number;
  className?: string;
}

/**
 * AnimatedCurrency
 * Realiza interpolação contínua e suave de números monetários (odômetro tátil),
 * transmitindo precisão matemática e resposta imediata às mudanças de carrinho.
 */
export const AnimatedCurrency: React.FC<AnimatedCurrencyProps> = ({
  value,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startValue = prevValueRef.current;
    const endValue = value;
    const diff = endValue - startValue;

    if (Math.abs(diff) < 0.001) {
      setDisplayValue(endValue);
      return;
    }

    const duration = 240; // ms
    const startTime = performance.now();

    const updateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Curva de deceleração quadrática suave
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + diff * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(updateNumber);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
      }
    };

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    animFrameRef.current = requestAnimationFrame(updateNumber);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, shouldReduceMotion]);

  return (
    <span className={`inline-block tabular-nums font-inherit ${className}`}>
      {formatCurrencyBRL(displayValue)}
    </span>
  );
};
