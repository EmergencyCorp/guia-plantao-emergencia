import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, AlertCircle, Search, Clock, Pill, FileText, Loader2, BookOpen, 
  Stethoscope, ClipboardCheck, AlertTriangle, ArrowRight, X, User, 
  CheckCircle2, Thermometer, Syringe, Siren, FlaskConical, Tag, Package,
  ShieldAlert, LogOut, Lock, Shield, History, LogIn, KeyRound, Edit, Save, Cloud, CloudOff, Settings, Info,
  HeartPulse, Microscope, Image as ImageIcon, FileDigit, ScanLine, Wind, Droplet, Timer, Skull, Printer, FilePlus, Calculator,
  Tablets, Syringe as SyringeIcon, Droplets, Pipette, Star, Trash2, SprayCan, CalendarDays, Utensils, Zap, Camera, Upload, Eye,
  Sun, Moon, BedDouble, ClipboardList, UserCheck, HelpCircle, LayoutGrid, ChevronDown
} from 'lucide-react';

// --- IMPORTAÇÕES NOVAS (Conexão Segura e Dados) ---
import { auth, db } from './firebaseConnection'; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'; 
import { MEDICAL_SCORES } from './medicalData'; 

import { 
  doc, setDoc, getDoc, collection, query as firestoreQuery, 
  where, orderBy, getDocs, deleteDoc, onSnapshot 
} from 'firebase/firestore';

// Componente Toggle Switch para Dark Mode
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

const appId = 'emergency-guide-app';

