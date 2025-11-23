import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, AlertCircle, Search, Clock, Pill, FileText, Loader2, BookOpen, 
  Stethoscope, ClipboardCheck, AlertTriangle, ArrowRight, X, User, 
  CheckCircle2, Thermometer, Syringe, Siren, FlaskConical, Tag, Package,
  ShieldAlert, LogOut, Lock, Shield, History, LogIn, KeyRound, Edit, Save, Cloud, CloudOff, Settings
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
// Usando pacotes padrão (requer 'npm install firebase')
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection } from 'firebase/firestore';

// --- LÓGICA DE CONFIGURAÇÃO DO FIREBASE (À PROVA DE FALHAS) ---
const getFirebaseConfig = () => {
  try {
    // 1. Prioridade: Variáveis de Ambiente do Vite (Para o Netlify)
    // Verifica se as variáveis de ambiente existem antes de usá-las
    if (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) {
      return {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };
    }
    
    // 2. Fallback: Variável Global Injetada (Para o Ambiente de Preview anterior)
    // O "typeof" previne o erro "ReferenceError" se a variável não existir
    if (typeof __firebase_config !== 'undefined') {
      return JSON.parse(__firebase_config);
    }
  } catch (e) {
    console.error("Erro ao carregar configuração do Firebase:", e);
  }
  return null;
};

// Inicializa as variáveis globais do Firebase
const firebaseConfig = getFirebaseConfig();
let app = null;
let auth = null;
let db = null;

// Só inicializa se tivermos uma configuração válida
if (firebaseConfig && firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Falha na inicialização do Firebase:", e);
  }
}

// IDs e Tokens com verificação de segurança (typeof previne o crash)
const appId = (typeof __app_id !== 'undefined') ? __app_id : 'emergency-guide-app';
const initialToken = (typeof __initial_auth_token !== 'undefined') ? __initial_auth_token : null;

// --- CONFIGURAÇÃO DE ACESSO (Login Local) ---
const AUTHORIZED_USERS = [
  { 
    username: 'admin', 
    password: '123', 
    name: 'Dr. Administrador',
    role: 'Diretor Clínico'
  },
  { 
    username: 'medico', 
    password: 'med', 
    name: 'Dr. Plantonista',
    role: 'Médico Assistente'
  },
  { 
    username: 'interno', 
    password: 'int', 
    name: 'Acadêmico',
    role: 'Interno'
  }
];

