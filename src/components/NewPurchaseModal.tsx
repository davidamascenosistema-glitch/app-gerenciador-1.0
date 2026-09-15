import React from 'react';
import { StartPurchaseModal, StartPurchaseModalProps } from './StartPurchaseModal';
import { List } from '../types';

export interface NewPurchaseModalProps {
  isOpen: boolean;
  lists: List[];
  selectedListId?: string | null;
  onClose: () => void;
  onStartPurchase: (params: {
    name?: string;
    storeName?: string;
    budget?: number;
    fromListId?: string;
  }) => void;
}

export function NewPurchaseModal(props: NewPurchaseModalProps) {
  return <StartPurchaseModal {...props} />;
}