export default function EmergencyGuideApp() {
  // --- ESTADO DE TEMA ---
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme_preference');
    if (savedTheme === 'dark') setIsDarkMode(true);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme_preference', newMode ? 'dark' : 'light');
  };

  // --- ESTADOS DE AUTENTICAÇÃO (SEGUROS) ---
  const [currentUser, setCurrentUser] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  // --- ESTADOS GERAIS DA APLICAÇÃO ---
  const [isSaving, setIsSaving] = useState(false);
  const [activeRoom, setActiveRoom] = useState('verde');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [conduct, setConduct] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const resultsRef = useRef(null);
  const menuRef = useRef(null);

  // --- MODAIS E FERRAMENTAS VISUAIS ---
  const [showNotepad, setShowNotepad] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [selectedPrescriptionItems, setSelectedPrescriptionItems] = useState([]);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showMedicalCalcModal, setShowMedicalCalcModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showBedsideModal, setShowBedsideModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  // --- ESTADOS ESPECÍFICOS ---
  const [calcInputs, setCalcInputs] = useState({ dose: '', peso: '', conc: '', tp_dose: 'mcgmin', tp_conc: 'mgml' });
  const [calcResult, setCalcResult] = useState('---');
  const [selectedScore, setSelectedScore] = useState('chadsvasc');
  const [scoreValues, setScoreValues] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageQuery, setImageQuery] = useState('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState(null);
  const [bedsideAnamnesis, setBedsideAnamnesis] = useState('');
  const [bedsideExams, setBedsideExams] = useState('');
  const [bedsideResult, setBedsideResult] = useState(null);
  const [isGeneratingBedside, setIsGeneratingBedside] = useState(false);
  const [isCurrentConductFavorite, setIsCurrentConductFavorite] = useState(false);

  // --- LISTA DE CATEGORIAS DA SALA VERMELHA ---
  const RED_ROOM_CATEGORIES = ['Dieta', 'Hidratação', 'Drogas Vasoativas', 'Antibiótico', 'Sintomáticos', 'Profilaxias', 'Outros'];

  // --- EFEITO DE LOGIN ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Criamos um nome baseado no email para exibir no topo
        const nameFromEmail = user.email.split('@')[0];
        const formattedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
        
        setCurrentUser({ 
          uid: user.uid, 
          email: user.email, 
          name: formattedName,
          role: 'Médico Autorizado'
        });
        setIsCloudConnected(true);
        loadHistory(user.uid);
        fetchNotesFromCloud(user.uid);
        subscribeToFavorites(user.uid);
      } else {
        setCurrentUser(null);
        setIsCloudConnected(false);
        setConduct(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- LOGIN E LOGOUT ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
    } catch (error) {
      console.error("Erro Login:", error);
      setLoginError("Email ou senha inválidos.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setRecentSearches([]);
    setFavorites([]);
  };

  // --- LÓGICA DE DADOS (FIRESTORE) ---
  const loadHistory = async (uid) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', uid, 'data', 'history');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().searches) {
         setRecentSearches(docSnap.data().searches);
      }
    } catch (e) { console.error(e); }
  };

  const saveToHistory = async (term, room) => {
    if (!currentUser) return;
    const newEntry = { query: term, room, timestamp: new Date().toISOString() };
    const hist = recentSearches.filter(s => s.query.toLowerCase() !== term.toLowerCase());
    const updated = [newEntry, ...hist].slice(0, 10); 
    setRecentSearches(updated);

    try {
      const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'data', 'history');
      await setDoc(docRef, { searches: updated }, { merge: true });
    } catch (error) { console.error("Erro salvar histórico:", error); }
  };

  const fetchNotesFromCloud = async (uid) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', uid, 'data', 'notes');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().content) {
        setUserNotes(docSnap.data().content);
      }
    } catch (error) { console.error("Erro notas:", error); }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (currentUser && userNotes) {
        setIsSaving(true);
        try {
          const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'data', 'notes');
          await setDoc(docRef, { content: userNotes }, { merge: true });
        } catch (error) { console.error("Erro save notas:", error); } 
        finally { setIsSaving(false); }
      }
    }, 1500);
    return () => clearTimeout(delayDebounceFn);
  }, [userNotes, currentUser]);

  const subscribeToFavorites = (uid) => {
    const favoritesRef = collection(db, 'artifacts', appId, 'users', uid, 'conducts');
    const q = firestoreQuery(favoritesRef, where("isFavorite", "==", true));
    return onSnapshot(q, (snapshot) => {
        const favs = [];
        snapshot.forEach((doc) => favs.push({ id: doc.id, ...doc.data() }));
        setFavorites(favs);
    });
  };

  const toggleFavorite = async () => {
    if (!currentUser || !conduct) { showError("Necessário estar online."); return; }
    const docId = `${searchQuery.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${activeRoom}`;
    const newStatus = !isCurrentConductFavorite;
    setIsCurrentConductFavorite(newStatus);

    try {
      const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'conducts', docId);
      if (newStatus) {
          await setDoc(docRef, { 
            query: searchQuery, room: activeRoom, conductData: conduct, 
            isFavorite: true, lastAccessed: new Date().toISOString()
          }, { merge: true });
      } else {
          await setDoc(docRef, { isFavorite: false }, { merge: true });
      }
    } catch (e) { console.error(e); setIsCurrentConductFavorite(!newStatus); }
  };

  // --- GERAÇÃO DE CONDUTA (Mantida a lógica original de conexão) ---
  const generateConduct = async (overrideRoom = null) => {
    if (!searchQuery.trim()) { showError('Digite uma condição clínica.'); return; }
    const targetRoom = overrideRoom || activeRoom;
    if (overrideRoom) setActiveRoom(overrideRoom);

    setLoading(true); setConduct(null); setErrorMsg(''); setIsCurrentConductFavorite(false);

    // Verifica se já é favorito localmente para UI otimista
    if(favorites.some(f => f.query.toLowerCase() === searchQuery.toLowerCase() && f.room === targetRoom)) {
        setIsCurrentConductFavorite(true);
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery, activeRoom: targetRoom })
      });

      if (!response.ok) throw new Error('Erro ao se comunicar com a IA.');
      const parsedConduct = await response.json();
      setConduct(parsedConduct);
      saveToHistory(searchQuery, targetRoom);
      
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);

    } catch (error) {
      console.error(error);
      showError("Erro ao gerar conduta. Tente novamente.");
    } finally { setLoading(false); }
  };

  // --- FUNÇÕES DE AJUDA VISUAL (ICONES E CORES) ---
  const showError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 4000); };
  
  const getVitalIcon = (text) => {
    const t = text.toLowerCase();
    if (t.includes('fc') || t.includes('bpm')) return <HeartPulse size={16} className="text-rose-500" />;
    if (t.includes('pa') || t.includes('mmhg') || t.includes('pam')) return <Activity size={16} className="text-blue-500" />;
    if (t.includes('sat') || t.includes('o2')) return <Droplet size={16} className="text-cyan-500" />;
    if (t.includes('fr') || t.includes('resp')) return <Wind size={16} className="text-teal-500" />;
    return <Activity size={16} className="text-slate-400" />;
  };

  const getMedTypeColor = (type) => {
    const base = isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200';
    if (!type) return base;
    const t = type.toLowerCase();
    if (isDarkMode) {
        if (t.includes('injet')) return 'bg-rose-900/30 text-rose-300 border-rose-800/50';
        if (t.includes('gota') || t.includes('solu') || t.includes('xarope')) return 'bg-blue-900/30 text-blue-300 border-blue-800/50';
        if (t.includes('comp') || t.includes('cap')) return 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50';
        if (t.includes('tópi')) return 'bg-amber-900/30 text-amber-300 border-amber-800/50';
        return base;
    } else {
        if (t.includes('injet')) return 'bg-rose-50 text-rose-700 border-rose-200';
        if (t.includes('gota') || t.includes('solu') || t.includes('xarope')) return 'bg-blue-50 text-blue-700 border-blue-200';
        if (t.includes('comp') || t.includes('cap')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (t.includes('tópi')) return 'bg-amber-50 text-amber-700 border-amber-200';
        return base;
    }
  };

  // --- RENDERIZAÇÃO DE CARTÕES (Visual Original) ---
  const renderMedicationCard = (med, idx) => {
     // Lógica simplificada de renderização visual
     const medType = med.tipo || "Medicamento";
     return (
       <div key={idx} className={`${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200'} rounded-xl border p-5 shadow-sm mb-4 relative overflow-hidden`}>
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isDarkMode ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
          <div className="absolute top-4 right-4">
             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getMedTypeColor(medType)}`}>{medType}</span>
          </div>
          <div className="mb-3 pr-20">
            <h4 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{med.farmaco}</h4>
            <span className={`text-sm italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{med.indicacao}</span>
          </div>
          <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'} rounded-lg p-3 font-mono text-sm border mb-2`}>
            <strong className="block text-xs uppercase mb-1 opacity-70">Posologia:</strong>{med.sugestao_uso || med.dose}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
             {med.diluicao && (<div className={`flex gap-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}><FlaskConical size={16}/><span><strong>Diluição:</strong> {med.diluicao}</span></div>)}
             {med.modo_admin && (<div className={`flex gap-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}><Timer size={16}/><span><strong>Infusão:</strong> {med.modo_admin}</span></div>)}
          </div>
       </div>
     );
  };

  const roomConfig = {
    verde: { name: 'Sala Verde', color: 'emerald', accent: isDarkMode ? 'bg-emerald-600' : 'bg-emerald-500', border: isDarkMode ? 'border-emerald-700' : 'border-emerald-500', text: isDarkMode ? 'text-emerald-300' : 'text-emerald-800', light: isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50', icon: <Stethoscope className="w-5 h-5" />, description: 'Ambulatorial' },
    amarela: { name: 'Sala Amarela', color: 'amber', accent: isDarkMode ? 'bg-amber-600' : 'bg-amber-500', border: isDarkMode ? 'border-amber-700' : 'border-amber-500', text: isDarkMode ? 'text-amber-300' : 'text-amber-800', light: isDarkMode ? 'bg-amber-900/30' : 'bg-amber-50', icon: <BedDouble className="w-5 h-5" />, description: 'Observação' },
    vermelha: { name: 'Sala Vermelha', color: 'rose', accent: isDarkMode ? 'bg-rose-700' : 'bg-rose-600', border: isDarkMode ? 'border-rose-700' : 'border-rose-600', text: isDarkMode ? 'text-rose-300' : 'text-rose-800', light: isDarkMode ? 'bg-rose-900/30' : 'bg-rose-50', icon: <Siren className="w-5 h-5" />, description: 'Emergência' }
  };

  // --- CALCULADORAS ---
  const calcularMl = () => {
    const dose = parseFloat(calcInputs.dose);
    const peso = parseFloat(calcInputs.peso);
    const conc = parseFloat(calcInputs.conc);
    if (isNaN(dose) || isNaN(peso) || isNaN(conc)) return;

    let doseTotalHora = calcInputs.tp_dose.includes('min') ? (dose * peso * 60) : (dose * peso);
    if (calcInputs.tp_dose.includes('mg')) doseTotalHora *= 1000;
    let concPadronizada = calcInputs.tp_conc === 'mgml' ? conc * 1000 : conc;
    const resultado = doseTotalHora / concPadronizada;
    setCalcResult(resultado < 1 ? resultado.toFixed(2) + " ml/h" : resultado.toFixed(1) + " ml/h");
  };
  useEffect(() => { if (showCalculatorModal) calcularMl(); }, [calcInputs]);

  // --- CÁLCULO DE SCORES (Lógica restaurada com importação) ---
  const handleScoreChange = (id, value, type, points) => {
    setScoreValues(prev => ({
      ...prev,
      [id]: type === 'bool' ? (prev[id] ? 0 : points) : parseFloat(value)
    }));
  };
  const calculateScoreResult = () => {
    if (!MEDICAL_SCORES[selectedScore]) return null;
    const scoreDef = MEDICAL_SCORES[selectedScore];
    let total = 0;
    scoreDef.items.forEach(item => {
      let val = scoreValues[item.id];
      if (val === undefined) val = item.type === 'select' ? item.options[0].val : 0;
      total += val;
    });
    return scoreDef.getResult(total);
  };
  useEffect(() => {
    if (showMedicalCalcModal && MEDICAL_SCORES[selectedScore]) {
       const initial = {};
       MEDICAL_SCORES[selectedScore].items.forEach(i => initial[i.id] = i.type === 'select' ? i.options[0].val : 0);
       setScoreValues(initial);
    }
  }, [showMedicalCalcModal, selectedScore]);

  // --- TELA DE LOGIN (COM DESIGN BONITO) ---
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-800'}`}>
        <div className={`rounded-3xl shadow-xl border max-w-md w-full overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-8 text-center text-white relative">
            <div className="absolute top-4 right-4"><ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} /></div>
            <h1 className="text-2xl font-bold mb-1">Lister Guidance</h1>
            <p className="text-blue-200 text-sm font-medium">Acesso Médico Seguro</p>
          </div>
          <div className="p-8 space-y-6">
            {loginError && <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border font-mono ${isDarkMode ? 'bg-red-900/30 text-red-200 border-red-800' : 'bg-red-50 text-red-600 border-red-100'}`}><AlertCircle size={14}/> {loginError}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                  <label className={`text-xs font-bold uppercase ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Email</label>
                  <div className="relative">
                      <User className={`absolute left-3 top-3 w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                      <input type="email" value={emailInput} onChange={(e)=>setEmailInput(e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-900 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`} placeholder="medico@hospital.com" />
                  </div>
              </div>
              <div>
                  <label className={`text-xs font-bold uppercase ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Senha</label>
                  <div className="relative">
                      <KeyRound className={`absolute left-3 top-3 w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                      <input type="password" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-900 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`} placeholder="••••••" />
                  </div>
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-3 bg-blue-900 text-white font-bold p-3.5 rounded-xl hover:bg-blue-800 transition-all shadow-lg mt-2"><LogIn className="w-5 h-5" /> Acessar Sistema</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- TELA PRINCIPAL (APP COMPLETO) ---
  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-100 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <header className={`border-b sticky top-0 z-40 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div><h1 className={`text-lg font-bold leading-none ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Lister Guidance</h1><span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Suporte Médico</span></div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex flex-col items-end mr-2"><span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{currentUser.name}</span><span className="text-[10px] text-slate-400 uppercase">{currentUser.role}</span></div>
             <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

             {/* MENU UNIFICADO DE FERRAMENTAS */}
             <div className="relative" ref={menuRef}>
                <button onClick={() => setShowToolsMenu(!showToolsMenu)} className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold text-sm ${isDarkMode ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                  <LayoutGrid size={18} /><span className="hidden sm:inline">Ferramentas</span><ChevronDown size={14} className={`transition-transform ${showToolsMenu ? 'rotate-180' : ''}`} />
                </button>
                {showToolsMenu && (
                  <div className={`absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                    <div className="p-1 space-y-1">
                      <button onClick={() => { setShowImageModal(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-blue-300 hover:bg-slate-800' : 'text-blue-700 hover:bg-blue-50'}`}><Camera size={16} /> IA Vision</button>
                      <button onClick={() => { setShowBedsideModal(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-indigo-300 hover:bg-slate-800' : 'text-indigo-700 hover:bg-indigo-50'}`}><ClipboardList size={16} /> BedSide Guidance</button>
                      <button onClick={() => { setShowMedicalCalcModal(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-emerald-300 hover:bg-slate-800' : 'text-emerald-700 hover:bg-emerald-50'}`}><FileDigit size={16} /> Scores Médicos</button>
                      <button onClick={() => { setShowCalculatorModal(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-rose-300 hover:bg-slate-800' : 'text-rose-700 hover:bg-rose-50'}`}><Calculator size={16} /> Calc. Infusão</button>
                      <div className={`h-px my-1 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}></div>
                      <button onClick={() => { setShowFavoritesModal(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-yellow-600 hover:bg-yellow-50'}`}><Star size={16} /> Favoritos</button>
                      <button onClick={() => { setShowNotepad(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-gray-50'}`}><Edit size={16} /> Meu Caderno</button>
                    </div>
                  </div>
                )}
             </div>
             <button onClick={handleLogout} className={`p-2 rounded-full ${isDarkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-400 hover:bg-red-50'}`}><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 space-y-8 w-full relative" onClick={() => setShowToolsMenu(false)}>
        {/* BOTÃO FLUTUANTE DE AJUDA */}
        <button onClick={() => setShowHelpModal(true)} className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-xl transition-transform hover:scale-110 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-700 hover:bg-blue-800 text-white'}`}><HelpCircle size={24} /></button>

        {/* SELEÇÃO DE SALAS */}
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(roomConfig).map(([key, config]) => {
              const isActive = activeRoom === key;
              return (
                <button key={key} onClick={() => setActiveRoom(key)} className={`relative flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${isActive ? `${isDarkMode ? 'bg-slate-900' : 'bg-white'} ${config.border} shadow-md ring-1 ring-offset-2 ${isDarkMode ? 'ring-offset-slate-950' : ''} ${config.accent.replace('bg-', 'ring-')}` : `border-transparent shadow-sm ${isDarkMode ? 'bg-slate-900 hover:border-slate-700' : 'bg-white hover:border-gray-200'}`}`}>
                  <div className={`p-3 rounded-xl ${isActive ? `${config.light} ${config.text}` : `${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-gray-100 text-gray-400'}`}`}>{config.icon}</div>
                  <div><h3 className={`font-bold ${isActive ? (isDarkMode ? 'text-slate-100' : 'text-slate-800') : (isDarkMode ? 'text-slate-500' : 'text-slate-500')}`}>{config.name}</h3><p className="text-xs text-slate-400">{config.description}</p></div>
                  {isActive && <CheckCircle2 className={`ml-auto ${config.text}`} size={20} />}
                </button>
              );
            })}
          </div>

          {/* BARRA DE BUSCA PRINCIPAL */}
          <div className={`p-2 rounded-2xl shadow-lg border flex items-center gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
            <Search className="ml-3 text-gray-400" size={20} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateConduct()} placeholder="Digite o quadro clínico (ex: Cetoacidose, IAM...)" className={`flex-1 py-3 bg-transparent outline-none font-medium ${isDarkMode ? 'text-white placeholder-slate-600' : 'text-slate-800'}`} />
            <button onClick={() => generateConduct()} disabled={loading} className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all ${loading ? 'bg-slate-600' : 'bg-blue-900 hover:bg-blue-800'}`}>{loading ? <Loader2 className="animate-spin" /> : <>Gerar <ArrowRight size={18} /></>}</button>
          </div>
          
          {recentSearches.length > 0 && (<div className="flex flex-wrap gap-2 px-1"><div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mr-2"><History size={14} /> Recentes</div>{recentSearches.map((search, idx) => (<button key={idx} onClick={() => {setActiveRoom(search.room); setSearchQuery(search.query);}} className={`flex items-center gap-2 text-xs px-3 py-1 border rounded-full transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-blue-500 hover:text-blue-400 text-slate-300' : 'bg-white border-gray-200 hover:border-blue-300 hover:text-blue-700'}`}><div className={`w-2 h-2 rounded-full shrink-0 ${search.room === 'verde' ? 'bg-emerald-500' : search.room === 'amarela' ? 'bg-amber-500' : 'bg-rose-500'}`} />{search.query}</button>))}</div>)}
          {errorMsg && <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 text-sm font-medium ${isDarkMode ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-50 text-red-700 border-red-200'}`}><AlertCircle size={18} /> {errorMsg}</div>}
        </div>

        {/* RESULTADOS DA CONDUTA */}
        {conduct && (
          <div ref={resultsRef} className="animate-in slide-in-from-bottom-4 fade-in duration-500 space-y-6">
            <div className="flex justify-between items-start">
               <div>
                  <div className="flex flex-wrap gap-2 mb-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${roomConfig[activeRoom].accent.replace('bg-', 'bg-')}`}>{conduct.classificacao}</span>{conduct.estadiamento && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-white">{conduct.estadiamento}</span>}</div>
                  <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{conduct.condicao}</h2>
               </div>
               <div className="flex gap-2">
                 <button onClick={toggleFavorite} className={`p-2 rounded-full transition-colors ${isCurrentConductFavorite ? (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-500') : (isDarkMode ? 'text-slate-600 hover:bg-slate-800 hover:text-yellow-400' : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-400')}`} title="Favoritar"><Star size={24} fill={isCurrentConductFavorite ? "currentColor" : "none"} /></button>
                 <button onClick={() => setConduct(null)} className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-gray-200 text-gray-500'}`}><X size={24}/></button>
               </div>
            </div>

            <div className={`p-6 rounded-2xl shadow-sm border flex gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
               <div className={`p-2 rounded-full h-fit ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><User size={24} /></div>
               <div><h3 className={`font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>Resumo Clínico</h3><p className={`leading-relaxed text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>{conduct.resumo_clinico}</p></div>
            </div>

            {/* SEÇÃO PRINCIPAL DE DADOS MÉDICOS */}
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 space-y-6">
                <div className={`rounded-2xl shadow-sm border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                   <div className={`px-5 py-3 border-b flex items-center gap-2 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}><Activity size={18} className="text-slate-500"/><h3 className={`font-bold text-sm uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Avaliação Inicial</h3></div>
                   <div className="p-5 space-y-5 text-sm">
                      {conduct.avaliacao_inicial?.sinais_vitais_alvos && (<div><span className="text-xs font-bold text-slate-400 uppercase block mb-2">Alvos Terapêuticos</span><div className="grid grid-cols-1 gap-2">{conduct.avaliacao_inicial.sinais_vitais_alvos.map((s,i)=>(<div key={i} className={`p-3 rounded-lg border flex items-center gap-3 ${isDarkMode ? 'bg-indigo-900/20 border-indigo-900/50 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>{getVitalIcon(s)} <span className="font-bold">{s}</span></div>))}</div></div>)}
                      <div className="space-y-3">
                         <div><span className="text-xs font-bold text-rose-600 uppercase block mb-1">Prioridade 1 (Obrigatórios)</span><ul className="space-y-1">{conduct.avaliacao_inicial?.exames_prioridade1?.map((ex,i)=><li key={i} className={`flex gap-2 items-start font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}><div className="mt-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"/>{ex}</li>)}</ul></div>
                      </div>
                   </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="space-y-4">
                   <div className={`flex items-center gap-2 mb-2 px-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}><div className={`p-1.5 rounded ${isDarkMode ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}><Pill size={18}/></div><h3 className="font-bold text-lg">Prescrição e Conduta</h3></div>
                   {activeRoom === 'verde' ? (
                      conduct.tratamento_medicamentoso?.map((med, idx) => renderMedicationCard(med, idx))
                   ) : (
                      <div className="space-y-8">
                         {RED_ROOM_CATEGORIES.map((catName) => {
                            const catItems = conduct.tratamento_medicamentoso?.filter(m => {
                               const mCat = m.categoria || "Outros";
                               return mCat.toLowerCase() === catName.toLowerCase() || (catName === "Outros" && !RED_ROOM_CATEGORIES.slice(0,6).some(c => c.toLowerCase() === mCat.toLowerCase()));
                            });
                            if (!catItems || catItems.length === 0) return null;
                            return (
                               <div key={catName} className="relative">
                                  <h4 className={`flex items-center gap-2 font-bold uppercase text-xs mb-3 pl-1 border-b pb-1 ${isDarkMode ? 'text-rose-300 border-rose-800/50' : 'text-rose-800 border-rose-100'}`}>{catName}</h4>
                                  <div className="grid gap-4">{catItems.map((med, idx) => renderMedicationCard(med, idx))}</div>
                               </div>
                            );
                         })}
                      </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODAIS DE FERRAMENTAS --- */}
      
      {/* MODAL CALCULADORA */}
      {showCalculatorModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-rose-900/30 border-rose-800/50' : 'bg-rose-50 border-rose-100'}`}>
              <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-rose-300' : 'text-rose-800'}`}><Calculator size={20} /> Calculadora de Infusão</h3>
              <button onClick={() => setShowCalculatorModal(false)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-rose-900/50 text-rose-300' : 'hover:bg-rose-100 text-rose-700'}`}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Peso (kg)</label>
                <input type="number" value={calcInputs.peso} onChange={(e) => setCalcInputs({...calcInputs, peso: e.target.value})} className={`w-full p-3 border rounded-xl font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Dose</label>
                <div className="flex gap-2">
                   <input type="number" value={calcInputs.dose} onChange={(e) => setCalcInputs({...calcInputs, dose: e.target.value})} className={`w-1/2 p-3 border rounded-xl font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`} />
                   <select value={calcInputs.tp_dose} onChange={(e) => setCalcInputs({...calcInputs, tp_dose: e.target.value})} className={`w-1/2 border rounded-xl text-xs font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}><option value="mcgmin">mcg/kg/min</option><option value="mgmin">mg/kg/min</option><option value="mcgh">mcg/kg/h</option><option value="mgh">mg/kg/h</option></select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Concentração</label>
                <div className="flex gap-2">
                   <input type="number" value={calcInputs.conc} onChange={(e) => setCalcInputs({...calcInputs, conc: e.target.value})} className={`w-1/2 p-3 border rounded-xl font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`} />
                   <select value={calcInputs.tp_conc} onChange={(e) => setCalcInputs({...calcInputs, tp_conc: e.target.value})} className={`w-1/2 border rounded-xl text-xs font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}><option value="mgml">mg/ml</option><option value="mcgml">mcg/ml</option></select>
                </div>
              </div>
              <div className={`rounded-xl p-6 text-center mt-6 ${isDarkMode ? 'bg-rose-900/20' : 'bg-rose-100'}`}>
                <span className={`text-xs font-bold uppercase mb-1 block ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>Velocidade</span>
                <div className={`text-3xl font-extrabold ${isDarkMode ? 'text-rose-200' : 'text-rose-900'}`}>{calcResult}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SCORES MÉDICOS */}
      {showMedicalCalcModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
            <div className={`w-1/3 border-r flex flex-col ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-gray-50'}`}>
               <div className={`p-4 border-b flex items-center gap-2 ${isDarkMode ? 'border-slate-800 text-emerald-400' : 'border-gray-200 text-emerald-700'}`}><FileDigit size={20} /><h3 className="font-bold">Calculadoras</h3></div>
               <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {Object.entries(MEDICAL_SCORES).map(([key, score]) => (
                     <button key={key} onClick={() => setSelectedScore(key)} className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-all ${selectedScore === key ? (isDarkMode ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-200') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-gray-200')}`}>{score.name}</button>
                  ))}
               </div>
            </div>
            <div className="w-2/3 flex flex-col">
               <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                  <div><h2 className="text-xl font-bold">{MEDICAL_SCORES[selectedScore].name}</h2><p className="text-xs opacity-70">{MEDICAL_SCORES[selectedScore].desc}</p></div>
                  <button onClick={() => setShowMedicalCalcModal(false)} className="p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {MEDICAL_SCORES[selectedScore].items.map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
                       <span className="text-sm font-medium">{item.label}</span>
                       {item.type === 'bool' ? (
                          <button onClick={() => handleScoreChange(item.id, null, 'bool', item.points)} className={`w-12 h-6 rounded-full relative ${scoreValues[item.id] ? 'bg-emerald-500' : (isDarkMode ? 'bg-slate-600' : 'bg-slate-300')}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${scoreValues[item.id] ? 'left-7' : 'left-1'}`} /></button>
                       ) : (
                          <select className={`p-2 rounded-lg text-sm border ${isDarkMode ? 'bg-slate-900 border-slate-600' : 'bg-gray-50 border-gray-200'}`} onChange={(e) => handleScoreChange(item.id, e.target.value, 'select', 0)} value={scoreValues[item.id]}>{item.options.map((opt, i) => <option key={i} value={opt.val}>{opt.text}</option>)}</select>
                       )}
                    </div>
                  ))}
               </div>
               <div className={`p-6 border-t ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                  {(() => {
                     const result = calculateScoreResult();
                     return result ? (<div className="flex justify-between"><div><span className="text-xs uppercase font-bold">Resultado</span><div className="text-3xl font-bold text-emerald-500">{result.points}</div></div><div className="text-right text-xs max-w-xs">{result.conduta}</div></div>) : null;
                  })()}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FAVORITOS */}
      {showFavoritesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-yellow-900/20 border-yellow-800/30' : 'bg-yellow-50 border-yellow-100'}`}>
              <div className={`flex items-center gap-2 font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-800'}`}><Star size={20} fill="currentColor" /> Favoritos</div>
              <button onClick={() => setShowFavoritesModal(false)}><X size={20} /></button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {favorites.length === 0 ? <div className="text-center p-8 text-slate-400">Sem favoritos.</div> : favorites.map((fav) => (
                <div key={fav.id} className={`p-3 rounded-lg border shadow-sm flex items-center justify-between mb-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                   <button onClick={() => { setConduct(fav.conductData); setSearchQuery(fav.query); setActiveRoom(fav.room); setShowFavoritesModal(false); }} className="flex-1 text-left font-bold text-sm">{fav.query}</button>
                   <button onClick={() => { deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'conducts', fav.id)); }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTEPAD */}
      {showNotepad && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
             <div className="p-4 border-b flex justify-between"><h3 className="font-bold">Meu Caderno</h3><button onClick={() => setShowNotepad(false)}><X size={20}/></button></div>
             <div className={`flex-1 ${isDarkMode ? 'bg-slate-800' : 'bg-yellow-50'}`}><textarea className="w-full h-full p-6 resize-none bg-transparent outline-none font-serif text-lg leading-loose" value={userNotes} onChange={(e) => setUserNotes(e.target.value)} /></div>
             <div className="p-2 text-center text-xs text-gray-400">{isSaving ? "Salvando..." : "Salvo."}</div>
          </div>
        </div>
      )}

    </div>
  );
}
