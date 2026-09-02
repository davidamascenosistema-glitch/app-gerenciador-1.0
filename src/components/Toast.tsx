import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

interface ToastContextType {
  showToast: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, duration = 3000) => {
    // Garante que apenas strings válidas e não-vazias sejam aceitas (nunca objetos de evento como SyntheticEvent)
    if (typeof message !== 'string' || !message.trim()) {
      return;
    }

    // Cancela qualquer timeout pendente para evitar fechamento prematuro
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    counterRef.current += 1;
    const currentId = counterRef.current;

    setToast({ id: currentId, message: message.trim() });

    // Fecha o toast automaticamente após a duração especificada (3 segundos)
    timeoutRef.current = setTimeout(() => {
      setToast((prev) => (prev?.id === currentId ? null : prev));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Container Fixo / Flutuante na parte INFERIOR da tela, posicionado com margem de segurança acima da BottomNavBar e barras de ação */}
      <div
        aria-live="polite"
        className="fixed bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-[100] pointer-events-none flex flex-col items-center justify-center w-full max-w-md px-4"
      >
        <AnimatePresence mode="wait">
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 14, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.94, transition: { duration: 0.12 } }}
              transition={{
                type: 'spring',
                damping: 26,
                stiffness: 420,
                mass: 0.6,
              }}
              className="pointer-events-none flex items-center space-x-2.5 px-4 py-2.5 rounded-full bg-zinc-900/95 backdrop-blur-md text-white shadow-xl shadow-black/30 border border-zinc-700/70 max-w-full"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-zinc-100 line-clamp-2 select-none">
                {toast.message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
