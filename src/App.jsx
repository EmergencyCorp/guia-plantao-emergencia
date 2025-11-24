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
  const [favorites, setFavorites] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const resultsRef = useRef(null);

  const [showNotepad, setShowNotepad] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [userNotes, setUserNotes] = useState('');

  const [selectedPrescriptionItems, setSelectedPrescriptionItems] = useState([]);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [patientWeight, setPatientWeight] = useState('');

  const [isCurrentConductFavorite, setIsCurrentConductFavorite] = useState(false);

  // --- HELPER FUNCTIONS ---

  const calculateDose = (med) => {
    const concValue = med.concentracao_mg_ml || med.concentracao_solucao;
    if (!patientWeight || !med.dose_padrao_kg || !concValue) return null;
    
    const weight = parseFloat(patientWeight);
    const doseKg = parseFloat(med.dose_padrao_kg);
    const concentration = parseFloat(concValue);
    const unit = med.unidade_base || ""; 
    const unitConc = med.unidade_concentracao || "mg/ml";

    let totalDoseValue = doseKg * weight;
    let doseDisplay = `${totalDoseValue.toFixed(2)}`;
    
    if (unit.includes("mcg")) {
      doseDisplay += " mcg";
      if (unit.includes("min")) doseDisplay += "/min";
      else if (unit.includes("h")) doseDisplay += "/h";
    } else {
      doseDisplay += " mg";
      if (unit.includes("min")) doseDisplay += "/min";
      else if (unit.includes("h")) doseDisplay += "/h";
    }

    let rateMlH = 0;
    if (concentration > 0) {
       let doseInMg = totalDoseValue; 
       // Normalização de massa
       if (unit.includes("mcg") && unitConc.includes("mg")) doseInMg = totalDoseValue / 1000;
       else if (unit.includes("mg") && unitConc.includes("mcg")) doseInMg = totalDoseValue * 1000;

       // Normalização de tempo
       if (unit.includes("/min")) rateMlH = (doseInMg * 60) / concentration;
       else rateMlH = doseInMg / concentration;
    }
    
    return { doseDisplay, rateMlH: rateMlH > 0 ? rateMlH.toFixed(1) : null };
  };

  const inferMedType = (med) => {
    if (med.tipo && med.tipo !== "N/A") return med.tipo;
    const name = med.farmaco?.toLowerCase() || "";
    const via = med.via?.toLowerCase() || "";
    if (via.includes('ev') || via.includes('iv')) return "Injetável";
    if (name.includes('gotas')) return "Gotas";
    if (name.includes('xarope')) return "Xarope";
    if (name.includes('comprimido')) return "Comprimido";
    if (name.includes('creme')) return "Tópico";
    return "Medicamento";
  };

  const getMedTypeColor = (type) => {
    if (!type) return 'bg-slate-100 text-slate-500 border-slate-200';
    const t = type.toLowerCase();
    if (t.includes('injet')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (t.includes('gota') || t.includes('xarope')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (t.includes('comp')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  const getMedTypeIcon = (type) => {
    if (!type) return <Pill size={14} />;
    const t = type.toLowerCase();
    if (t.includes('injet')) return <SyringeIcon size={14} />;
    if (t.includes('gota')) return <Droplets size={14} />;
    return <Pill size={14} />;
  };

  const getVitalIcon = (text) => {
    const t = text.toLowerCase();
    if (t.includes('fc') || t.includes('bpm')) return <HeartPulse size={16} className="text-rose-500" />;
    if (t.includes('pa') || t.includes('mmhg')) return <Activity size={16} className="text-blue-500" />;
    if (t.includes('sat') || t.includes('o2')) return <Droplet size={16} className="text-cyan-500" />;
    return <Activity size={16} className="text-slate-400" />;
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (initialToken) await signInWithCustomToken(auth, initialToken);
        else await signInAnonymously(auth);
      } catch (error) { console.error("Auth error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { setFirebaseUser(user); setIsCloudConnected(true); } 
      else { setFirebaseUser(null); setIsCloudConnected(false); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('emergency_app_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (currentUser && isCloudConnected) {
      fetchNotesFromCloud(currentUser.username);
      const unsubFavs = subscribeToFavorites(currentUser.username);
      return () => { if(unsubFavs) unsubFavs(); };
    }
  }, [currentUser, isCloudConnected]);

  useEffect(() => {
    setSelectedPrescriptionItems([]);
    setPatientWeight('');
    if (conduct && favorites.length > 0) {
      const docId = getConductDocId(conduct.condicao || searchQuery, activeRoom);
      const isFav = favorites.some(f => f.id === docId || f.query === searchQuery);
      setIsCurrentConductFavorite(isFav);
    } else {
      setIsCurrentConductFavorite(false);
    }
  }, [conduct, favorites]);

  // --- ACTIONS ---
  const fetchNotesFromCloud = async (username) => {
    if (db && auth?.currentUser) {
      const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', username));
      if (docSnap.exists()) setUserNotes(docSnap.data().content);
    }
  };

  const handleNoteChange = (e) => {
    setUserNotes(e.target.value);
    if (currentUser && db && auth?.currentUser) {
       setIsSaving(true);
       setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', currentUser.username), {
         content: e.target.value, author: currentUser.name || "User", username: currentUser.username
       }, { merge: true }).then(() => setIsSaving(false));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!db || !isCloudConnected) { setLoginError("Sem conexão."); return; }
    const userSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'registered_users', usernameInput.toLowerCase().trim()));
    if (userSnap.exists() && userSnap.data().password === passwordInput) {
      const user = { ...userSnap.data(), username: usernameInput.toLowerCase() };
      setCurrentUser(user);
      localStorage.setItem('emergency_app_user', JSON.stringify(user));
    } else {
      setLoginError("Dados inválidos.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null); setConduct(null); setSearchQuery(''); setRecentSearches([]); setUserNotes(''); setFavorites([]); localStorage.removeItem('emergency_app_user');
  };

  const generateConduct = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery, activeRoom })
      });
      const data = await response.json();
      setConduct(data);
      
      // Cache e Histórico
      if (isCloudConnected && currentUser) {
         const docId = getConductDocId(searchQuery, activeRoom);
         await setDoc(doc(db, 'artifacts', appId, 'users', currentUser.username, 'conducts', docId), {
            query: searchQuery, room: activeRoom, conductData: data, isFavorite: false, lastAccessed: new Date().toISOString()
         }, { merge: true });
         
         // Salva histórico
         const newEntry = { query: searchQuery, room: activeRoom, timestamp: new Date().toISOString() };
         const updated = [newEntry, ...recentSearches.filter(s => s.query !== searchQuery)].slice(0, 10);
         setRecentSearches(updated);
         await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'history', currentUser.username), { searches: updated }, { merge: true });
      }

    } catch (error) { console.error(error); setErrorMsg("Erro na IA"); } 
    finally { setLoading(false); }
  };

  // --- RECEITA ---
  const togglePrescriptionItem = (med) => {
    if (activeRoom !== 'verde' || !med.receita) return;
    setSelectedPrescriptionItems(prev => {
      const exists = prev.find(i => i.farmaco === med.farmaco);
      if (exists) return prev.filter(i => i.farmaco !== med.farmaco);
      return [...prev, { ...med, dias_tratamento: med.receita.dias_sugeridos || 5 }];
    });
  };

  const updateItemDays = (farmaco, days) => {
    if (days < 1) days = 1;
    setSelectedPrescriptionItems(prev => prev.map(item => item.farmaco === farmaco ? { ...item, dias_tratamento: days } : item));
  };

  const calculateTotalQuantity = (item) => {
    const rec = item.receita;
    if (!rec || !rec.calculo_qnt || !rec.calculo_qnt.qtd_por_dose) return "1 caixa"; // Fallback seguro
    
    const dose = rec.calculo_qnt.qtd_por_dose;
    const freq = rec.calculo_qnt.frequencia_diaria || 1;
    const total = Math.ceil(dose * freq * item.dias_tratamento);
    const unidade = rec.calculo_qnt.unidade_form || "unidades";
    
    return `${total} ${unidade}`;
  };

  // --- FAVORITOS ---
  const getConductDocId = (q, r) => `${q.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${r}`;
  const subscribeToFavorites = (username) => {
    if (!db) return;
    return onSnapshot(firestoreQuery(collection(db, 'artifacts', appId, 'users', username, 'conducts'), where("isFavorite", "==", true)), (snap) => {
      setFavorites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  };
  const toggleFavorite = async () => {
    if (!currentUser || !conduct) return;
    const newStatus = !isCurrentConductFavorite;
    setIsCurrentConductFavorite(newStatus);
    const docId = getConductDocId(searchQuery, activeRoom);
    await setDoc(doc(db, 'artifacts', appId, 'users', currentUser.username, 'conducts', docId), {
       query: searchQuery, room: activeRoom, conductData: conduct, isFavorite: newStatus, lastAccessed: new Date().toISOString()
    }, { merge: true });
  };
  const removeFavoriteFromList = async (docId) => {
    await setDoc(doc(db, 'artifacts', appId, 'users', currentUser.username, 'conducts', docId), { isFavorite: false }, { merge: true });
  };
  const loadFavoriteConduct = (fav) => {
    setConduct(fav.conductData); setSearchQuery(fav.query); setActiveRoom(fav.room); setShowFavoritesModal(false);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <Shield size={40} className="mx-auto mb-3 text-blue-600"/>
          <h1 className="text-2xl font-bold mb-6 text-slate-800">Guia de Plantão</h1>
          {loginError && <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-xs">{loginError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input className="w-full p-3 border rounded-xl" placeholder="Usuário" value={usernameInput} onChange={e=>setUsernameInput(e.target.value)} />
            <input className="w-full p-3 border rounded-xl" type="password" placeholder="Senha" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} />
            <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">Entrar</button>
          </form>
          <div className="mt-4 text-[10px] text-slate-400 flex items-center justify-center gap-2">
            {isCloudConnected ? <Cloud size={12}/> : <CloudOff size={12}/>} {isCloudConnected ? 'Conectado' : 'Offline'}
          </div>
        </div>
      </div>
    );
  }

  const roomConfig = { verde: { color: 'emerald', icon: <Stethoscope/>, name: 'Sala Verde' }, vermelha: { color: 'rose', icon: <Siren/>, name: 'Sala Vermelha' } };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <header className="bg-white border-b sticky top-0 z-40 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2"><div className="bg-blue-900 p-1.5 rounded text-white"><ClipboardCheck size={20}/></div><span className="font-bold">Guia de Plantão</span></div>
        <div className="flex gap-3">
          <button onClick={() => setShowFavoritesModal(true)} className="text-yellow-500"><Star size={20}/></button>
          <button onClick={() => setShowNotepad(true)} className="text-slate-600"><Edit size={20}/></button>
          <button onClick={() => { setCurrentUser(null); localStorage.removeItem('emergency_app_user'); }} className="text-red-400"><LogOut size={20}/></button>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 space-y-6 w-full relative">
        {activeRoom === 'verde' && selectedPrescriptionItems.length > 0 && (
          <button onClick={() => setShowPrescriptionModal(true)} className="fixed bottom-8 right-8 z-50 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-full shadow-xl flex items-center gap-3 font-bold animate-in slide-in-from-bottom-4"><Printer size={24} /> Gerar Receita ({selectedPrescriptionItems.length})</button>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(roomConfig).map(([key, conf]) => (
            <button key={key} onClick={() => setActiveRoom(key)} className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${activeRoom === key ? `bg-white border-${conf.color}-500 shadow-md` : 'bg-white border-transparent'}`}>
              <div className={`p-3 rounded-xl bg-${conf.color}-50 text-${conf.color}-600`}>{conf.icon}</div>
              <span className="font-bold capitalize">{conf.name}</span>
              {activeRoom === key && <CheckCircle2 className={`ml-auto text-${conf.color}-600`} size={20}/>}
            </button>
          ))}
        </div>

        <div className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
          <input className="flex-1 outline-none px-2" placeholder="Digite a condição clínica..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&generateConduct()} />
          <button onClick={generateConduct} disabled={loading} className="bg-blue-900 text-white px-6 py-2 rounded-lg font-bold">{loading ? <Loader2 className="animate-spin"/> : 'Gerar'}</button>
        </div>

        {recentSearches.length > 0 && <div className="flex gap-2 overflow-x-auto pb-2">{recentSearches.map((s, i) => <button key={i} onClick={()=>{setSearchQuery(s.query); setActiveRoom(s.room);}} className="text-xs px-3 py-1 bg-white border rounded-full whitespace-nowrap">{s.query}</button>)}</div>}

        {conduct && (
          <div ref={resultsRef} className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex gap-2 mb-2"><span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${activeRoom==='verde'?'bg-emerald-500':'bg-rose-600'}`}>{conduct.classificacao}</span></div>
                <h2 className="text-3xl font-bold">{conduct.condicao}</h2>
              </div>
              <button onClick={toggleFavorite} className="p-2 rounded-full hover:bg-gray-100"><Star size={24} fill={isCurrentConductFavorite ? "gold" : "none"} stroke={isCurrentConductFavorite ? "gold" : "currentColor"} /></button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-slate-900 mb-2 flex gap-2 items-center"><User size={20}/> Resumo Clínico</h3>
              <p className="text-slate-700 leading-relaxed text-sm">{conduct.resumo_clinico}</p>
            </div>

            {/* TRAUMA */}
            {conduct.xabcde_trauma && (
              <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl space-y-3">
                 <h3 className="text-orange-900 font-bold flex gap-2"><Skull/> Protocolo Trauma</h3>
                 {Object.entries(conduct.xabcde_trauma).map(([key, val])=>(<div key={key} className="flex gap-3 bg-white/60 p-2 rounded"><div className="bg-orange-600 text-white w-6 h-6 rounded flex items-center justify-center font-bold uppercase shrink-0">{key.charAt(0)}</div><p className="text-sm text-orange-950">{val}</p></div>))}
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 space-y-6">
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-slate-50 px-5 py-3 border-b flex items-center gap-2"><Activity size={18}/><h3 className="font-bold text-sm">Avaliação Inicial</h3></div>
                    <div className="p-5 space-y-4 text-sm">
                       {conduct.avaliacao_inicial?.sinais_vitais_alvos?.map((s,i)=><div key={i} className="bg-indigo-50 p-2 rounded border border-indigo-100 flex items-center gap-2 text-indigo-900">{getVitalIcon(s)} <b>{s}</b></div>)}
                       {conduct.avaliacao_inicial?.exames_prioridade1 && <div className="pt-2"><span className="font-bold text-rose-600 text-xs uppercase">Prioridade 1</span><ul className="list-disc pl-4 mt-1">{conduct.avaliacao_inicial.exames_prioridade1.map((ex,i)=><li key={i}>{ex}</li>)}</ul></div>}
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                 {activeRoom === 'vermelha' && (
                   <div className="bg-rose-100 p-4 rounded border-l-4 border-rose-600 flex items-center gap-4">
                      <Calculator className="text-rose-800"/>
                      <div className="flex-1"><input type="number" placeholder="Peso (kg)" className="w-full p-2 rounded border border-rose-300 font-bold text-rose-900" value={patientWeight} onChange={e=>setPatientWeight(e.target.value)}/></div>
                   </div>
                 )}

                 <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Pill/> Prescrição</h3>
                    {conduct.tratamento_medicamentoso?.map((med, idx) => {
                      const canSelect = activeRoom === 'verde' && med.receita;
                      const isSelected = selectedPrescriptionItems.some(i => i.farmaco === med.farmaco);
                      const medType = inferMedType(med);
                      let doseCalc = null;
                      if (activeRoom === 'vermelha' && med.usa_peso) doseCalc = calculateDose(med);

                      return (
                        <div key={idx} onClick={() => canSelect && togglePrescriptionItem(med)} className={`bg-white rounded-xl border p-5 shadow-sm relative group cursor-pointer ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}>
                           {canSelect && <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}><CheckCircle2 size={14}/></div>}
                           <div className="flex justify-between pr-12 mb-2">
                              <div>
                                <h4 className="text-xl font-bold text-slate-800">{med.farmaco}</h4>
                                <div className="flex gap-2 mt-1">
                                  <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${getMedTypeColor(medType)}`}>{medType}</span>
                                  {med.apresentacao && <span className="text-[10px] px-2 py-0.5 rounded border bg-gray-50 text-gray-600 font-bold">{med.apresentacao}</span>}
                                </div>
                              </div>
                           </div>
                           
                           <div className="bg-slate-50 p-3 rounded border border-slate-100 mb-2">
                              <strong className="text-xs text-slate-500 block uppercase mb-1">Posologia:</strong>
                              {med.sugestao_uso}
                           </div>

                           {canSelect && isSelected && (
                             <div className="mt-3 pt-3 border-t flex items-center gap-2" onClick={e=>e.stopPropagation()}>
                               <label className="text-xs font-bold text-blue-700">Duração (Dias):</label>
                               <input type="number" min="1" className="w-16 p-1 border rounded text-center font-bold" value={selectedPrescriptionItems.find(i=>i.farmaco===med.farmaco)?.dias_tratamento || 5} onChange={e=>updateItemDays(med.farmaco, e.target.value)}/>
                             </div>
                           )}

                           {doseCalc && (
                             <div className="mt-2 bg-rose-50 p-2 rounded border border-rose-100 text-rose-900 text-sm flex justify-between font-mono">
                                <span>Dose: <b>{doseCalc.doseDisplay}</b></span>
                                {doseCalc.rateMlH && <span>Bomba: <b>{doseCalc.rateMlH} ml/h</b></span>}
                             </div>
                           )}
                        </div>
                      );
                    })}
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL RECEITA */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 print:p-0">
          <div className="bg-white w-full max-w-3xl h-[90vh] rounded-xl overflow-hidden flex flex-col print:h-full print:rounded-none">
             <div className="p-4 bg-slate-100 flex justify-between print:hidden">
               <h3 className="font-bold">Gerador de Receita</h3>
               <div className="flex gap-2">
                 <button onClick={window.print} className="bg-blue-600 text-white px-4 rounded flex items-center gap-2"><Printer size={16}/> Imprimir</button>
                 <button onClick={()=>setShowPrescriptionModal(false)} className="bg-gray-300 px-3 rounded"><X size={20}/></button>
               </div>
             </div>
             <div className="p-12 overflow-y-auto font-serif text-slate-900 flex-1">
                <header className="text-center border-b-4 double border-black pb-6 mb-8">
                   <h1 className="text-2xl font-bold uppercase">{currentUser?.name}</h1>
                   <p className="text-sm font-bold mt-1">CRM: {currentUser?.crm} • CLÍNICA MÉDICA</p>
                </header>
                <div className="space-y-8">
                   {['USO ORAL', 'USO TÓPICO', 'USO RETAL', 'OUTROS'].map(tipo => {
                      const items = selectedPrescriptionItems.filter(i => {
                         const uso = i.receita?.uso?.toUpperCase() || 'USO ORAL';
                         if(tipo === 'OUTROS') return !uso.includes('ORAL') && !uso.includes('TÓPICO') && !uso.includes('RETAL');
                         return uso.includes(tipo.replace('USO ',''));
                      });
                      if(items.length === 0) return null;
                      return (
                        <div key={tipo}>
                           <h3 className="font-bold text-lg underline mb-4 decoration-2 underline-offset-4">{tipo}</h3>
                           <ul className="space-y-6">
                              {items.map((item, idx) => (
                                <li key={idx} className="relative pl-8">
                                   <span className="absolute left-0 top-0 font-bold text-lg">{idx+1}.</span>
                                   <div className="flex justify-between items-end border-b-2 border-dotted border-black mb-1 pb-1">
                                      <span className="font-bold text-xl">{item.receita.nome_comercial || item.farmaco}</span>
                                      <span className="font-bold whitespace-nowrap">{calculateTotalQuantity(item)}</span>
                                   </div>
                                   <p className="text-lg leading-relaxed">{item.receita.instrucoes}</p>
                                </li>
                              ))}
                           </ul>
                        </div>
                      )
                   })}
                </div>
                <footer className="mt-16 pt-8 border-t flex justify-between items-end">
                   <div className="text-sm"><p>Data:</p><p className="mt-4 border-b border-black w-32 text-center">{new Date().toLocaleDateString('pt-BR')}</p></div>
                   <div className="text-center"><div className="w-64 border-b border-black mb-2"/><p className="font-bold uppercase text-sm">{currentUser?.name}</p><p className="text-xs">Assinatura e Carimbo</p></div>
                </footer>
             </div>
          </div>
        </div>
      )}

      {/* MODAL FAVORITOS */}
      {showFavoritesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-yellow-50 p-4 flex justify-between items-center border-b border-yellow-100">
                 <h3 className="font-bold text-yellow-800 flex gap-2"><Star fill="currentColor"/> Meus Favoritos</h3>
                 <button onClick={()=>setShowFavoritesModal(false)}><X/></button>
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto bg-slate-50 space-y-2">
                 {favorites.length===0 ? <p className="text-center p-4 text-slate-400">Sem favoritos.</p> : favorites.map(fav => (
                   <div key={fav.id} className="bg-white p-3 rounded border flex justify-between items-center hover:border-blue-400 cursor-pointer" onClick={()=>loadFavoriteConduct(fav)}>
                      <div>
                        <span className={`w-2 h-2 inline-block rounded-full mr-2 ${fav.room==='verde'?'bg-emerald-500':'bg-rose-500'}`}/>
                        <span className="font-bold text-sm">{fav.query}</span>
                      </div>
                      <button onClick={(e)=>{e.stopPropagation(); removeFavoriteFromList(fav.id)}} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* MODAL NOTEPAD */}
      {showNotepad && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
              <div className="bg-gray-50 p-4 border-b flex justify-between"><h3 className="font-bold text-slate-700">Meu Caderno</h3><button onClick={()=>setShowNotepad(false)}><X/></button></div>
              <textarea className="flex-1 p-6 bg-yellow-50 resize-none outline-none text-lg leading-loose font-serif" value={userNotes} onChange={handleNoteChange} placeholder="Anotações..."/>
              <div className="p-2 bg-gray-50 text-xs text-right text-gray-400">{isSaving ? 'Salvando...' : 'Salvo'}</div>
           </div>
        </div>
      )}
    </div>
  );
}
