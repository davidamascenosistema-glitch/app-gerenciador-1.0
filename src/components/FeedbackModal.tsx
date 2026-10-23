import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  Sparkles, 
  Check, 
  Loader2, 
  Mail, 
  Send,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionConfig } from '../styles/motionSystem';
import { useToast } from './Toast';

export type FeedbackCategory = 'bug' | 'sugestao' | 'elogio';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

const CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  badgeBg: string;
  badgeText: string;
}[] = [
  {
    id: 'bug',
    label: 'Informar Problema',
    description: 'Algo não funcionou como esperado',
    icon: Bug,
    activeBg: 'bg-rose-50',
    activeBorder: 'border-rose-300 ring-2 ring-rose-200',
    activeText: 'text-rose-900',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
  },
  {
    id: 'sugestao',
    label: 'Sugestão',
    description: 'Ideia para melhorar o app',
    icon: Lightbulb,
    activeBg: 'bg-amber-50',
    activeBorder: 'border-amber-300 ring-2 ring-amber-200',
    activeText: 'text-amber-900',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
  },
  {
    id: 'elogio',
    label: 'Elogio',
    description: 'Gostou de uma função',
    icon: Sparkles,
    activeBg: 'bg-emerald-50',
    activeBorder: 'border-emerald-300 ring-2 ring-emerald-200',
    activeText: 'text-emerald-900',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
  },
];

export function FeedbackModal({
  isOpen,
  onClose,
  userEmail = '',
  userName = '',
}: FeedbackModalProps) {
  const motionConfig = useMotionConfig();
  const { showToast } = useToast();

  const [category, setCategory] = useState<FeedbackCategory>('sugestao');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(userEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincroniza e-mail se mudar
  React.useEffect(() => {
    if (userEmail && !email) {
      setEmail(userEmail);
    }
  }, [userEmail, email]);

  // Resetar estados ao fechar ou reabrir
  const handleClose = () => {
    if (isSubmitting) return;
    setIsSuccess(false);
    setErrorMsg(null);
    setMessage('');
    onClose();
  };

  const getPlaceholder = () => {
    switch (category) {
      case 'bug':
        return 'Descreva o que aconteceu: qual tela estava, o que tentou fazer e qual foi o comportamento inesperado...';
      case 'sugestao':
        return 'Qual recurso ou melhoria tornaria sua experiência de compras mais ágil e prática?';
      case 'elogio':
        return 'O que você mais gostou no aplicativo? Adoramos saber o que está funcionando bem!';
      default:
        return 'Escreva sua mensagem com detalhes...';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg('Por favor, digite sua mensagem antes de enviar.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          message: message.trim(),
          email: email.trim(),
          name: userName.trim(),
          metadata: {
            url: window.location.href,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar feedback.');
      }

      setIsSuccess(true);
      showToast('Obrigado! Feedback enviado com sucesso.');
    } catch (err: any) {
      console.warn('Erro ao enviar feedback pela API:', err);
      // Fallback gracioso
      setErrorMsg('Não foi possível enviar automaticamente. Você também pode enviar para davidamascenosistema@gmail.com.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenMailto = () => {
    const subject = encodeURIComponent(`[Feedback - ${category.toUpperCase()}] Lista & Compra`);
    const body = encodeURIComponent(
      `Olá David,\n\nCategoria: ${category}\nDe: ${userName} (${email || 'não informado'})\n\nMensagem:\n${message}\n`
    );
    window.location.href = `mailto:davidamascenosistema@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={motionConfig.shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={motionConfig.shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={motionConfig.modalSpring}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-zinc-200 relative max-h-[92vh] flex flex-col"
          >
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              aria-label="Fechar modal"
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Cabeçalho */}
            <div className="p-5 pb-3 border-b border-zinc-100 bg-gradient-to-b from-emerald-50/50 to-white">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 tracking-tight leading-tight">
                    Enviar Feedback
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Sua opinião nos ajuda a evoluir o aplicativo
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo rolável se tela pequena */}
            <div className="p-5 overflow-y-auto flex-1">
              {isSuccess ? (
                /* Estado de Sucesso */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-6 flex flex-col items-center text-center space-y-3"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-700 flex items-center justify-center shadow-xs">
                    <Check className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <h4 className="text-lg font-bold text-zinc-900 tracking-tight">
                    Feedback Enviado!
                  </h4>
                  <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
                    Muito obrigado por dedicar seu tempo para nos ajudar. Lemos cada mensagem com atenção para melhorar o Lista &amp; Compra!
                  </p>
                  <div className="pt-3 w-full">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer min-h-[44px]"
                    >
                      Concluir
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Formulário */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Seleção de Categoria */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Qual é o assunto?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = category === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setCategory(cat.id);
                              setErrorMsg(null);
                            }}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer min-h-[72px] ${
                              isSelected
                                ? `${cat.activeBg} ${cat.activeBorder} ${cat.activeText} shadow-xs font-bold`
                                : 'bg-zinc-50/80 hover:bg-zinc-100 border-zinc-200 text-zinc-600 font-medium'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 ${
                                isSelected ? cat.badgeBg : 'bg-white text-zinc-500'
                              }`}
                            >
                              <Icon className={`w-4 h-4 ${isSelected ? cat.badgeText : 'text-zinc-600'}`} />
                            </div>
                            <span className="text-[11px] leading-tight truncate w-full">
                              {cat.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campo de Mensagem */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="feedback-message" className="text-xs font-semibold text-zinc-700">
                        Mensagem <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {message.length}/1000
                      </span>
                    </div>
                    <textarea
                      id="feedback-message"
                      rows={4}
                      maxLength={1000}
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder={getPlaceholder()}
                      required
                      className="w-full p-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all leading-relaxed"
                    />
                  </div>

                  {/* Campo de E-mail de Contato (Opcional) */}
                  <div>
                    <label htmlFor="feedback-email" className="block text-xs font-semibold text-zinc-700 mb-1">
                      Seu E-mail para resposta (opcional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <input
                        id="feedback-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Se preenchido, poderemos entrar em contato para responder sua sugestão ou tirar dúvidas.
                    </p>
                  </div>

                  {/* Mensagem de Erro / Alerta */}
                  {errorMsg && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <div className="flex-1">
                        <span>{errorMsg}</span>
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={handleOpenMailto}
                            className="text-rose-800 underline font-semibold text-[11px] hover:text-rose-950 cursor-pointer"
                          >
                            Clique aqui para enviar via seu aplicativo de e-mail
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="pt-2 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !message.trim()}
                      className={`flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all min-h-[44px] cursor-pointer flex items-center justify-center space-x-1.5 ${
                        isSubmitting || !message.trim() ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Feedback</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
