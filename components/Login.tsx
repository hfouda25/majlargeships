import React, { useState } from 'react';
import { Lock, Anchor } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Retrieve stored password or use default
    const storedPassword = localStorage.getItem('maj_app_password');
    const validPasswords = storedPassword ? [storedPassword] : ['admin123', 'jamaica2025'];

    if (validPasswords.includes(password)) {
      // Ensure the active password is saved if using a default one for the first time
      if (!storedPassword) {
        localStorage.setItem('maj_app_password', password);
      }
      onLogin();
    } else {
      setError('Invalid access password.');
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center border-t-8 border-gold-500">
        <div className="flex justify-center mb-6">
          <div className="bg-navy-900 p-4 rounded-full shadow-lg border-4 border-gold-500">
            <Anchor className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Maritime Authority of Jamaica</h1>
        <p className="text-gray-500 mb-8">Large Ships Database Access</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-transparent transition"
              placeholder="Enter Access Password"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}
          
          <button
            type="submit"
            className="w-full bg-navy-900 hover:bg-navy-800 text-white font-bold py-3 rounded-lg transition duration-200 shadow-md border-b-4 border-navy-700 active:border-b-0 active:mt-1"
          >
            Access Database
          </button>
        </form>
        
        <div className="mt-8 text-xs text-gray-400">
          Authorized Personnel Only • Secure Connection
        </div>
      </div>
    </div>
  );
};