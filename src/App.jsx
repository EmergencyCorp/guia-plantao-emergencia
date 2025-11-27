// Local: src/App.jsx

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

// --- IMPORTAÇÕES NOVAS (NOSSOS ARQUIVOS) ---
import { auth, db } from './firebaseConnection'; // Importa a conexão segura
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'; // Importa login seguro
import { MEDICAL_SCORES } from './medicalData'; // Importa os dados médicos

import { 
  doc, setDoc, getDoc, collection, query as firestoreQuery, 
  where, orderBy, getDocs, deleteDoc, onSnapshot 
} from 'firebase/firestore';

// Componente Toggle Switch para Dark Mode (Mantido aqui por simplicidade)
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

const appId = 'emergency-guide-app'; // ID fixo do app

export default function EmergencyGuideApp() {
  // --- ESTADO DE TEMA (DARK MODE) ---
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

  // --- ESTADOS DE AUTENTICAÇÃO (AGORA SEGUROS) ---
  const [currentUser, setCurrentUser] = useState(null);
  const [emailInput, setEmailInput] = useState(''); // Mudamos de username para email
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  // --- ESTADOS GERAIS ---
  const [isSaving, setIsSaving] = useState(false);
  const [activeRoom, setActiveRoom] = useState('verde');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [conduct, setConduct] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const resultsRef = useRef(null);

  // --- MODAIS E FERRAMENTAS ---
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

  // --- ESTADOS ESPECÍFICOS DAS FERRAMENTAS ---
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

  // --- EFEITO DE LOGIN (MONITORA O USUÁRIO) ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({ 
          uid: user.uid, 
          email: user.email, 
          name: user.email.split('@')[0] // Usa o começo do email como nome provisório
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

  // --- FUNÇÕES DE LOGIN SEGURO ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      // O useEffect acima vai detectar o login automaticamente
    } catch (error) {
      console.error("Erro Login:", error);
      if(error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
         setLoginError("Email ou senha incorretos.");
      } else {
         setLoginError("Erro ao fazer login. Verifique sua conexão.");
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('emergency_app_user');
  };

  // --- FUNÇÕES DE SINCRONIZAÇÃO (ADAPTADAS PARA UID) ---
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

  // Salvamento automático de notas (Debounce)
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

  // --- FAVORITOS ---
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
    if (!currentUser || !conduct) return;
    const docId = `${searchQuery.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${activeRoom}`;
    const newStatus = !isCurrentConductFavorite;
    setIsCurrentConductFavorite(newStatus); // Optimistic UI

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

  // --- GERAÇÃO DE CONDUTA (Mantida igual, apenas usando Auth segura) ---
  const generateConduct = async (overrideRoom = null) => {
    if (!searchQuery.trim()) { showError('Digite uma condição clínica.'); return; }
    const targetRoom = overrideRoom || activeRoom;
    if (overrideRoom) setActiveRoom(overrideRoom);

    setLoading(true); setConduct(null); setErrorMsg(''); setIsCurrentConductFavorite(false);

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

      // Verifica se já é favorito
      if(favorites.some(f => f.query.toLowerCase() === searchQuery.toLowerCase() && f.room === targetRoom)) {
        setIsCurrentConductFavorite(true);
      }

    } catch (error) {
      console.error(error);
      showError("Erro ao gerar conduta. Tente novamente.");
    } finally { setLoading(false); }
  };

  // --- CALCULADORA DE INFUSÃO ---
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

  // --- OUTRAS FUNÇÕES AUXILIARES ---
  const showError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 4000); };
  const getVitalIcon = (text) => {
     if (text.toLowerCase().includes('fc')) return <HeartPulse size={16} className="text-rose-500" />;
     if (text.toLowerCase().includes('pa')) return <Activity size={16} className="text-blue-500" />;
     return <Activity size={16} className="text-slate-400" />;
  };

  // --- TELA DE LOGIN ---
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-800'}`}>
        <div className={`rounded-3xl shadow-xl border max-w-md w-full overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-8 text-center text-white relative">
             <div className="absolute top-4 right-4"><ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} /></div>
             <h1 className="text-2xl font-bold mb-1">Lister Guidance</h1>
             <p className="text-blue-200 text-sm font-medium">Acesso Seguro</p>
          </div>
          <div className="p-8 space-y-6">
            {loginError && <div className="p-3 rounded bg-red-100 text-red-700 text-xs border border-red-200">{loginError}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                  <label className="text-xs font-bold uppercase ml-1 text-slate-500">Email</label>
                  <input type="email" value={emailInput} onChange={(e)=>setEmailInput(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="seu@email.com" required />
              </div>
              <div>
                  <label className="text-xs font-bold uppercase ml-1 text-slate-500">Senha</label>
                  <input type="password" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="••••••" required />
              </div>
              <button type="submit" className="w-full bg-blue-900 text-white font-bold p-3.5 rounded-xl hover:bg-blue-800 shadow-lg">Entrar</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- TELA PRINCIPAL (APLICAÇÃO) ---
  return (
    <div className={`min-h-screen flex flex-col font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* HEADER */}
      <header className={`border-b sticky top-0 z-40 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2"><h1 className="font-bold text-lg">Lister Guidance</h1></div>
          <div className="flex items-center gap-3">
             <span className="text-xs hidden sm:block">{currentUser.email}</span>
             <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
             <button onClick={handleLogout} className="text-red-400 p-2"><LogOut size={20}/></button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 space-y-8 w-full">
         {/* BARRA DE BUSCA */}
         <div className={`p-2 rounded-2xl shadow-lg border flex items-center gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
            <Search className="ml-3 text-gray-400" size={20} />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && generateConduct()} 
              placeholder="Digite o caso clínico (ex: IAM, Sepse...)" 
              className="flex-1 py-3 bg-transparent outline-none font-medium" 
            />
            <button onClick={() => generateConduct()} disabled={loading} className="px-6 py-3 rounded-xl font-bold text-white bg-blue-900 hover:bg-blue-800 flex items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={18} />}
            </button>
         </div>
         
         {errorMsg && <div className="p-3 bg-red-100 text-red-700 rounded-xl text-sm border border-red-200">{errorMsg}</div>}

         {/* RESULTADOS DA CONDUTA */}
         {conduct && (
           <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-start">
                 <h2 className="text-3xl font-bold">{conduct.condicao}</h2>
                 <button onClick={toggleFavorite} className={`p-2 rounded-full ${isCurrentConductFavorite ? 'text-yellow-500' : 'text-gray-400'}`}><Star fill="currentColor" /></button>
              </div>
              
              <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                 <h3 className="font-bold mb-2">Resumo Clínico</h3>
                 <p className="text-sm leading-relaxed opacity-80">{conduct.resumo_clinico}</p>
              </div>

              {/* Exibição básica dos medicamentos (Simplificado para o exemplo) */}
              <div className="space-y-4">
                 <h3 className="font-bold flex items-center gap-2"><Pill size={18}/> Prescrição Sugerida</h3>
                 {conduct.tratamento_medicamentoso?.map((med, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                       <h4 className="font-bold text-lg">{med.farmaco}</h4>
                       <p className="text-sm opacity-70">{med.dose || med.sugestao_uso}</p>
                       <div className="mt-2 text-xs flex gap-3 opacity-60">
                          {med.via && <span>Via: {med.via}</span>}
                          {med.diluicao && <span>Diluição: {med.diluicao}</span>}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
         )}
      </main>

      {/* --- MODAIS DE FERRAMENTAS --- */}
      {/* Calculadora (Exemplo) */}
      {showCalculatorModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className={`w-full max-w-md rounded-2xl p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="flex justify-between mb-4"><h3 className="font-bold">Calculadora</h3><button onClick={()=>setShowCalculatorModal(false)}><X/></button></div>
              <div className="space-y-4">
                 <input type="number" placeholder="Peso (kg)" value={calcInputs.peso} onChange={e => setCalcInputs({...calcInputs, peso: e.target.value})} className="w-full p-3 border rounded" />
                 <input type="number" placeholder="Dose" value={calcInputs.dose} onChange={e => setCalcInputs({...calcInputs, dose: e.target.value})} className="w-full p-3 border rounded" />
                 <div className="text-center font-bold text-2xl p-4 bg-blue-100 text-blue-900 rounded">{calcResult}</div>
              </div>
           </div>
        </div>
      )}
      
      {/* Botão flutuante para abrir menu de ferramentas (como Scores, Calculadora) */}
      <button onClick={() => setShowCalculatorModal(true)} className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl z-40">
        <Calculator size={24} />
      </button>

    </div>
  );
}
