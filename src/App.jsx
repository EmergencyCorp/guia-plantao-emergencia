import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, AlertCircle, Search, Clock, Pill, FileText, Loader2, BookOpen, 
  Stethoscope, ClipboardCheck, AlertTriangle, ArrowRight, X, User, 
  CheckCircle2, Thermometer, Syringe, Siren, FlaskConical, Tag, Package,
  ShieldAlert, LogOut, Lock, Shield, History, LogIn, KeyRound, Edit, Save, Cloud, CloudOff, Settings, Info,
  HeartPulse, Microscope, Image as ImageIcon, FileDigit, ScanLine, Wind, Droplet, Timer, Skull, Printer, FilePlus, Calculator,
  Tablets, Syringe as SyringeIcon, Droplets, Pipette, Star, Trash2, SprayCan
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
  query, 
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

const AUTHORIZED_USERS = [
  { username: 'admin', password: '123', name: 'Dr. Administrador', role: 'Diretor Clínico', crm: '12345-MG' },
  { username: 'medico', password: 'med', name: 'Dr. Plantonista', role: 'Médico Assistente', crm: '67890-SP' },
  { username: 'interno', password: 'int', name: 'Acadêmico', role: 'Interno', crm: 'Estudante' }
];

export default function EmergencyGuideApp() {
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
  const [favorites, setFavorites] = useState([]); // Estado para lista de favoritos
  const [errorMsg, setErrorMsg] = useState('');
  const resultsRef = useRef(null);

  const [showNotepad, setShowNotepad] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false); // Modal de favoritos
  const [userNotes, setUserNotes] = useState('');

  const [selectedPrescriptionItems, setSelectedPrescriptionItems] = useState([]);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [patientWeight, setPatientWeight] = useState('');

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
        setCurrentUser(parsedUser);
        loadHistory(parsedUser.username);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (currentUser && isCloudConnected) {
      fetchNotesFromCloud(currentUser.username);
      fetchHistoryFromCloud(currentUser.username);
      subscribeToFavorites(currentUser.username); // Listener em tempo real para favoritos
    } else if (currentUser) {
      const localNotes = localStorage.getItem(`notes_${currentUser.username}`);
      if (localNotes) setUserNotes(localNotes);
      loadLocalHistory(currentUser.username);
    }
  }, [currentUser, isCloudConnected]);

  useEffect(() => {
    setSelectedPrescriptionItems([]);
    setPatientWeight('');
    
    // Verifica se a conduta atual está nos favoritos para pintar a estrelinha
    if (conduct && favorites.length > 0) {
      const docId = getConductDocId(conduct.condicao || searchQuery, activeRoom);
      const isFav = favorites.some(f => f.id === docId || f.query === searchQuery);
      setIsCurrentConductFavorite(isFav);
    } else {
      setIsCurrentConductFavorite(false);
    }
  }, [conduct, favorites]);

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
              author: currentUser.name,
              username: currentUser.username
            }, { merge: true });
          } catch (error) { console.error(error); } 
          finally { setIsSaving(false); }
        }
      }
    }, 1500);
    return () => clearTimeout(delayDebounceFn);
  }, [userNotes, currentUser]);

  const handleNoteChange = (e) => setUserNotes(e.target.value);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    const foundUser = AUTHORIZED_USERS.find(u => u.username.toLowerCase() === usernameInput.toLowerCase() && u.password === passwordInput);
    if (foundUser) {
      setCurrentUser(foundUser);
      localStorage.setItem('emergency_app_user', JSON.stringify(foundUser));
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setLoginError('Credenciais inválidas.');
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
        return [...prev, med];
      }
    });
  };

  // --- LÓGICA DE CACHE E FAVORITOS ---
  const getConductDocId = (query, room) => {
    return `${query.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${room}`;
  };

  // Listener em tempo real para a lista de favoritos
  const subscribeToFavorites = (username) => {
      if (!db) return;
      
      const favoritesRef = collection(db, 'artifacts', appId, 'users', username, 'conducts');
      const q = query(favoritesRef, where("isFavorite", "==", true));

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
      const q = query(conductsRef, where("isFavorite", "==", false), orderBy("lastAccessed", "desc"));
      
      const snapshot = await getDocs(q);
      if (snapshot.size > 10) {
        const docsToDelete = snapshot.docs.slice(10);
        const deletePromises = docsToDelete.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }
    } catch (error) { console.error("Erro ao limpar cache:", error); }
  };

  const generateConduct = async () => {
    if (!searchQuery.trim()) {
      showError('Digite uma condição clínica.');
      return;
    }
    
    setLoading(true);
    setConduct(null);
    setErrorMsg('');
    setIsCurrentConductFavorite(false);

    const docId = getConductDocId(searchQuery, activeRoom);

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
          saveToHistory(searchQuery, activeRoom);
          setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
          return;
        }
      } catch (error) { console.error("Erro cache:", error); }
    }

    const roomContext = activeRoom === 'verde' ? 'SALA VERDE (AMBULATORIAL)' : 'SALA VERMELHA (EMERGÊNCIA)';
    
    let promptExtra = "";
    if (activeRoom === 'verde') {
      promptExtra += `
      IMPORTANTE (SALA VERDE):
      Para cada item em "tratamento_medicamentoso", inclua um objeto "receita":
      "receita": {
         "uso": "USO ORAL/TÓPICO/etc",
         "nome_comercial": "Nome + Concentração",
         "quantidade": "Qtd total (ex: 1 cx)",
         "instrucoes": "Posologia para o paciente"
      }
      `;
    }

    if (activeRoom === 'vermelha') {
      promptExtra += `
      IMPORTANTE (SALA VERMELHA - CÁLCULO DE VOLUME):
      Para drogas tituláveis por peso (ex: Sedação, Aminas, Trombólise):
      1. "usa_peso": true
      2. "dose_padrao_kg": número (ex: 0.3)
      3. "unidade_base": "mg/kg"
      4. "concentracao_mg_ml": NÚMERO (ex: 5 para 5mg/ml)
      5. "diluicao_contexto": Texto explicativo (ex: "1 amp em 100ml")
      `;
    }

    const promptText = `Atue como médico especialista em emergência.
    Gere conduta clínica para "${searchQuery}" na ${roomContext}.
    ${promptExtra}
    
    REGRAS RÍGIDAS:
    1. JSON puro.
    2. "tratamento_medicamentoso": ARRAY de objetos. Se um mesmo fármaco tiver apresentações diferentes (ex: Dipirona Comp vs Gotas), separe em objetos distintos.
    3. "tipo": CAMPO OBRIGATÓRIO E RÍGIDO. Escolha EXATAMENTE UM DA LISTA: ['Comprimido', 'Cápsula', 'Xarope', 'Suspensão', 'Gotas', 'Solução Oral', 'Injetável', 'Tópico', 'Inalatório', 'Supositório'].
    4. "farmaco": Nome + Concentração (Ex: "Dipirona 500mg").
    5. "criterios_internacao/alta": OBRIGATÓRIOS.
    
    ESTRUTURA JSON:
    {
      "condicao": "Nome",
      "estadiamento": "Classificação",
      "classificacao": "${roomContext}",
      "resumo_clinico": "Texto técnico...",
      "xabcde_trauma": null, 
      "avaliacao_inicial": { 
        "sinais_vitais_alvos": ["PAM > 65mmHg", "SatO2 > 94%"], 
        "exames_prioridade1": ["..."], 
        "exames_complementares": ["..."] 
      },
      "achados_exames": { "ecg": "...", "laboratorio": "...", "imagem": "..." },
      "criterios_gravidade": ["..."],
      "tratamento_medicamentoso": [ 
        { 
          "farmaco": "Nome + Concentração", 
          "tipo": "Comprimido", // USE A LISTA RÍGIDA
          "sugestao_uso": "Texto descritivo...",
          "diluicao": "...",
          "modo_admin": "...",
          "cuidados": "...", 
          "indicacao": "...",
          "receita": { ... }, 
          "usa_peso": false, 
          "dose_padrao_kg": 0,
          "unidade_base": "mg/kg",
          "concentracao_mg_ml": 0,
          "diluicao_contexto": "..."
        } 
      ],
      "escalonamento_terapeutico": [ { "passo": "1ª Linha", "descricao": "..." } ],
      "medidas_gerais": ["..."],
      "criterios_internacao": ["..."],
      "criterios_alta": ["..."],
      "guideline_referencia": "Fonte"
    }
    Doses adulto 70kg.`;

    try {
      const apiKey = (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) ? import.meta.env.VITE_GEMINI_API_KEY : "";
      if(!apiKey) throw new Error("API Key do Gemini não configurada.");

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) throw new Error('Erro na API');
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (text) {
        const parsedConduct = JSON.parse(text);
        setConduct(parsedConduct);
        
        if (isCloudConnected && currentUser) {
          const docRef = doc(db, 'artifacts', appId, 'users', currentUser.username, 'conducts', docId);
          await setDoc(docRef, {
            query: searchQuery,
            room: activeRoom,
            conductData: parsedConduct,
            isFavorite: false,
            lastAccessed: new Date().toISOString()
          });
          manageCacheLimit(currentUser.username);
        }

        saveToHistory(searchQuery, activeRoom);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
      }
    } catch (error) {
      console.error(error);
      showError(error.message);
    } finally {
      setLoading(false);
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
    if (t.includes('comp') || t.includes('cap') || t.includes('oral')) return <Tablets size={14} className="text-emerald-500" />;
    if (t.includes('tópi') || t.includes('pomada') || t.includes('creme')) return <Pipette size={14} className="text-amber-500" />;
    if (t.includes('inal') || t.includes('spray')) return <SprayCan size={14} className="text-purple-500" />;
    return <Pill size={14} className="text-slate-500" />;
  };

  // Função Helper para definir cor da badge de tipo
  const getMedTypeColor = (type) => {
    if (!type) return 'bg-slate-100 text-slate-500 border-slate-200';
    const t = type.toLowerCase();
    if (t.includes('injet')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (t.includes('gota') || t.includes('solu') || t.includes('xarope')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (t.includes('comp') || t.includes('cap')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (t.includes('tópi')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  // Função Helper para fallback de tipo
  const inferMedType = (med) => {
    if (med.tipo && med.tipo !== "N/A") return med.tipo;
    
    // Tenta adivinhar pelo nome ou via
    const name = med.farmaco?.toLowerCase() || "";
    const via = med.via?.toLowerCase() || ""; // A IA as vezes manda 'via' separado

    if (via.includes('ev') || via.includes('iv') || via.includes('im') || via.includes('sc')) return "Injetável";
    if (name.includes('gotas')) return "Gotas";
    if (name.includes('xarope')) return "Xarope";
    if (name.includes('comprimido')) return "Comprimido";
    if (name.includes('creme') || name.includes('pomada')) return "Tópico";
    
    return "Medicamento"; // Fallback final
  };

  const roomConfig = {
    verde: { name: 'Sala Verde', color: 'emerald', accent: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-800', light: 'bg-emerald-50', icon: <Stethoscope className="w-5 h-5" />, description: 'Ambulatorial / Baixa Complexidade' },
    vermelha: { name: 'Sala Vermelha', color: 'rose', accent: 'bg-rose-600', border: 'border-rose-600', text: 'text-rose-800', light: 'bg-rose-50', icon: <Siren className="w-5 h-5" />, description: 'Emergência / Risco de Vida' }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-br from-blue-900 to-slate-800 p-8 text-center text-white relative">
            <Shield size={40} className="mx-auto mb-3 text-blue-300" />
            <h1 className="text-2xl font-bold mb-1">Guia de Plantão</h1>
            <p className="text-blue-200 text-sm font-medium">Acesso Exclusivo Médico</p>
          </div>
          <div className="p-8 space-y-6">
            {loginError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2 border border-red-100"><AlertCircle size={14} /> {loginError}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Usuário</label><div className="relative"><User className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input type="text" value={usernameInput} onChange={(e)=>setUsernameInput(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-900" placeholder="Ex: admin" /></div></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Senha</label><div className="relative"><KeyRound className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input type="password" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-900" placeholder="••••••" /></div></div>
              <button type="submit" className="w-full flex items-center justify-center gap-3 bg-blue-900 text-white font-bold p-3.5 rounded-xl hover:bg-blue-800 transition-all shadow-lg mt-2"><LogIn className="w-5 h-5" /> Acessar Sistema</button>
            </form>
            <div className="text-center flex flex-col items-center gap-3 pt-2 border-t border-gray-100">
              <div className={`flex items-center justify-center gap-2 text-[10px] px-3 py-1.5 rounded-full mx-auto w-fit ${configStatus === 'missing' ? 'bg-red-50 text-red-700' : isCloudConnected ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{configStatus === 'missing' ? <Settings size={12}/> : isCloudConnected ? <Cloud size={12}/> : <CloudOff size={12}/>}<span>{configStatus === 'missing' ? 'Erro: Variáveis de Ambiente' : isCloudConnected ? 'Banco de Dados Conectado' : 'Modo Offline (Dados Locais)'}</span></div>
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
          <div className="flex items-center gap-3"><div className="bg-blue-900 p-2 rounded-lg text-white"><ClipboardCheck size={20} /></div><div><h1 className="text-lg font-bold text-slate-800 leading-none">Guia de Plantão</h1><span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Suporte Médico</span></div></div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex flex-col items-end mr-2"><span className="text-xs font-bold text-slate-700">{currentUser.name}</span><span className="text-[10px] text-slate-400 uppercase">{currentUser.role}</span></div>
             
             {/* BOTÃO MEUS FAVORITOS */}
             <button onClick={() => setShowFavoritesModal(true)} className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-full transition-colors" title="Meus Favoritos"><Star size={20} /></button>
             
             <button onClick={() => setShowNotepad(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full"><Edit size={20} /></button>
             <button onClick={handleLogout} className="p-2 text-red-400 hover:bg-red-50 rounded-full"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 space-y-8 w-full relative">
        {/* BOTÃO FLUTUANTE DE RECEITA (SÓ SALA VERDE) */}
        {activeRoom === 'verde' && selectedPrescriptionItems.length > 0 && (
          <button 
            onClick={() => setShowPrescriptionModal(true)}
            className="fixed bottom-8 right-8 z-50 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-full shadow-xl flex items-center gap-3 font-bold transition-all animate-in slide-in-from-bottom-4"
          >
            <Printer size={24} />
            Gerar Receita ({selectedPrescriptionItems.length})
          </button>
        )}

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
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mr-2">
                <History size={14} /> Recentes
              </div>
              {recentSearches.map((search, idx) => (
                <button 
                  key={idx} 
                  onClick={() => {setActiveRoom(search.room); setSearchQuery(search.query);}} 
                  className="flex items-center gap-2 text-xs px-3 py-1 bg-white border border-gray-200 rounded-full hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${search.room === 'verde' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {search.query}
                </button>
              ))}
            </div>
          )}
          {errorMsg && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200 flex items-center gap-3 text-sm font-medium"><AlertCircle size={18} /> {errorMsg}</div>}
        </div>

        {conduct && (
          <div ref={resultsRef} className="animate-in slide-in-from-bottom-4 fade-in duration-500 space-y-6">
            <div className="flex justify-between items-start">
               <div>
                  <div className="flex flex-wrap gap-2 mb-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${activeRoom === 'verde' ? 'bg-emerald-500' : 'bg-rose-600'}`}>{conduct.classificacao}</span>{conduct.estadiamento && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-white">{conduct.estadiamento}</span>}</div>
                  <h2 className="text-3xl font-bold text-slate-800">{conduct.condicao}</h2>
                  {conduct.guideline_referencia && (<p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><BookOpen size={12} /> Fonte: <span className="font-medium">{conduct.guideline_referencia}</span></p>)}
               </div>
               <div className="flex gap-2">
                 {/* BOTÃO FAVORITAR */}
                 <button 
                    onClick={toggleFavorite} 
                    className={`p-2 rounded-full transition-colors ${isCurrentConductFavorite ? 'bg-yellow-100 text-yellow-500 hover:bg-yellow-200' : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-400'}`}
                    title={isCurrentConductFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
                 >
                    <Star size={24} fill={isCurrentConductFavorite ? "currentColor" : "none"} />
                 </button>
                 <button onClick={() => setConduct(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={24}/></button>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex gap-4">
               <div className="bg-blue-50 p-2 rounded-full h-fit text-blue-600"><User size={24} /></div>
               <div><h3 className="font-bold text-slate-900 mb-1">Resumo Clínico e Fisiopatologia</h3><p className="text-slate-700 leading-relaxed text-sm">{conduct.resumo_clinico}</p></div>
            </div>

            {conduct.xabcde_trauma && (
              <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl">
                <h3 className="text-orange-900 font-bold flex items-center gap-2 mb-3 uppercase tracking-wide"><Skull size={20}/> Protocolo de Trauma (ATLS - xABCDE)</h3>
                <div className="space-y-3">{Object.entries(conduct.xabcde_trauma).map(([key, value]) => (<div key={key} className="flex gap-3 items-start bg-white/60 p-2 rounded border border-orange-100"><div className="bg-orange-600 text-white w-6 h-6 rounded flex items-center justify-center font-bold uppercase text-xs shrink-0">{key}</div><p className="text-sm text-orange-950">{value}</p></div>))}</div>
              </div>
            )}

            {conduct.criterios_gravidade?.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl">
                <h3 className="text-rose-800 font-bold flex items-center gap-2 mb-3 text-sm uppercase"><AlertTriangle size={18}/> Sinais de Alarme</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">{conduct.criterios_gravidade.map((crit, i) => (<div key={i} className="bg-white/80 p-2.5 rounded-lg border border-rose-100/50 text-sm text-rose-900 font-medium flex gap-2"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"/>{crit}</div>))}</div>
              </div>
            )}

            {activeRoom === 'vermelha' && (
              <div className="bg-rose-100 border-l-4 border-rose-600 p-4 rounded shadow-sm flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold"><Calculator size={20} /><span>Cálculo de Doses (Peso)</span></div>
                <div className="flex items-center gap-2 flex-1 w-full">
                  <input type="number" value={patientWeight} onChange={(e) => setPatientWeight(e.target.value)} placeholder="Peso (kg)" className="px-4 py-2 rounded border border-rose-300 focus:ring-2 focus:ring-rose-500 w-full md:w-48 text-slate-800 font-bold" />
                  <span className="text-xs text-rose-700">*Insira o peso para calcular doses automaticamente</span>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 space-y-6">
                {/* AVALIAÇÃO E ALVOS */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2"><Activity size={18} className="text-slate-500"/><h3 className="font-bold text-slate-700 text-sm uppercase">Avaliação Inicial</h3></div>
                   <div className="p-5 space-y-5 text-sm">
                      {conduct.avaliacao_inicial?.sinais_vitais_alvos && (<div><span className="text-xs font-bold text-slate-400 uppercase block mb-2">Alvos Terapêuticos</span><div className="grid grid-cols-1 gap-2">{conduct.avaliacao_inicial.sinais_vitais_alvos.map((s,i)=>(<div key={i} className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex items-center gap-3 text-indigo-900">{getVitalIcon(s)} <span className="font-bold">{s}</span></div>))}</div></div>)}
                      <div className="space-y-3">
                         <div><span className="text-xs font-bold text-rose-600 uppercase block mb-1">Prioridade 1 (Obrigatórios)</span><ul className="space-y-1">{conduct.avaliacao_inicial?.exames_prioridade1?.map((ex,i)=><li key={i} className="flex gap-2 items-start font-medium text-slate-700"><div className="mt-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"/>{ex}</li>)}</ul></div>
                         <div><span className="text-xs font-bold text-slate-400 uppercase block mb-1">Complementares</span><ul className="space-y-1">{conduct.avaliacao_inicial?.exames_complementares?.map((ex,i)=><li key={i} className="flex gap-2 items-start text-slate-500"><div className="mt-1.5 w-1.5 h-1.5 bg-slate-300 rounded-full shrink-0"/>{ex}</li>)}</ul></div>
                      </div>
                   </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-blue-50 px-5 py-3 border-b border-blue-100 flex items-center gap-2"><Search size={18} className="text-blue-600"/><h3 className="font-bold text-blue-900 text-sm uppercase">Investigação Diagnóstica</h3></div>
                   <div className="p-5 space-y-4 text-sm">
                      {conduct.achados_exames?.ecg && <div><div className="flex items-center gap-2 font-bold text-slate-700 mb-1"><HeartPulse size={14} className="text-rose-500"/> ECG</div><p className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">{conduct.achados_exames.ecg}</p></div>}
                      {conduct.achados_exames?.laboratorio && <div><div className="flex items-center gap-2 font-bold text-slate-700 mb-1"><Microscope size={14} className="text-purple-500"/> Laboratório</div><p className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">{conduct.achados_exames.laboratorio}</p></div>}
                      {conduct.achados_exames?.imagem && <div><div className="flex items-center gap-2 font-bold text-slate-700 mb-1"><ImageIcon size={14} className="text-slate-500"/> Imagem</div><p className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">{conduct.achados_exames.imagem}</p></div>}
                   </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100 flex items-center gap-2"><FileText size={18} className="text-indigo-600"/><h3 className="font-bold text-indigo-900 text-sm uppercase">Critérios de Desfecho</h3></div>
                   <div className="p-5 space-y-4 text-sm">
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-100"><span className="text-xs font-bold text-amber-800 uppercase block mb-1">Internação / UTI</span><ul className="space-y-1">{conduct.criterios_internacao?.map((c,i)=><li key={i} className="text-amber-900 flex gap-2"><div className="mt-1.5 w-1 h-1 bg-amber-500 rounded-full shrink-0"/>{c}</li>)}</ul></div>
                      <div className="bg-green-50 p-3 rounded-lg border border-green-100"><span className="text-xs font-bold text-green-800 uppercase block mb-1">Critérios de Alta</span><ul className="space-y-1">{conduct.criterios_alta?.map((c,i)=><li key={i} className="text-green-900 flex gap-2"><div className="mt-1.5 w-1 h-1 bg-green-500 rounded-full shrink-0"/>{c}</li>)}</ul></div>
                   </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-emerald-800 mb-2 px-2"><div className="bg-emerald-100 p-1.5 rounded"><Pill size={18}/></div><h3 className="font-bold text-lg">Prescrição e Conduta</h3></div>
                   {conduct.tratamento_medicamentoso?.map((med, idx) => {
                     const itemId = med.farmaco + (med.receita?.nome_comercial || "");
                     const isSelected = selectedPrescriptionItems.some(item => (item.farmaco + (item.receita?.nome_comercial || "")) === itemId);
                     const canSelect = activeRoom === 'verde' && med.receita;
                     const medType = inferMedType(med); // Corrige "N/A" automaticamente
                     const isInjectable = medType.toLowerCase().includes('injet');
                     
                     let doseFinal = null;
                     let volumeFinal = null;
                     
                     if (activeRoom === 'vermelha' && med.usa_peso && patientWeight && med.dose_padrao_kg) {
                       const doseNum = parseFloat(med.dose_padrao_kg) * parseFloat(patientWeight);
                       doseFinal = doseNum.toFixed(1) + " " + med.unidade_base.split('/')[0];
                       
                       if (med.concentracao_mg_ml) {
                         const vol = doseNum / parseFloat(med.concentracao_mg_ml);
                         volumeFinal = vol.toFixed(1) + " ml";
                       }
                     }

                     return (
                       <div 
                         key={idx} 
                         onClick={() => canSelect && togglePrescriptionItem(med)}
                         className={`bg-white rounded-xl border p-5 shadow-sm transition-all relative overflow-hidden group ${canSelect ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''} ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'border-gray-200'}`}
                       >
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isSelected ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                          
                          {canSelect && (
                            <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-transparent'}`}>
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                          
                          <div className="absolute top-4 right-12">
                             <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getMedTypeColor(medType)}`}>
                                {getMedTypeIcon(medType)} {medType}
                             </span>
                          </div>

                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3 pl-3 pr-20">
                             <div>
                                <div className="flex items-center gap-2">
                                   <h4 className="text-xl font-bold text-slate-800">{med.farmaco}</h4>
                                </div>
                                <span className="text-sm text-slate-500 italic">{med.indicacao}</span>
                             </div>
                             {med.via && <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">{med.via}</span>}
                          </div>
                          
                          <div className="bg-slate-50 rounded-lg p-3 ml-3 mb-3 font-mono text-sm text-slate-700 border border-slate-100">
                             <strong>Sugestão de Uso:</strong> {med.sugestao_uso || med.dose}
                          </div>

                          {activeRoom === 'vermelha' && med.usa_peso && (
                            <div className="bg-rose-50 rounded-lg p-3 ml-3 mb-3 border border-rose-100">
                               <div className="flex justify-between items-center mb-1">
                                 <span className="text-xs font-bold text-rose-800 uppercase">Dose Calculada ({patientWeight || '?'}kg):</span>
                                 <span className="text-[10px] text-rose-600">Ref: {med.dose_padrao_kg} {med.unidade_base}</span>
                               </div>
                               <div className="flex gap-4">
                                  {doseFinal ? <span className="text-lg font-bold text-rose-900">{doseFinal}</span> : <span className="italic text-sm text-rose-400">Insira o peso</span>}
                                  {volumeFinal && <span className="text-lg font-bold text-rose-700 border-l pl-4 border-rose-200">Volume: {volumeFinal}</span>}
                               </div>
                               {med.diluicao_contexto && <div className="text-[10px] text-rose-500 mt-1 bg-white/50 p-1 rounded">{med.diluicao_contexto}</div>}
                            </div>
                          )}

                          <div className="grid sm:grid-cols-2 gap-4 ml-3 text-sm">
                             {isInjectable && med.diluicao && (
                               <div className="flex gap-2 text-blue-700"><FlaskConical size={16} className="shrink-0 mt-0.5"/><span><strong>Diluição:</strong> {med.diluicao}</span></div>
                             )}
                             {isInjectable && med.modo_admin && (
                               <div className="flex gap-2 text-purple-700"><Timer size={16} className="shrink-0 mt-0.5"/><span><strong>Infusão:</strong> {med.modo_admin} {med.tempo_infusao ? `(${med.tempo_infusao})` : ''}</span></div>
                             )}
                             {med.cuidados && <div className="flex gap-2 text-amber-700 col-span-2"><AlertTriangle size={16} className="shrink-0 mt-0.5"/><span><strong>Atenção:</strong> {med.cuidados}</span></div>}
                          </div>
                       </div>
                     );
                   })}
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

      {/* MODAL DE RECEITUÁRIO (VISUAL PROFISSIONAL) */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:h-full print:rounded-none print:shadow-none">
            <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center print:hidden">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><FilePlus size={20} /> Gerador de Receituário</h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"><Printer size={16}/> Imprimir</button>
                <button onClick={() => setShowPrescriptionModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-lg transition-colors"><X size={20}/></button>
              </div>
            </div>
            <div className="p-12 overflow-y-auto print:overflow-visible font-serif text-slate-900 bg-white flex-1 flex flex-col h-full relative">
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none"><Activity size={400} /></div>
              <header className="flex flex-col items-center border-b-4 border-double border-slate-800 pb-6 mb-8">
                <h1 className="text-3xl font-bold tracking-widest uppercase text-slate-900">{currentUser?.name || "NOME DO MÉDICO"}</h1>
                <div className="flex items-center gap-2 mt-2 text-sm font-bold text-slate-600 uppercase tracking-wide"><span>CRM: {currentUser?.crm || "00000/UF"}</span><span>•</span><span>CLÍNICA MÉDICA</span></div>
              </header>
              <div className="flex-1 space-y-8">
                {['USO ORAL', 'USO TÓPICO', 'USO RETAL', 'USO INALATÓRIO', 'USO OFTÁLMICO', 'USO OTOLÓGICO'].map((usoType) => {
                  const items = selectedPrescriptionItems.filter(item => item.receita?.uso?.toUpperCase().includes(usoType.replace('USO ', '')) || (usoType === 'USO ORAL' && !item.receita?.uso));
                  if (items.length === 0) return null;
                  return (
                    <div key={usoType}>
                      <div className="flex items-center gap-4 mb-4"><h3 className="font-bold text-lg underline decoration-2 underline-offset-4">{usoType}</h3></div>
                      <ul className="space-y-6 list-none">
                        {items.map((item, index) => (
                          <li key={index} className="relative pl-6">
                            <span className="absolute left-0 top-0 font-bold text-lg">{index + 1}.</span>
                            <div className="flex items-end mb-1 w-full"><span className="font-bold text-xl">{item.receita.nome_comercial}</span><div className="flex-1 mx-2 border-b-2 border-dotted border-slate-400 mb-1.5"></div><span className="font-bold text-lg whitespace-nowrap">{item.receita.quantidade}</span></div>
                            <p className="text-base leading-relaxed text-slate-800 mt-1 pl-2 border-l-4 border-slate-200">{item.receita.instrucoes}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
              <footer className="mt-auto pt-12">
                <div className="flex justify-between items-end">
                  <div className="text-sm"><p className="font-bold">Data:</p><div className="w-40 border-b border-slate-800 mt-4 text-center relative top-1">{new Date().toLocaleDateString('pt-BR')}</div></div>
                  <div className="text-center"><div className="w-64 border-b border-slate-800 mb-2"></div><p className="font-bold uppercase text-sm">{currentUser?.name}</p><p className="text-xs text-slate-500">Assinatura e Carimbo</p></div>
                </div>
                <div className="text-center mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 uppercase">Rua da Medicina, 123 • Centro • Cidade/UF • Tel: (00) 1234-5678</div>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FAVORITOS (NOVO) */}
      {showFavoritesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex justify-between items-center">
              <div className="flex items-center gap-2 text-yellow-800 font-bold">
                <Star size={20} fill="currentColor" /> Meus Favoritos
              </div>
              <button onClick={() => setShowFavoritesModal(false)} className="p-2 hover:bg-yellow-100 rounded-full text-yellow-700 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto bg-slate-50">
              {favorites.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-sm">Você ainda não tem favoritos.</div>
              ) : (
                <div className="space-y-2">
                  {favorites.map((fav) => (
                    <div key={fav.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-colors">
                      <button onClick={() => loadFavoriteConduct(fav)} className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${fav.room === 'verde' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="font-bold text-slate-700 text-sm">{fav.query}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 ml-4">{new Date(fav.lastAccessed).toLocaleDateString()}</span>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFavoriteFromList(fav.id); }}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BLOCO DE NOTAS */}
      {showNotepad && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 print:hidden">
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
