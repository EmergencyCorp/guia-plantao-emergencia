import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, AlertCircle, Search, Clock, Pill, FileText, Loader2, BookOpen, 
  Stethoscope, ClipboardCheck, AlertTriangle, ArrowRight, X, User, 
  CheckCircle2, Thermometer, Syringe, Siren, FlaskConical, Tag, Package,
  ShieldAlert, LogOut, Lock, Shield, History, LogIn, KeyRound, Edit, Save, Cloud, CloudOff
} from 'lucide-react';

// --- FIREBASE IMPORTS (PADRÃO NPM) ---
// Agora usamos as importações corretas para instalação via npm install
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection } from 'firebase/firestore';

// --- FIREBASE CONFIG ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'emergency-guide-app';

// --- CONFIGURAÇÃO DE ACESSO ---
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
  const [firebaseUser, setFirebaseUser] = useState(null); // Usuário técnico do Firebase
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    const initAuth = async () => {
      try {
        // Prioriza o token do ambiente se existir (Fix para permissões)
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Falha na autenticação do banco de dados:", error);
      }
    };

    initAuth();

    // Monitora o estado real da conexão
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

  // 2. Carregar sessão local e dados
  useEffect(() => {
    const savedUser = localStorage.getItem('emergency_app_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        loadHistory(parsedUser.username);
      } catch (e) {
        console.error("Erro ao restaurar sessão", e);
      }
    }
  }, []);

  // 3. Efeito para carregar notas da nuvem assim que o Firebase conectar
  useEffect(() => {
    if (currentUser && isCloudConnected) {
      fetchNotesFromCloud(currentUser.username);
    }
  }, [currentUser, isCloudConnected]);

  // Função para carregar histórico (Mantido Local por simplicidade de performance)
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

  // Carregar notas da nuvem
  const fetchNotesFromCloud = async (username) => {
    // 1. Carrega do local storage primeiro para exibir algo rápido
    const localNotes = localStorage.getItem(`notes_${username}`);
    if (localNotes) setUserNotes(localNotes);

    // 2. Se tiver internet e autenticação Firebase, busca a versão mais recente da nuvem
    if (auth.currentUser) {
      try {
        // Caminho: artifacts/{appId}/public/data/user_notes_{username}
        // Nota: Usamos uma coleção 'notes' e o ID do documento é o username para facilitar
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'notes', username);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const remoteData = docSnap.data();
          // Atualiza o estado com o que veio da nuvem (presume-se mais atual ou sincronizado)
          if (remoteData.content) {
            setUserNotes(remoteData.content);
            localStorage.setItem(`notes_${username}`, remoteData.content);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar notas na nuvem:", error);
      }
    }
  };

  // Salvar notas (Debounced)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (currentUser) {
        // Salva Localmente sempre
        localStorage.setItem(`notes_${currentUser.username}`, userNotes);

        // Salva na Nuvem se conectado e autenticado
        if (auth.currentUser) {
          setIsSaving(true);
          try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'notes', currentUser.username);
            await setDoc(docRef, {
              content: userNotes,
              lastUpdated: new Date().toISOString(),
              author: currentUser.name,
              username: currentUser.username // Metadado útil
            }, { merge: true });
          } catch (error) {
            console.error("Erro ao salvar na nuvem:", error);
          } finally {
            setIsSaving(false);
          }
        }
      }
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [userNotes, currentUser]); // Removido isCloudConnected da dependência para evitar loops, usa auth.currentUser dentro

  const handleNoteChange = (e) => {
    setUserNotes(e.target.value);
  };

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
      // A busca na nuvem será acionada pelo useEffect que monitora [currentUser, isCloudConnected]
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

  // --- LÓGICA DA FERRAMENTA ---

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

    DETECÇÃO DE ESTADIAMENTO/CLASSIFICAÇÃO:
    Se a doença possui classificações formais (ex: Dengue A/B/C/D, Asma GINA, ICC NYHA, Pneumonia CURB-65):
    1. Se o usuário especificou (ex: "Dengue C"), siga estritamente esse estadiamento.
    2. Se o usuário NÃO especificou (ex: "Dengue"), assuma o estadiamento mais provável para a SALA ATUAL (${activeRoom === 'verde' ? 'Leve/Moderado' : 'Grave/Emergência'}) e indique isso claramente no campo 'estadiamento'.
    
    Retorne APENAS um JSON com esta estrutura exata:
    {
      "condicao": "Nome da condição",
      "estadiamento": "Classificação Específica usada nesta conduta (ex: 'Grupo B', 'GINA Step 2'). Se não houver, null.",
      "classificacao": "${roomClassification}",
      "resumo_clinico": "Resumo narrativo do quadro típico.",
      "apresentacao_tipica": {
        "sintomas_principais": ["..."],
        "sinais_fisicos": ["..."],
        "tempo_evolucao": "..."
      },
      "achados_exames": {
        "ecg": "...",
        "raio_x": "...",
        "laboratorio": "...",
        "outros_exames": "..."
      },
      "avaliacao_inicial": {
        "sinais_vitais_especificos": ["PA alvo...", "SatO2 alvo..."],
        "exames_obrigatorios": ["..."],
        "exames_complementares": ["..."]
      },
      "criterios_gravidade": ["Sinal de alarme 1", "..."],
      "tratamento_medicamentoso": [
        {
          "linha": "1ª Linha",
          "farmaco": "NOME",
          "apresentacao": "Liste as formas disponíveis úteis (ex: Comp 500mg, Gts 200mg/ml, Amp 10mg/2ml).",
          "indicacao": "Dor/Infecção",
          "diluicao": "Instrução DESTAQUE sobre diluição. Se EV: 'Diluir X mg em Y ml de SF0.9%'. Se NÃO precisar diluir: 'Não necessário (motivo: bolus/uso direto/IM)'.",
          "posologia": "Dose + Velocidade de Infusão + Frequência (Evite repetir a diluição aqui se já estiver no campo acima)",
          "via_administracao": "EV/VO",
          "tempo_infusao": "...",
          "cuidados": "...",
          "observacoes": "..."
        }
      ],
      "escalonamento_terapeutico": {
        "primeira_linha": "...",
        "se_falha": "...",
        "resgate": "..."
      },
      "medidas_gerais": ["..."],
      "criterios_internacao": ["..."],
      "criterios_alta": ["..."],
      "guideline_referencia": "Fonte"
    }
    SEJA PRAGMÁTICO. Doses para adulto 70kg. JSON puro sem markdown.`;

    try {
      const apiKey = (import.meta && import.meta.env) ? import.meta.env.VITE_GEMINI_API_KEY : "";
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) throw new Error('Falha na API');

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
      showError('Erro ao gerar conduta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = (newSearchTerm, room) => {
    if (!currentUser) return;
    const newEntry = { query: newSearchTerm, room: room, timestamp: new Date().toISOString() };
    const currentHistory = recentSearches.filter(s => s.query.toLowerCase() !== newSearchTerm.toLowerCase());
    const updatedHistory = [newEntry, ...currentHistory].slice(0, 10);
    setRecentSearches(updatedHistory);
    localStorage.setItem(`history_${currentUser.username}`, JSON.stringify(updatedHistory));
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  // --- RENDERIZAÇÃO ---

  const roomConfig = {
    verde: {
      name: 'Sala Verde',
      color: 'emerald',
      accent: 'bg-emerald-500',
      border: 'border-emerald-500',
      text: 'text-emerald-800',
      light: 'bg-emerald-50',
      icon: <Stethoscope className="w-5 h-5" />,
      description: 'Baixa Complexidade / Ambulatorial',
      examples: ['Cefaleia tensional', 'Lombalgia', 'IVAS', 'Gastroenterite']
    },
    vermelha: {
      name: 'Sala Vermelha',
      color: 'rose',
      accent: 'bg-rose-600',
      border: 'border-rose-600',
      text: 'text-rose-800',
      light: 'bg-rose-50',
      icon: <Siren className="w-5 h-5" />,
      description: 'Emergência / Risco de Vida',
      examples: ['Sepse', 'IAMCSST', 'AVC', 'Insuficiência Respiratória']
    }
  };

  // Tela de Login
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input 
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                    placeholder="Ex: admin"
                    autoCapitalize="none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Senha</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input 
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                    placeholder="••••••"
                  />
                </div>
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-bold p-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg mt-2">
                <LogIn className="w-5 h-5" />
                <span>Entrar</span>
              </button>
            </form>
            <div className="text-center flex flex-col items-center gap-2">
              <p className="text-[10px] text-slate-400">Acesso controlado localmente.</p>
              <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${isCloudConnected ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                {isCloudConnected ? <Cloud size={10} /> : <CloudOff size={10} />}
                <span>{isCloudConnected ? 'Banco de Dados Conectado' : 'Modo Offline'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // App Principal
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-slate-800 selection:bg-blue-100">
      
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm">
              <ClipboardCheck size={20} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-slate-800 leading-none">Guia de Plantão</h1>
              <span className="text-[11px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">Suporte Clínico Inteligente</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-end mr-2">
               <span className="text-xs font-bold text-slate-700">{currentUser.name}</span>
               <span className="text-[10px] text-slate-400 uppercase tracking-wider">{currentUser.role}</span>
             </div>
             
             <button
               onClick={() => setShowNotepad(true)}
               className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all relative group"
               title="Meu Caderno"
             >
                <Edit size={20} />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Anotações
                </span>
             </button>

             <button 
               onClick={handleLogout}
               className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
               title="Sair"
             >
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 space-y-8 w-full">
        
        {/* Context & Search Section */}
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(roomConfig).map(([key, config]) => {
              const isActive = activeRoom === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveRoom(key)}
                  className={`
                    relative flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all duration-200
                    ${isActive ? `bg-white ${config.border} shadow-md translate-y-[-2px]` : 'bg-white border-transparent hover:border-gray-200 shadow-sm hover:shadow-md'}
                  `}
                >
                  <div className={`p-3 rounded-xl shrink-0 transition-colors ${isActive ? `${config.light} ${config.text}` : 'bg-gray-100 text-gray-500'}`}>
                    {React.cloneElement(config.icon, { className: "w-6 h-6" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-bold text-base ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>{config.name}</h3>
                      {isActive && <CheckCircle2 size={18} className={config.text} />}
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{config.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {config.examples.slice(0,3).map((ex, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500 truncate max-w-full">{ex}</span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-white p-1.5 rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative flex items-center">
              <Search className="absolute left-4 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateConduct()}
                placeholder="Digite o quadro clínico (ex: Cetoacidose, IAM, Sepse...)"
                className="w-full pl-12 pr-4 py-3.5 bg-transparent border-none outline-none text-slate-800 placeholder:text-gray-400 font-medium"
              />
            </div>
            <button
              onClick={generateConduct}
              disabled={loading}
              className={`
                px-8 py-3.5 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-md
                ${loading ? 'bg-slate-300 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]'}
              `}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Gerar <ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>

          {recentSearches.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider mr-2">
                <History size={14} /> Histórico
              </div>
              {recentSearches.map((search, idx) => (
                <button key={idx} onClick={() => {setActiveRoom(search.room); setSearchQuery(search.query);}} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm">
                  <div className={`w-1.5 h-1.5 rounded-full ${search.room === 'verde' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {search.query}
                </button>
              ))}
            </div>
          )}
          
          {errorMsg && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="shrink-0" size={20} />
              <span className="font-medium text-sm">{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Results Area */}
        {conduct && (
          <div ref={resultsRef} className="animate-in slide-in-from-bottom-8 fade-in duration-500 space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                   <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider text-white shadow-sm ${activeRoom === 'verde' ? 'bg-emerald-500' : 'bg-rose-600'}`}>
                        {conduct.classificacao}
                      </span>
                      {conduct.estadiamento && (
                        <span className="flex items-center gap-1.5 bg-slate-800 text-white px-3 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider shadow-sm">
                          <Tag size={12} /> {conduct.estadiamento}
                        </span>
                      )}
                      {conduct.guideline_referencia && (
                        <span className="text-xs text-slate-500 flex items-center gap-1.5">
                          <BookOpen size={14} /> {conduct.guideline_referencia}
                        </span>
                      )}
                   </div>
                   <h2 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight leading-tight">
                     {conduct.condicao}
                     {conduct.estadiamento && <span className="block md:inline md:ml-3 text-lg md:text-2xl font-normal text-slate-500">{conduct.estadiamento}</span>}
                   </h2>
                </div>
                <button onClick={() => { setConduct(null); setSearchQuery(''); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                  <X size={24} />
                </button>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 text-slate-700 leading-relaxed">
                <div className="flex gap-3">
                  <User className="text-blue-500 shrink-0 mt-1" size={20} />
                  <div>
                    <span className="font-bold text-slate-900 block mb-1">Quadro Clínico Típico {conduct.estadiamento ? `(${conduct.estadiamento})` : ''}</span>
                    {conduct.resumo_clinico}
                  </div>
                </div>
              </div>
            </div>

            {conduct.criterios_gravidade?.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-rose-800 font-bold flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5" /> SINAIS DE ALARME (RED FLAGS)</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {conduct.criterios_gravidade.map((crit, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white/60 p-2.5 rounded-lg border border-rose-100/50">
                      <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                      <span className="text-sm text-rose-800 font-medium leading-snug">{crit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-indigo-50/50 px-5 py-3 border-b border-indigo-50 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-bold text-indigo-900 text-sm uppercase tracking-wide">Avaliação Inicial</h3>
                   </div>
                   <div className="p-5 space-y-5">
                      {conduct.avaliacao_inicial?.sinais_vitais_especificos && (
                        <div>
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Alvos Terapêuticos</span>
                          <div className="flex flex-wrap gap-2">
                            {conduct.avaliacao_inicial.sinais_vitais_especificos.map((s, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100"><Activity size={12} /> {s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(conduct.avaliacao_inicial?.exames_obrigatorios || conduct.avaliacao_inicial?.exames_complementares) && (
                          <div className="space-y-3">
                             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Solicitação de Exames</span>
                             <ul className="space-y-2">
                               {conduct.avaliacao_inicial?.exames_obrigatorios?.map((ex, i) => (
                                 <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" /><span className="font-medium">{ex}</span></li>
                               ))}
                               {conduct.avaliacao_inicial?.exames_complementares?.map((ex, i) => (
                                 <li key={i} className="flex items-start gap-2 text-sm text-slate-500"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" /><span>{ex} (opcional)</span></li>
                               ))}
                             </ul>
                          </div>
                      )}
                   </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-blue-50/50 px-5 py-3 border-b border-blue-50 flex items-center gap-2">
                      <Search className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wide">Achados Típicos</h3>
                   </div>
                   <div className="p-5 space-y-4">
                      {Object.entries(conduct.achados_exames || {}).map(([key, value]) => {
                          if(!value) return null;
                          const map = { ecg: 'ECG', raio_x: 'Imagem', laboratorio: 'Laboratório', outros_exames: 'Outros' };
                          return (
                            <div key={key} className="text-sm">
                              <span className="font-bold text-slate-700 block mb-1">{map[key]}</span>
                              <p className="text-slate-600 leading-snug bg-gray-50 p-3 rounded-lg border border-gray-100">{value}</p>
                            </div>
                          )
                      })}
                      {conduct.apresentacao_tipica && (
                        <div className="pt-4 border-t border-gray-100">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Sinais Físicos</span>
                          <div className="flex flex-wrap gap-1.5">
                            {conduct.apresentacao_tipica.sinais_fisicos?.map((s, i) => (
                              <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                   </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden ring-1 ring-emerald-100">
                   <div className="bg-emerald-50/80 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-700"><Pill className="w-5 h-5" /></div>
                        <h3 className="font-bold text-emerald-900 text-base">Conduta Medicamentosa</h3>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Prescrição</span>
                   </div>
                   <div className="divide-y divide-gray-100">
                      {conduct.tratamento_medicamentoso?.map((med, idx) => (
                        <div key={idx} className="p-6 hover:bg-gray-50 transition-colors group">
                           <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-baseline gap-3">
                                  <h4 className="text-xl font-bold text-slate-800">{med.farmaco}</h4>
                                  {med.linha && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide border border-slate-200">{med.linha}</span>}
                                </div>
                                {med.apresentacao && (
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mt-1 bg-slate-100 px-2 py-1 rounded w-fit"><Package size={12} className="text-slate-400" /><span>{med.apresentacao}</span></div>
                                )}
                                <p className="text-sm text-slate-500 italic mt-1">{med.indicacao}</p>
                              </div>
                              {(med.via_administracao || med.tempo_infusao) && (
                                <div className="flex items-center gap-3 text-xs font-medium text-slate-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm shrink-0">
                                   {med.via_administracao && <span>Via: <b className="text-slate-700">{med.via_administracao}</b></span>}
                                   {med.tempo_infusao && med.tempo_infusao !== 'N/A' && (
                                     <>
                                      <span className="w-px h-3 bg-gray-300" />
                                      <span>Tempo: <b className="text-slate-700">{med.tempo_infusao}</b></span>
                                     </>
                                   )}
                                </div>
                              )}
                           </div>
                           {med.diluicao && (
                             <div className="mb-3 flex items-start gap-3 bg-cyan-50 border border-cyan-100 rounded-xl p-3">
                                <FlaskConical size={18} className="text-cyan-600 mt-0.5 shrink-0" />
                                <div>
                                   <span className="text-[10px] font-bold text-cyan-700 uppercase block mb-0.5">Diluição / Preparo</span>
                                   <p className="text-sm font-medium text-cyan-900">{med.diluicao}</p>
                                </div>
                             </div>
                           )}
                           <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 mb-3 relative">
                              <div className="absolute left-0 top-4 bottom-4 w-1 bg-emerald-400 rounded-r"></div>
                              <p className="text-emerald-950 font-mono text-[15px] font-medium leading-relaxed pl-2">{med.posologia}</p>
                           </div>
                           <div className="grid sm:grid-cols-2 gap-4 text-sm">
                              {med.cuidados && <div className="flex gap-2 text-amber-700"><AlertTriangle size={16} className="shrink-0 mt-0.5" /><span>{med.cuidados}</span></div>}
                              {med.observacoes && <div className="flex gap-2 text-slate-500"><FileText size={16} className="shrink-0 mt-0.5" /><span>{med.observacoes}</span></div>}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                   <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 h-full">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><ArrowRight className="w-4 h-4 text-purple-600" /> Fluxo de Escalonamento</h3>
                      <div className="space-y-4 relative">
                         <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-100" />
                         <StepItem number="1" title="Primeira Linha" content={conduct.escalonamento_terapeutico?.primeira_linha} color="purple" />
                         <StepItem number="2" title="Se Falha Terapêutica" content={conduct.escalonamento_terapeutico?.se_falha} color="amber" />
                         <StepItem number="3" title="Resgate / Avançado" content={conduct.escalonamento_terapeutico?.resgate} color="rose" />
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                         <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"><ClipboardCheck className="w-4 h-4 text-slate-600" /> Medidas Gerais</h3>
                         <ul className="space-y-2">
                            {conduct.medidas_gerais?.map((m, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600"><CheckCircle2 className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" /><span>{m}</span></li>
                            ))}
                         </ul>
                      </div>
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                         <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"><FileText className="w-4 h-4 text-cyan-600" /> Critérios de Desfecho</h3>
                         <div className="space-y-3">
                            {conduct.criterios_alta?.length > 0 && (
                               <div className="bg-green-50 p-3 rounded-xl border border-green-100"><span className="text-[10px] font-bold text-green-800 uppercase block mb-1">Alta Segura</span><p className="text-xs text-green-900 leading-snug">{conduct.criterios_alta.join('. ')}</p></div>
                            )}
                            {conduct.criterios_internacao?.length > 0 && (
                               <div className="bg-amber-50 p-3 rounded-xl border border-amber-100"><span className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Internação</span><p className="text-xs text-amber-900 leading-snug">{conduct.criterios_internacao.join('. ')}</p></div>
                            )}
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 flex gap-4 items-start">
             <ShieldAlert className="text-amber-600 shrink-0 w-6 h-6 mt-1" />
             <div className="space-y-2">
               <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Aviso Legal Importante</h4>
               <p className="text-xs text-amber-900/80 leading-relaxed text-justify">Esta ferramenta utiliza <strong>Inteligência Artificial</strong> para fornecer suporte rápido à decisão clínica. O conteúdo gerado pode conter imprecisões. O uso é estritamente restrito a médicos.</p>
             </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-semibold text-slate-500">&copy; {new Date().getFullYear()} EmergencyCorp. Todos os direitos reservados.</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Emergency Clinical Support System v2.0</p>
          </div>
        </div>
      </footer>

      {/* MODAL DE BLOCO DE NOTAS */}
      {showNotepad && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[80vh] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Edit size={20} /></div>
                 <div>
                    <h3 className="font-bold text-slate-800 leading-none">Meu Caderno de Plantão</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">Anotações de {currentUser?.name}</span>
                      <span className="text-gray-300">•</span>
                      {isCloudConnected ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium"><Cloud size={10} /> Nuvem Ativa</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium"><CloudOff size={10} /> Offline</span>
                      )}
                    </div>
                 </div>
              </div>
              <button onClick={() => setShowNotepad(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 bg-yellow-50 relative">
              <textarea
                className="w-full h-full p-6 resize-none focus:outline-none text-slate-700 leading-relaxed bg-transparent text-lg font-medium font-serif"
                placeholder="Escreva suas anotações pessoais, pendências ou lembretes aqui..."
                value={userNotes}
                onChange={handleNoteChange}
                style={{ backgroundImage: 'linear-gradient(transparent, transparent 31px, #e5e7eb 31px)', backgroundSize: '100% 32px', lineHeight: '32px' }}
              />
            </div>
            <div className="p-3 bg-white border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
               <div className="flex items-center gap-1.5">
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="text-blue-600 animate-spin" />
                      <span className="text-blue-600">Salvando na nuvem...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} className="text-green-600" />
                      <span>{isCloudConnected ? "Salvo na nuvem e localmente" : "Salvo apenas neste dispositivo"}</span>
                    </>
                  )}
               </div>
               <span>{userNotes.length} caracteres</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Components
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