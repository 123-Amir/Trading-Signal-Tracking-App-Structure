import { useState } from 'react';
import type { FormEvent } from 'react';
import { createSignal, validateSignalForm } from './utils';
import type { Direction, SignalPayload } from './types';

interface CreateSignalForm {
  symbol: string;
  direction: Direction;
  entryPrice: string;
  stopLoss: string;
  targetPrice: string;
  entryTime: string;
  expiryTime: string;
}

const initialState: CreateSignalForm = {
  symbol: 'BTCUSDT',
  direction: 'BUY',
  entryPrice: '',
  stopLoss: '',
  targetPrice: '',
  entryTime: '',
  expiryTime: '',
};

function CreateSignal({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState<CreateSignalForm>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (field: keyof CreateSignalForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const payload: SignalPayload = {
      symbol: form.symbol.trim().toUpperCase(),
      direction: form.direction,
      entryPrice: Number(form.entryPrice),
      stopLoss: Number(form.stopLoss),
      targetPrice: Number(form.targetPrice),
      entryTime: form.entryTime,
      expiryTime: form.expiryTime,
    };

    const validationErrors = validateSignalForm(payload);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '));
      setLoading(false);
      return;
    }

    try {
      await createSignal(payload);
      setSuccess('Signal created successfully.');
      setForm(initialState);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create signal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm ring-1 ring-slate-200">
      <h2 className="text-2xl font-semibold mb-4 text-slate-900">Create Signal</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700">
            <span>Symbol</span>
            <input
              value={form.symbol}
              onChange={(e) => handleChange('symbol', e.target.value)}
              className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-blue-500"
              required
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Direction</span>
            <select
              value={form.direction}
              onChange={(e) => handleChange('direction', e.target.value)}
              className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-blue-500"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm text-slate-700">
            <span>Entry Price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.entryPrice || ''}
              onChange={(e) => handleChange('entryPrice', e.target.value)}
              className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-blue-500"
              required
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Stop Loss</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.stopLoss || ''}
              onChange={(e) => handleChange('stopLoss', e.target.value)}
              className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-blue-500"
              required
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Target Price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.targetPrice || ''}
              onChange={(e) => handleChange('targetPrice', e.target.value)}
              className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-blue-500"
              required
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700">
            <span>Entry Time</span>
            <input
              type="datetime-local"
              value={form.entryTime}
              onChange={(e) => handleChange('entryTime', e.target.value)}
              className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-blue-500"
              required
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Expiry Time</span>
            <input
              type="datetime-local"
              value={form.expiryTime}
              onChange={(e) => handleChange('expiryTime', e.target.value)}
              className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-blue-500"
              required
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 text-white px-5 py-2 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Create Signal'}
          </button>
          <div className="space-y-1 text-sm">
            {success && <div className="text-green-600">{success}</div>}
            {error && <div className="text-red-600">{error}</div>}
          </div>
        </div>
      </form>
    </div>
  );
}

export default CreateSignal;
