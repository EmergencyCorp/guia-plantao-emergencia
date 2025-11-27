// Arquivo: src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, AlertCircle, Search, Loader2, BookOpen, Stethoscope, 
  AlertTriangle, ArrowRight, X, User, CheckCircle2, Siren, ShieldAlert, 
  LogOut, History, Cloud, CloudOff, HeartPulse, Microscope, Image as ImageIcon, 
  Wind, Droplet, Skull, Printer, Calculator, Star, Utensils, Zap, Camera, 
  BedDouble, ClipboardList, Edit, LayoutGrid, ChevronDown, FileText, Droplets,
  Pill, HelpCircle, UserCheck, Lock
} from 'lucide-react';

// --- CONFIG & COMPONENTS ---
import { auth, db, firebaseConfig, googleProvider } from './firebaseClient'; 
import ThemeToggle from './components/ThemeToggle';
import LoginScreen from './components/LoginScreen';
import DisclaimerScreen from './components/DisclaimerScreen';
import MedicationCard from './components/MedicationCard';

// --- MODALS ---
import InfusionCalculator from './components/modals/InfusionCalculator';
import ImageAnalysisModal from './components/modals/ImageAnalysisModal';
import BedsideModal from './components/modals/BedsideModal';
import PrescriptionModal from './components/modals/PrescriptionModal';
import NotepadModal from './components/modals/NotepadModal';
import FavoritesModal from './components/modals/FavoritesModal';
import HelpModal from './components/modals/HelpModal';
import MedicalScoresModal from './components/modals/MedicalScoresModal';
import QuickPrescriptionsModal from './components/modals/QuickPrescriptionsModal';
import PhysicalExamModal from './components/modals/PhysicalExamModal';

// --- FIREBASE IMPORTS ---
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query as firestoreQuery, where, orderBy, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';

const appId = (typeof __app_id !== 'undefined') ? __app_id : 'emergency-guide-app';

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center text-red-600 bg-red-50"><h1 className="text-2xl font-bold">Ops! Erro crítico.</h1><p className="mt-2 text-sm">{this.state.error?.toString()}</p><button onClick={()=>window.location.reload()} className="mt-6 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700">Recarregar Aplicação</button></div>;
    return this.props.children; 
  }
}