export default function EmergencyGuideApp() {
  // Estados de Autenticação Local (App)
  const [currentUser, setCurrentUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Estados de Conexão com Banco (Firebase)
  const [firebaseUser, setFirebaseUser] = useState(null); 
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Detecta erro de config para avisar o usuário na tela de login se o Firebase não estiver configurado
  const [configError, setConfigError] = useState(!firebaseConfig || !firebaseConfig.apiKey);

  // Estados da Aplicação Principal
  const [activeRoom, setActiveRoom] = useState('verde');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [conduct, setConduct] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const resultsRef = useRef(null);

  // Estados do Bloco de Notas
  const [showNotepad, setShowNotepad] = useState(false);
  const [userNotes, setUserNotes] = useState('');

  // 1. Inicialização Robusta da Autenticação do Firebase
  useEffect(() => {
    // Se o auth não foi inicializado (falta de config), não faz nada
    if (!auth) return;

    const initAuth = async () => {
      try {
        if (initialToken) {
          await signInWithCustomToken(auth, initialToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Falha na autenticação anônima:", error);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
        setIsCloudConnected(true);
      } else {
        setFirebaseUser(null);
        setIsCloudConnected(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Carregar sessão local
  useEffect(() => {
    const savedUser = localStorage.getItem('emergency_app_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        loadHistory(parsedUser.username);
      } catch (e) {
        console.error("Sessão inválida", e);
      }
    }
  }, []);

  // 3. Sincronizar notas quando conectar
  useEffect(() => {
    if (currentUser && isCloudConnected) {
      fetchNotesFromCloud(currentUser.username);
    } else if (currentUser) {
      // Se não tem nuvem, carrega local
      const localNotes = localStorage.getItem(`notes_${currentUser.username}`);
      if (localNotes) setUserNotes(localNotes);
    }
  }, [currentUser, isCloudConnected]);

  const loadHistory = (username) => {
    try {
      const history = localStorage.getItem(`history_${username}`);
      if (history) setRecentSearches(JSON.parse(history));
      else setRecentSearches([]);
    } catch (e) {
      setRecentSearches([]);
    }
  };

  // --- LÓGICA DE ANOTAÇÕES REMOTAS ---
  const fetchNotesFromCloud = async (username) => {
    const localNotes = localStorage.getItem(`notes_${username}`);
    if (localNotes) setUserNotes(localNotes);

    if (db && auth?.currentUser) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'notes', username);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const remoteData = docSnap.data();
          if (remoteData.content) {
            setUserNotes(remoteData.content);
            localStorage.setItem(`notes_${username}`, remoteData.content);
          }
        }
      } catch (error) {
        console.error("Erro sync nuvem:", error);
      }
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (currentUser) {
        localStorage.setItem(`notes_${currentUser.username}`, userNotes);

        if (db && auth?.currentUser) {
          setIsSaving(true);
          try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'notes', currentUser.username);
            await setDoc(docRef, {
              content: userNotes,
              lastUpdated: new Date().toISOString(),
              author: currentUser.name,
              username: currentUser.username
            }, { merge: true });
          } catch (error) {
            console.error("Erro save nuvem:", error);
          } finally {
            setIsSaving(false);
          }
        }
      }
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [userNotes, currentUser]);

  const handleNoteChange = (e) => setUserNotes(e.target.value);

  // --- LÓGICA DE LOGIN ---
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    const foundUser = AUTHORIZED_USERS.find(
      u => u.username.toLowerCase() === usernameInput.toLowerCase() && u.password === passwordInput
    );
    if (foundUser) {
      setCurrentUser(foundUser);
      localStorage.setItem('emergency_app_user', JSON.stringify(foundUser));
      loadHistory(foundUser.username);
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setLoginError('Usuário ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setConduct(null);
    setSearchQuery('');
    setRecentSearches([]);
    setUserNotes('');
    localStorage.removeItem('emergency_app_user');
  };

  // --- LÓGICA DA FERRAMENTA (GEMINI) ---
  const generateConduct = async () => {
    if (!searchQuery.trim()) {
      showError('Por favor, digite uma condição clínica para buscar.');
      return;
    }

    setLoading(true);
    setConduct(null);
    setErrorMsg('');

    const roomContext = activeRoom === 'verde' 
      ? 'sala verde (baixa complexidade, ambulatorial/urgência menor)' 
      : 'sala vermelha (alta complexidade, emergência/risco de vida)';

    const roomClassification = activeRoom === 'verde' ? 'Baixa complexidade' : 'Alta complexidade/Emergência';

    const prescriptionGuidance = activeRoom === 'verde'
      ? 'DIRETRIZ IMPORTANTE: Como é Sala Verde, dê PREFERÊNCIA para medicações via ORAL (VO) ou IM na primeira linha de tratamento visando a alta do paciente. Use EV apenas se estritamente necessário para controle álgico intenso ou se houver falha da VO (deixe o EV claro no escalonamento).'
      : 'DIRETRIZ: Priorize a via mais eficaz e rápida para estabilização (geralmente EV).';

    const promptText = `Você é um assistente médico sênior especializado em medicina de emergência.
    TAREFA: Forneça uma conduta clínica COMPLETA para "${searchQuery}" na ${roomContext}.
    ${prescriptionGuidance}
    
    Retorne APENAS um JSON com esta estrutura exata (sem markdown):
    {
      "condicao": "Nome da condição",
      "estadiamento": "Classificação/Estadiamento se houver (ex: Dengue C, Asma Grave)",
      "classificacao": "${roomClassification}",
      "resumo_clinico": "Resumo narrativo do quadro.",
      "apresentacao_tipica": { "sintomas_principais": ["..."], "sinais_fisicos": ["..."], "tempo_evolucao": "..." },
      "achados_exames": { "ecg": "...", "raio_x": "...", "laboratorio": "...", "outros_exames": "..." },
      "avaliacao_inicial": { "sinais_vitais_especificos": ["..."], "exames_obrigatorios": ["..."], "exames_complementares": ["..."] },
      "criterios_gravidade": ["..."],
      "tratamento_medicamentoso": [ { "linha": "1ª Linha", "farmaco": "...", "apresentacao": "...", "indicacao": "...", "diluicao": "...", "posologia": "...", "via_administracao": "...", "tempo_infusao": "...", "cuidados": "...", "observacoes": "..." } ],
      "escalonamento_terapeutico": { "primeira_linha": "...", "se_falha": "...", "resgate": "..." },
      "medidas_gerais": ["..."],
      "criterios_internacao": ["..."],
      "criterios_alta": ["..."],
      "guideline_referencia": "Fonte"
    }
    Doses para adulto 70kg.`;

    try {
      // Tenta pegar a chave do Gemini do import.meta.env (Vite)
      // Se não existir, usa string vazia para não quebrar a renderização inicial
      const apiKey = (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) ? import.meta.env.VITE_GEMINI_API_KEY : "";
      
      if (!apiKey) {
        throw new Error("Chave de API do Gemini não configurada (VITE_GEMINI_API_KEY).");
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) throw new Error('Falha na API do Gemini');

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (textResponse) {
        const conductData = JSON.parse(textResponse);
        setConduct(conductData);
        saveToHistory(searchQuery, activeRoom);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      } else {
        throw new Error('Sem resposta válida');
      }
    } catch (error) {
      console.error('Erro:', error);
      showError(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = (term, room) => {
    if (!currentUser) return;
    const newEntry = { query: term, room, timestamp: new Date().toISOString() };
    const currentHistory = recentSearches.filter(s => s.query.toLowerCase() !== term.toLowerCase());
    const updatedHistory = [newEntry, ...currentHistory].slice(0, 10);
    setRecentSearches(updatedHistory);
    localStorage.setItem(`history_${currentUser.username}`, JSON.stringify(updatedHistory));
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  // --- INTERFACE ---
  const roomConfig = {
    verde: { name: 'Sala Verde', color: 'emerald', accent: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-800', light: 'bg-emerald-50', icon: <Stethoscope className="w-5 h-5" />, description: 'Baixa Complexidade / Ambulatorial', examples: ['Cefaleia', 'Lombalgia', 'IVAS'] },
    vermelha: { name: 'Sala Vermelha', color: 'rose', accent: 'bg-rose-600', border: 'border-rose-600', text: 'text-rose-800', light: 'bg-rose-50', icon: <Siren className="w-5 h-5" />, description: 'Emergência / Risco de Vida', examples: ['Sepse', 'IAM', 'AVC'] }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center text-white relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/medical-icons.png')] opacity-10"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="bg-white/20 p-3 rounded-2xl mb-4 backdrop-blur-sm shadow-lg">
                <Shield size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-1">Guia de Plantão</h1>
              <p className="text-blue-100 text-sm font-medium">Acesso Restrito a Profissionais</p>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-slate-800">Autenticação</h2>
              <p className="text-slate-500 text-sm">Insira suas credenciais institucionais.</p>
            </div>
            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2 border border-red-100 animate-in fade-in">
                <AlertCircle size={14} /> {loginError}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Usuário</label>
                <div className="relative"><User className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input type="text" value={usernameInput} onChange={(e)=>setUsernameInput(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ex: admin" autoCapitalize="none" /></div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Senha</label>
                <div className="relative"><KeyRound className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input type="password" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="••••••" /></div>
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-bold p-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg mt-2"><LogIn className="w-5 h-5" /> Entrar</button>
            </form>
            <div className="text-center flex flex-col items-center gap-2">
              <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${isCloudConnected ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                {isCloudConnected ? <Cloud size={10} /> : <CloudOff size={10} />}
                <span>{isCloudConnected ? 'Banco de Dados Conectado' : 'Modo Offline (Dados Locais)'}</span>
              </div>
              {configError && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-600 mt-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                  <Settings size={12} />
                  <span>Configuração do Firebase ausente</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // App Principal
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-slate-800 selection:bg-blue-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm"><ClipboardCheck size={20} /></div>
            <div><h1 className="text-lg font-bold text-slate-800 leading-none">Guia de Plantão</h1><span className="text-[11px] text-slate-500 font-medium uppercase">Suporte Inteligente</span></div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-end mr-2"><span className="text-xs font-bold text-slate-700">{currentUser.name}</span><span className="text-[10px] text-slate-400 uppercase">{currentUser.role}</span></div>
             <button onClick={() => setShowNotepad(true)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all relative group" title="Meu Caderno">
                <Edit size={20} />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Anotações</span>
             </button>
             <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Sair"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 space-y-8 w-full">
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(roomConfig).map(([key, config]) => {
              const isActive = activeRoom === key;
              return (
                <button key={key} onClick={() => setActiveRoom(key)} className={`relative flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all duration-200 ${isActive ? `bg-white ${config.border} shadow-md -translate-y-0.5` : 'bg-white border-transparent hover:border-gray-200 shadow-sm'}`}>
                  <div className={`p-3 rounded-xl shrink-0 ${isActive ? `${config.light} ${config.text}` : 'bg-gray-100 text-gray-500'}`}>{React.cloneElement(config.icon, { className: "w-6 h-6" })}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1"><h3 className={`font-bold text-base ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>{config.name}</h3>{isActive && <CheckCircle2 size={18} className={config.text} />}</div>
                    <p className="text-sm text-slate-500 mb-2">{config.description}</p>
                    <div className="flex flex-wrap gap-2">{config.examples.map((ex, i) => (<span key={i} className="text-[11px] px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500">{ex}</span>))}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-white p-1.5 rounded-2xl shadow-lg border border-gray-100 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative flex items-center"><Search className="absolute left-4 text-gray-400 w-5 h-5" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateConduct()} placeholder="Digite o quadro clínico (ex: Cetoacidose...)" className="w-full pl-12 pr-4 py-3.5 bg-transparent border-none outline-none text-slate-800 placeholder:text-gray-400 font-medium" /></div>
            <button onClick={generateConduct} disabled={loading} className={`px-8 py-3.5 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-md ${loading ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'}`}>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Gerar <ArrowRight className="w-5 h-5" /></>}</button>
          </div>

          {recentSearches.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase mr-2"><History size={14} /> Histórico</div>
              {recentSearches.map((search, idx) => (<button key={idx} onClick={() => {setActiveRoom(search.room); setSearchQuery(search.query);}} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-sm"><div className={`w-1.5 h-1.5 rounded-full ${search.room === 'verde' ? 'bg-emerald-500' : 'bg-rose-500'}`} />{search.query}</button>))}
            </div>
          )}
          {errorMsg && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-3"><AlertCircle size={20} /><span className="font-medium text-sm">{errorMsg}</span></div>}
        </div>

        {conduct && (
          <div ref={resultsRef} className="animate-in slide-in-from-bottom-8 fade-in duration-500 space-y-6">
            <div className="flex items-start justify-between">
               <div>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                     <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase text-white shadow-sm ${activeRoom === 'verde' ? 'bg-emerald-500' : 'bg-rose-600'}`}>{conduct.classificacao}</span>
                     {conduct.estadiamento && (<span className="flex items-center gap-1.5 bg-slate-800 text-white px-3 py-0.5 rounded text-[11px] font-bold uppercase shadow-sm"><Tag size={12} /> {conduct.estadiamento}</span>)}
                     {conduct.guideline_referencia && (<span className="text-xs text-slate-500 flex items-center gap-1.5"><BookOpen size={14} /> {conduct.guideline_referencia}</span>)}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">{conduct.condicao}</h2>
               </div>
               <button onClick={() => { setConduct(null); setSearchQuery(''); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-full"><X size={24} /></button>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 text-slate-700 leading-relaxed flex gap-3">
               <User className="text-blue-500 shrink-0 mt-1" size={20} />
               <div><span className="font-bold text-slate-900 block mb-1">Quadro Clínico Típico {conduct.estadiamento ? `(${conduct.estadiamento})` : ''}</span>{conduct.resumo_clinico}</div>
            </div>

            {conduct.criterios_gravidade?.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-rose-800 font-bold flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5" /> SINAIS DE ALARME</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {conduct.criterios_gravidade.map((crit, i) => (<div key={i} className="flex items-start gap-2 bg-white/60 p-2.5 rounded-lg border border-rose-100/50"><AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" /><span className="text-sm text-rose-800 font-medium">{crit}</span></div>))}
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-600" /><h3 className="font-bold text-indigo-900 text-sm uppercase">Avaliação</h3></div>
                   <div className="p-5 space-y-4">
                      {conduct.avaliacao_inicial?.sinais_vitais_especificos && <div className="flex flex-wrap gap-2">{conduct.avaliacao_inicial.sinais_vitais_especificos.map((s,i)=><span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100"><Activity size={12}/> {s}</span>)}</div>}
                      {conduct.avaliacao_inicial?.exames_obrigatorios && <ul className="space-y-2">{conduct.avaliacao_inicial.exames_obrigatorios.map((ex,i)=><li key={i} className="flex items-start gap-2 text-sm text-slate-700"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />{ex}</li>)}</ul>}
                   </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-blue-50/50 px-5 py-3 border-b border-blue-50 flex items-center gap-2"><Search className="w-5 h-5 text-blue-600" /><h3 className="font-bold text-blue-900 text-sm uppercase tracking-wide">Achados Típicos</h3></div>
                   <div className="p-5 space-y-4">
                      {Object.entries(conduct.achados_exames || {}).map(([key, value]) => { if(!value) return null; const map = { ecg: 'ECG', raio_x: 'Imagem', laboratorio: 'Laboratório', outros_exames: 'Outros' }; return (<div key={key} className="text-sm"><span className="font-bold text-slate-700 block mb-1">{map[key]}</span><p className="text-slate-600 leading-snug bg-gray-50 p-3 rounded-lg border border-gray-100">{value}</p></div>)})}
                      {conduct.apresentacao_tipica && (<div className="pt-4 border-t border-gray-100"><span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Sinais Físicos</span><div className="flex flex-wrap gap-1.5">{conduct.apresentacao_tipica.sinais_fisicos?.map((s, i) => (<span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{s}</span>))}</div></div>)}
                   </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden ring-1 ring-emerald-100">
                   <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between"><div className="flex items-center gap-2"><div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-700"><Pill className="w-5 h-5" /></div><h3 className="font-bold text-emerald-900 text-base">Conduta Medicamentosa</h3></div><span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Prescrição</span></div>
                   <div className="divide-y divide-gray-100">
                      {conduct.tratamento_medicamentoso?.map((med, idx) => (
                        <div key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                           <div className="flex justify-between items-start mb-2">
                              <div><h4 className="text-xl font-bold text-slate-800">{med.farmaco}</h4><span className="text-xs text-slate-500 italic">{med.indicacao}</span></div>
                              {med.via_administracao && <span className="text-xs font-bold bg-white border px-2 py-1 rounded text-slate-600">{med.via_administracao}</span>}
                           </div>
                           {med.diluicao && <div className="mb-2 text-xs bg-blue-50 p-2 rounded text-blue-800"><FlaskConical size={10} className="inline mr-1"/>{med.diluicao}</div>}
                           <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-2"><p className="text-emerald-900 font-mono text-sm">{med.posologia}</p></div>
                           <div className="text-sm text-slate-600">{med.observacoes}</div>
                        </div>
                      ))}
                   </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                   <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase"><ArrowRight className="w-4 h-4 text-purple-600" /> Escalonamento</h3>
                   <div className="space-y-3">
                      <StepItem number="1" title="1ª Linha" content={conduct.escalonamento_terapeutico?.primeira_linha} color="purple" />
                      <StepItem number="2" title="Falha" content={conduct.escalonamento_terapeutico?.se_falha} color="amber" />
                      <StepItem number="3" title="Resgate" content={conduct.escalonamento_terapeutico?.resgate} color="rose" />
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto py-8 px-4 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} EmergencyCorp. Uso exclusivo médico.</p>
      </footer>

      {showNotepad && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Edit size={20} /></div>
                 <div><h3 className="font-bold text-slate-800 leading-none">Meu Caderno</h3><div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Anotações de {currentUser?.name}</span><span className="text-gray-300">•</span>{isCloudConnected ? (<span className="flex items-center gap-1 text-[10px] text-green-600 font-medium"><Cloud size={10} /> Nuvem Ativa</span>) : (<span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium"><CloudOff size={10} /> Offline</span>)}</div></div>
              </div>
              <button onClick={() => setShowNotepad(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 bg-yellow-50 relative"><textarea className="w-full h-full p-6 resize-none focus:outline-none text-slate-700 leading-relaxed bg-transparent text-lg font-medium font-serif" placeholder="Escreva suas anotações..." value={userNotes} onChange={handleNoteChange} style={{ backgroundImage: 'linear-gradient(transparent, transparent 31px, #e5e7eb 31px)', backgroundSize: '100% 32px', lineHeight: '32px' }} /></div>
            <div className="p-3 bg-white border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
               <div className="flex items-center gap-1.5">{isSaving ? (<><Loader2 size={14} className="text-blue-600 animate-spin" /><span className="text-blue-600">Salvando...</span></>) : (<><Save size={14} className="text-green-600" /><span>{isCloudConnected ? "Salvo na nuvem" : "Salvo localmente"}</span></>)}</div>
               <span>{userNotes.length} caracteres</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepItem({ number, title, content, color }) {
   if (!content) return null;
   const colors = { purple: "bg-purple-100 text-purple-700 ring-purple-200", amber: "bg-amber-100 text-amber-700 ring-amber-200", rose: "bg-rose-100 text-rose-700 ring-rose-200" };
   return (
     <div className="relative flex gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 ring-2 ring-offset-2 ring-offset-white ${colors[color]}`}>{number}</div>
        <div className="pb-1"><p className="text-xs font-bold text-gray-500 uppercase mb-0.5">{title}</p><p className="text-sm text-slate-700 leading-snug">{content}</p></div>
     </div>
   )
}