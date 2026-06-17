import { useState } from 'react';
import CreateSignal from './CreateSignal';
import Dashboard from './Dashboard';

function App() {
  const [refreshCounter, setRefreshCounter] = useState(0);

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <header className="mb-8 text-center sm:text-left">
          <h1 className="text-4xl font-bold text-slate-900">Trading Signal Tracker</h1>
          <p className="mt-2 text-slate-600">Create signals and monitor live Binance prices with auto-refresh.</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <CreateSignal onCreated={() => setRefreshCounter((prev) => prev + 1)} />
          <div className="space-y-6">
            <Dashboard refreshTrigger={refreshCounter} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
