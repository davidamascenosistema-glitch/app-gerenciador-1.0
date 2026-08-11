export interface Item {
  id: string;
  name: string;
  category: string;
  quantity: number;
  weight?: number;       // usado quando for produto por peso
  isWeighted: boolean;   // indica se é produto por peso (kg) ou por unidade
  price?: number;
  bought: boolean;
}

export interface Purchase {
  id: string;
  name?: string;
  status: 'planning' | 'in_progress' | 'finished';
  origin: 'list' | 'direct' | 'invoice' | 'manual';
  createdAt: string;
  finishedAt?: string;
  items: Item[];
}
