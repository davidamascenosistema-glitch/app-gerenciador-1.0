import React, { useState, useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { motion } from 'motion/react';

export interface VoiceActionButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceActionButton({ onTranscript, className = '' }: VoiceActionButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Reconhecimento de voz não é suportado pelo seu navegador.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          onTranscript(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event?.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Erro ao iniciar reconhecimento de voz:', err);
      setIsRecording(false);
    }
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={handleToggleVoice}
      aria-label={isRecording ? 'Gravando voz... Toque para parar' : 'Ditar item por voz'}
      title={isRecording ? 'Gravando... Toque para parar' : 'Ditar item por voz'}
      className={`fixed bottom-24 right-5 sm:right-6 z-40 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer select-none ${
        isRecording
          ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-red-600/40 ring-4 ring-red-300'
          : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/30'
      } ${className}`}
    >
      <Mic className="w-7 h-7 stroke-[2.2]" />
    </motion.button>
  );
}
