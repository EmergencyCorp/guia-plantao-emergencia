import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, AlertCircle, Search, Clock, Pill, FileText, Loader2, BookOpen, 
  Stethoscope, ClipboardCheck, AlertTriangle, ArrowRight, X, User, 
  CheckCircle2, Thermometer, Syringe, Siren, FlaskConical, Tag, Package,
  ShieldAlert, LogOut, Lock, Shield, History, LogIn, KeyRound, Edit, Save, Cloud, CloudOff, Settings, Info,
  HeartPulse, Microscope, Image as ImageIcon, FileDigit, ScanLine, Wind, Droplet, Timer, Skull, Printer, FilePlus, Calculator,
  Tablets, Syringe as SyringeIcon, Droplets, Pipette, Star, Trash2, SprayCan, CalendarDays, Utensils, Zap, Camera, Upload, Eye,
  Sun, Moon, BedDouble, ClipboardList, UserCheck
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query as firestoreQuery, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';

// --- LÓGICA DE CONFIGURAÇÃO DO FIREBASE ---
const getFirebaseConfig = () => {
  try {
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
    if (typeof __firebase_config !== 'undefined') {
      return JSON.parse(__firebase_config);
    }
  } catch (e) {
    console.error("Erro config firebase:", e);
  }
  return null;
};

const firebaseConfig = getFirebaseConfig();
let app, auth, db;

if (firebaseConfig && firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Erro init firebase:", e);
  }
}

const appId = (typeof __app_id !== 'undefined') ? __app_id : 'emergency-guide-app';
const initialToken = (typeof __initial_auth_token !== 'undefined') ? __initial_auth_token : null;

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