function EmergencyGuideAppContent() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState(null); // 'pending', 'approved', 'rejected', null

  // App States
  const [activeRoom, setActiveRoom] = useState('verde');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [conduct, setConduct] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const resultsRef = useRef(null);

  // Modals
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showNotepad, setShowNotepad] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showBedsideModal, setShowBedsideModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showScoresModal, setShowScoresModal] = useState(false);
  const [showQuickPrescriptions, setShowQuickPrescriptions] = useState(false);
  const [showPhysicalExam, setShowPhysicalExam] = useState(false);

  const [userNotes, setUserNotes] = useState('');
  const [selectedPrescriptionItems, setSelectedPrescriptionItems] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null); 
  const [imageQuery, setImageQuery] = useState('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState(null);
  const [bedsideAnamnesis, setBedsideAnamnesis] = useState('');
  const [bedsideExams, setBedsideExams] = useState('');
  const [bedsideResult, setBedsideResult] = useState(null);
  const [isGeneratingBedside, setIsGeneratingBedside] = useState(false);
  const [isCurrentConductFavorite, setIsCurrentConductFavorite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- INIT ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme_preference');
    if (savedTheme === 'dark') setIsDarkMode(true);
    if (localStorage.getItem('terms_accepted_v1') === 'true') setHasAcceptedTerms(true);
    if (firebaseConfig && firebaseConfig.apiKey) setIsCloudConnected(true);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme_preference', newMode ? 'dark' : 'light');
  };

  // --- AUTH LISTENER ---
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          
          if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.status === 'approved') {
              setCurrentUser({ ...userData, uid: user.uid, email: user.email });
              setApprovalStatus('approved');
              loadHistory(user.uid);
              fetchNotesFromCloud(user.uid);
            } else {
              setApprovalStatus(userData.status || 'pending');
              setCurrentUser(null);
            }
          } else {
            await setDoc(userDocRef, {
              name: user.displayName || 'Usuário',
              email: user.email,
              status: 'pending',
              role: 'user',
              createdAt: new Date().toISOString()
            }, { merge: true });
            setApprovalStatus('pending');
            setCurrentUser(null);
          }
        } catch (e) {
          console.error("Erro ao buscar perfil:", e);
          setLoginError("Erro ao verificar permissões.");
        }
      } else {
        setCurrentUser(null);
        setApprovalStatus(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- LOGIN HANDLERS ---
  const handleEmailLogin = async (email, password) => {
    setAuthLoading(true); setLoginError('');
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (error) { setLoginError("Email ou senha incorretos."); } 
    finally { setAuthLoading(false); }
  };

  const handleSignUp = async (email, password, fullName, crm) => {
    setAuthLoading(true); setLoginError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'artifacts', appId, 'users', userCredential.user.uid), {
        name: fullName, crm: crm, email: email, status: 'pending', role: 'user', createdAt: new Date().toISOString()
      });
    } catch (error) { setLoginError("Erro ao criar conta."); } 
    finally { setAuthLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true); setLoginError('');
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { setLoginError("Erro no login com Google."); } 
    finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    await signOut(auth); setCurrentUser(null); setConduct(null); setFavorites([]);
  };

  // --- HELPERS ---
  const showError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 4000); };
  const getConductDocId = (query, room) => `${query.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${room}`;
  
  const getVitalIcon = (text) => {
    const t = text.toLowerCase();
    if (t.includes('fc') || t.includes('bpm')) return <HeartPulse size={16} className="text-rose-500" />;
    if (t.includes('pa') || t.includes('mmhg') || t.includes('pam')) return <Activity size={16} className="text-blue-500" />;
    if (t.includes('sat') || t.includes('o2')) return <Droplet size={16} className="text-cyan-500" />;
    if (t.includes('fr') || t.includes('resp')) return <Wind size={16} className="text-teal-500" />;
    return <Activity size={16} className="text-slate-400" />;
  };

  // --- DATA SYNC ---
  const loadHistory = async (uid) => {
    if (!db) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'history', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().searches) setRecentSearches(docSnap.data().searches);
    } catch (e) {}
  };

  const saveToHistory = async (term, room) => {
    if (!currentUser || !db) return;
    const newEntry = { query: term, room, timestamp: new Date().toISOString() };
    const updated = [newEntry, ...recentSearches.filter(s => s.query.toLowerCase() !== term.toLowerCase())].slice(0, 10);
    setRecentSearches(updated);
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'history', currentUser.uid), { searches: updated }, { merge: true }); } catch (e) {}
  };

  const fetchNotesFromCloud = async (uid) => {
    if (!db) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'notes', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setUserNotes(docSnap.data().content || '');
    } catch (e) {}
  };

  useEffect(() => { 
    if (!currentUser || !db) return;
    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', currentUser.uid), { content: userNotes, lastUpdated: new Date().toISOString() }, { merge: true }); } 
      finally { setIsSaving(false); }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [userNotes, currentUser]);

  const handleNoteChange = (e) => setUserNotes(e.target.value);

  // --- CORE LOGIC ---
  const toggleFavorite = async () => {
    if (!currentUser || !conduct) { showError("Necessário estar online."); return; }
    const newStatus = !isCurrentConductFavorite;
    setIsCurrentConductFavorite(newStatus);
    try {
      const docId = getConductDocId(searchQuery, activeRoom);
      const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'conducts', docId);
      await setDoc(docRef, { query: searchQuery, room: activeRoom, conductData: conduct, isFavorite: newStatus, lastAccessed: new Date().toISOString() }, { merge: true });
    } catch (error) { setIsCurrentConductFavorite(!newStatus); showError("Erro ao favoritar."); }
  };

  const removeFavoriteFromList = async (docId) => {
      if (!currentUser) return;
      try {
          const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'conducts', docId);
          await setDoc(docRef, { isFavorite: false }, { merge: true });
      } catch (e) { console.error(e); }
  };

  const loadFavoriteConduct = (fav) => {
      setConduct(fav.conductData); setSearchQuery(fav.query); setActiveRoom(fav.room);
      setShowFavoritesModal(false); setIsCurrentConductFavorite(true);
  };

  const generateConduct = async (overrideRoom = null) => {
    if (!searchQuery.trim()) { showError('Digite uma condição clínica.'); return; }
    const targetRoom = overrideRoom || activeRoom;
    setLoading(true); setConduct(null); setErrorMsg(''); setIsCurrentConductFavorite(false);
    if (overrideRoom) setActiveRoom(overrideRoom);

    const docId = getConductDocId(searchQuery, targetRoom);
    
    // Check Cache
    if (currentUser && db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'conducts', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setConduct(data.conductData); setIsCurrentConductFavorite(data.isFavorite || false);
          setLoading(false); saveToHistory(searchQuery, targetRoom);
          return;
        }
      } catch (e) {}
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery, activeRoom: targetRoom })
      });
      if (!response.ok) throw new Error('Erro IA.');
      const parsedConduct = await response.json();
      setConduct(parsedConduct);
      
      if (currentUser && db) {
        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'conducts', docId);
        await setDoc(docRef, { query: searchQuery, room: targetRoom, conductData: parsedConduct, isFavorite: false, lastAccessed: new Date().toISOString() });
      }
      saveToHistory(searchQuery, targetRoom);
    } catch (error) { showError("Erro ao gerar conduta."); } finally { setLoading(false); }
  };

  // --- OTHER HANDLERS ---
  const togglePrescriptionItem = (med) => {
    if (activeRoom !== 'verde' || !med.receita) return;
    setSelectedPrescriptionItems(prev => {
      const itemId = med.farmaco + (med.receita?.nome_comercial || "");
      const exists = prev.find(item => (item.farmaco + (item.receita?.nome_comercial || "")) === itemId);
      if (exists) return prev.filter(item => (item.farmaco + (item.receita?.nome_comercial || "")) !== itemId);
      return [...prev, { ...med, dias_tratamento: med.receita.dias_sugeridos || 5 }];
    });
  };

  const updateItemDays = (id, days) => {
    const newItems = [...selectedPrescriptionItems];
    const index = newItems.findIndex(item => (item.farmaco + (item.receita?.nome_comercial || "")) === id);
    if (index !== -1) {
      newItems[index].dias_tratamento = days;
      const item = newItems[index];
      if (item.receita?.calculo_qnt?.frequencia_diaria && days > 0) {
        const total = Math.ceil(item.receita.calculo_qnt.frequencia_diaria * days);
        item.receita.quantidade = `${total} ${item.receita.calculo_qnt.unidade || 'unidades'}`;
      }
      setSelectedPrescriptionItems(newItems);
    }
  };
  
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setSelectedImage(reader.result); setImageAnalysisResult(null); };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage || !imageQuery.trim()) { showError("Selecione imagem e pergunta."); return; }
    setIsAnalyzingImage(true); setImageAnalysisResult(null);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: selectedImage, prompt: imageQuery })
      });
      if (!response.ok) throw new Error('Erro ao analisar.');
      const data = await response.json();
      let finalResult = data.analysis;
      if (typeof finalResult === 'string' && finalResult.trim().startsWith('{')) {
         try { const p = JSON.parse(finalResult); finalResult = p.analise_ecg || p.analysis || p; } catch(e){}
      }
      setImageAnalysisResult(finalResult);
    } catch (error) { showError("Falha na análise."); } finally { setIsAnalyzingImage(false); }
  };

  const generateBedsideConduct = async () => {
    if (!bedsideAnamnesis.trim()) { showError('Preencha a anamnese.'); return; }
    setIsGeneratingBedside(true); setBedsideResult(null);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bedside', anamnesis: bedsideAnamnesis, exams: bedsideExams, searchQuery: 'Bedside', activeRoom: 'bedside' })
      });
      if (!response.ok) throw new Error('Erro Bedside.');
      const data = await response.json();
      setBedsideResult(data);
    } catch (error) { showError("Erro ao processar."); } finally { setIsGeneratingBedside(false); }
  };

  const roomConfig = {
    verde: { name: 'Sala Verde', color: 'emerald', accent: isDarkMode ? 'bg-emerald-600' : 'bg-emerald-500', border: isDarkMode ? 'border-emerald-700' : 'border-emerald-500', text: isDarkMode ? 'text-emerald-300' : 'text-emerald-800', light: isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50', icon: <Stethoscope className="w-5 h-5" />, description: 'Ambulatorial / Baixa Complexidade' },
    amarela: { name: 'Sala Amarela', color: 'amber', accent: isDarkMode ? 'bg-amber-600' : 'bg-amber-500', border: isDarkMode ? 'border-amber-700' : 'border-amber-500', text: isDarkMode ? 'text-amber-300' : 'text-amber-800', light: isDarkMode ? 'bg-amber-900/30' : 'bg-amber-50', icon: <BedDouble className="w-5 h-5" />, description: 'Observação / Média Complexidade' },
    vermelha: { name: 'Sala Vermelha', color: 'rose', accent: isDarkMode ? 'bg-rose-700' : 'bg-rose-600', border: isDarkMode ? 'border-rose-700' : 'border-rose-600', text: isDarkMode ? 'text-rose-300' : 'text-rose-800', light: isDarkMode ? 'bg-rose-900/30' : 'bg-rose-50', icon: <Siren className="w-5 h-5" />, description: 'Emergência / Risco de Vida' }
  };
  const RED_ROOM_CATEGORIES = ['Dieta', 'Hidratação', 'Drogas Vasoativas', 'Antibiótico', 'Sintomáticos', 'Profilaxias', 'Outros'];

  // --- VIEWS ---
  if (!hasAcceptedTerms) {
    return <DisclaimerScreen onAccept={() => { setHasAcceptedTerms(true); localStorage.setItem('terms_accepted_v1', 'true'); }} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />;
  }

  if (!currentUser && approvalStatus !== 'pending' && approvalStatus !== 'rejected') {
    return <LoginScreen isDarkMode={isDarkMode} toggleTheme={toggleTheme} loginError={loginError} handleEmailLogin={handleEmailLogin} handleGoogleLogin={handleGoogleLogin} handleSignUp={handleSignUp} configStatus={configStatus} isCloudConnected={isCloudConnected} isLoading={authLoading} />;
  }

  if (approvalStatus === 'pending') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-800'}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl shadow-xl text-center border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
          <div className="bg-yellow-100 text-yellow-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32} /></div>
          <h2 className="text-2xl font-bold mb-2">Acesso em Análise</h2>
          <p className="text-sm mb-6 opacity-80">Seu cadastro foi realizado e está aguardando aprovação do administrador.</p>
          <button onClick={handleLogout} className="text-blue-600 hover:underline text-sm">Voltar</button>
        </div>
      </div>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-100 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <header className={`border-b sticky top-0 z-40 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <img src={isDarkMode ? "https://i.ibb.co/d0W4s2yH/logobranco.png" : "https://i.ibb.co/vCp5pXZP/logopreto.png"} alt="Logo" className="h-12 w-auto object-contain" />
             <div><h1 className={`text-lg font-bold leading-none ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Lister Guidance</h1><span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Suporte Médico</span></div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex flex-col items-end mr-2"><span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{currentUser.name}</span><span className="text-[10px] text-slate-400 uppercase">Médico(a)</span></div>
             <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
             <div className="relative">
                <button onClick={() => setShowToolsMenu(!showToolsMenu)} className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold text-sm ${isDarkMode ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                  <LayoutGrid size={18} /><span className="hidden sm:inline">Ferramentas</span><ChevronDown size={14} className={`transition-transform ${showToolsMenu ? 'rotate-180' : ''}`} />
                </button>
                {showToolsMenu && (
                  <div className={`absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                    <div className="p-1 space-y-1">
                      <button onClick={() => { setShowImageModal(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-blue-300 hover:bg-slate-800' : 'text-blue-700 hover:bg-blue-50'}`}><Camera size={16} /> IA Vision</button>
                      <button onClick={() => { setShowBedsideModal(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-indigo-300 hover:bg-slate-800' : 'text-indigo-700 hover:bg-indigo-50'}`}><ClipboardList size={16} /> BedSide Guidance</button>
                      <button onClick={() => { setShowQuickPrescriptions(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-teal-300 hover:bg-slate-800' : 'text-teal-700 hover:bg-teal-50'}`}><FileText size={16} /> Acesso Rápido Receitas</button>
                      <button onClick={() => { setShowScoresModal(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-emerald-300 hover:bg-slate-800' : 'text-emerald-700 hover:bg-emerald-50'}`}><Activity size={16} /> Scores Médicos</button>
                      <button onClick={() => { setShowCalculatorModal(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-rose-300 hover:bg-slate-800' : 'text-rose-700 hover:bg-rose-50'}`}><Calculator size={16} /> Calc. Infusão</button>
                      <div className={`h-px my-1 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}></div>
                      <button onClick={() => { setShowFavoritesModal(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-yellow-600 hover:bg-yellow-50'}`}><Star size={16} /> Favoritos</button>
                      <button onClick={() => { setShowNotepad(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-gray-50'}`}><Edit size={16} /> Meu Caderno</button>
                      <button onClick={() => { setShowPhysicalExam(true); setShowToolsMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${isDarkMode ? 'text-sky-300 hover:bg-slate-800' : 'text-sky-600 hover:bg-sky-50'}`}><UserCheck size={16} /> Exame Físico Padrão</button>
                    </div>
                  </div>
                )}
             </div>
             <button onClick={() => setShowHelpModal(true)} className={`p-2 rounded-full ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-gray-100'}`}><HelpCircle size={20} /></button>
             <button onClick={handleLogout} className={`p-2 rounded-full ${isDarkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-400 hover:bg-red-50'}`}><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 space-y-8 w-full relative" onClick={() => setShowToolsMenu(false)}>
        {activeRoom === 'verde' && selectedPrescriptionItems.length > 0 && (
          <button onClick={() => setShowPrescriptionModal(true)} className="fixed bottom-24 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-full shadow-xl flex items-center gap-3 font-bold transition-all animate-in slide-in-from-bottom-4"><Printer size={24} /> Gerar Receita ({selectedPrescriptionItems.length})</button>
        )}

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

          {(activeRoom === 'vermelha' || activeRoom === 'amarela') && (
             <div className="flex justify-center"><button onClick={() => setShowCalculatorModal(true)} className={`px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-colors border ${isDarkMode ? 'bg-rose-900/30 text-rose-300 border-rose-800 hover:bg-rose-900/50' : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300'}`}><Calculator size={16}/> Calculadora de Infusão</button></div>
          )}

          <div className={`p-2 rounded-2xl shadow-lg border flex items-center gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
            <Search className="ml-3 text-gray-400" size={20} />
            <input id="search-input" name="search" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateConduct()} placeholder="Digite o quadro clínico (ex: Cetoacidose, IAM...)" className={`flex-1 py-3 bg-transparent outline-none font-medium ${isDarkMode ? 'text-white placeholder-slate-600' : 'text-slate-800'}`} />
            <button aria-label="Gerar Conduta" onClick={() => generateConduct()} disabled={loading} className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all ${loading ? 'bg-slate-600' : 'bg-blue-900 hover:bg-blue-800'}`}>{loading ? <Loader2 className="animate-spin" /> : <>Gerar <ArrowRight size={18} /></>}</button>
          </div>

          {recentSearches.length > 0 && (<div className="flex flex-wrap gap-2 px-1"><div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mr-2"><History size={14} /> Recentes</div>{recentSearches.map((search, idx) => (<button key={idx} onClick={() => {setActiveRoom(search.room); setSearchQuery(search.query);}} className={`flex items-center gap-2 text-xs px-3 py-1 border rounded-full transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-blue-500 hover:text-blue-400 text-slate-300' : 'bg-white border-gray-200 hover:border-blue-300 hover:text-blue-700'}`}><div className={`w-2 h-2 rounded-full shrink-0 ${search.room === 'verde' ? 'bg-emerald-500' : search.room === 'amarela' ? 'bg-amber-500' : 'bg-rose-500'}`} />{search.query}</button>))}</div>)}
          {errorMsg && <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 text-sm font-medium ${isDarkMode ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-50 text-red-700 border-red-200'}`}><AlertCircle size={18} /> {errorMsg}</div>}
        </div>

        {conduct && (
          <div ref={resultsRef} className="animate-in slide-in-from-bottom-4 fade-in duration-500 space-y-6">
            {activeRoom === 'verde' && (
              <div className={`border-l-4 border-amber-500 p-4 rounded-r-xl flex items-center justify-between gap-4 ${isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-3"><div className={`p-2 rounded-full ${isDarkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'}`}><AlertTriangle size={20} /></div><div><h4 className={`text-sm font-bold ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>Caso mais grave que o esperado?</h4><p className={`text-xs ${isDarkMode ? 'text-amber-400/70' : 'text-amber-700'}`}>Gere uma conduta de média complexidade.</p></div></div>
                <button onClick={() => generateConduct('amarela')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm hover:shadow-md flex items-center gap-2 ${isDarkMode ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>Transferir p/ Observação <ArrowRight size={14} /></button>
              </div>
            )}

            <div className="flex justify-between items-start">
               <div>
                  <div className="flex flex-wrap gap-2 mb-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${roomConfig[activeRoom].accent.replace('bg-', 'bg-')}`}>{conduct.classificacao}</span>{conduct.estadiamento && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-white">{conduct.estadiamento}</span>}</div>
                  <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{conduct.condicao}</h2>
                  {conduct.guideline_referencia && (<p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><BookOpen size={12} /> Fonte: <span className="font-medium">{conduct.guideline_referencia}</span></p>)}
               </div>
               <div className="flex gap-2">
                 <button onClick={toggleFavorite} className={`p-2 rounded-full transition-colors ${isCurrentConductFavorite ? (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-500') : (isDarkMode ? 'text-slate-600 hover:bg-slate-800 hover:text-yellow-400' : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-400')}`} title="Favoritar"><Star size={24} fill={isCurrentConductFavorite ? "currentColor" : "none"} /></button>
                 <button onClick={() => setConduct(null)} className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-gray-200 text-gray-500'}`}><X size={24}/></button>
               </div>
            </div>

            <div className={`p-6 rounded-2xl shadow-sm border flex gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
               <div className={`p-2 rounded-full h-fit ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><User size={24} /></div>
               <div><h3 className={`font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>Resumo Clínico e Fisiopatologia</h3><p className={`leading-relaxed text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>{conduct.resumo_clinico}</p></div>
            </div>

            {conduct.xabcde_trauma && (
              <div className={`border p-5 rounded-2xl ${isDarkMode ? 'bg-orange-900/20 border-orange-900/50' : 'bg-orange-50 border-orange-200'}`}>
                <h3 className={`font-bold flex items-center gap-2 mb-3 uppercase tracking-wide ${isDarkMode ? 'text-orange-400' : 'text-orange-900'}`}><Skull size={20}/> Protocolo de Trauma (ATLS - xABCDE)</h3>
                <div className="space-y-3">{Object.entries(conduct.xabcde_trauma).map(([key, value]) => (<div key={key} className={`flex gap-3 items-start p-2 rounded border ${isDarkMode ? 'bg-slate-900/60 border-orange-900/30' : 'bg-white/60 border-orange-100'}`}><div className="bg-orange-600 text-white w-6 h-6 rounded flex items-center justify-center font-bold uppercase text-xs shrink-0">{key}</div><p className={`text-sm ${isDarkMode ? 'text-orange-200' : 'text-orange-950'}`}>{value}</p></div>))}</div>
              </div>
            )}

            {conduct.criterios_gravidade?.length > 0 && (
              <div className={`border p-5 rounded-2xl ${isDarkMode ? 'bg-rose-900/20 border-rose-900/50' : 'bg-rose-50 border-rose-100'}`}>
                <h3 className={`font-bold flex items-center gap-2 mb-3 text-sm uppercase ${isDarkMode ? 'text-rose-400' : 'text-rose-800'}`}><AlertTriangle size={18}/> Sinais de Alarme</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">{conduct.criterios_gravidade.map((crit, i) => (<div key={i} className={`p-2.5 rounded-lg border text-sm font-medium flex gap-2 ${isDarkMode ? 'bg-slate-900/80 border-rose-900/30 text-rose-200' : 'bg-white/80 border-rose-100/50 text-rose-900'}`}><div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"/>{crit}</div>))}</div>
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 space-y-6">
                <div className={`rounded-2xl shadow-sm border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                   <div className={`px-5 py-3 border-b flex items-center gap-2 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}><Activity size={18} className="text-slate-500"/><h3 className={`font-bold text-sm uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Avaliação Inicial</h3></div>
                   <div className="p-5 space-y-5 text-sm">
                     {conduct.avaliacao_inicial?.sinais_vitais_alvos && (<div><span className="text-xs font-bold text-slate-400 uppercase block mb-2">Alvos Terapêuticos</span><div className="grid grid-cols-1 gap-2">{conduct.avaliacao_inicial.sinais_vitais_alvos.map((s,i)=>(<div key={i} className={`p-3 rounded-lg border flex items-center gap-3 ${isDarkMode ? 'bg-indigo-900/20 border-indigo-900/50 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>{getVitalIcon(s)} <span className="font-bold">{s}</span></div>))}</div></div>)}
                     <div className="space-y-3">
                         <div><span className="text-xs font-bold text-rose-600 uppercase block mb-1">Prioridade 1 (Obrigatórios)</span><ul className="space-y-1">{conduct.avaliacao_inicial?.exames_prioridade1?.map((ex,i)=><li key={i} className={`flex gap-2 items-start font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}><div className="mt-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"/>{ex}</li>)}</ul></div>
                         <div><span className="text-xs font-bold text-slate-400 uppercase block mb-1">Complementares</span><ul className="space-y-1">{conduct.avaliacao_inicial?.exames_complementares?.map((ex,i)=><li key={i} className="flex gap-2 items-start text-slate-500"><div className="mt-1.5 w-1.5 h-1.5 bg-slate-500 rounded-full shrink-0"/>{ex}</li>)}</ul></div>
                     </div>
                   </div>
                </div>
                
                <div className={`rounded-2xl shadow-sm border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                   <div className={`px-5 py-3 border-b flex items-center gap-2 ${isDarkMode ? 'bg-blue-900/20 border-slate-800' : 'bg-blue-50 border-blue-100'}`}><Search size={18} className="text-blue-600"/><h3 className={`font-bold text-sm uppercase ${isDarkMode ? 'text-blue-400' : 'text-blue-900'}`}>Investigação Diagnóstica</h3></div>
                   <div className="p-5 space-y-4 text-sm">
                     {conduct.achados_exames?.ecg && <div><div className={`flex items-center gap-2 font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}><HeartPulse size={14} className="text-rose-500"/> ECG</div><p className={`p-2 rounded border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{conduct.achados_exames.ecg}</p></div>}
                     {conduct.achados_exames?.laboratorio && <div><div className={`flex items-center gap-2 font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}><Microscope size={14} className="text-purple-500"/> Laboratório</div><p className={`p-2 rounded border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{conduct.achados_exames.laboratorio}</p></div>}
                     {conduct.achados_exames?.imagem && <div><div className={`flex items-center gap-2 font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}><ImageIcon size={14} className="text-slate-500"/> Imagem</div><p className={`p-2 rounded border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{conduct.achados_exames.imagem}</p></div>}
                   </div>
                </div>

                <div className={`rounded-2xl shadow-sm border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                   <div className={`px-5 py-3 border-b flex items-center gap-2 ${isDarkMode ? 'bg-indigo-900/20 border-slate-800' : 'bg-indigo-50 border-indigo-100'}`}><FileText size={18} className="text-indigo-600"/><h3 className={`font-bold text-sm uppercase ${isDarkMode ? 'text-indigo-400' : 'text-indigo-900'}`}>Critérios de Desfecho</h3></div>
                   <div className="p-5 space-y-4 text-sm">
                     <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-amber-900/20 border-amber-900/50' : 'bg-amber-50 border-amber-100'}`}><span className={`text-xs font-bold uppercase block mb-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>Internação / UTI</span><ul className="space-y-1">{conduct.criterios_internacao?.map((c,i)=><li key={i} className={`flex gap-2 ${isDarkMode ? 'text-amber-200' : 'text-amber-900'}`}><div className="mt-1.5 w-1 h-1 bg-amber-500 rounded-full shrink-0"/>{c}</li>)}</ul></div>
                     <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-green-900/20 border-green-900/50' : 'bg-green-50 border-green-100'}`}><span className={`text-xs font-bold uppercase block mb-1 ${isDarkMode ? 'text-green-400' : 'text-green-800'}`}>Critérios de Alta</span><ul className="space-y-1">{conduct.criterios_alta?.map((c,i)=><li key={i} className={`flex gap-2 ${isDarkMode ? 'text-green-200' : 'text-green-900'}`}><div className="mt-1.5 w-1 h-1 bg-green-500 rounded-full shrink-0"/>{c}</li>)}</ul></div>
                   </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="space-y-4">
                   <div className={`flex items-center gap-2 mb-2 px-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}><div className={`p-1.5 rounded ${isDarkMode ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}><Pill size={18}/></div><h3 className="font-bold text-lg">Prescrição e Conduta</h3></div>
                   
                   {activeRoom === 'verde' ? (
                      conduct.tratamento_medicamentoso?.map((med, idx) => (
                        <MedicationCard key={idx} med={med} activeRoom={activeRoom} selectedPrescriptionItems={selectedPrescriptionItems} togglePrescriptionItem={togglePrescriptionItem} updateItemDays={updateItemDays} isDarkMode={isDarkMode} />
                      ))
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
                                 <h4 className={`flex items-center gap-2 font-bold uppercase text-xs mb-3 pl-1 border-b pb-1 ${isDarkMode ? 'text-rose-300 border-rose-800/50' : 'text-rose-800 border-rose-100'}`}>
                                   {catName === 'Dieta' && <Utensils size={14}/>}
                                   {catName === 'Hidratação' && <Droplets size={14}/>}
                                   {catName === 'Drogas Vasoativas' && <Zap size={14}/>}
                                   {catName}
                                 </h4>
                                 <div className="grid gap-4">
                                   {catItems.map((med, idx) => (<MedicationCard key={idx} med={med} activeRoom={activeRoom} selectedPrescriptionItems={selectedPrescriptionItems} togglePrescriptionItem={togglePrescriptionItem} updateItemDays={updateItemDays} isDarkMode={isDarkMode} />))}
                                 </div>
                              </div>
                           );
                         })}
                      </div>
                   )}
                </div>

                <div className={`rounded-2xl border p-6 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
                   <h3 className={`font-bold mb-5 flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}><ArrowRight className="text-purple-600"/> Fluxo de Escalonamento</h3>
                   <div className="space-y-6 relative">
                     <div className={`absolute left-3.5 top-2 bottom-2 w-0.5 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
                     {conduct.escalonamento_terapeutico?.map((step, i) => (
                       <div key={i} className="relative flex gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 ring-4 ${isDarkMode ? 'ring-slate-900' : 'ring-white'} ${i===0 ? (isDarkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700') : i===1 ? (isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700') : (isDarkMode ? 'bg-rose-900/50 text-rose-300' : 'bg-rose-100 text-rose-700')}`}>{i+1}</div>
                          <div className="pt-1"><h4 className="text-xs font-bold uppercase text-slate-400 mb-1">{step.passo}</h4><p className={`leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{step.descricao}</p></div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <InfusionCalculator isOpen={showCalculatorModal} onClose={() => setShowCalculatorModal(false)} isDarkMode={isDarkMode} />
      <NotepadModal isOpen={showNotepad} onClose={() => setShowNotepad(false)} isDarkMode={isDarkMode} userNotes={userNotes} handleNoteChange={handleNoteChange} currentUser={currentUser} isCloudConnected={isCloudConnected} isSaving={isSaving} />
      <FavoritesModal isOpen={showFavoritesModal} onClose={() => setShowFavoritesModal(false)} isDarkMode={isDarkMode} favorites={favorites} loadFavoriteConduct={loadFavoriteConduct} removeFavoriteFromList={removeFavoriteFromList} />
      <PrescriptionModal isOpen={showPrescriptionModal} onClose={() => setShowPrescriptionModal(false)} currentUser={currentUser} selectedPrescriptionItems={selectedPrescriptionItems} />
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} isDarkMode={isDarkMode} />
      <MedicalScoresModal isOpen={showScoresModal} onClose={() => setShowScoresModal(false)} isDarkMode={isDarkMode} />
      <QuickPrescriptionsModal isOpen={showQuickPrescriptions} onClose={() => setShowQuickPrescriptions(false)} isDarkMode={isDarkMode} />
      <ImageAnalysisModal isOpen={showImageModal} onClose={() => setShowImageModal(false)} isDarkMode={isDarkMode} selectedImage={selectedImage} handleImageUpload={handleImageUpload} imageQuery={imageQuery} setImageQuery={setImageQuery} handleAnalyzeImage={handleAnalyzeImage} isAnalyzingImage={isAnalyzingImage} imageAnalysisResult={imageAnalysisResult} setImageAnalysisResult={setImageAnalysisResult} />
      <BedsideModal isOpen={showBedsideModal} onClose={() => setShowBedsideModal(false)} isDarkMode={isDarkMode} bedsideAnamnesis={bedsideAnamnesis} setBedsideAnamnesis={setBedsideAnamnesis} bedsideExams={bedsideExams} setBedsideExams={setBedsideExams} generateBedsideConduct={generateBedsideConduct} isGeneratingBedside={isGeneratingBedside} bedsideResult={bedsideResult} />
      <PhysicalExamModal isOpen={showPhysicalExam} onClose={() => setShowPhysicalExam(false)} isDarkMode={isDarkMode} />
    </div>
  );
}

export default function EmergencyGuideApp() { return <ErrorBoundary><EmergencyGuideAppContent /></ErrorBoundary>; }