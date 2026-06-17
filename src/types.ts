export type Direction = 'BUY' | 'SELL';

export interface SignalPayload {
  symbol: string;
  direction: Direction;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  entryTime: string;
  expiryTime: string;
}

export interface Signal extends SignalPayload {
  id: string;
  status: string;
  realizedRoi: number | null;
  createdAt: string;
}

export interface LiveSignal extends Signal {
  currentPrice?: number;
  roi?: number;
  timeRemaining?: string;
}

export interface ServerStatusResponse {
  id: string;
  status: string;
  currentPrice: number;
  roi: number;
  timeRemaining: string;
}
