// Arquivo: src/components/LoginScreen.jsx
import React, { useState } from 'react';
import { User, KeyRound, LogIn, Settings, Cloud, CloudOff, Mail, FileBadge, ArrowRight, AlertCircle } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function LoginScreen({ 
  isDarkMode, toggleTheme, loginError, handleEmailLogin, handleGoogleLogin, handleSignUp,
  configStatus, isCloudConnected, isLoading 
}) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [crm, setCrm] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignUp) handleSignUp(email, password, fullName, crm);
    else handleEmailLogin(email, password);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-800'}`}>
      <div className={`rounded-3xl shadow-xl border max-w-md w-full overflow-hidden transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        
        <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-6 text-center text-white relative">
          <div className="absolute top-4 right-4">
             <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          </div>
          <img src="https://i.ibb.co/d0W4s2yH/logobranco.png" alt="Logo" className="mx-auto mb-2 h-16 w-auto object-contain"/>
          <h1 className="text-xl font-bold mb-1">Lister Guidance</h1>
          <p className="text-blue-200 text-xs font-medium">Acesso Exclusivo Médico</p>
        </div>

        <div className="p-6">
          <div className="flex mb-6 border-b border-gray-200 dark:border-slate-700">
            <button onClick={() => setIsSignUp(false)} className={`flex-1 pb-2 text-sm font-bold ${!isSignUp ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>Entrar</button>
            <button onClick={() => setIsSignUp(true)} className={`flex-1 pb-2 text-sm font-bold ${isSignUp ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>Criar Conta</button>
          </div>

          {loginError && <div className={`mb-4 p-3 rounded-lg text-xs flex items-start gap-2 border font-medium ${isDarkMode ? 'bg-red-900/30 text-red-200 border-red-800' : 'bg-red-50 text-red-600 border-red-100'}`}><AlertCircle size={14} className="shrink-0 mt-0.5"/><span>{loginError}</span></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                  <div className="relative"><User className="absolute left-3 top-3 text-gray-400" size={18} /><input type="text" required value={fullName} onChange={(e)=>setFullName(e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="Nome Completo" /></div>
                  <div className="relative"><FileBadge className="absolute left-3 top-3 text-gray-400" size={18} /><input type="text" required value={crm} onChange={(e)=>setCrm(e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="CRM / UF" /></div>
              </div>
            )}
            <div className="relative"><Mail className="absolute left-3 top-3 text-gray-400" size={18} /><input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="Email" /></div>
            <div className="relative"><KeyRound className="absolute left-3 top-3 text-gray-400" size={18} /><input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="Senha" minLength={6} /></div>
            <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white font-bold p-3.5 rounded-xl hover:bg-blue-800 transition-all shadow-lg mt-2 text-sm">{isLoading ? 'Processando...' : (isSignUp ? 'Solicitar Acesso' : 'Acessar Sistema')} <ArrowRight size={16} /></button>
          </form>

          <div className="my-6 flex items-center justify-center"><div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div><span className={`px-4 text-[10px] font-medium uppercase ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Ou continue com</span><div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div></div>
          <button type="button" onClick={handleGoogleLogin} disabled={isLoading} className={`w-full flex items-center justify-center gap-3 border font-bold p-3 rounded-xl transition-all text-sm ${isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg> Google
          </button>
        </div>
      </div>
    </div>
  );
}