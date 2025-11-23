import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, AlertCircle, Search, Clock, Pill, FileText, Loader2, BookOpen, 
  Stethoscope, ClipboardCheck, AlertTriangle, ArrowRight, X, User, 
  CheckCircle2, Thermometer, Syringe, Siren, FlaskConical, Tag, Package,
  ShieldAlert, LogOut, Lock, Shield, History, LogIn, KeyRound, Edit, Save, Cloud, CloudOff, Settings, Info,
  HeartPulse, Microscope, Image as ImageIcon, FileDigit, ScanLine, Wind, Droplet
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection } from 'firebase/firestore';

// --- LÓGICA DE CONFIGURAÇÃO DO FIREBASE (À PROVA DE FALHAS) ---
const getFirebaseConfig = () => {
  try {
    // 1. Prioridade: Variáveis de Ambiente do Vite (Netlify/Vercel)
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
    // 2. Fallback: Variável Global Injetada (Ambiente de Teste/Preview)
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

// IDs e Tokens com verificação de segurança
const appId = (typeof __app_id !== 'undefined') ? __app_id : 'emergency-guide-app';
const initialToken = (typeof __initial_auth_token !== 'undefined') ? __initial_auth_token : null;

// --- CONFIGURAÇÃO DE ACESSO (LOGIN LOCAL) ---
const AUTHORIZED_USERS = [
  { username: 'admin', password: '123', name: 'Dr. Administrador', role: 'Diretor Clínico' },
  { username: 'medico', password: 'med', name: 'Dr. Plantonista', role: 'Médico Assistente' },
  { username: 'interno', password: 'int', name: 'Acadêmico', role: 'Interno' }
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
  const [configStatus, setConfigStatus] = useState('verificando'); // 'ok', 'missing'

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
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      setConfigStatus('missing');
      return;
    }
    setConfigStatus('ok');

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

  // 3. Sincronizar notas
  useEffect(() => {
    if (currentUser && isCloudConnected) {
      fetchNotesFromCloud(currentUser.username);
    } else if (currentUser) {
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
      setLoginError('Credenciais inválidas. Verifique usuário e senha.');
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
      ? 'SALA VERDE (AMBULATORIAL/BAIXA COMPLEXIDADE)' 
      : 'SALA VERMELHA (EMERGÊNCIA/RISCO DE VIDA)';

    const prescriptionGuidance = activeRoom === 'verde'
      ? 'DIRETRIZ: Preferência absoluta por VIA ORAL (VO) ou IM. Visar alta hospitalar.'
      : 'DIRETRIZ: Preferência por VIA ENDOVENOSA (EV). Visar estabilização imediata.';

    // PROMPT REFINADO PARA VITAIS DETALHADOS
    const promptText = `Atue como médico especialista em medicina de emergência.
    Gere conduta clínica para "${searchQuery}" na ${roomContext}.
    ${prescriptionGuidance}
    
    REGRAS OBRIGATÓRIAS:
    1. Retorne APENAS JSON válido.
    2. "tratamento_medicamentoso": ARRAY de objetos.
    3. "criterios_internacao" e "criterios_alta": OBRIGATÓRIOS.
    4. "avaliacao_inicial.sinais_vitais_especificos": Forneça alvos numéricos claros para FC, FR, PA (Sistólica/Diastólica e PAM entre parênteses quando relevante) e SatO2. Se a condição for benigna, coloque 'Sinais estáveis'.
    
    ESTRUTURA DO JSON:
    {
      "condicao": "Nome da Doença",
      "estadiamento": "Estágio (ex: Dengue C). Se não aplicável, null",
      "classificacao": "${roomContext}",
      "resumo_clinico": "Resumo sucinto.",
      "apresentacao_tipica": { "sintomas_principais": [], "sinais_fisicos": [], "tempo_evolucao": "..." },
      "achados_exames": { "ecg": "...", "raio_x": "...", "laboratorio": "...", "outros_exames": "..." },
      "avaliacao_inicial": { 
        "sinais_vitais_especificos": ["FC: < 100bpm", "PA: > 90mmHg (PAM > 65)", "SatO2: > 92%", "FR: 12-20 ipm"], 
        "exames_obrigatorios": ["..."], 
        "exames_complementares": ["..."] 
      },
      "criterios_gravidade": ["Red flag 1", "..."],
      "tratamento_medicamentoso": [ 
        { "farmaco": "Nome", "posologia": "Dose", "via": "EV/VO", "diluicao": "...", "cuidados": "...", "indicacao": "..." } 
      ],
      "escalonamento_terapeutico": [
        { "passo": "1ª Linha", "descricao": "..." },
        { "passo": "Se falha", "descricao": "..." },
        { "passo": "Resgate", "descricao": "..." }
      ],
      "medidas_gerais": ["..."],
      "criterios_internacao": ["..."],
      "criterios_alta": ["..."],
      "guideline_referencia": "Fonte"
    }
    Doses para adulto 70kg.`;

    try {
      const apiKey = (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) ? import.meta.env.VITE_GEMINI_API_KEY : "";
      
      if (!apiKey) {
        throw new Error("Chave de API do Gemini não configurada.");
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
        throw new Error('Sem resposta válida da IA');
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

  // --- HELPER PARA ÍCONES DE VITAIS ---
  const getVitalIcon = (text) => {
    const t = text.toLowerCase();
    if (t.includes('fc') || t.includes('bpm') || t.includes('freq')) return <HeartPulse size={16} className="text-rose-500" />;
    if (t.includes('pa') || t.includes('mmhg') || t.includes('pam') || t.includes('press')) return <Activity size={16} className="text-blue-500" />;
    if (t.includes('sat') || t.includes('%') || t.includes('o2')) return <Droplet size={16} className="text-cyan-500" />;
    if (t.includes('fr') || t.includes('ipm') || t.includes('resp')) return <Wind size={16} className="text-teal-500" />;
    if (t.includes('temp') || t.includes('tax') || t.includes('°')) return <Thermometer size={16} className="text-orange-500" />;
    return <Activity size={16} className="text-slate-400" />;
  };

  // --- INTERFACE ---
  const roomConfig = {
    verde: { name: 'Sala Verde', color: 'emerald', accent: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-800', light: 'bg-emerald-50', icon: <Stethoscope className="w-5 h-5" />, description: 'Ambulatorial / Baixa Complexidade', examples: ['Cefaleia', 'Lombalgia', 'IVAS'] },
    vermelha: { name: 'Sala Vermelha', color: 'rose', accent: 'bg-rose-600', border: 'border-rose-600', text: 'text-rose-800', light: 'bg-rose-50', icon: <Siren className="w-5 h-5" />, description: 'Emergência / Risco de Vida', examples: ['Sepse', 'IAM', 'AVC'] }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-br from-blue-900 to-slate-800 p-8 text-center text-white relative">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10 flex flex-col items-center">
              <Shield size={40} className="mx-auto mb-3 text-blue-300" />
              <h1 className="text-2xl font-bold mb-1">Guia de Plantão</h1>
              <p className="text-blue-200 text-sm font-medium">Acesso Exclusivo Médico</p>
            </div>
          </div>
          <div className="p-8 space-y-6">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2 border border-red-100 animate-in fade-in">
                <AlertCircle size={14} /> {loginError}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Usuário</label>
                <div className="relative"><User className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input type="text" value={usernameInput} onChange={(e)=>setUsernameInput(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-900 focus:outline-none transition-all" placeholder="Ex: admin" autoCapitalize="none" /></div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Senha</label>
                <div className="relative"><KeyRound className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input type="password" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-900 focus:outline-none transition-all" placeholder="••••••" /></div>
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-3 bg-blue-900 text-white font-bold p-3.5 rounded-xl hover:bg-blue-800 transition-all shadow-lg mt-2"><LogIn className="w-5 h-5" /> Acessar Sistema</button>
            </form>
            <div className="text-center flex flex-col items-center gap-3 pt-2 border-t border-gray-100">
              <div className={`flex items-center justify-center gap-2 text-[10px] px-3 py-1.5 rounded-full mx-auto w-fit ${configStatus === 'missing' ? 'bg-red-50 text-red-700' : isCloudConnected ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {configStatus === 'missing' ? <Settings size={12}/> : isCloudConnected ? <Cloud size={12}/> : <CloudOff size={12}/>}
                <span>{configStatus === 'missing' ? 'Erro: Variáveis de Ambiente' : isCloudConnected ? 'Banco de Dados Conectado' : 'Modo Offline (Dados Locais)'}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight max-w-xs">ATENÇÃO: Ferramenta auxiliar. Não substitui o julgamento clínico. O autor isenta-se de responsabilidade. Uso proibido para leigos.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 selection:bg-blue-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-900 p-2 rounded-lg text-white shadow-sm"><ClipboardCheck size={20} /></div>
            <div><h1 className="text-lg font-bold text-slate-800 leading-none">Guia de Plantão</h1><span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Suporte Médico</span></div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex flex-col items-end mr-2"><span className="text-xs font-bold text-slate-700">{currentUser.name}</span><span className="text-[10px] text-slate-400 uppercase">{currentUser.role}</span></div>
             <button onClick={() => setShowNotepad(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full" title="Caderno"><Edit size={20} /></button>
             <button onClick={handleLogout} className="p-2 text-red-400 hover:bg-red-50 rounded-full" title="Sair"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 space-y-8 w-full">
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(roomConfig).map(([key, config]) => {
              const isActive = activeRoom === key;
              return (
                <button key={key} onClick={() => setActiveRoom(key)} className={`relative flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${isActive ? `bg-white ${config.border} shadow-md ring-1 ring-offset-2 ${config.accent.replace('bg-', 'ring-')}` : 'bg-white border-transparent hover:border-gray-200 shadow-sm'}`}>
                  <div className={`p-3 rounded-xl ${isActive ? `${config.light} ${config.text}` : 'bg-gray-100 text-gray-400'}`}>{config.icon}</div>
                  <div><h3 className={`font-bold ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>{config.name}</h3><p className="text-xs text-slate-400">{config.description}</p></div>
                  {isActive && <CheckCircle2 className={`ml-auto ${config.text}`} size={20} />}
                </button>
              );
            })}
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-2">
            <Search className="ml-3 text-gray-400" size={20} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateConduct()} placeholder="Digite o quadro clínico (ex: Cetoacidose, IAM...)" className="flex-1 py-3 bg-transparent outline-none text-slate-800 font-medium" />
            <button onClick={generateConduct} disabled={loading} className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all ${loading ? 'bg-slate-300' : 'bg-blue-900 hover:bg-blue-800'}`}>{loading ? <Loader2 className="animate-spin" /> : <>Gerar <ArrowRight size={18} /></>}</button>
          </div>

          {recentSearches.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mr-2"><History size={14} /> Recentes</div>
              {recentSearches.map((search, idx) => (<button key={idx} onClick={() => {setActiveRoom(search.room); setSearchQuery(search.query);}} className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-full hover:border-blue-300 hover:text-blue-700 transition-colors">{search.query}</button>))}
            </div>
          )}
          {errorMsg && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200 flex items-center gap-3 text-sm font-medium"><AlertCircle size={18} /> {errorMsg}</div>}
        </div>

        {conduct && (
          <div ref={resultsRef} className="animate-in slide-in-from-bottom-4 fade-in duration-500 space-y-6">
            <div className="flex justify-between items-start">
               <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${activeRoom === 'verde' ? 'bg-emerald-500' : 'bg-rose-600'}`}>{conduct.classificacao}</span>
                     {conduct.estadiamento && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-white">{conduct.estadiamento}</span>}
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800">{conduct.condicao}</h2>
               </div>
               <button onClick={() => setConduct(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={24}/></button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex gap-4">
               <div className="bg-blue-50 p-2 rounded-full h-fit text-blue-600"><User size={24} /></div>
               <div><h3 className="font-bold text-slate-900 mb-1">Resumo Clínico</h3><p className="text-slate-600 leading-relaxed">{conduct.resumo_clinico}</p></div>
            </div>

            {conduct.criterios_gravidade?.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl">
                <h3 className="text-rose-800 font-bold flex items-center gap-2 mb-3 text-sm uppercase"><AlertTriangle size={18}/> Sinais de Alarme (Red Flags)</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {conduct.criterios_gravidade.map((crit, i) => (<div key={i} className="bg-white/80 p-2.5 rounded-lg border border-rose-100/50 text-sm text-rose-900 font-medium flex gap-2"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"/>{crit}</div>))}
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6 items-start">
              {/* ESQUERDA: AVALIAÇÃO E DESFECHO */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2"><Activity size={18} className="text-slate-500"/><h3 className="font-bold text-slate-700 text-sm uppercase">Avaliação Inicial</h3></div>
                   <div className="p-5 space-y-5 text-sm">
                      {conduct.avaliacao_inicial?.sinais_vitais_especificos && (
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Alvos Terapêuticos</span>
                          <div className="grid grid-cols-1 gap-2">
                            {conduct.avaliacao_inicial.sinais_vitais_especificos.map((s,i)=>(
                              <div key={i} className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex items-center gap-3 text-indigo-900">
                                {getVitalIcon(s)} <span className="font-bold">{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(conduct.avaliacao_inicial?.exames_obrigatorios || conduct.avaliacao_inicial?.exames_complementares) && (
                        <div className="space-y-3">
                           <div><span className="text-xs font-bold text-rose-600 uppercase block mb-1">Prioridade 1 (Obrigatórios)</span><ul className="space-y-1">{conduct.avaliacao_inicial?.exames_obrigatorios?.map((ex,i)=><li key={i} className="flex gap-2 items-start font-medium text-slate-700"><div className="mt-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"/>{ex}</li>)}</ul></div>
                           <div><span className="text-xs font-bold text-slate-400 uppercase block mb-1">Complementares</span><ul className="space-y-1">{conduct.avaliacao_inicial?.exames_complementares?.map((ex,i)=><li key={i} className="flex gap-2 items-start text-slate-500"><div className="mt-1.5 w-1.5 h-1.5 bg-slate-300 rounded-full shrink-0"/>{ex}</li>)}</ul></div>
                        </div>
                      )}
                   </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-blue-50 px-5 py-3 border-b border-blue-100 flex items-center gap-2"><Search size={18} className="text-blue-600"/><h3 className="font-bold text-blue-900 text-sm uppercase">O que procurar?</h3></div>
                   <div className="p-5 space-y-4 text-sm">
                      {conduct.achados_exames?.ecg && <div><div className="flex items-center gap-2 font-bold text-slate-700 mb-1"><HeartPulse size={14} className="text-rose-500"/> ECG</div><p className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">{conduct.achados_exames.ecg}</p></div>}
                      {conduct.achados_exames?.laboratorio && <div><div className="flex items-center gap-2 font-bold text-slate-700 mb-1"><Microscope size={14} className="text-purple-500"/> Laboratório</div><p className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">{conduct.achados_exames.laboratorio}</p></div>}
                      {conduct.achados_exames?.raio_x && <div><div className="flex items-center gap-2 font-bold text-slate-700 mb-1"><ImageIcon size={14} className="text-slate-500"/> Imagem</div><p className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">{conduct.achados_exames.raio_x}</p></div>}
                   </div>
                </div>

                {/* CRITÉRIOS DE DESFECHO */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100 flex items-center gap-2"><FileText size={18} className="text-indigo-600"/><h3 className="font-bold text-indigo-900 text-sm uppercase">Critérios de Desfecho</h3></div>
                   <div className="p-5 space-y-4 text-sm">
                      {conduct.criterios_internacao && (
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                          <span className="text-xs font-bold text-amber-800 uppercase block mb-1">Internação / UTI</span>
                          <ul className="space-y-1">{conduct.criterios_internacao.map((c,i)=><li key={i} className="text-amber-900 flex gap-2"><div className="mt-1.5 w-1 h-1 bg-amber-500 rounded-full shrink-0"/>{c}</li>)}</ul>
                        </div>
                      )}
                      {conduct.criterios_alta && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                          <span className="text-xs font-bold text-green-800 uppercase block mb-1">Critérios de Alta</span>
                          <ul className="space-y-1">{conduct.criterios_alta.map((c,i)=><li key={i} className="text-green-900 flex gap-2"><div className="mt-1.5 w-1 h-1 bg-green-500 rounded-full shrink-0"/>{c}</li>)}</ul>
                        </div>
                      )}
                   </div>
                </div>
              </div>

              {/* DIREITA: CONDUTA E MEDICAMENTOS */}
              <div className="lg:col-span-8 space-y-6">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-emerald-800 mb-2 px-2"><div className="bg-emerald-100 p-1.5 rounded"><Pill size={18}/></div><h3 className="font-bold text-lg">Prescrição e Conduta</h3></div>
                   {conduct.tratamento_medicamentoso?.map((med, idx) => (
                     <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3 pl-3">
                           <div>
                              <div className="flex items-center gap-2"><h4 className="text-xl font-bold text-slate-800">{med.farmaco}</h4>{med.linha && <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">{med.linha}</span>}</div>
                              <span className="text-sm text-slate-500 italic">{med.indicacao}</span>
                           </div>
                           {med.via && <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">{med.via}</span>}
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 ml-3 mb-3 font-mono text-sm text-slate-700 border border-slate-100">{med.posologia}</div>
                        <div className="grid sm:grid-cols-2 gap-4 ml-3 text-sm">
                           {med.diluicao && <div className="flex gap-2 text-blue-700"><FlaskConical size={16} className="shrink-0 mt-0.5"/><span><strong>Preparo:</strong> {med.diluicao}</span></div>}
                           {med.cuidados && <div className="flex gap-2 text-amber-700"><AlertTriangle size={16} className="shrink-0 mt-0.5"/><span><strong>Atenção:</strong> {med.cuidados}</span></div>}
                        </div>
                     </div>
                   ))}
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                   <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2"><ArrowRight className="text-purple-600"/> Fluxo de Escalonamento</h3>
                   <div className="space-y-6 relative">
                      <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                      {conduct.escalonamento_terapeutico?.map((step, i) => (
                        <div key={i} className="relative flex gap-4">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 ring-4 ring-white ${i===0 ? 'bg-purple-100 text-purple-700' : i===1 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{i+1}</div>
                           <div className="pt-1"><h4 className="text-xs font-bold uppercase text-slate-400 mb-1">{step.passo}</h4><p className="text-slate-700 leading-relaxed">{step.descricao}</p></div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center text-left">
             <ShieldAlert className="text-amber-600 shrink-0 w-8 h-8" />
             <div><h4 className="font-bold text-amber-900 uppercase text-sm mb-1">Aviso Legal Importante</h4><p className="text-xs text-amber-800/90 leading-relaxed text-justify">Esta é uma ferramenta de <strong>guia de plantão</strong> baseada em inteligência artificial. <strong>NÃO DEVE SER UTILIZADA POR LEIGOS</strong>. O conteúdo pode conter imprecisões. Médicos devem tomar condutas baseados <strong>exclusivamente em sua própria expertise</strong>. O autor isenta-se de responsabilidade.</p></div>
          </div>
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} EmergencyCorp. Todos os direitos reservados.</p>
        </div>
      </footer>

      {showNotepad && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3"><div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Edit size={20} /></div><div><h3 className="font-bold text-slate-800 leading-none">Meu Caderno</h3><div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Anotações de {currentUser?.name}</span><span className="text-gray-300">•</span>{isCloudConnected ? (<span className="flex items-center gap-1 text-[10px] text-green-600 font-medium"><Cloud size={10} /> Nuvem Ativa</span>) : (<span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium"><CloudOff size={10} /> Offline</span>)}</div></div></div>
              <button onClick={() => setShowNotepad(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 bg-yellow-50 relative"><textarea className="w-full h-full p-6 resize-none focus:outline-none text-slate-700 leading-relaxed bg-transparent text-lg font-medium font-serif" placeholder="Escreva suas anotações..." value={userNotes} onChange={handleNoteChange} style={{ backgroundImage: 'linear-gradient(transparent, transparent 31px, #e5e7eb 31px)', backgroundSize: '100% 32px', lineHeight: '32px' }} /></div>
            <div className="p-3 bg-white border-t border-gray-200 flex justify-between items-center text-xs text-gray-500"><div className="flex items-center gap-1.5">{isSaving ? (<><Loader2 size={14} className="text-blue-600 animate-spin" /><span className="text-blue-600">Salvando...</span></>) : (<><Save size={14} className="text-green-600" /><span>{isCloudConnected ? "Salvo na nuvem" : "Salvo localmente"}</span></>)}</div><span>{userNotes.length} caracteres</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