export default function EmergencyGuideApp() {
  // --- ESTADO DE TEMA (DARK MODE) ---
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme_preference');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme_preference', newMode ? 'dark' : 'light');
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [firebaseUser, setFirebaseUser] = useState(null); 
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [configStatus, setConfigStatus] = useState('verificando');

  const [activeRoom, setActiveRoom] = useState('verde');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [conduct, setConduct] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const resultsRef = useRef(null);

  const [showNotepad, setShowNotepad] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [userNotes, setUserNotes] = useState('');

  const [selectedPrescriptionItems, setSelectedPrescriptionItems] = useState([]);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  // --- ESTADOS DA CALCULADORA DE INFUSÃO ---
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [calcInputs, setCalcInputs] = useState({
    dose: '',
    peso: '',
    conc: '',
    tp_dose: 'mcgmin', // Default: mcg/kg/min
    tp_conc: 'mgml'    // Default: mg/ml
  });
  const [calcResult, setCalcResult] = useState('---');

  // --- ESTADOS DA ANÁLISE DE IMAGEM (IA VISION) ---
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); 
  const [imageQuery, setImageQuery] = useState('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState(null);

  // --- ESTADOS BEDSIDE ---
  const [showBedsideModal, setShowBedsideModal] = useState(false);
  const [bedsideAnamnesis, setBedsideAnamnesis] = useState('');
  const [bedsideExams, setBedsideExams] = useState('');
  const [bedsideResult, setBedsideResult] = useState(null);
  const [isGeneratingBedside, setIsGeneratingBedside] = useState(false);

  const [isCurrentConductFavorite, setIsCurrentConductFavorite] = useState(false);

  useEffect(() => {
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      setConfigStatus('missing');
      return;
    }
    setConfigStatus('ok');

    if (!auth) return;

    const initAuth = async () => {
      try {
        if (initialToken) await signInWithCustomToken(auth, initialToken);
        else await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
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

  useEffect(() => {
    const savedUser = localStorage.getItem('emergency_app_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.expiresAt) {
          const expires = new Date(parsedUser.expiresAt);
          if (new Date() > expires) {
             localStorage.removeItem('emergency_app_user');
             return;
          }
        }
        setCurrentUser(parsedUser);
        loadHistory(parsedUser.username);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (currentUser && isCloudConnected) {
      fetchNotesFromCloud(currentUser.username);
      fetchHistoryFromCloud(currentUser.username);
      const unsubFavs = subscribeToFavorites(currentUser.username);
      return () => { if(unsubFavs) unsubFavs(); };
    } else if (currentUser) {
      const localNotes = localStorage.getItem(`notes_${currentUser.username}`);
      if (localNotes) setUserNotes(localNotes);
      loadLocalHistory(currentUser.username);
    }
  }, [currentUser, isCloudConnected]);

  useEffect(() => {
    setSelectedPrescriptionItems([]);
    
    if (conduct && favorites.length > 0) {
      const docId = getConductDocId(conduct.condicao || searchQuery, activeRoom);
      const isFav = favorites.some(f => f.id === docId || f.query === searchQuery);
      setIsCurrentConductFavorite(isFav);
    } else {
      setIsCurrentConductFavorite(false);
    }
  }, [conduct, favorites]);

  // --- LÓGICA DE UPLOAD E ANÁLISE DE IMAGEM ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setImageAnalysisResult(null); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage || !imageQuery.trim()) {
      showError("Por favor, selecione uma imagem e faça uma pergunta.");
      return;
    }

    setIsAnalyzingImage(true);
    setImageAnalysisResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: selectedImage, 
          prompt: imageQuery 
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || 'Erro ao analisar imagem.');
      }

      const data = await response.json();
      
      let finalResult = data.analysis;
      try {
        if (typeof finalResult === 'string' && finalResult.trim().startsWith('{')) {
          const parsed = JSON.parse(finalResult);
          const content = parsed.analise_ecg || parsed.analysis || parsed;
          
          if (typeof content === 'object' && content !== null) {
            finalResult = Object.entries(content)
              .filter(([_, v]) => v !== null && v !== undefined)
              .map(([k, v]) => {
                const label = k.replace(/_/g, ' ').toUpperCase();
                const value = Array.isArray(v) ? v.join(', ') : String(v);
                return `• ${label}: ${value}`;
              })
              .join('\n\n');
          }
        }
      } catch (e) {
        console.log("Resposta da IA já é texto ou formato desconhecido, mantendo original.");
      }

      setImageAnalysisResult(finalResult);

    } catch (error) {
      console.error("Erro na análise:", error);
      showError(error.message || "Falha na análise da imagem. Tente novamente.");
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setTimeout(() => {
      setSelectedImage(null);
      setImageQuery('');
      setImageAnalysisResult(null);
    }, 300);
  };

  // --- LÓGICA DA CALCULADORA ---
  const calcularMl = () => {
    const dose = parseFloat(calcInputs.dose);
    const peso = parseFloat(calcInputs.peso);
    const conc = parseFloat(calcInputs.conc);
    const tp_dose = calcInputs.tp_dose;
    const tp_conc = calcInputs.tp_conc;

    if (isNaN(dose) || isNaN(peso) || isNaN(conc) || dose <= 0 || peso <= 0 || conc <= 0) {
      setCalcResult("Preencha valores válidos.");
      return;
    }

    let dosePeloPeso = dose * peso;
    let doseTotalHora = 0;
    if (tp_dose.includes('min')) {
      doseTotalHora = dosePeloPeso * 60;
    } else {
      doseTotalHora = dosePeloPeso;
    }

    if (tp_dose.includes('mg')) {
      doseTotalHora = doseTotalHora * 1000;
    }

    let concPadronizada = conc;
    if (tp_conc === 'mgml') {
      concPadronizada = conc * 1000;
    }

    let resultado = doseTotalHora / concPadronizada;

    if (resultado < 1) {
      setCalcResult(resultado.toFixed(2) + " ml/h");
    } else {
      setCalcResult(resultado.toFixed(1) + " ml/h");
    }
  };

  useEffect(() => {
    if (showCalculatorModal) {
       calcularMl();
    }
  }, [calcInputs]);

  const handleCalcChange = (field, value) => {
    setCalcInputs(prev => ({ ...prev, [field]: value }));
  };

  const loadHistory = (username) => {
    try {
      const history = localStorage.getItem(`history_${username}`);
      if (history) setRecentSearches(JSON.parse(history));
      else setRecentSearches([]);
    } catch (e) { setRecentSearches([]); }
  };
  
  const loadLocalHistory = (username) => {
      try {
        const history = localStorage.getItem(`history_${username}`);
        if (history) setRecentSearches(JSON.parse(history));
        else setRecentSearches([]);
      } catch (e) { setRecentSearches([]); }
  };

  const fetchHistoryFromCloud = async (username) => {
      loadLocalHistory(username);
      if (db && auth?.currentUser) {
        try {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'history', username);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const remoteData = docSnap.data();
            if (remoteData.searches && Array.isArray(remoteData.searches)) {
              setRecentSearches(remoteData.searches);
              localStorage.setItem(`history_${username}`, JSON.stringify(remoteData.searches));
            }
          }
        } catch (error) { console.error("Erro sync histórico:", error); }
      }
  };

  const saveToHistory = async (term, room) => {
      if (!currentUser) return;
      const newEntry = { query: term, room, timestamp: new Date().toISOString() };
      const hist = recentSearches.filter(s => s.query.toLowerCase() !== term.toLowerCase());
      const updated = [newEntry, ...hist].slice(0, 10); 
      setRecentSearches(updated);
      localStorage.setItem(`history_${currentUser.username}`, JSON.stringify(updated));
  
      if (db && auth?.currentUser) {
        try {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'history', currentUser.username);
          await setDoc(docRef, {
            searches: updated,
            lastUpdated: new Date().toISOString(),
            username: currentUser.username
          }, { merge: true });
        } catch (error) { console.error("Erro ao salvar histórico na nuvem:", error); }
      }
  };

  const fetchNotesFromCloud = async (username) => {
    const localNotes = localStorage.getItem(`notes_${username}`);
    if (localNotes) setUserNotes(localNotes);

    if (db && auth?.currentUser) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'notes', username);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().content) {
          setUserNotes(docSnap.data().content);
          localStorage.setItem(`notes_${username}`, docSnap.data().content);
        }
      } catch (error) { console.error("Erro sync notas:", error); }
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
              author: currentUser.name || "Usuário",
              username: currentUser.username
            }, { merge: true });
          } catch (error) { console.error("Erro save nuvem:", error); } 
          finally { setIsSaving(false); }
        }
      }
    }, 1500);
    return () => clearTimeout(delayDebounceFn);
  }, [userNotes, currentUser]);

  const handleNoteChange = (e) => setUserNotes(e.target.value);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!db || !isCloudConnected) {
      setLoginError("Sem conexão com o servidor. Verifique se o 'Anônimo' está ativado no Firebase Authentication.");
      return;
    }

    try {
      const userId = usernameInput.toLowerCase().trim();
      const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'registered_users', userId);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        if (userData.password === passwordInput) {
          if (userData.expiresAt) {
             const expirationDate = new Date(userData.expiresAt);
             const now = new Date();
             if (now > expirationDate) {
               setLoginError(`Assinatura expirada em ${expirationDate.toLocaleDateString()}.`);
               return;
             }
          }
          
          const userSession = { ...userData, username: userId };
          setCurrentUser(userSession);
          localStorage.setItem('emergency_app_user', JSON.stringify(userSession));
          setUsernameInput('');
          setPasswordInput('');
        } else {
          setLoginError("Senha incorreta.");
        }
      } else {
        setLoginError(`Usuário não encontrado.`);
      }
    } catch (err) {
      console.error("Erro crítico no login:", err);
      setLoginError("Erro técnico ao tentar login (verifique console).");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setConduct(null);
    setSearchQuery('');
    setRecentSearches([]);
    setUserNotes('');
    setFavorites([]);
    localStorage.removeItem('emergency_app_user');
  };

  const togglePrescriptionItem = (med) => {
    if (activeRoom !== 'verde' || !med.receita) return;

    setSelectedPrescriptionItems(prev => {
      const itemId = med.farmaco + (med.receita?.nome_comercial || "");
      const exists = prev.find(item => (item.farmaco + (item.receita?.nome_comercial || "")) === itemId);
      
      if (exists) {
        return prev.filter(item => (item.farmaco + (item.receita?.nome_comercial || "")) !== itemId);
      } else {
        return [...prev, { ...med, dias_tratamento: med.receita.dias_sugeridos || 5 }];
      }
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
        const unidade = item.receita.calculo_qnt.unidade || 'unidades';
        item.receita.quantidade = `${total} ${unidade}`;
      }
      
      setSelectedPrescriptionItems(newItems);
    }
  };

  const getConductDocId = (query, room) => {
    return `${query.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${room}`;
  };

  const subscribeToFavorites = (username) => {
      if (!db) return;
      
      const favoritesRef = collection(db, 'artifacts', appId, 'users', username, 'conducts');
      const q = firestoreQuery(favoritesRef, where("isFavorite", "==", true));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const favs = [];
          querySnapshot.forEach((doc) => {
              favs.push({ id: doc.id, ...doc.data() });
          });
          setFavorites(favs);
      }, (error) => {
          console.error("Erro ao buscar favoritos:", error);
      });
      return unsubscribe;
  };

  const toggleFavorite = async () => {
    if (!currentUser || !conduct || !isCloudConnected) {
      showError("Necessário estar online para favoritar.");
      return;
    }

    const newStatus = !isCurrentConductFavorite;
    setIsCurrentConductFavorite(newStatus);

    try {
      const docId = getConductDocId(searchQuery, activeRoom);
      const docRef = doc(db, 'artifacts', appId, 'users', currentUser.username, 'conducts', docId);
      
      if (newStatus) {
          await setDoc(docRef, { 
            query: searchQuery,
            room: activeRoom,
            conductData: conduct,
            isFavorite: true,
            lastAccessed: new Date().toISOString()
          }, { merge: true });
      } else {
          await setDoc(docRef, { isFavorite: false }, { merge: true });
      }

    } catch (error) {
      console.error("Erro ao favoritar:", error);
      setIsCurrentConductFavorite(!newStatus);
      showError("Erro ao atualizar favorito.");
    }
  };
  
  const removeFavoriteFromList = async (docId) => {
      if (!currentUser || !isCloudConnected) return;
      try {
          const docRef = doc(db, 'artifacts', appId, 'users', currentUser.username, 'conducts', docId);
          await setDoc(docRef, { isFavorite: false }, { merge: true });
      } catch (e) {
          console.error("Erro ao remover favorito", e);
      }
  };

  const loadFavoriteConduct = (fav) => {
      setConduct(fav.conductData);
      setSearchQuery(fav.query);
      setActiveRoom(fav.room);
      setShowFavoritesModal(false);
      setIsCurrentConductFavorite(true);
  };

  const manageCacheLimit = async (username) => {
    if (!db) return;
    try {
      const conductsRef = collection(db, 'artifacts', appId, 'users', username, 'conducts');
      const q = firestoreQuery(conductsRef, where("isFavorite", "==", false), orderBy("lastAccessed", "desc"));
      
      const snapshot = await getDocs(q);
      if (snapshot.size > 10) {
        const docsToDelete = snapshot.docs.slice(10);
        const deletePromises = docsToDelete.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }
    } catch (error) { console.error("Erro ao limpar cache:", error); }
  };

  // Modificado para aceitar um overrideRoom (para a funcionalidade de transferir para observação)
  const generateConduct = async (overrideRoom = null) => {
    if (!searchQuery.trim()) {
      showError('Digite uma condição clínica.');
      return;
    }
    
    const targetRoom = overrideRoom || activeRoom; // Usa a sala passada ou a atual

    setLoading(true);
    setConduct(null);
    setErrorMsg('');
    setIsCurrentConductFavorite(false);

    // Se for override (transferência), mudamos visualmente para a sala correspondente
    if (overrideRoom) {
        setActiveRoom(overrideRoom);
    }

    const docId = getConductDocId(searchQuery, targetRoom);

    if (isCloudConnected && currentUser) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.username, 'conducts', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setConduct(data.conductData);
          setIsCurrentConductFavorite(data.isFavorite || false);
          await setDoc(docRef, { lastAccessed: new Date().toISOString() }, { merge: true });
          
          setLoading(false);
          saveToHistory(searchQuery, targetRoom);
          setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
          return;
        }
      } catch (error) { console.error("Erro cache:", error); }
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery, activeRoom: targetRoom })
      });

      if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || 'Erro ao se comunicar com a IA.');
      }
      
      const parsedConduct = await response.json();
      setConduct(parsedConduct);
      
      if (isCloudConnected && currentUser) {
        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.username, 'conducts', docId);
        await setDoc(docRef, {
          query: searchQuery,
          room: targetRoom,
          conductData: parsedConduct,
          isFavorite: false,
          lastAccessed: new Date().toISOString()
        });
        manageCacheLimit(currentUser.username);
      }

      saveToHistory(searchQuery, targetRoom);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);

    } catch (error) {
      console.error("Erro API:", error);
      showError(error.message || "Erro ao gerar conduta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const generateBedsideConduct = async () => {
    if (!bedsideAnamnesis.trim()) {
      showError('Por favor, preencha a anamnese do paciente.');
      return;
    }

    setIsGeneratingBedside(true);
    setBedsideResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: 'bedside', 
          anamnesis: bedsideAnamnesis,
          exams: bedsideExams,
          // Campos abaixo são ignorados no modo bedside mas evitam erro se a API validar
          searchQuery: 'Bedside Case', 
          activeRoom: 'bedside' 
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || 'Erro ao gerar conduta bedside.');
      }

      const data = await response.json();
      setBedsideResult(data);

    } catch (error) {
      console.error("Erro Bedside:", error);
      showError("Erro ao processar o caso clínico. Tente novamente.");
    } finally {
      setIsGeneratingBedside(false);
    }
  };

  const showError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 4000); };

  const getVitalIcon = (text) => {
    const t = text.toLowerCase();
    if (t.includes('fc') || t.includes('bpm')) return <HeartPulse size={16} className="text-rose-500" />;
    if (t.includes('pa') || t.includes('mmhg') || t.includes('pam')) return <Activity size={16} className="text-blue-500" />;
    if (t.includes('sat') || t.includes('o2')) return <Droplet size={16} className="text-cyan-500" />;
    if (t.includes('fr') || t.includes('resp')) return <Wind size={16} className="text-teal-500" />;
    return <Activity size={16} className="text-slate-400" />;
  };

  const getMedTypeIcon = (type) => {
    if (!type) return <Pill size={14} />;
    const t = type.toLowerCase();
    if (t.includes('injet')) return <SyringeIcon size={14} className="text-rose-500" />;
    if (t.includes('gota') || t.includes('solu') || t.includes('xarope') || t.includes('susp')) return <Droplets size={14} className="text-blue-500" />;
    if (t.includes('comp') || t.includes('cap')) return <Tablets size={14} className="text-emerald-500" />;
    if (t.includes('tópi') || t.includes('pomada') || t.includes('creme')) return <Pipette size={14} className="text-amber-500" />;
    if (t.includes('inal') || t.includes('spray')) return <SprayCan size={14} className="text-purple-500" />;
    return <Pill size={14} className="text-slate-500" />;
  };

  const getMedTypeColor = (type) => {
    // No Dark Mode, usamos cores mais escuras ou neutras
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

  const inferMedType = (med) => {
    if (med.tipo && med.tipo !== "N/A") return med.tipo;
    const name = med.farmaco?.toLowerCase() || "";
    const via = med.via?.toLowerCase() || "";
    if (via.includes('ev') || via.includes('iv') || via.includes('im') || via.includes('sc')) return "Injetável";
    if (name.includes('gotas')) return "Gotas";
    if (name.includes('xarope')) return "Xarope";
    if (name.includes('comprimido')) return "Comprimido";
    if (name.includes('creme') || name.includes('pomada')) return "Tópico";
    if (name.includes('spray') || name.includes('bombinha')) return "Inalatório";
    return "Medicamento";
  };

  const renderMedicationCard = (med, idx) => {
     const itemId = med.farmaco + (med.receita?.nome_comercial || "");
     const isSelected = selectedPrescriptionItems.some(item => (item.farmaco + (item.receita?.nome_comercial || "")) === itemId);
     const canSelect = activeRoom === 'verde' && med.receita;
     const medType = inferMedType(med); 
     const isInjectable = medType.toLowerCase().includes('injet');
     
     const selectedItemState = selectedPrescriptionItems.find(item => (item.farmaco + (item.receita?.nome_comercial || "")) === itemId);
     const currentDays = selectedItemState ? selectedItemState.dias_tratamento : (med.receita?.dias_sugeridos || 5);

     return (
       <div 
         key={idx} 
         onClick={() => canSelect && togglePrescriptionItem(med)}
         className={`${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200'} rounded-xl border p-5 shadow-sm transition-all relative overflow-hidden group mb-4 ${canSelect ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''} ${isSelected ? (isDarkMode ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-900/20' : 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30') : ''}`}
       >
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isSelected ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
          {canSelect && (<div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-transparent'}`}><CheckCircle2 size={14} /></div>)}
          
          <div className="absolute top-4 right-12">
             <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getMedTypeColor(medType)}`}>{getMedTypeIcon(medType)} {medType}</span>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3 pl-3 pr-20">
             <div>
                <div className="flex items-center gap-2"><h4 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{med.farmaco}</h4></div>
                <span className={`text-sm italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{med.indicacao}</span>
             </div>
             {med.via && <span className={`text-xs font-bold px-3 py-1 rounded-full border ${isDarkMode ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{med.via}</span>}
          </div>
          
          <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'} rounded-lg p-3 ml-3 mb-3 font-mono text-sm border`}><strong className={`block text-xs uppercase mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sugestão de Uso / Dose:</strong>{med.sugestao_uso || med.dose}</div>
          
          {canSelect && isSelected && (
            <div className="ml-3 mb-3 animate-in slide-in-from-top-1" onClick={(e) => e.stopPropagation()}>
               <label className={`text-xs font-bold flex items-center gap-1 mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}><CalendarDays size={12} /> Duração (Dias):</label>
               <input type="number" min="1" className={`w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold ${isDarkMode ? 'bg-slate-900 border-slate-600 text-white' : 'border-blue-300 text-blue-900'}`} value={currentDays} onChange={(e) => updateItemDays(itemId, parseInt(e.target.value))} />
            </div>
          )}
          
          <div className="grid sm:grid-cols-2 gap-4 ml-3 text-sm">
             {isInjectable && med.diluicao && (<div className={`flex gap-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}><FlaskConical size={16} className="shrink-0 mt-0.5"/><span><strong>Diluição:</strong> {med.diluicao}</span></div>)}
             {isInjectable && med.modo_admin && (<div className={`flex gap-2 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}><Timer size={16} className="shrink-0 mt-0.5"/><span><strong>Infusão:</strong> {med.modo_admin} {med.tempo_infusao ? `(${med.tempo_infusao})` : ''}</span></div>)}
             {med.cuidados && <div className={`flex gap-2 col-span-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}><AlertTriangle size={16} className="shrink-0 mt-0.5"/><span><strong>Atenção:</strong> {med.cuidados}</span></div>}
          </div>
       </div>
     );
  };

  const roomConfig = {
    verde: { 
        name: 'Sala Verde', 
        color: 'emerald', 
        accent: isDarkMode ? 'bg-emerald-600' : 'bg-emerald-500', 
        border: isDarkMode ? 'border-emerald-700' : 'border-emerald-500', 
        text: isDarkMode ? 'text-emerald-300' : 'text-emerald-800', 
        light: isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50', 
        icon: <Stethoscope className="w-5 h-5" />, 
        description: 'Ambulatorial / Baixa Complexidade' 
    },
    amarela: { 
      name: 'Sala Amarela', 
      color: 'amber', 
      accent: isDarkMode ? 'bg-amber-600' : 'bg-amber-500', 
      border: isDarkMode ? 'border-amber-700' : 'border-amber-500', 
      text: isDarkMode ? 'text-amber-300' : 'text-amber-800', 
      light: isDarkMode ? 'bg-amber-900/30' : 'bg-amber-50', 
      icon: <BedDouble className="w-5 h-5" />, 
      description: 'Observação / Média Complexidade' 
    },
    vermelha: { 
        name: 'Sala Vermelha', 
        color: 'rose', 
        accent: isDarkMode ? 'bg-rose-700' : 'bg-rose-600', 
        border: isDarkMode ? 'border-rose-700' : 'border-rose-600', 
        text: isDarkMode ? 'text-rose-300' : 'text-rose-800', 
        light: isDarkMode ? 'bg-rose-900/30' : 'bg-rose-50', 
        icon: <Siren className="w-5 h-5" />, 
        description: 'Emergência / Risco de Vida' 
    }
  };
  
  // Categorias para Sala Vermelha
  const RED_ROOM_CATEGORIES = [
    'Dieta', 
    'Hidratação', 
    'Drogas Vasoativas', 
    'Antibiótico', 
    'Sintomáticos', 
    'Profilaxias', 
    'Outros'
  ];

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-800'}`}>
        <div className={`rounded-3xl shadow-xl border max-w-md w-full overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-8 text-center text-white relative">
            <div className="absolute top-4 right-4">
               <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
            </div>
            {/* LOGO NO LOGIN */}
            <img 
               src={isDarkMode ? "https://i.ibb.co/d0W4s2yH/logobranco.png" : "https://i.ibb.co/vCp5pXZP/logopreto.png"} 
               alt="Emergency Guide Logo" 
               className="mx-auto mb-4 h-24 w-auto object-contain"
            />
            <h1 className="text-2xl font-bold mb-1">Guia de Plantão</h1>
            <p className="text-blue-200 text-sm font-medium">Acesso Exclusivo Médico</p>
          </div>
          <div className="p-8 space-y-6">
            {loginError && <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border font-mono ${isDarkMode ? 'bg-red-900/30 text-red-200 border-red-800' : 'bg-red-50 text-red-600 border-red-100'}`}>{loginError}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                  <label className={`text-xs font-bold uppercase ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Usuário</label>
                  <div className="relative">
                      <User className={`absolute left-3 top-3 w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                      <input type="text" value={usernameInput} onChange={(e)=>setUsernameInput(e.target.value)} className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-900 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200'}`} placeholder="Ex: admin" />
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
            <div className={`text-center flex flex-col items-center gap-3 pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`flex items-center justify-center gap-2 text-[10px] px-3 py-1.5 rounded-full mx-auto w-fit ${configStatus === 'missing' ? (isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700') : isCloudConnected ? (isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700') : (isDarkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700')}`}>{configStatus === 'missing' ? <Settings size={12}/> : isCloudConnected ? <Cloud size={12}/> : <CloudOff size={12}/>}<span>{configStatus === 'missing' ? 'Erro: Variáveis de Ambiente' : isCloudConnected ? 'Banco de Dados Conectado' : 'Modo Offline (Dados Locais)'}</span></div>
              <p className="text-[10px] text-slate-400 leading-tight max-w-xs">ATENÇÃO: Ferramenta auxiliar. Não substitui o julgamento clínico. O autor isenta-se de responsabilidade.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-100 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <header className={`border-b sticky top-0 z-40 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {/* LOGO NO HEADER */}
             <img 
               src={isDarkMode ? "https://i.ibb.co/d0W4s2yH/logobranco.png" : "https://i.ibb.co/vCp5pXZP/logopreto.png"} 
               alt="Logo" 
               className="h-12 w-auto object-contain" 
             />
             <div><h1 className={`text-lg font-bold leading-none ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Guia de Plantão</h1><span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Suporte Médico</span></div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex flex-col items-end mr-2"><span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{currentUser.name}</span><span className="text-[10px] text-slate-400 uppercase">{currentUser.role}</span></div>
             
             {/* TOGGLE DARK MODE */}
             <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

             {/* BOTÃO DE IA VISION (NOVO) */}
             <button onClick={() => setShowImageModal(true)} className={`p-2 rounded-full transition-colors flex items-center gap-2 ${isDarkMode ? 'text-blue-300 bg-slate-800 hover:bg-slate-700' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`} title="Análise de Imagem IA">
                <Camera size={20} />
                <span className="text-xs font-bold hidden sm:inline">IA Vision</span>
             </button>

             {/* BOTÃO BEDSIDE (NOVO) */}
             <button onClick={() => setShowBedsideModal(true)} className={`p-2 rounded-full transition-colors flex items-center gap-2 ${isDarkMode ? 'text-indigo-300 bg-slate-800 hover:bg-slate-700' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`} title="BedSide - Clinical Guidance">
                <ClipboardList size={20} />
                <span className="text-xs font-bold hidden sm:inline">BedSide</span>
             </button>

             <button onClick={() => setShowFavoritesModal(true)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-yellow-500 hover:bg-yellow-50'}`} title="Meus Favoritos"><Star size={20} /></button>
             <button onClick={() => setShowNotepad(true)} className={`p-2 rounded-full ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}><Edit size={20} /></button>
             <button onClick={handleLogout} className={`p-2 rounded-full ${isDarkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-400 hover:bg-red-50'}`}><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 space-y-8 w-full relative">
        {/* BOTÃO FLUTUANTE DE RECEITA (SÓ SALA VERDE) */}
        {activeRoom === 'verde' && selectedPrescriptionItems.length > 0 && (
          <button onClick={() => setShowPrescriptionModal(true)} className="fixed bottom-8 right-8 z-50 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-full shadow-xl flex items-center gap-3 font-bold transition-all animate-in slide-in-from-bottom-4"><Printer size={24} /> Gerar Receita ({selectedPrescriptionItems.length})</button>
        )}

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(roomConfig)
              .map(([key, config]) => {
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

          {/* BOTÃO PARA ABRIR CALCULADORA (SALAS GRAVES) */}
          {(activeRoom === 'vermelha' || activeRoom === 'amarela') && (
             <div className="flex justify-center">
                <button onClick={() => setShowCalculatorModal(true)} className={`px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-colors border ${isDarkMode ? 'bg-rose-900/30 text-rose-300 border-rose-800 hover:bg-rose-900/50' : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300'}`}>
                   <Calculator size={16}/> Calculadora de Infusão
                </button>
             </div>
          )}

          <div className={`p-2 rounded-2xl shadow-lg border flex items-center gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
            <Search className="ml-3 text-gray-400" size={20} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateConduct()} placeholder="Digite o quadro clínico (ex: Cetoacidose, IAM...)" className={`flex-1 py-3 bg-transparent outline-none font-medium ${isDarkMode ? 'text-white placeholder-slate-600' : 'text-slate-800'}`} />
            <button onClick={() => generateConduct()} disabled={loading} className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all ${loading ? 'bg-slate-600' : 'bg-blue-900 hover:bg-blue-800'}`}>{loading ? <Loader2 className="animate-spin" /> : <>Gerar <ArrowRight size={18} /></>}</button>
          </div>

          {recentSearches.length > 0 && (<div className="flex flex-wrap gap-2 px-1"><div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mr-2"><History size={14} /> Recentes</div>{recentSearches.map((search, idx) => (<button key={idx} onClick={() => {setActiveRoom(search.room); setSearchQuery(search.query);}} className={`flex items-center gap-2 text-xs px-3 py-1 border rounded-full transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-blue-500 hover:text-blue-400 text-slate-300' : 'bg-white border-gray-200 hover:border-blue-300 hover:text-blue-700'}`}><div className={`w-2 h-2 rounded-full shrink-0 ${search.room === 'verde' ? 'bg-emerald-500' : search.room === 'amarela' ? 'bg-amber-500' : 'bg-rose-500'}`} />{search.query}</button>))}</div>)}
          {errorMsg && <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 text-sm font-medium ${isDarkMode ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-50 text-red-700 border-red-200'}`}><AlertCircle size={18} /> {errorMsg}</div>}
        </div>

        {conduct && (
          <div ref={resultsRef} className="animate-in slide-in-from-bottom-4 fade-in duration-500 space-y-6">
            
            {/* BOTÃO DE TRANSFERÊNCIA PARA OBSERVAÇÃO (SÓ APARECE NA SALA VERDE) */}
            {activeRoom === 'verde' && (
              <div className={`border-l-4 border-amber-500 p-4 rounded-r-xl flex items-center justify-between gap-4 ${isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isDarkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isDarkMode ? 'text-amber-300' : 'text-amber-900'}`}>Caso mais grave que o esperado?</h4>
                    <p className={`text-xs ${isDarkMode ? 'text-amber-400/70' : 'text-amber-700'}`}>Gere uma conduta de média complexidade.</p>
                  </div>
                </div>
                <button 
                  onClick={() => generateConduct('amarela')} 
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm hover:shadow-md flex items-center gap-2 ${isDarkMode ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                >
                  Transferir p/ Observação <ArrowRight size={14} />
                </button>
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
                {/* AVALIAÇÃO E ALVOS */}
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
                   
                   {/* RENDERIZAÇÃO CONDICIONAL POR CATEGORIA (SALA VERMELHA OU AMARELA) OU LISTA SIMPLES (VERDE) */}
                   {activeRoom === 'verde' ? (
                      conduct.tratamento_medicamentoso?.map((med, idx) => renderMedicationCard(med, idx))
                   ) : (
                      // LÓGICA DE AGRUPAMENTO SALAS AMARELA E VERMELHA
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
                                    {catItems.map((med, idx) => renderMedicationCard(med, idx))}
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

      <footer className={`border-t mt-auto ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className={`border rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center text-left ${isDarkMode ? 'bg-amber-900/20 border-amber-900/50' : 'bg-amber-50 border-amber-200'}`}>
             <ShieldAlert className="text-amber-600 shrink-0 w-8 h-8" />
             <div><h4 className={`font-bold uppercase text-sm mb-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-900'}`}>Aviso Legal Importante</h4><p className={`text-xs leading-relaxed text-justify ${isDarkMode ? 'text-amber-200/90' : 'text-amber-800/90'}`}>Esta é uma ferramenta de <strong>guia de plantão</strong> baseada em inteligência artificial. <strong>NÃO DEVE SER UTILIZADA POR LEIGOS</strong>. O conteúdo pode conter imprecisões. Médicos devem tomar condutas baseados <strong>exclusivamente em sua própria expertise</strong>. O autor isenta-se de responsabilidade.</p></div>
          </div>
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} EmergencyCorp. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* MODAL DE RECEITUÁRIO */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:h-full print:rounded-none print:shadow-none">
            <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center print:hidden">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><FilePlus size={20} /> Gerador de Receituário</h3>
              <div className="flex gap-2"><button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"><Printer size={16}/> Imprimir</button><button onClick={() => setShowPrescriptionModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-lg transition-colors"><X size={20}/></button></div>
            </div>
            <div className="p-12 overflow-y-auto print:overflow-visible font-serif text-slate-900 bg-white flex-1 flex flex-col h-full relative">
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none"><Activity size={400} /></div>
              <header className="flex flex-col items-center border-b-4 border-double border-slate-800 pb-6 mb-8"><h1 className="text-3xl font-bold tracking-widest uppercase text-slate-900">{currentUser?.name || "NOME DO MÉDICO"}</h1><div className="flex items-center gap-2 mt-2 text-sm font-bold text-slate-600 uppercase tracking-wide"><span>CRM: {currentUser?.crm || "00000/UF"}</span><span>•</span><span>CLÍNICA MÉDICA</span></div></header>
              <div className="flex-1 space-y-8">
                {['USO ORAL', 'USO TÓPICO', 'USO RETAL', 'USO INALATÓRIO', 'USO OFTÁLMICO', 'USO OTOLÓGICO'].map((usoType) => {
                  const items = selectedPrescriptionItems.filter(item => item.receita?.uso?.toUpperCase().includes(usoType.replace('USO ', '')) || (usoType === 'USO ORAL' && !item.receita?.uso));
                  if (items.length === 0) return null;
                  return (
                    <div key={usoType}>
                      <div className="flex items-center gap-4 mb-4"><h3 className="font-bold text-lg underline decoration-2 underline-offset-4">{usoType}</h3></div>
                      <ul className="space-y-6 list-none">{items.map((item, index) => (<li key={index} className="relative pl-6"><span className="absolute left-0 top-0 font-bold text-lg">{index + 1}.</span><div className="flex items-end mb-1 w-full"><span className="font-bold text-xl">{item.receita.nome_comercial || item.farmaco}</span><div className="flex-1 mx-2 border-b-2 border-dotted border-slate-400 mb-1.5"></div><span className="font-bold text-lg whitespace-nowrap">{item.receita.quantidade}</span></div><p className="text-base leading-relaxed text-slate-800 mt-1 pl-2 border-l-4 border-slate-200">{item.receita.instrucoes} {item.dias_tratamento ? `(Uso por ${item.dias_tratamento} dias)` : ''}</p></li>))}</ul>
                    </div>
                  )
                })}
              </div>
              <footer className="mt-auto pt-12"><div className="flex justify-between items-end"><div className="text-sm"><p className="font-bold">Data:</p><div className="w-40 border-b border-slate-800 mt-4 text-center relative top-1">{new Date().toLocaleDateString('pt-BR')}</div></div><div className="text-center"><div className="w-64 border-b border-slate-800 mb-2"></div><p className="font-bold uppercase text-sm">{currentUser?.name}</p><p className="text-xs text-slate-500">Assinatura e Carimbo</p></div></div><div className="text-center mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 uppercase">Rua da Medicina, 123 • Centro • Cidade/UF • Tel: (00) 1234-5678</div></footer>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CALCULADORA DE INFUSÃO */}
      {showCalculatorModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-rose-900/30 border-rose-800/50' : 'bg-rose-50 border-rose-100'}`}>
              <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-rose-300' : 'text-rose-800'}`}><Calculator size={20} /> Calculadora de Infusão</h3>
              <button onClick={() => setShowCalculatorModal(false)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-rose-900/50 text-rose-300' : 'hover:bg-rose-100 text-rose-700'}`}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Peso */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Peso do Paciente</label>
                <div className="relative">
                   <input type="number" id="peso" value={calcInputs.peso} onChange={(e) => handleCalcChange('peso', e.target.value)} placeholder="0.0" className={`w-full pl-4 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-rose-500 font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-slate-800'}`} />
                   <span className="absolute right-4 top-3.5 text-xs font-bold text-gray-400">kg</span>
                </div>
              </div>

              {/* Dose */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Dose Desejada</label>
                <div className="flex gap-2">
                   <input type="number" id="dose" value={calcInputs.dose} onChange={(e) => handleCalcChange('dose', e.target.value)} placeholder="0.0" className={`w-1/2 pl-4 py-3 border rounded-xl focus:ring-2 focus:ring-rose-500 font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-slate-800'}`} />
                   <select id="tp_dose" value={calcInputs.tp_dose} onChange={(e) => handleCalcChange('tp_dose', e.target.value)} className={`w-1/2 px-2 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-slate-600'}`}>
                      <option value="mcgmin">mcg/kg/min</option>
                      <option value="mgmin">mg/kg/min</option>
                      <option value="mcgh">mcg/kg/h</option>
                      <option value="mgh">mg/kg/h</option>
                   </select>
                </div>
              </div>

              {/* Concentração */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Concentração da Solução</label>
                <div className="flex gap-2">
                   <input type="number" id="conc" value={calcInputs.conc} onChange={(e) => handleCalcChange('conc', e.target.value)} placeholder="0.0" className={`w-1/2 pl-4 py-3 border rounded-xl focus:ring-2 focus:ring-rose-500 font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-slate-800'}`} />
                   <select id="tp_conc" value={calcInputs.tp_conc} onChange={(e) => handleCalcChange('tp_conc', e.target.value)} className={`w-1/2 px-2 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-slate-600'}`}>
                      <option value="mgml">mg/ml</option>
                      <option value="mcgml">mcg/ml</option>
                   </select>
                </div>
              </div>

              {/* Resultado */}
              <div className={`rounded-xl p-6 text-center mt-6 ${isDarkMode ? 'bg-rose-900/20' : 'bg-rose-100'}`}>
                <span className={`text-xs font-bold uppercase mb-1 block ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>Velocidade de Infusão</span>
                <div id="resultado" className={`text-3xl font-extrabold ${isDarkMode ? 'text-rose-200' : 'text-rose-900'}`}>{calcResult}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IA VISION (ANÁLISE DE IMAGEM) */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-blue-900/30 border-slate-800' : 'bg-blue-600 border-blue-700'}`}>
              <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-blue-300' : 'text-white'}`}><Camera size={24} /> IA Vision - Análise de Exames</h3>
              <button onClick={closeImageModal} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-blue-700 text-white'}`}><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {!imageAnalysisResult ? (
                <div className="space-y-6">
                  {/* Área de Upload */}
                  <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors group ${isDarkMode ? 'border-slate-700 bg-slate-800/50 hover:border-blue-500' : 'border-gray-300 bg-gray-50 hover:border-blue-500'}`}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    />
                    {selectedImage ? (
                      <div className="relative h-64 w-full">
                        <img src={selectedImage} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white px-3 py-1 rounded text-xs">Clique para trocar</div>
                      </div>
                    ) : (
                      <div className="space-y-2 pointer-events-none">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                          <Upload size={32} />
                        </div>
                        <h4 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Arraste ou clique para enviar</h4>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Suporta: ECG, Raio-X, Tomografia, Fotos de Lesões...</p>
                      </div>
                    )}
                  </div>

                  {/* Input de Pergunta */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">O que você deseja saber?</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={imageQuery} 
                        onChange={(e) => setImageQuery(e.target.value)} 
                        placeholder="Ex: Onde está a fratura? / Qual o ritmo deste ECG?" 
                        className={`w-full pl-4 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 font-medium ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-slate-800'}`} 
                      />
                      <Eye className="absolute right-4 top-3 text-gray-400" size={20} />
                    </div>
                  </div>

                  <button 
                    onClick={handleAnalyzeImage} 
                    disabled={isAnalyzingImage || !selectedImage}
                    className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${isAnalyzingImage || !selectedImage ? 'bg-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isAnalyzingImage ? <Loader2 className="animate-spin" /> : <><Camera size={20}/> Analisar Imagem</>}
                  </button>
                  
                  <div className={`border p-3 rounded-lg flex gap-3 items-start ${isDarkMode ? 'bg-yellow-900/20 border-yellow-800/30' : 'bg-yellow-50 border-yellow-100'}`}>
                    <AlertTriangle className={`shrink-0 w-5 h-5 mt-0.5 ${isDarkMode ? 'text-yellow-500' : 'text-yellow-600'}`} />
                    <p className={`text-xs text-justify ${isDarkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                      <strong>Atenção:</strong> As imagens são processadas em tempo real e <strong>deletadas imediatamente</strong> após fechar esta janela. Não substitui a avaliação do radiologista ou especialista.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className={`flex gap-4 items-start p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-black border border-slate-300">
                      <img src={selectedImage} alt="Miniatura" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Sua Pergunta:</span>
                      <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>"{imageQuery}"</p>
                    </div>
                  </div>

                  <div className={`p-6 rounded-xl border shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100'}`}>
                    <h4 className={`font-bold flex items-center gap-2 mb-4 border-b pb-2 ${isDarkMode ? 'text-blue-300 border-slate-600' : 'text-blue-900 border-blue-50'}`}>
                      <Microscope size={20}/> Laudo Preliminar IA
                    </h4>
                    <div className={`prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {imageAnalysisResult}
                    </div>
                  </div>

                  <button 
                    onClick={() => setImageAnalysisResult(null)} 
                    className={`w-full py-3 border-2 rounded-xl font-bold transition-colors ${isDarkMode ? 'border-slate-600 text-slate-400 hover:bg-slate-800' : 'border-gray-200 text-slate-600 hover:bg-gray-50'}`}
                  >
                    Nova Análise
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL BEDSIDE - CLINICAL GUIDANCE */}
      {showBedsideModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-indigo-900/30 border-slate-800' : 'bg-indigo-600 border-indigo-700'}`}>
              <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-indigo-300' : 'text-white'}`}><ClipboardList size={24} /> BedSide - Clinical Guidance</h3>
              <button onClick={() => setShowBedsideModal(false)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-indigo-700 text-white'}`}><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 grid md:grid-cols-2 gap-6">
              {/* Coluna da Esquerda: Inputs */}
              <div className="space-y-4">
                <div>
                  <label className={`text-xs font-bold uppercase mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Anamnese Completa</label>
                  <textarea 
                    className={`w-full h-40 p-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed resize-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-slate-800'}`}
                    placeholder="Descreva a história clínica: ID, QP, HMA, antecedentes, alergias, medicações em uso..."
                    value={bedsideAnamnesis}
                    onChange={(e) => setBedsideAnamnesis(e.target.value)}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Exames Complementares / Sinais Vitais</label>
                  <textarea 
                    className={`w-full h-32 p-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed resize-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-slate-800'}`}
                    placeholder="PA, FC, SatO2, Tax, resultados de laboratório, laudos de imagem..."
                    value={bedsideExams}
                    onChange={(e) => setBedsideExams(e.target.value)}
                  />
                </div>
                <button 
                  onClick={generateBedsideConduct} 
                  disabled={isGeneratingBedside}
                  className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${isGeneratingBedside ? 'bg-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {isGeneratingBedside ? <Loader2 className="animate-spin" /> : <><UserCheck size={20}/> Gerar Conduta Personalizada</>}
                </button>
              </div>

              {/* Coluna da Direita: Resultados */}
              <div className={`rounded-xl border p-4 overflow-y-auto max-h-[600px] ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-indigo-50 border-indigo-100'}`}>
                {!bedsideResult ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <ClipboardList size={48} className="mb-4 text-indigo-400" />
                    <p className="text-sm font-bold">Aguardando dados do caso...</p>
                    <p className="text-xs mt-1 max-w-xs">Preencha a anamnese e exames ao lado para receber uma orientação clínica completa.</p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div>
                      <h4 className={`text-xs font-bold uppercase border-b pb-1 mb-2 ${isDarkMode ? 'text-indigo-300 border-slate-600' : 'text-indigo-800 border-indigo-200'}`}>Hipóteses Diagnósticas</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {bedsideResult.hipoteses_diagnosticas?.map((h, i) => (
                          <li key={i} className="font-bold">{h}</li>
                        ))}
                      </ul>
                    </div>

                    <div className={`p-3 rounded-lg text-sm italic border ${isDarkMode ? 'bg-slate-900/50 border-slate-600 text-slate-300' : 'bg-white border-indigo-100 text-slate-600'}`}>
                      {bedsideResult.racional_clinico}
                    </div>

                    <div>
                      <h4 className={`text-xs font-bold uppercase border-b pb-1 mb-2 flex items-center gap-2 ${isDarkMode ? 'text-emerald-400 border-slate-600' : 'text-emerald-800 border-emerald-200'}`}><Pill size={14}/> Conduta Terapêutica</h4>
                      <div className="space-y-2">
                        {bedsideResult.conduta_terapeutica?.map((item, i) => (
                          <div key={i} className={`p-2 rounded border text-sm flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-600' : 'bg-white border-gray-200'}`}>
                            <span className="font-bold text-xs uppercase opacity-70">{item.tipo}</span>
                            <span className="font-medium">{item.detalhe}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className={`text-xs font-bold uppercase border-b pb-1 mb-2 flex items-center gap-2 ${isDarkMode ? 'text-blue-400 border-slate-600' : 'text-blue-800 border-blue-200'}`}><Search size={14}/> Solicitação de Exames</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {bedsideResult.solicitacao_exames?.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                       <div>
                          <h4 className={`text-xs font-bold uppercase border-b pb-1 mb-2 ${isDarkMode ? 'text-slate-400 border-slate-600' : 'text-slate-600 border-gray-200'}`}>Cuidados Gerais</h4>
                          <ul className="text-xs space-y-1 list-disc list-inside">
                             {bedsideResult.cuidados_gerais?.map((c, i) => <li key={i}>{c}</li>)}
                          </ul>
                       </div>
                       <div>
                          <h4 className={`text-xs font-bold uppercase border-b pb-1 mb-2 ${isDarkMode ? 'text-slate-400 border-slate-600' : 'text-slate-600 border-gray-200'}`}>Orientações</h4>
                          <ul className="text-xs space-y-1 list-disc list-inside">
                             {bedsideResult.orientacoes_paciente?.map((o, i) => <li key={i}>{o}</li>)}
                          </ul>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FAVORITOS */}
      {showFavoritesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-yellow-900/20 border-yellow-800/30' : 'bg-yellow-50 border-yellow-100'}`}>
              <div className={`flex items-center gap-2 font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-800'}`}><Star size={20} fill="currentColor" /> Meus Favoritos</div>
              <button onClick={() => setShowFavoritesModal(false)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-yellow-100 text-yellow-700'}`}><X size={20} /></button>
            </div>
            <div className={`p-2 max-h-[60vh] overflow-y-auto ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
              {favorites.length === 0 ? (<div className="text-center p-8 text-slate-400 text-sm">Você ainda não tem favoritos.</div>) : (<div className="space-y-2">{favorites.map((fav) => (<div key={fav.id} className={`p-3 rounded-lg border shadow-sm flex items-center justify-between group transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}><button onClick={() => loadFavoriteConduct(fav)} className="flex-1 text-left"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full shrink-0 ${fav.room === 'verde' ? 'bg-emerald-500' : fav.room === 'amarela' ? 'bg-amber-500' : 'bg-rose-500'}`} /><span className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{fav.query}</span></div><span className="text-[10px] text-slate-400 ml-4">{new Date(fav.lastAccessed).toLocaleDateString()}</span></button><button onClick={(e) => { e.stopPropagation(); removeFavoriteFromList(fav.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Remover"><Trash2 size={16} /></button></div>))}</div>)}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BLOCO DE NOTAS */}
      {showNotepad && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 print:hidden">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><Edit size={20} /></div><div><h3 className={`font-bold leading-none ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Meu Caderno</h3><div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">Anotações de {currentUser?.name}</span><span className="text-gray-300">•</span>{isCloudConnected ? (<span className="flex items-center gap-1 text-[10px] text-green-600 font-medium"><Cloud size={10} /> Nuvem Ativa</span>) : (<span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium"><CloudOff size={10} /> Offline</span>)}</div></div></div>
              <button onClick={() => setShowNotepad(false)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}><X size={20}/></button>
            </div>
            <div className={`flex-1 relative ${isDarkMode ? 'bg-slate-800' : 'bg-yellow-50'}`}><textarea className={`w-full h-full p-6 resize-none focus:outline-none leading-relaxed bg-transparent text-lg font-medium font-serif ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`} placeholder="Escreva suas anotações..." value={userNotes} onChange={handleNoteChange} style={{ backgroundImage: isDarkMode ? 'linear-gradient(transparent, transparent 31px, #334155 31px)' : 'linear-gradient(transparent, transparent 31px, #e5e7eb 31px)', backgroundSize: '100% 32px', lineHeight: '32px' }} /></div>
            <div className={`p-3 border-t flex justify-between items-center text-xs text-gray-500 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}><div className="flex items-center gap-1.5">{isSaving ? (<><Loader2 size={14} className="text-blue-600 animate-spin" /><span className="text-blue-600">Salvando...</span></>) : (<><Save size={14} className="text-green-600" /><span>{isCloudConnected ? "Salvo na nuvem" : "Salvo localmente"}</span></>)}</div><span>{userNotes.length} caracteres</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
