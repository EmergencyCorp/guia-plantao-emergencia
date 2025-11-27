import React from 'react';
import { User, KeyRound, LogIn, Settings, Cloud, CloudOff } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function LoginScreen({ 
  isDarkMode, toggleTheme, loginError, handleLogin, 
  usernameInput, setUsernameInput, passwordInput, setPasswordInput, 
  configStatus, isCloudConnected 
}) {
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-800'}`}>
      <div className={`rounded-3xl shadow-xl border max-w-md w-full overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-8 text-center text-white relative">
          <div className="absolute top-4 right-4">
             <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          </div>
          <img 
             src="https://i.ibb.co/d0W4s2yH/logobranco.png"
             alt="Lister Guidance Logo" 
             className="mx-auto mb-4 h-24 w-auto object-contain"
          />
          <h1 className="text-2xl font-bold mb-1">Lister Guidance</h1>
          <p className="text-blue-200 text-sm font-medium">Acesso Exclusivo Médico</p>
        </div>
        <div className="p-8 space-y-6">
          {loginError && <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border font-mono ${isDarkMode ? 'bg-red-900/30 text-red-200 border-red-800' : 'bg-red-50 text-red-600 border-red-100'}`}>{loginError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label htmlFor="username" className={`text-xs font-bold uppercase ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Usuário</label>
                <div className="relative">
                    <User className={`absolute left-3 top-3 w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                    <input 
                      id="username"
                      name="username"
                      type="text" 
                      value={usernameInput} 
                      onChange={(e)=>setUsernameInput(e.target.value)} 
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-900 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`} 
                      placeholder="Ex: admin" 
                      autoComplete="username"
                    />
                </div>
            </div>
            <div>
                <label htmlFor="password" className={`text-xs font-bold uppercase ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Senha</label>
                <div className="relative">
                    <KeyRound className={`absolute left-3 top-3 w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                    <input 
                      id="password"
                      name="password"
                      type="password" 
                      value={passwordInput} 
                      onChange={(e)=>setPasswordInput(e.target.value)} 
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-900 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`} 
                      placeholder="••••••" 
                      autoComplete="current-password"
                    />
                </div>
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-3 bg-blue-900 text-white font-bold p-3.5 rounded-xl hover:bg-blue-800 transition-all shadow-lg mt-2"><LogIn className="w-5 h-5" /> Acessar Sistema</button>
          </form>
          <div className={`text-center flex flex-col items-center gap-3 pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
            <div className={`flex items-center justify-center gap-2 text-[10px] px-3 py-1.5 rounded-full mx-auto w-fit ${configStatus === 'missing' ? (isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700') : isCloudConnected ? (isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700') : (isDarkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700')}`}>{configStatus === 'missing' ? <Settings size={12}/> : isCloudConnected ? <Cloud size={12}/> : <CloudOff size={12}/>}<span>{configStatus === 'missing' ? 'Erro: Variáveis de Ambiente' : isCloudConnected ? 'Banco de Dados Conectado' : 'Modo Offline (Dados Locais)'}</span></div>
            <p className="text-[10px] text-slate-400 leading-tight max-w-xs">ATENÇÃO: Ferramenta auxiliar. Não substitui o julgamento clínico. O autor isenta-se de responsabilidade.</p>
          </div>
        </div>
      </div>
    </div>
  );
}