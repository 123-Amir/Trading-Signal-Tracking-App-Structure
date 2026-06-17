import type { Direction, ServerStatusResponse, Signal, SignalPayload } from './types';

const API_BASE = '/api';

export function formatNumber(value: number, decimals = 2) {
  return Number.isFinite(value) ? value.toFixed(decimals) : '—';
}

export function calculateRoi(direction: Direction, entryPrice: number, currentPrice: number) {
  if (direction === 'BUY') {
    return ((currentPrice - entryPrice) / entryPrice) * 100;
  }

  if (direction === 'SELL') {
    return ((entryPrice - currentPrice) / entryPrice) * 100;
  }

  return 0;
}

export function calculateTimeRemaining(expiryTime: string) {
  const now = new Date();
  const expiry = new Date(expiryTime);
  const diffMs = expiry.getTime() - now.getTime();

  if (Number.isNaN(expiry.getTime()) || diffMs <= 0) {
    return 'Expired';
  }

  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours}h ${minutes}m ${secs}s`;
}

export function validateSignalForm(form: SignalPayload) {
  const errors: string[] = [];
  const symbol = form.symbol.trim().toUpperCase();

  if (!symbol) {
    errors.push('Symbol is required.');
  }

  if (!/^[A-Z0-9]+$/.test(symbol)) {
    errors.push('Symbol should contain only letters and numbers.');
  }

  if (!['BUY', 'SELL'].includes(form.direction)) {
    errors.push('Direction must be BUY or SELL.');
  }

  if (!(form.entryPrice > 0)) {
    errors.push('Entry price must be greater than 0.');
  }

  if (!(form.stopLoss > 0)) {
    errors.push('Stop loss must be greater than 0.');
  }

  if (!(form.targetPrice > 0)) {
    errors.push('Target price must be greater than 0.');
  }

  const entryDate = new Date(form.entryTime);
  const expiryDate = new Date(form.expiryTime);

  if (!form.entryTime || Number.isNaN(entryDate.getTime())) {
    errors.push('Entry time must be a valid date and time.');
  }

  if (!form.expiryTime || Number.isNaN(expiryDate.getTime())) {
    errors.push('Expiry time must be a valid date and time.');
  }

  if (!Number.isNaN(entryDate.getTime()) && !Number.isNaN(expiryDate.getTime()) && expiryDate <= entryDate) {
    errors.push('Expiry time must be after entry time.');
  }

  if (form.direction === 'BUY') {
    if (!(form.stopLoss < form.entryPrice)) {
      errors.push('For BUY signals, stop loss must be less than entry price.');
    }
    if (!(form.targetPrice > form.entryPrice)) {
      errors.push('For BUY signals, target price must be greater than entry price.');
    }
  }

  if (form.direction === 'SELL') {
    if (!(form.stopLoss > form.entryPrice)) {
      errors.push('For SELL signals, stop loss must be greater than entry price.');
    }
    if (!(form.targetPrice < form.entryPrice)) {
      errors.push('For SELL signals, target price must be less than entry price.');
    }
  }

  return errors;
}

export async function fetchSignals(): Promise<Signal[]> {
  const res = await fetch(`${API_BASE}/signals`);
  if (!res.ok) {
    throw new Error('Unable to load signals.');
  }

  return res.json();
}

export async function createSignal(signal: SignalPayload): Promise<Signal> {
  const res = await fetch(`${API_BASE}/signals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signal),
  });

  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(
      Array.isArray(errorBody.errors) ? errorBody.errors.join(' ') : errorBody.message || 'Unable to create signal.'
    );
  }

  return res.json();
}

export async function fetchSignalStatus(id: string): Promise<ServerStatusResponse> {
  const res = await fetch(`${API_BASE}/signals/${encodeURIComponent(id)}/status`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Unable to fetch live status.');
  }
  return res.json();
}
