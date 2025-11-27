// Arquivo: src/components/ThemeToggle.jsx
import React from 'react';
import { Moon, Sun } from 'lucide-react';

const ThemeToggle = ({ isDarkMode, toggleTheme }) => (
  <button 
    onClick={toggleTheme}
    className={`relative inline-flex items-center h-8 rounded-full w-16 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-700' : 'bg-blue-200'}`}
    title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
  >
    <span className="sr-only">Trocar Tema</span>
    <span
      className={`${
        isDarkMode ? 'translate-x-9 bg-slate-800' : 'translate-x-1 bg-white'
      } inline-block w-6 h-6 transform rounded-full transition-transform shadow-md flex items-center justify-center`}
    >
      {isDarkMode ? <Moon size={14} className="text-blue-300" /> : <Sun size={14} className="text-yellow-500" />}
    </span>
  </button>
);

export default ThemeToggle;