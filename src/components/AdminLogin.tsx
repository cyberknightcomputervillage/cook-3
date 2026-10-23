import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  onLogin: (passcode: string) => boolean;
  onBackToHome: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBackToHome }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(password);
    if (!success) {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Admin Authentication
          </h2>
          <p className="text-xs text-slate-400">
            Enter the admin passcode to access files, downloads, and upload audit logs.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Passcode
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              placeholder="Enter passcode..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Incorrect passcode. Please try again.</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <span>Unlock Admin Panel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <button
            onClick={onBackToHome}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Return to public upload page
          </button>
        </div>
      </div>
    </div>
  );
};
