import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, AlertCircle, Search, Clock, Pill, FileText, Loader2, BookOpen, 
  Stethoscope, ClipboardCheck, AlertTriangle, ArrowRight, X, User, 
  CheckCircle2, Thermometer, Syringe, Siren, FlaskConical, Tag, Package,
  ShieldAlert, LogOut, Lock, Shield, History, LogIn, KeyRound, Edit, Save, Cloud, CloudOff, Settings, Info,
  HeartPulse, Microscope, Image as ImageIcon, FileDigit, ScanLine, Wind, Droplet, Timer, Skull, Printer, FilePlus, Calculator,
  Tablets, Syringe as SyringeIcon, Droplets, Pipette, Star, Trash2, SprayCan, CalendarDays
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, collection, 
  query as firestoreQuery, where, orderBy, limit, getDocs, deleteDoc, onSnapshot
} from 'firebase/firestore';

// --- CONFIGURAÇÃO FIREBASE ---
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
    if (typeof __firebase_config !== 'undefined') return JSON.parse(__firebase_config);
  } catch (e) { console.error(e); }
  return null;
};

const firebaseConfig = getFirebaseConfig();
let app, auth, db;
if (firebaseConfig?.apiKey) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const appId = (typeof __app_id !== 'undefined') ? __app_id : 'emergency-guide-app';
const initialToken = (typeof __initial_auth_token !== 'undefined') ? __initial_auth_token : null;

