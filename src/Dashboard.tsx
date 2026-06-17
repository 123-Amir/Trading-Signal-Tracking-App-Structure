import { useEffect, useMemo, useState } from 'react';
import { calculateTimeRemaining, fetchSignals, fetchSignalStatus, formatNumber } from './utils';
import type { LiveSignal } from './types';

function Dashboard({ refreshTrigger }: { refreshTrigger: number }) {
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const loadSignals = async () => {
    setError(null);
    setLoading(true);

    try {
      const storedSignals = await fetchSignals();
      const signalsWithLive = await Promise.all(
        storedSignals.map(async (signal) => {
          try {
            const statusData = await fetchSignalStatus(signal.id);
            const currentPrice = Number(statusData.currentPrice ?? 0);
            return {
              ...signal,
              currentPrice,
              status: statusData.status,
              roi: Number(statusData.roi.toFixed(2)),
              timeRemaining: statusData.timeRemaining,
            };
          } catch {
            return {
              ...signal,
              currentPrice: undefined,
              status: 'PRICE ERROR',
              roi: undefined,
              timeRemaining: 'Unknown',
            };
          }
        })
      );

      setSignals(signalsWithLive);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignals();
  }, [refreshTrigger]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRefreshCounter((prev) => prev + 1);
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (refreshCounter > 0) {
      loadSignals();
    }
  }, [refreshCounter]);

  const rows = useMemo(
    () =>
      signals.map((signal) => ({
        ...signal,
        roiDisplay: signal.roi != null ? `${formatNumber(signal.roi, 2)}%` : '—',
        currentPriceDisplay:
          signal.currentPrice != null ? formatNumber(signal.currentPrice, 2) : 'Loading...',
      })),
    [signals]
  );

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <span className="text-sm text-gray-500">Refreshes every 15 sec</span>
      </div>

      {loading && <div className="text-gray-600">Loading dashboard...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {['Symbol', 'Direction', 'Entry Price', 'Target Price', 'Stop Loss', 'Current Price', 'Status', 'ROI %', 'Time Until Expiry'].map((label) => (
                <th key={label} className="px-4 py-3 font-medium text-gray-700">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                  No signals available.
                </td>
              </tr>
            ) : (
              rows.map((signal) => (
                <tr key={signal.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{signal.symbol}</td>
                  <td className="px-4 py-3">{signal.direction}</td>
                  <td className="px-4 py-3">{formatNumber(signal.entryPrice, 2)}</td>
                  <td className="px-4 py-3">{formatNumber(signal.targetPrice, 2)}</td>
                  <td className="px-4 py-3">{formatNumber(signal.stopLoss, 2)}</td>
                  <td className="px-4 py-3">{signal.currentPriceDisplay}</td>
                  <td className="px-4 py-3">{signal.status}</td>
                  <td className="px-4 py-3">{signal.roiDisplay}</td>
                  <td className="px-4 py-3">{signal.timeRemaining}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Dashboard;
