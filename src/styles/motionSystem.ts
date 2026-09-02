import { useReducedMotion } from 'motion/react';

/**
 * MOTION DESIGN SYSTEM
 * Tokens de movimento padronizados para velocidade, precisão e sensação tátil nativa.
 */
export const MOTION_TOKENS = {
  duration: {
    instant: 0.05,
    micro: 0.12,
    fast: 0.18,
    normal: 0.24,
    emphasized: 0.32,
  },
  easing: {
    standard: [0.2, 0.0, 0.0, 1.0] as const,
    decelerate: [0.0, 0.0, 0.2, 1.0] as const,
    accelerate: [0.3, 0.0, 1.0, 1.0] as const,
  },
  spring: {
    snappy: { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 },
    press: { type: 'spring', stiffness: 600, damping: 25, mass: 0.5 },
    modal: { type: 'spring', stiffness: 420, damping: 30, mass: 0.9 },
    sheet: { type: 'spring', stiffness: 360, damping: 32, mass: 1.0 },
    layout: { type: 'spring', stiffness: 450, damping: 35, mass: 0.9 },
    gentle: { type: 'spring', stiffness: 320, damping: 28, mass: 1.0 },
  },
  tap: {
    button: { scale: 0.96 },
    iconButton: { scale: 0.88 },
    card: { scale: 0.985 },
    pill: { scale: 0.92 },
  },
};

/**
 * Variantes pré-configuradas para componentes da interface.
 */
export const MOTION_VARIANTS = {
  screenTransition: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    transition: { duration: 0.16, ease: [0.2, 0.0, 0.0, 1.0] },
  },
  cardItem: {
    initial: { opacity: 0, y: -8, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: {
      opacity: 0,
      scale: 0.92,
      x: -16,
      transition: { duration: 0.14 },
    },
  },
  modalBackdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  },
  modalContent: {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 10 },
    transition: { type: 'spring', stiffness: 420, damping: 30 },
  },
  dropdownMenu: {
    initial: { opacity: 0, y: -6, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -6, scale: 0.98 },
    transition: { duration: 0.12 },
  },
};

/**
 * Hook de preferência de movimento para acessibilidade WCAG.
 */
export function useMotionConfig() {
  const shouldReduceMotion = useReducedMotion();

  return {
    shouldReduceMotion,
    tap: shouldReduceMotion ? {} : MOTION_TOKENS.tap,
    spring: shouldReduceMotion
      ? { duration: 0.01 }
      : MOTION_TOKENS.spring.snappy,
    layoutSpring: shouldReduceMotion
      ? { duration: 0.01 }
      : MOTION_TOKENS.spring.layout,
    fadeTransition: {
      duration: shouldReduceMotion ? 0.01 : MOTION_TOKENS.duration.fast,
    },
  };
}