export default function EmergencyGuideApp() {
  // Estados Globais
  const [currentUser, setCurrentUser] = useState(null);
  const [activeRoom, setActiveRoom] = useState('verde');
  const [searchQuery, setSearchQuery] = useState('');
  const [conduct, setConduct] = useState(null);
  
  // Estados UI/UX
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [configStatus, setConfigStatus] = useState('verificando');
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dados Persistentes
  const [recentSearches, setRecentSearches] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [userNotes, setUserNotes] = useState('');
  
  // Modais e Ferramentas
  const [showNotepad, setShowNotepad] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  
  // Estados Específicos (Receita e Calculadora)
  const [selectedPrescriptionItems, setSelectedPrescriptionItems] = useState([]);
  const [patientWeight, setPatientWeight] = useState('');
  const [isCurrentConductFavorite, setIsCurrentConductFavorite] = useState(false);

  const resultsRef = useRef(null);

  // --- INICIALIZAÇÃO E AUTH ---
  useEffect(() => {
    if (!firebaseConfig?.apiKey) { setConfigStatus('missing'); return; }
    setConfigStatus('ok');
    if (!auth) return;

    const initAuth = async () => {
      try {
        if (initialToken) await signInWithCustomToken(auth, initialToken);
        else await signInAnonymously(auth);
      } catch (e) { console.error("Auth err:", e); }
    };
    initAuth();

    return onAuthStateChanged(auth, (user) => {
      setIsCloudConnected(!!user);
      if(user) setFirebaseUser(user);
    });
  }, []);

  // Carregar sessão e dados iniciais
  useEffect(() => {
    const saved = localStorage.getItem('emergency_app_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        loadUserData(user.username);
      } catch (e) {}
    }
  }, []);

  // Listener de Favoritos e Sync de Dados
  useEffect(() => {
    if (currentUser && isCloudConnected && db) {
      // Sync Favoritos em Tempo Real
      const q = firestoreQuery(collection(db, 'artifacts', appId, 'users', currentUser.username, 'conducts'), where("isFavorite", "==", true));
      const unsubFav = onSnapshot(q, (snap) => {
        setFavorites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Sync Notas e Histórico (One-off)
      fetchUserDataFromCloud(currentUser.username);

      return () => unsubFav();
    }
  }, [currentUser, isCloudConnected]);

  // Resetar estados ao mudar conduta
  useEffect(() => {
    setSelectedPrescriptionItems([]);
    setPatientWeight('');
    if (conduct && favorites.length > 0) {
      const docId = getConductDocId(conduct.condicao || searchQuery, activeRoom);
      setIsCurrentConductFavorite(favorites.some(f => f.id === docId));
    } else {
      setIsCurrentConductFavorite(false);
    }
  }, [conduct]);

  // --- LOGIC: CÁLCULO DE BIC (SALA VERMELHA) ---
  const calculateInfusion = (med) => {
    const bic = med.parametros_bic;
    if (!bic || !patientWeight || !bic.dose_inicial_num || !bic.concentracao_solucao_num) return null;

    const weight = parseFloat(patientWeight);
    const doseRef = parseFloat(bic.dose_inicial_num);
    const conc = parseFloat(bic.concentracao_solucao_num);
    const unitDose = bic.unidade_dose || "";
    const unitConc = bic.unidade_concentracao || "mg/ml";

    // 1. Dose Total Alvo (por paciente)
    let totalDose = doseRef;
    if (unitDose.includes("/kg")) totalDose = doseRef * weight; // Multiplica peso se necessário

    // Exibição da Dose Alvo
    let doseDisplay = totalDose.toFixed(2) + " " + unitDose.split("/")[0]; // ex: 14 mcg
    if(unitDose.includes("min")) doseDisplay += "/min";
    else doseDisplay += "/h";

    // 2. Cálculo de Vazão (ml/h)
    // Precisamos converter tudo para a mesma unidade de massa (mg ou mcg) e tempo (hora)
    
    let massaHora = totalDose; // Base
    
    // Normalizar Tempo para Horas
    if (unitDose.includes("min")) massaHora = totalDose * 60; 
    
    // Normalizar Massa para bater com a Concentração
    // Se Dose é mcg e Conc é mg -> divide por 1000
    if (unitDose.includes("mcg") && unitConc.includes("mg")) massaHora = massaHora / 1000;
    // Se Dose é mg e Conc é mcg -> multiplica por 1000
    if (unitDose.includes("mg") && unitConc.includes("mcg")) massaHora = massaHora * 1000;

    // Vazão final
    const mlh = massaHora / conc;

    return { 
      doseDisplay, 
      rateMlH: mlh > 0 ? mlh.toFixed(1) : "Err",
      details: bic.texto_diluicao
    };
  };

  // --- LOGIC: RECEITA (SALA VERDE) ---
  const togglePrescriptionItem = (med) => {
    if (activeRoom !== 'verde' || !med.prescricao_alta) return;
    
    setSelectedPrescriptionItems(prev => {
      // ID único baseado no nome do fármaco
      const exists = prev.find(i => i.farmaco === med.farmaco);
      if (exists) return prev.filter(i => i.farmaco !== med.farmaco);
      // Adiciona com dias padrão 5
      return [...prev, { ...med, dias_tratamento: 5 }];
    });
  };

  const updateItemDays = (farmacoId, days) => {
    if (days < 1) days = 1;
    setSelectedPrescriptionItems(prev => prev.map(item => 
      item.farmaco === farmacoId ? { ...item, dias_tratamento: days } : item
    ));
  };

  const calculateTotalQty = (item) => {
    const p = item.prescricao_alta;
    if (!p || !p.dose_unitaria_num || !p.freq_diaria_num) return p?.quantidade || "1 un";
    
    const total = Math.ceil(p.dose_unitaria_num * p.freq_diaria_num * item.dias_tratamento);
    return `${total} ${p.unidade_frasco_cx || 'unidades'}`;
  };

  // --- HELPERS ---
  const getConductDocId = (q, r) => `${q.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${r}`;
  
  const inferMedType = (med) => {
    if (med.tipo) return med.tipo;
    const t = (med.farmaco + (med.posologia_texto || "")).toLowerCase();
    if (t.includes('ev') || t.includes('iv') || t.includes('im')) return 'Injetável';
    if (t.includes('oral') || t.includes('comp')) return 'Comprimido';
    return 'Medicamento';
  };

  const getMedColor = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes('injet')) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (t.includes('gotas') || t.includes('liq')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (t.includes('tópi')) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  // --- API CALL ---
  const generateConduct = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setIsCurrentConductFavorite(false);
    
    // 1. Check Cache Local/Remoto
    const docId = getConductDocId(searchQuery, activeRoom);
    if (currentUser && isCloudConnected) {
      try {
        const docSnap = await getDoc(doc(db, 'artifacts', appId, 'users', currentUser.username, 'conducts', docId));
        if (docSnap.exists()) {
           const data = docSnap.data();
           setConduct(data.conductData);
           setIsCurrentConductFavorite(data.isFavorite);
           setLoading(false);
           saveHistory(searchQuery, activeRoom);
           return;
        }
      } catch(e) { console.error("Cache miss/err", e); }
    }

    // 2. Call Serverless API
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ searchQuery, activeRoom })
      });
      if (!res.ok) throw new Error('Erro na IA');
      const data = await res.json();
      setConduct(data);
      
      // Save Cache
      if (currentUser && isCloudConnected) {
         await setDoc(doc(db, 'artifacts', appId, 'users', currentUser.username, 'conducts', docId), {
           query: searchQuery, room: activeRoom, conductData: data, isFavorite: false, lastAccessed: new Date().toISOString()
         });
      }
      saveHistory(searchQuery, activeRoom);
    } catch (e) {
      console.error(e);
      setErrorMsg("Não foi possível gerar a conduta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- DATA SYNC HELPERS ---
  const saveHistory = (term, room) => {
    if(!currentUser) return;
    const newEntry = { query: term, room, timestamp: new Date().toISOString() };
    const updated = [newEntry, ...recentSearches.filter(s => s.query !== term)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem(`history_${currentUser.username}`, JSON.stringify(updated));
    if(isCloudConnected) {
       setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'history', currentUser.username), { searches: updated }, { merge: true });
    }
  };

  const loadUserData = (username) => {
    const hist = localStorage.getItem(`history_${username}`);
    if(hist) setRecentSearches(JSON.parse(hist));
    const notes = localStorage.getItem(`notes_${username}`);
    if(notes) setUserNotes(notes);
  };

  const fetchUserDataFromCloud = async (username) => {
    if(!db) return;
    const hSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'history', username));
    if(hSnap.exists()) {
       setRecentSearches(hSnap.data().searches || []);
       localStorage.setItem(`history_${username}`, JSON.stringify(hSnap.data().searches));
    }
    const nSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', username));
    if(nSnap.exists()) {
       setUserNotes(nSnap.data().content || '');
       localStorage.setItem(`notes_${username}`, nSnap.data().content);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!db || !isCloudConnected) { setLoginError("Sem conexão."); return; }
    try {
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'registered_users', usernameInput.toLowerCase()));
      if (snap.exists() && snap.data().password === passwordInput) {
         const user = { ...snap.data(), username: usernameInput.toLowerCase() };
         // Check expiry
         if (user.expiresAt && new Date() > new Date(user.expiresAt)) {
           setLoginError("Assinatura expirada.");
           return;
         }
         setCurrentUser(user);
         localStorage.setItem('emergency_app_user', JSON.stringify(user));
         loadUserData(user.username);
      } else {
         setLoginError("Dados inválidos.");
      }
    } catch(e) { setLoginError("Erro ao logar."); }
  };

  const toggleFavorite = async () => {
    if(!currentUser || !conduct) return;
    const newStatus = !isCurrentConductFavorite;
    setIsCurrentConductFavorite(newStatus);
    const docId = getConductDocId(searchQuery, activeRoom);
    if(isCloudConnected) {
       await setDoc(doc(db, 'artifacts', appId, 'users', currentUser.username, 'conducts', docId), { 
         isFavorite: newStatus 
       }, { merge: true });
    }
  };

  // --- RENDER ---

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
       <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <Shield className="mx-auto text-blue-600 mb-4" size={48}/>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Guia de Plantão</h1>
          <p className="text-slate-500 text-sm mb-6">Acesso Médico Exclusivo</p>
          <form onSubmit={handleLogin} className="space-y-4">
             <input className="w-full p-3 border rounded-lg" placeholder="Usuário" value={usernameInput} onChange={e=>setUsernameInput(e.target.value)}/>
             <input className="w-full p-3 border rounded-lg" type="password" placeholder="Senha" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)}/>
             {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
             <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700">Entrar</button>
          </form>
          <div className="mt-4 text-xs text-slate-400 flex justify-center gap-2 items-center">
             {isCloudConnected ? <Cloud size={12} className="text-green-500"/> : <CloudOff size={12} className="text-red-500"/>} 
             {isCloudConnected ? 'Conectado' : 'Offline'}
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
       {/* HEADER */}
       <header className="bg-white border-b sticky top-0 z-30 px-4 h-16 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-bold text-slate-800"><Activity className="text-blue-600"/> Guia de Plantão</div>
          <div className="flex gap-3">
             <button onClick={()=>setShowFavoritesModal(true)} className="text-yellow-500"><Star/></button>
             <button onClick={()=>setShowNotepad(true)} className="text-slate-600"><Edit/></button>
             <button onClick={()=>{setCurrentUser(null); localStorage.removeItem('emergency_app_user');}} className="text-red-400"><LogOut/></button>
          </div>
       </header>

       <main className="max-w-5xl mx-auto p-4 space-y-6">
          {/* SEARCH & ROOMS */}
          <div className="grid grid-cols-2 gap-4">
             <button onClick={()=>setActiveRoom('verde')} className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${activeRoom==='verde'?'border-emerald-500 bg-white shadow-md':'border-transparent bg-emerald-50/50'}`}>
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700"><Stethoscope/></div>
                <div className="text-left"><div className="font-bold text-sm">Sala Verde</div><div className="text-[10px] opacity-70">Ambulatorial</div></div>
             </button>
             <button onClick={()=>setActiveRoom('vermelha')} className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${activeRoom==='vermelha'?'border-rose-500 bg-white shadow-md':'border-transparent bg-rose-50/50'}`}>
                <div className="bg-rose-100 p-2 rounded-lg text-rose-700"><Siren/></div>
                <div className="text-left"><div className="font-bold text-sm">Sala Vermelha</div><div className="text-[10px] opacity-70">Emergência</div></div>
             </button>
          </div>

          <div className="relative">
             <input className="w-full p-4 pl-12 rounded-xl shadow-sm border-none outline-none ring-1 ring-slate-200 focus:ring-blue-500" placeholder="Qual o quadro clínico?" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&generateConduct()}/>
             <Search className="absolute left-4 top-4 text-slate-400"/>
             <button onClick={generateConduct} disabled={loading} className="absolute right-2 top-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin"/> : 'Gerar'}
             </button>
          </div>

          {/* RECENTS */}
          {recentSearches.length > 0 && (
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {recentSearches.map((s,i)=>(
                   <button key={i} onClick={()=>{setSearchQuery(s.query); setActiveRoom(s.room);}} className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-xs border whitespace-nowrap hover:border-blue-400">
                      <div className={`w-2 h-2 rounded-full ${s.room==='verde'?'bg-emerald-500':'bg-rose-500'}`}/> {s.query}
                   </button>
                ))}
             </div>
          )}

          {/* CONDUCT DISPLAY */}
          {conduct && (
             <div className="space-y-6 animate-in slide-in-from-bottom-4">
                {/* Header Conduta */}
                <div className="flex justify-between items-start">
                   <div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded text-white uppercase ${activeRoom==='verde'?'bg-emerald-500':'bg-rose-600'}`}>{conduct.classificacao}</span>
                      <h2 className="text-3xl font-bold text-slate-800 mt-2">{conduct.condicao}</h2>
                      {conduct.estadiamento && <span className="text-slate-500 font-medium">{conduct.estadiamento}</span>}
                   </div>
                   <button onClick={toggleFavorite} className="p-2 bg-white rounded-full shadow-sm border"><Star fill={isCurrentConductFavorite?"gold":"none"} className={isCurrentConductFavorite?"text-yellow-400":"text-slate-400"}/></button>
                </div>

                {/* Resumo */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                   <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><User size={18}/> Resumo Clínico</h3>
                   <p className="text-slate-600 text-sm leading-relaxed">{conduct.resumo_clinico}</p>
                </div>

                {/* Trauma / Sinais */}
                <div className="grid md:grid-cols-2 gap-4">
                   {conduct.xabcde_trauma && (
                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                         <h4 className="font-bold text-orange-900 mb-2 flex gap-2"><Skull size={18}/> Trauma (ATLS)</h4>
                         <div className="space-y-2">{Object.entries(conduct.xabcde_trauma).map(([k,v])=>(<div key={k} className="text-xs flex gap-2"><span className="font-bold bg-white px-1.5 rounded border border-orange-200">{k.toUpperCase()}</span> <span className="text-orange-800">{v}</span></div>))}</div>
                      </div>
                   )}
                   {conduct.criterios_gravidade && (
                      <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                         <h4 className="font-bold text-rose-900 mb-2 flex gap-2"><AlertTriangle size={18}/> Sinais de Alarme</h4>
                         <ul className="text-xs text-rose-800 list-disc pl-4 space-y-1">{conduct.criterios_gravidade.map((c,i)=><li key={i}>{c}</li>)}</ul>
                      </div>
                   )}
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                   {/* Coluna 1: Avaliação */}
                   <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border shadow-sm">
                         <h4 className="font-bold text-sm text-slate-500 uppercase mb-3 flex gap-2"><Activity size={16}/> Avaliação</h4>
                         <div className="space-y-3">
                            <div className="bg-slate-50 p-2 rounded border">
                               <span className="text-xs font-bold text-slate-400 block mb-1">Alvos</span>
                               <div className="flex flex-wrap gap-1">{conduct.avaliacao_inicial?.sinais_vitais_alvos?.map((s,i)=><span key={i} className="text-[10px] bg-white px-1.5 py-0.5 rounded border font-bold text-indigo-600">{s}</span>)}</div>
                            </div>
                            {conduct.avaliacao_inicial?.exames_prioridade1 && <div><span className="text-[10px] font-bold text-rose-500 uppercase">Prioridade 1</span><ul className="text-xs list-disc pl-4 mt-1 text-slate-600">{conduct.avaliacao_inicial.exames_prioridade1.map((e,i)=><li key={i}>{e}</li>)}</ul></div>}
                         </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border shadow-sm">
                         <h4 className="font-bold text-sm text-slate-500 uppercase mb-3 flex gap-2"><FileText size={16}/> Desfecho</h4>
                         <div className="space-y-2 text-xs">
                            {conduct.criterios_internacao && <div className="bg-amber-50 p-2 rounded text-amber-900"><strong>Internar:</strong> {conduct.criterios_internacao.join(', ')}</div>}
                            {conduct.criterios_alta && <div className="bg-green-50 p-2 rounded text-green-900"><strong>Alta:</strong> {conduct.criterios_alta.join(', ')}</div>}
                         </div>
                      </div>
                   </div>

                   {/* Coluna 2 e 3: Tratamento */}
                   <div className="lg:col-span-2 space-y-4">
                      {activeRoom === 'vermelha' && (
                        <div className="bg-rose-100 border-l-4 border-rose-500 p-3 rounded flex items-center gap-3">
                           <Calculator className="text-rose-700"/>
                           <input type="number" placeholder="Peso (kg)" className="flex-1 p-2 rounded border-rose-300 font-bold text-rose-900" value={patientWeight} onChange={e=>setPatientWeight(e.target.value)}/>
                        </div>
                      )}

                      {conduct.tratamento_medicamentoso?.map((med, idx) => {
                         const medType = inferMedType(med);
                         const isSelected = selectedPrescriptionItems.some(i => i.farmaco === med.farmaco);
                         const canSelect = activeRoom === 'verde' && med.prescricao_alta;
                         
                         let bicCalc = null;
                         if(activeRoom === 'vermelha' && med.parametros_bic) bicCalc = calculateInfusion(med);

                         return (
                           <div key={idx} onClick={() => canSelect && togglePrescriptionItem(med)} className={`bg-white p-4 rounded-xl border shadow-sm transition-all cursor-pointer relative overflow-hidden ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}>
                              <div className={`absolute left-0 top-0 bottom-0 w-1 ${isSelected ? 'bg-blue-500' : 'bg-slate-300'}`}/>
                              {canSelect && <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}/>}
                              
                              <div className="pl-3 pr-8">
                                 <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-lg text-slate-800">{med.farmaco}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${getMedTypeColor(medType)}`}>{medType}</span>
                                 </div>
                                 {med.apresentacao && <p className="text-xs text-slate-500 mb-2">{med.apresentacao}</p>}
                                 
                                 <div className="bg-slate-50 p-2 rounded border border-slate-100 mb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Sugestão de Uso</span>
                                    <p className="text-sm font-medium text-slate-700">{med.posologia_texto || med.sugestao_uso}</p>
                                 </div>

                                 {/* BIC CALC (Vermelha) */}
                                 {bicCalc && (
                                    <div className="bg-rose-50 p-2 rounded border border-rose-100 mt-2 flex justify-between items-center">
                                       <div>
                                          <span className="text-[10px] text-rose-500 block">DOSE ALVO ({patientWeight||'?'}kg)</span>
                                          <strong className="text-rose-900">{bicCalc.doseDisplay}</strong>
                                       </div>
                                       <div className="text-right">
                                          <span className="text-[10px] text-rose-500 block">VAZÃO</span>
                                          <strong className="text-xl text-rose-700">{bicCalc.rateMlH} ml/h</strong>
                                       </div>
                                    </div>
                                 )}
                                 {/* INPUT DIAS (Verde) */}
                                 {canSelect && isSelected && (
                                    <div className="mt-2 pt-2 border-t flex items-center gap-2" onClick={e=>e.stopPropagation()}>
                                       <label className="text-xs font-bold text-blue-600">Dias:</label>
                                       <input type="number" min="1" className="w-16 p-1 border rounded text-center font-bold" value={selectedPrescriptionItems.find(i=>i.farmaco===med.farmaco)?.dias_tratamento || 5} onChange={e=>updateItemDays(med.farmaco, e.target.value)}/>
                                    </div>
                                 )}
                              </div>
                           </div>
                         )
                      })}
                   </div>
                </div>
             </div>
          )}
       </main>

       {/* MODAL RECEITA */}
       {showPrescriptionModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 print:p-0">
             <div className="bg-white w-full max-w-3xl h-[90vh] rounded-xl overflow-hidden flex flex-col print:h-full print:rounded-none">
                <div className="bg-slate-100 p-4 border-b flex justify-between print:hidden">
                   <h3 className="font-bold">Receituário</h3>
                   <div className="flex gap-2"><button onClick={window.print} className="bg-blue-600 text-white px-4 rounded flex items-center gap-2"><Printer size={16}/> Imprimir</button><button onClick={()=>setShowPrescriptionModal(false)} className="bg-gray-300 px-3 rounded"><X/></button></div>
                </div>
                <div className="p-12 overflow-y-auto flex-1 font-serif text-slate-900 relative">
                   <div className="text-center border-b-4 double border-black pb-6 mb-8">
                      <h1 className="text-2xl font-bold uppercase">{currentUser.name}</h1>
                      <p className="text-sm font-bold mt-1">CRM: {currentUser.crm}</p>
                   </div>
                   <div className="space-y-8">
                      {['USO ORAL', 'USO TÓPICO', 'OUTROS'].map(tipo => {
                         const items = selectedPrescriptionItems.filter(i => {
                            const uso = i.prescricao_alta?.uso?.toUpperCase() || 'USO ORAL';
                            if(tipo === 'OUTROS') return !uso.includes('ORAL') && !uso.includes('TÓPICO');
                            return uso.includes(tipo.replace('USO ',''));
                         });
                         if(items.length === 0) return null;
                         return (
                            <div key={tipo}>
                               <h3 className="font-bold text-lg underline mb-4">{tipo}</h3>
                               <ul className="space-y-6">
                                  {items.map((item, idx) => (
                                     <li key={idx} className="pl-4">
                                        <div className="flex justify-between items-end border-b-2 border-dotted border-black mb-1 pb-1">
                                           <span className="font-bold text-lg">{item.prescricao_alta.nome_comercial || item.farmaco}</span>
                                           <span className="font-bold whitespace-nowrap">{calculateTotalQty(item)}</span>
                                        </div>
                                        <p className="text-base">{item.prescricao_alta.instrucoes_paciente}</p>
                                     </li>
                                  ))}
                               </ul>
                            </div>
                         )
                      })}
                   </div>
                   <footer className="mt-16 pt-8 border-t flex justify-between items-end">
                      <div className="text-sm">Data: {new Date().toLocaleDateString()}</div>
                      <div className="text-center"><div className="w-48 border-b border-black mb-1"/><p className="text-xs font-bold">{currentUser.name}</p></div>
                   </footer>
                </div>
             </div>
          </div>
       )}
       
       {/* MODAL FAVORITOS E NOTEPAD (Simplificados) */}
       {showFavoritesModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-md rounded-xl overflow-hidden">
                <div className="p-4 border-b flex justify-between bg-yellow-50"><h3 className="font-bold text-yellow-800">Favoritos</h3><button onClick={()=>setShowFavoritesModal(false)}><X/></button></div>
                <div className="p-2 max-h-[60vh] overflow-y-auto space-y-2">
                   {favorites.map(f => (
                      <div key={f.id} className="p-3 border rounded flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={()=>{setConduct(f.conductData); setSearchQuery(f.query); setShowFavoritesModal(false);}}>
                         <span className="font-bold text-sm">{f.query}</span>
                         <button onClick={(e)=>{e.stopPropagation(); removeFavoriteFromList(f.id)}} className="text-red-400"><Trash2 size={16}/></button>
                      </div>
                   ))}
                </div>
             </div>
          </div>
       )}

       {showNotepad && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-xl h-[70vh] rounded-xl flex flex-col overflow-hidden">
                <div className="p-4 border-b flex justify-between bg-slate-50"><h3 className="font-bold">Anotações</h3><button onClick={()=>setShowNotepad(false)}><X/></button></div>
                <textarea className="flex-1 p-4 resize-none outline-none bg-yellow-50 text-lg leading-loose" value={userNotes} onChange={handleNoteChange} placeholder="Digite aqui..."/>
             </div>
          </div>
       )}
    </div>
  );
}
