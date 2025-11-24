import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, AlertCircle, Search, Clock, Pill, FileText, Loader2, BookOpen, 
  Stethoscope, ClipboardCheck, AlertTriangle, ArrowRight, X, User, 
  CheckCircle2, Thermometer, Syringe, Siren, FlaskConical, Tag, Package,
  ShieldAlert, LogOut, Lock, Shield, History, LogIn, KeyRound, Edit, Save, Cloud, CloudOff, Settings, Info,
  HeartPulse, Microscope, Image as ImageIcon, FileDigit, ScanLine, Wind, Droplet, Timer, Skull, Printer, FilePlus, Calculator,
  Tablets, Syringe as SyringeIcon, Droplets, Pipette, Star, Trash2, SprayCan, CalendarDays,
  Utensils, GlassWater, ShieldCheck, Zap, Info as InfoIcon, Target
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

// ==========================================================================================
// 🚨 ÁREA DE CONFIGURAÇÃO DO USUÁRIO - COLE SUAS CHAVES AQUI 🚨
// ==========================================================================================
// Passo 4: Copie o objeto do console do Firebase e cole abaixo.
// Deve ficar parecido com: { apiKey: "AIzaSy...", authDomain: "..." }

const YOUR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyA75b9ELr3J8RCL1LGVixZUvk3pLzTOeis", // <--- Cole sua apiKey aqui entre as aspas
  authDomain: "emergency-bedside.firebaseapp.com",
  projectId: "emergency-bedside",
  storageBucket: "emergency-bedside.firebasestorage.app",
  messagingSenderId: "101850697558",
  appId: "1:101850697558:web:a6a27f1b9978a3b6b6d0f7"
  measurementId: "G-S00ZM050F9"
};

// ==========================================================================================

// --- LÓGICA DE INICIALIZAÇÃO SEGURA ---
const getGlobalVar = (varName) => {
  if (typeof window !== 'undefined' && window[varName]) return window[varName];
  if (typeof globalThis !== 'undefined' && globalThis[varName]) return globalThis[varName];
  return null;
};

let app = null;
let auth = null;
let db = null;

const initFirebase = () => {
  try {
    // 1. Prioridade: Configuração Manual (A que você vai colar)
    if (YOUR_FIREBASE_CONFIG.apiKey && YOUR_FIREBASE_CONFIG.apiKey.length > 5) {
      console.log("Tentando conectar com configuração MANUAL...");
      const fApp = initializeApp(YOUR_FIREBASE_CONFIG);
      return { 
        app: fApp, 
        auth: getAuth(fApp), 
        db: getFirestore(fApp),
        method: 'manual'
      };
    }

    // 2. Fallback: Tenta pegar do ambiente (caso exista no futuro)
    const rawConfig = getGlobalVar('__firebase_config');
    if (rawConfig) {
      console.log("Tentando conectar com configuração GLOBAL...");
      const fApp = initializeApp(JSON.parse(rawConfig));
      return { 
        app: fApp, 
        auth: getAuth(fApp), 
        db: getFirestore(fApp),
        method: 'global'
      };
    }
    
    console.warn("Nenhuma configuração do Firebase encontrada.");
    return null;
  } catch (e) {
    console.error("Erro fatal na inicialização do Firebase:", e);
    return null;
  }
};

const fbInstance = initFirebase();
if (fbInstance) {
  app = fbInstance.app;
  auth = fbInstance.auth;
  db = fbInstance.db;
}

const appId = getGlobalVar('__app_id') || 'emergency-guide-app';
const initialToken = getGlobalVar('__initial_auth_token');

// --- URL DO LOGO (Link direto do Google Drive) ---
const logoImg = "https://drive.google.com/uc?export=view&id=1NOTk8hlnegfrHc_EHIuFM9j3sqZ20OVC";

export default function EmergencyGuideApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [firebaseUser, setFirebaseUser] = useState(null); 
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // --- INICIALIZAÇÃO E AUTH ---
  useEffect(() => {
    if (!auth) {
      setIsCloudConnected(false);
      return;
    }

    const initAuth = async () => {
      try {
        if (initialToken) {
          await signInWithCustomToken(auth, initialToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Erro na autenticação:", error);
        setIsCloudConnected(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
        setIsCloudConnected(true);
        console.log("Conectado à nuvem como:", user.uid);
      } else {
        setFirebaseUser(null);
        setIsCloudConnected(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- CARREGAMENTO DE SESSÃO LOCAL ---
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

  // --- SINCRONIZAÇÃO DE DADOS ---
  useEffect(() => {
    if (currentUser && isCloudConnected && firebaseUser) {
      fetchNotesFromCloud(currentUser.username);
      fetchHistoryFromCloud(currentUser.username);
      const unsubFavs = subscribeToFavorites(currentUser.username);
      return () => { if(unsubFavs) unsubFavs(); };
    } else if (currentUser) {
      const localNotes = localStorage.getItem(`notes_${currentUser.username}`);
      if (localNotes) setUserNotes(localNotes);
      loadLocalHistory(currentUser.username);
    }
  }, [currentUser, isCloudConnected, firebaseUser]);

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

  // --- FUNÇÕES DE HISTÓRICO ---
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
      if (db && firebaseUser) {
        try {
          // Regra de segurança: Usar coleção 'users' para dados privados
          const docRef = doc(db, 'artifacts', appId, 'users', firebaseUser.uid, 'history', 'main');
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
  
      if (db && firebaseUser) {
        try {
          const docRef = doc(db, 'artifacts', appId, 'users', firebaseUser.uid, 'history', 'main');
          await setDoc(docRef, {
            searches: updated,
            lastUpdated: new Date().toISOString(),
            username: currentUser.username
          }, { merge: true });
        } catch (error) { console.error("Erro ao salvar histórico na nuvem:", error); }
      }
  };

  // --- FUNÇÕES DE NOTAS ---
  const fetchNotesFromCloud = async (username) => {
    const localNotes = localStorage.getItem(`notes_${username}`);
    if (localNotes) setUserNotes(localNotes);

    if (db && firebaseUser) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', firebaseUser.uid, 'notes', 'main');
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
        if (db && firebaseUser) {
          setIsSaving(true);
          try {
            const docRef = doc(db, 'artifacts', appId, 'users', firebaseUser.uid, 'notes', 'main');
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
  }, [userNotes, currentUser, firebaseUser]);

  const handleNoteChange = (e) => setUserNotes(e.target.value);

  // --- LOGIN (SIMPLIFICADO) ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!usernameInput.trim()) {
      setLoginError("Digite um usuário.");
      return;
    }

    // Simulação de login
    const mockUser = {
      username: usernameInput.toLowerCase().trim(),
      name: "Médico(a) Demo",
      role: "Plantonista",
      crm: "12345/BR"
    };

    setCurrentUser(mockUser);
    localStorage.setItem('emergency_app_user', JSON.stringify(mockUser));
    setUsernameInput('');
    setPasswordInput('');
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

  // --- HELPER PARA INFERIR USO DO TIPO DE MEDICAÇÃO ---
  const inferUsoFromType = (tipo, farmaco = "") => {
    if (!tipo) return "USO ORAL";
    const t = tipo.toLowerCase();
    const f = farmaco.toLowerCase();
    
    if (t.includes('oftálmico') || t.includes('colírio')) return "USO OFTÁLMICO";
    if (t.includes('otológico')) return "USO OTOLÓGICO";
    if (t.includes('nasal')) return "USO NASAL";
    if (t.includes('inalatório') || t.includes('spray') || t.includes('bombinha')) return "USO INALATÓRIO";
    if (t.includes('tópico') || t.includes('creme') || t.includes('pomada') || t.includes('gel')) return "USO TÓPICO";
    if (t.includes('retal') || t.includes('supositório')) return "USO RETAL";
    if (t.includes('injetável') || t.includes('ampola') || t.includes('ev') || t.includes('im') || t.includes('iv') || t.includes('subcut')) return "USO INJETÁVEL";
    if (t.includes('vaginal') || t.includes('óvulo')) return "USO VAGINAL";
    
    // Fallbacks
    if (f.includes('creme') || f.includes('pomada')) return "USO TÓPICO";
    if (f.includes('colírio')) return "USO OFTÁLMICO";
    
    return "USO ORAL";
  };

  // --- LÓGICA DE PRESCRIÇÃO ATUALIZADA ---
  const togglePrescriptionItem = (med) => {
    if (activeRoom !== 'verde') return;

    setSelectedPrescriptionItems(prev => {
      const medName = med.farmaco || "Medicamento sem nome";
      const commercialName = med.receita?.nome_comercial || medName; 
      const itemId = medName + commercialName;
      
      const exists = prev.find(item => {
        const iName = item.farmaco || "Medicamento sem nome";
        const iComm = item.receita?.nome_comercial || iName;
        return (iName + iComm) === itemId;
      });
      
      if (exists) {
        return prev.filter(item => {
            const iName = item.farmaco || "Medicamento sem nome";
            const iComm = item.receita?.nome_comercial || iName;
            return (iName + iComm) !== itemId;
        });
      } else {
        const medType = inferMedType(med);
        const usoInferido = inferUsoFromType(med.tipo || medType, med.farmaco);
        
        const newItem = {
            ...med,
            dias_tratamento: med.receita?.dias_sugeridos || 5,
            receita: med.receita ? {
                ...med.receita,
                uso: med.receita.uso || usoInferido
            } : {
                nome_comercial: med.farmaco,
                quantidade: "1 cx/frasco",
                uso: usoInferido,
                instrucoes: med.sugestao_uso || "Conforme orientação médica.",
                dias_sugeridos: 5
            }
        };
        return [...prev, newItem];
      }
    });
  };

  const updateItemDays = (id, days) => {
    const newItems = [...selectedPrescriptionItems];
    const index = newItems.findIndex(item => {
        const iName = item.farmaco || "Medicamento sem nome";
        const iComm = item.receita?.nome_comercial || iName;
        return (iName + iComm) === id;
    });
    
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

  // --- FAVORITOS E CACHE ---
  const getConductDocId = (query, room) => {
    return `${query.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${room}`;
  };

  const subscribeToFavorites = (username) => {
      if (!db || !firebaseUser) return;
      
      const favoritesRef = collection(db, 'artifacts', appId, 'users', firebaseUser.uid, 'conducts');
      const q = firestoreQuery(favoritesRef); 

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const favs = [];
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.isFavorite) {
                favs.push({ id: doc.id, ...data });
              }
          });
          setFavorites(favs);
      }, (error) => {
          console.error("Erro ao buscar favoritos:", error);
      });
      return unsubscribe;
  };

  const toggleFavorite = async () => {
    if (!currentUser || !conduct) return;
    if (!isCloudConnected || !firebaseUser || !db) {
      showError("Modo Offline: Favoritos na nuvem indisponíveis.");
      return;
    }

    const newStatus = !isCurrentConductFavorite;
    setIsCurrentConductFavorite(newStatus);

    try {
      const docId = getConductDocId(searchQuery, activeRoom);
      const docRef = doc(db, 'artifacts', appId, 'users', firebaseUser.uid, 'conducts', docId);
      
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
      if (!currentUser || !isCloudConnected || !firebaseUser || !db) return;
      try {
          const docRef = doc(db, 'artifacts', appId, 'users', firebaseUser.uid, 'conducts', docId);
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

  // --- GERAÇÃO DE CONDUTA (INTEGRAÇÃO GEMINI) ---
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

    // 1. Tentar Cache
    if (isCloudConnected && currentUser && firebaseUser && db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', firebaseUser.uid, 'conducts', docId);
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

    // 2. Chamar Gemini API
    try {
      const apiKey = ""; // Injetado pelo ambiente
      const roomContext = activeRoom === 'verde' ? 'SALA VERDE (AMBULATORIAL)' : 'SALA VERMELHA (EMERGÊNCIA/UTI)';
      const lowerQuery = searchQuery.toLowerCase();
      
      let promptExtra = "";
      let roleDefinition = "";

      if (activeRoom === 'vermelha') {
        roleDefinition = "Você é um médico INTENSIVISTA e EMERGENCISTA SÊNIOR. Sua prioridade é salvar a vida do paciente com precisão absoluta e tolerância zero para erros.";
        promptExtra += `
        CRITICIDADE MÁXIMA (SALA VERMELHA):
        
        **PROTOCOLOS INSTITUCIONAIS OBRIGATÓRIOS (SIGA ESTRITAMENTE ESTES PADRÕES DE DILUIÇÃO SE O MEDICAMENTO FOR SOLICITADO):**
        1. **Noradrenalina:** 8 ampolas (4mg/4mL) + 218mL SG 5% (Total 250mL). Concentração: 128 mcg/mL.
        2. **Dobutamina:** 4 ampolas (250mg/20mL) + 170mL SG 5% (Total 250mL). Concentração: 4000 mcg/mL.
        3. **Nitroprussiato (Nipride):** 1 ampola (50mg/2mL) + 248mL SG 5% (Total 250mL). Concentração: 200 mcg/mL.
        4. **Nitroglicerina (Tridil):** 1 ampola (50mg/10mL) + 240mL SG 5% (Total 250mL). Concentração: 200 mcg/mL. Dose em mcg/min.
        5. **Vasopressina:** 1 ampola (20UI/1mL) + 100mL SF 0,9%. Concentração: 0.2 UI/mL. Dose em UI/min.
        6. **Dopamina:** 5 ampolas (50mg/10mL) + 200mL SG 5%. Concentração: 1000 mcg/mL.
        7. **Dexmedetomidina (Precedex):** 2 ampolas (200mcg/2mL) + 96mL SF 0,9%. Concentração: 4 mcg/mL. Dose em **mcg/kg/h**.
        8. **Fentanyl (Manutenção):** 2 ampolas (500mcg/10mL) + 80mL SF 0,9%. Concentração: 10 mcg/mL. Dose em **mcg/kg/h**.
        9. **Midazolam (Manutenção):** 10 ampolas (15mg/3mL) + 120mL SG 5%. Concentração: 1 mg/mL. Dose em **mg/kg/h**.
        10. **Propofol (Manutenção):** Puro (Sem diluição). Concentração: 10 mg/mL. Dose em **mg/kg/h**.
        11. **Esmolol:** 1 ampola (2500mg/10mL) + 240mL SG 5%. Concentração: 10 mg/mL. Dose em mcg/kg/min.
        12. **Cisatracúrio:** 5 ampolas (10mg/5mL) + 25mL SF 0,9%. Concentração: 1 mg/mL. Dose em mcg/kg/min.

        **ESTRUTURA DE PRESCRIÇÃO E CATEGORIZAÇÃO:**
           - Categorias: "Dieta", "Hidratação", "DVA" (Drogas Vasoativas), "Antibiótico", "Sintomáticos", "Profilaxia", "Terapia Específica".
           - **DVA**: Use esta categoria EXCLUSIVAMENTE para drogas vasoativas: Noradrenalina, Dobutamina, Dopamina, Vasopressina, Adrenalina, Nitroprussiato, Nitroglicerina.
           - Para **Hidratação**, se venosa, use "usa_peso": true se necessário. Decida a melhor estratégia (Bolus 30ml/kg, Manutenção em ml/kg/h ou Volume Total/24h).
           
        **DETALHAMENTO TÉCNICO:**
           - "diluicao_detalhada": Copie o texto do protocolo acima se aplicável.
           - "concentracao_mg_ml": Use o valor numérico exato do protocolo.
           - "unidade_base": ATENÇÃO ÀS UNIDADES DE TEMPO! Use "mcg/kg/min", "mcg/kg/h", "mg/kg/h", "UI/min" ou "mcg/min" conforme o protocolo da droga. Para hidratação use "ml/kg", "ml/kg/h" ou "ml/kg/24h".
        `;
      } else {
        roleDefinition = "Você é um médico generalista experiente em pronto atendimento.";
        promptExtra += `
        CONTEXTO SALA VERDE (AMBULATORIAL):
        - Foco em alívio sintomático e tratamento domiciliar.
        - "receita": OBRIGATÓRIO para TODOS os medicamentos (seja Oral, Tópico, Injetável, etc).
        - No objeto "receita", o campo "uso" deve ser EXATO: "USO ORAL", "USO TÓPICO", "USO INJETÁVEL", "USO OFTÁLMICO", "USO OTOLÓGICO", "USO RETAL", "USO INALATÓRIO".
        - "instrucoes": Linguagem clara para o paciente.
        `;
      }

      if (lowerQuery.includes('dengue')) promptExtra += `\nPROTOCOLO DENGUE (MS BRASIL): Classifique A, B, C, D. Grupo C/D (Sala Vermelha): Expansão 20ml/kg.`;
      if (lowerQuery.includes('sepse')) promptExtra += `\nPROTOCOLO SEPSE: Pacote de 1 hora, Lactato, Hemoculturas, Antibiótico, Cristaloide 30ml/kg.`;
      if (lowerQuery.includes('iam') || lowerQuery.includes('infarto')) promptExtra += `\nPROTOCOLO IAM: Tempo porta-balão/agulha, Dupla antiagregação, Anticoagulação.`;
      if (lowerQuery.includes('trauma') || lowerQuery.includes('acid')) promptExtra += `\nPROTOCOLO TRAUMA (ATLS): Preencher objeto "xabcde_trauma".`;

      const promptText = `${roleDefinition}
      Gere a conduta clínica IMPECÁVEL para "${searchQuery}" na ${roomContext}.
      ${promptExtra}
      
      REGRAS DE FORMATO (JSON):
      1. Retorne APENAS JSON válido.
      2. Separe apresentações diferentes em objetos diferentes.
      3. "tipo" OBRIGATÓRIO: ['Comprimido', 'Cápsula', 'Xarope', 'Suspensão', 'Gotas', 'Solução Oral', 'Injetável', 'Tópico', 'Inalatório', 'Supositório', 'Colírio'].
      4. "sugestao_uso": Sala Verde (Instruções paciente), Sala Vermelha (Instruções adminstração resumida).
      
      ESTRUTURA JSON ESPERADA:
      {
        "condicao": "Nome Técnico Completo",
        "estadiamento": "Classificação de Risco/Gravidade",
        "classificacao": "${roomContext}",
        "resumo_clinico": "Texto técnico detalhado...",
        "xabcde_trauma": null, 
        "avaliacao_inicial": { 
          "sinais_vitais_alvos": ["PAM ≥ 65mmHg", "FC < 100bpm"], 
          "exames_prioridade1": ["Gasometria", "Lactato"], 
          "exames_complementares": ["..."] 
        },
        "achados_exames": { "ecg": "...", "laboratorio": "...", "imagem": "..." },
        "criterios_gravidade": ["Sinal 1", "Sinal 2"],
        "tratamento_medicamentoso": [ 
          { 
            "categoria": "Terapia Específica", 
            "farmaco": "Nome + Concentração", 
            "tipo": "Injetável",
            "posologia": "...",
            "diluicao_detalhada": "...",
            "concentracao_solucao": "...",
            "velocidade_infusao_sugerida": "...",
            "referencia_dose": "...",
            "cuidados_especificos": "...",
            "tempo_infusao": "...",
            "indicacao": "...",
            "receita": { "nome_comercial": "...", "quantidade": "...", "uso": "USO ORAL", "instrucoes": "...", "dias_sugeridos": 5, "calculo_qnt": {"frequencia_diaria": 1, "unidade": "cp"} },
            "usa_peso": false, 
            "dose_padrao_kg": 0.0, 
            "unidade_base": "mcg/kg/min", 
            "concentracao_mg_ml": 0.0
          } 
        ],
        "escalonamento_terapeutico": [ { "passo": "...", "descricao": "..." } ],
        "medidas_gerais": ["..."],
        "criterios_internacao": ["..."],
        "criterios_alta": ["..."],
        "guideline_referencia": "Fonte"
      }
      Baseie-se em doses para adulto 70kg (padrão).`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) throw new Error('Erro na API IA');
      
      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsedConduct = JSON.parse(textResponse);
      
      setConduct(parsedConduct);

      // Salvar Cache se possível
      if (isCloudConnected && currentUser && firebaseUser && db) {
        const docRef = doc(db, 'artifacts', appId, 'users', firebaseUser.uid, 'conducts', docId);
        await setDoc(docRef, {
          query: searchQuery,
          room: activeRoom,
          conductData: parsedConduct,
          isFavorite: false,
          lastAccessed: new Date().toISOString()
        });
      }

      saveToHistory(searchQuery, activeRoom);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);

    } catch (error) {
      console.error("Erro API:", error);
      showError("Erro ao gerar conduta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const showError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 4000); };

  // ... (Helpers de UI mantidos iguais ao anterior) ...
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
    if (!type) return 'bg-slate-100 text-slate-500 border-slate-200';
    const t = type.toLowerCase();
    if (t.includes('injet')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (t.includes('gota') || t.includes('solu') || t.includes('xarope')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (t.includes('comp') || t.includes('cap')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (t.includes('tópi')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
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

  const groupMedsByCategory = (meds) => {
    if (!meds) return {};
    const groups = {};
    const defaultOrder = ['Dieta', 'Hidratação', 'DVA', 'Terapia Específica', 'Antibiótico', 'Sintomáticos', 'Profilaxia', 'Outros'];
    
    meds.forEach(med => {
      let cat = med.categoria || 'Outros';
      if (cat.toLowerCase().includes('dieta')) cat = 'Dieta';
      else if (cat.toLowerCase().includes('hidrat')) cat = 'Hidratação';
      else if (cat.toUpperCase() === 'DVA' || cat.toLowerCase().includes('vaso')) cat = 'DVA';
      else if (cat.toLowerCase().includes('anti') && cat.toLowerCase().includes('bi')) cat = 'Antibiótico';
      else if (cat.toLowerCase().includes('sintom')) cat = 'Sintomáticos';
      else if (cat.toLowerCase().includes('profilax')) cat = 'Profilaxia';
      else if (cat.toLowerCase().includes('espec') || cat.toLowerCase().includes('seda')) cat = 'Terapia Específica';
      
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(med);
    });

    const orderedGroups = {};
    defaultOrder.forEach(key => {
      if (groups[key]) orderedGroups[key] = groups[key];
    });
    Object.keys(groups).forEach(key => {
      if (!defaultOrder.includes(key) && !['Dieta', 'Hidratação', 'DVA', 'Antibiótico', 'Sintomáticos', 'Profilaxia', 'Terapia Específica'].includes(key)) {
        orderedGroups[key] = groups[key];
      }
    });

    return orderedGroups;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Dieta': return <Utensils size={18} />;
      case 'Hidratação': return <GlassWater size={18} />;
      case 'DVA': return <Activity size={18} />;
      case 'Antibiótico': return <Tablets size={18} />;
      case 'Sintomáticos': return <Pill size={18} />;
      case 'Profilaxia': return <ShieldCheck size={18} />;
      case 'Terapia Específica': return <Zap size={18} />;
      default: return <Pill size={18} />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Dieta': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Hidratação': return 'text-cyan-600 bg-cyan-50 border-cyan-200';
      case 'DVA': return 'text-red-700 bg-red-50 border-red-200'; 
      case 'Antibiótico': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'Sintomáticos': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Profilaxia': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Terapia Específica': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  // --- RENDERIZAÇÃO: TELA DE LOGIN ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-br from-blue-900 to-slate-800 p-8 text-center text-white relative">
            <img src={logoImg} alt="Logo do Sistema" className="mx-auto mb-3 h-24 w-auto rounded-xl shadow-2xl border-4 border-white/20 object-cover bg-white p-1" />
            <h1 className="text-2xl font-bold mb-1">Guia de Plantão</h1>
            <p className="text-blue-200 text-sm font-medium">Acesso Exclusivo Médico</p>
          </div>
          <div className="p-8 space-y-6">
            {loginError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2 border border-red-100 font-mono">{loginError}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Usuário</label><div className="relative"><User className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input type="text" value={usernameInput} onChange={(e)=>setUsernameInput(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-900" placeholder="Digite um usuário para demo" /></div></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Senha</label><div className="relative"><KeyRound className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input type="password" value={passwordInput} onChange={(e)=>setPasswordInput(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-900" placeholder="Qualquer senha" /></div></div>
              <button type="submit" className="w-full flex items-center justify-center gap-3 bg-blue-900 text-white font-bold p-3.5 rounded-xl hover:bg-blue-800 transition-all shadow-lg mt-2"><LogIn className="w-5 h-5" /> Acessar Sistema</button>
            </form>
            <div className="text-center flex flex-col items-center gap-3 pt-2 border-t border-gray-100">
              <div className={`flex items-center justify-center gap-2 text-[10px] px-3 py-1.5 rounded-full mx-auto w-fit ${isCloudConnected ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{isCloudConnected ? <Cloud size={12}/> : <CloudOff size={12}/>}<span>{isCloudConnected ? 'Banco de Dados Conectado' : 'Modo Offline (Dados Locais)'}</span></div>
              <p className="text-[10px] text-slate-400 leading-tight max-w-xs">ATENÇÃO: Ferramenta auxiliar. Não substitui o julgamento clínico. O autor isenta-se de responsabilidade.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO: APP PRINCIPAL ---
  const groupedMeds = conduct && activeRoom === 'vermelha' ? groupMedsByCategory(conduct.tratamento_medicamentoso) : null;

  // (O resto do componente Main é idêntico, apenas a inicialização do Firebase mudou)
  // ...
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 selection:bg-blue-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Logo" className="w-10 h-10 rounded-lg object-cover shadow-sm border border-gray-200" />
            <div><h1 className="text-lg font-bold text-slate-800 leading-none">Guia de Plantão</h1><span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Suporte Médico</span></div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex flex-col items-end mr-2"><span className="text-xs font-bold text-slate-700">{currentUser.name}</span><span className="text-[10px] text-slate-400 uppercase">{currentUser.role}</span></div>
             <button onClick={() => setShowFavoritesModal(true)} className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-full transition-colors" title="Meus Favoritos"><Star size={20} /></button>
             <button onClick={() => setShowNotepad(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full"><Edit size={20} /></button>
             <button onClick={handleLogout} className="p-2 text-red-400 hover:bg-red-50 rounded-full"><LogOut size={20} /></button>
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
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateConduct()} placeholder="Digite o quadro clínico (ex: Cetoacidose, IAM, Dengue...)" className="flex-1 py-3 bg-transparent outline-none text-slate-800 font-medium" />
            <button onClick={generateConduct} disabled={loading} className={`px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all ${loading ? 'bg-slate-300' : 'bg-blue-900 hover:bg-blue-800'}`}>{loading ? <Loader2 className="animate-spin" /> : <>Gerar <ArrowRight size={18} /></>}</button>
          </div>

          {recentSearches.length > 0 && (<div className="flex flex-wrap gap-2 px-1"><div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mr-2"><History size={14} /> Recentes</div>{recentSearches.map((search, idx) => (<button key={idx} onClick={() => {setActiveRoom(search.room); setSearchQuery(search.query);}} className="flex items-center gap-2 text-xs px-3 py-1 bg-white border border-gray-200 rounded-full hover:border-blue-300 hover:text-blue-700 transition-colors"><div className={`w-2 h-2 rounded-full shrink-0 ${search.room === 'verde' ? 'bg-emerald-500' : 'bg-rose-500'}`} />{search.query}</button>))}</div>)}
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
                 <button onClick={toggleFavorite} className={`p-2 rounded-full transition-colors ${isCurrentConductFavorite ? 'bg-yellow-100 text-yellow-500 hover:bg-yellow-200' : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-400'}`} title="Favoritar"><Star size={24} fill={isCurrentConductFavorite ? "currentColor" : "none"} /></button>
                 <button onClick={() => setConduct(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={24}/></button>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex gap-4">
               <div className="bg-blue-50 p-2 rounded-full h-fit text-blue-600"><User size={24} /></div>
               <div><h3 className="font-bold text-slate-900 mb-1">Resumo Clínico e Fisiopatologia</h3><p className="text-slate-700 leading-relaxed text-sm">{conduct.resumo_clinico}</p></div>
            </div>

            {conduct.xabcde_trauma && typeof conduct.xabcde_trauma === 'object' && (
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
                   
                   {/* RENDERIZAÇÃO CONDICIONAL: SE FOR SALA VERMELHA E TIVER CATEGORIAS, USA O NOVO LAYOUT */}
                   {groupedMeds ? (
                     <div className="space-y-6">
                        {Object.entries(groupedMeds).map(([category, meds]) => (
                           <div key={category} className={`border rounded-2xl overflow-hidden ${getCategoryColor(category)} bg-white border-opacity-60`}>
                              <div className={`px-4 py-2 flex items-center gap-2 font-bold text-sm uppercase border-b border-opacity-50 ${getCategoryColor(category)}`}>
                                 {getCategoryIcon(category)} {category}
                              </div>
                              <div className="p-4 space-y-4">
                                 {meds.map((med, idx) => {
                                    const medType = inferMedType(med);
                                    let doseFinal = null;
                                    let volumeFinal = null;

                                    if (activeRoom === 'vermelha' && med.usa_peso && patientWeight && med.dose_padrao_kg) {
                                      const weight = parseFloat(patientWeight);
                                      const doseRef = parseFloat(med.dose_padrao_kg);
                                      const unit = med.unidade_base?.toLowerCase() || '';
                                      const concMgMl = parseFloat(med.concentracao_mg_ml || 0);
               
                                      // Cálculo base da dose absoluta (Ex: Total de mg)
                                      const totalDose = doseRef * weight;
                                      const displayUnit = med.unidade_base ? med.unidade_base.replace(/\/kg.*$/, '').trim() : '';
                                      doseFinal = `${totalDose.toFixed(2)} ${displayUnit}`;
               
                                      // === LÓGICA DE CÁLCULO AVANÇADA PARA BIC (mL/h) ===
                                      
                                      // 1. HIDRATAÇÃO (Flexible Logic)
                                      if (category === 'Hidratação' && med.usa_peso) {
                                         if (unit.includes('24h') || unit.includes('dia')) {
                                            const volume24h = totalDose; 
                                            const flowRate = volume24h / 24;
                                            volumeFinal = `Total: ${volume24h.toFixed(0)} ml/24h (Vazão: ${flowRate.toFixed(1)} ml/h)`;
                                         } else if (unit.includes('h') && !unit.includes('24')) {
                                            // ml/kg/h
                                            const flowRate = totalDose; // doseRef * weight
                                            volumeFinal = `Vazão: ${flowRate.toFixed(1)} ml/h`;
                                         } else {
                                            // Bolus (ml/kg)
                                            volumeFinal = `Volume Total: ${totalDose.toFixed(0)} ml`;
                                         }
                                         // Atualiza doseFinal para mostrar a unidade correta
                                         doseFinal = `${doseRef} ${med.unidade_base}`;
                                      } 
                                      
                                      // 2. CÁLCULOS ESPECÍFICOS DE VAZÃO (DROGAS)
                                      else if (concMgMl > 0) {
                                         // A. Unidade: mcg/kg/min (Noradrenalina, Dopamina, Dobutamina, Nipride)
                                         // Fórmula: (Dose * Peso * 60) / (Conc_mg * 1000)
                                         if (unit.includes('mcg') && unit.includes('min')) {
                                            const concMcgMl = concMgMl * 1000;
                                            const flowRate = (doseRef * weight * 60) / concMcgMl;
                                            volumeFinal = `${flowRate.toFixed(1)} ml/h`;
                                         } 
                                         // B. Unidade: mcg/kg/h (Precedex, Fentanyl)
                                         // Fórmula: (Dose * Peso) / (Conc_mg * 1000)
                                         else if (unit.includes('mcg') && unit.includes('h') && !unit.includes('min')) {
                                            const concMcgMl = concMgMl * 1000;
                                            const flowRate = (doseRef * weight) / concMcgMl;
                                            volumeFinal = `${flowRate.toFixed(1)} ml/h`;
                                         }
                                         // C. Unidade: mg/kg/h (Midazolam, Propofol)
                                         // Fórmula: (Dose * Peso) / Conc_mg
                                         else if (unit.includes('mg') && unit.includes('h') && !unit.includes('min') && !unit.includes('mcg')) {
                                            const flowRate = (doseRef * weight) / concMgMl;
                                            volumeFinal = `${flowRate.toFixed(1)} ml/h`;
                                         }
                                         // D. Unidade: UI/min (Vasopressina)
                                         // Fórmula: (Dose_UI_min * 60) / Conc_UI_ml
                                         else if (unit.includes('ui') && unit.includes('min')) {
                                            // doseRef aqui é UI/min (sem peso, geralmente)
                                            // Se usa_peso for false, weight = 1. Mas se usa_peso=true, mantemos
                                            const doseTotalUI = med.usa_peso ? (doseRef * weight) : doseRef;
                                            // concMgMl aqui representa UI/mL
                                            const flowRate = (doseTotalUI * 60) / concMgMl;
                                            volumeFinal = `${flowRate.toFixed(1)} ml/h`;
                                            doseFinal = `${doseTotalUI} UI/min`;
                                         }
                                         // E. Unidade: mcg/min (Nitroglicerina/Tridil - sem peso)
                                         else if (unit.includes('mcg') && unit.includes('min') && !unit.includes('kg')) {
                                            const concMcgMl = concMgMl * 1000;
                                            const flowRate = (doseRef * 60) / concMcgMl;
                                            volumeFinal = `${flowRate.toFixed(1)} ml/h`;
                                            doseFinal = `${doseRef} mcg/min`;
                                         }
                                         // Fallback: Dose Absoluta / Concentração (Bolus simples)
                                         else {
                                            let adjustedConc = concMgMl;
                                            if (unit.includes('mcg')) adjustedConc = concMgMl * 1000;
                                            const vol = totalDose / adjustedConc;
                                            volumeFinal = `${vol.toFixed(1)} ml`;
                                         }
                                      }
                                    }

                                    return (
                                       <div key={idx} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm relative group hover:border-blue-200 transition-all">
                                          <div className="flex justify-between items-start mb-2">
                                             <h4 className="font-bold text-slate-800 text-lg">{med.farmaco}</h4>
                                             {med.via && <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{med.via}</span>}
                                          </div>
                                          
                                          {/* Nova Ficha Técnica Detalhada (Apenas Vermelha) */}
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-600 mb-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                            {med.posologia && <div className="col-span-2 flex items-start gap-2"><span className="font-bold text-slate-700 shrink-0">Posologia:</span> <span>{med.posologia}</span></div>}
                                            {med.diluicao_detalhada && <div className="col-span-2 flex items-start gap-2 text-blue-800"><FlaskConical size={14} className="mt-0.5 shrink-0"/> <span className="font-bold shrink-0">Diluição:</span> <span>{med.diluicao_detalhada}</span></div>}
                                            {med.concentracao_solucao && <div className="flex items-center gap-2"><span className="font-bold text-slate-700">Conc. Final:</span> <span>{med.concentracao_solucao}</span></div>}
                                            {med.velocidade_infusao_sugerida && <div className="flex items-center gap-2 text-purple-700"><Timer size={14} className="shrink-0"/> <span className="font-bold">Vel. Inicial:</span> <span>{med.velocidade_infusao_sugerida}</span></div>}
                                            {med.tempo_infusao && <div className="flex items-center gap-2"><Clock size={14} className="shrink-0"/> <span className="font-bold text-slate-700">Tempo:</span> <span>{med.tempo_infusao}</span></div>}
                                            {med.referencia_dose && <div className="flex items-center gap-2 text-slate-400 text-xs"><BookOpen size={12} className="shrink-0"/> <span className="font-medium">Ref:</span> <span>{med.referencia_dose}</span></div>}
                                            {med.cuidados_especificos && <div className="col-span-2 flex items-start gap-2 text-amber-700 bg-amber-50 p-2 rounded mt-1 border border-amber-100/50"><AlertTriangle size={14} className="mt-0.5 shrink-0"/> <span className="font-bold shrink-0">Cuidados:</span> <span>{med.cuidados_especificos}</span></div>}
                                          </div>

                                          {activeRoom === 'vermelha' && med.usa_peso && (
                                            <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 text-sm mt-3 relative overflow-hidden">
                                               <div className="absolute top-0 right-0 p-1 opacity-10"><Calculator size={40} /></div>
                                               <div className="flex gap-2 items-center mb-1 relative z-10">
                                                  <span className="font-bold text-slate-600 uppercase text-xs">Cálculo para {patientWeight || '...'} kg:</span>
                                               </div>
                                               <div className="flex gap-4 items-baseline relative z-10">
                                                 <span className="text-slate-800 font-bold text-lg">{doseFinal || '-'}</span>
                                                 {volumeFinal && <div className="text-blue-700 font-bold text-lg border-l border-slate-300 pl-4">{volumeFinal}</div>}
                                               </div>
                                               {!patientWeight && <div className="text-xs text-rose-500 mt-1 font-medium italic animate-pulse">⚠ Insira o peso do paciente acima para calcular</div>}
                                            </div>
                                          )}
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        ))}
                     </div>
                   ) : (
                     /* RENDERIZAÇÃO PADRÃO (SALA VERDE OU SEM CATEGORIAS) */
                     conduct.tratamento_medicamentoso?.map((med, idx) => {
                       // CORREÇÃO: Lógica de ID simplificada para corresponder ao togglePrescriptionItem
                       const medName = med.farmaco || "Medicamento sem nome";
                       // Se não tem receita, o toggle vai criar uma com nome_comercial = medName
                       // Se tem receita, usa o nome_comercial existente
                       const commercialName = med.receita?.nome_comercial || medName;
                       const itemId = medName + commercialName;

                       const isSelected = selectedPrescriptionItems.some(item => {
                           const iName = item.farmaco || "Medicamento sem nome";
                           const iComm = item.receita?.nome_comercial || iName;
                           return (iName + iComm) === itemId;
                       });
                       
                       const canSelect = activeRoom === 'verde'; 
                       const medType = inferMedType(med); 
                       const isInjectable = medType.toLowerCase().includes('injet');
                       
                       const selectedItemState = selectedPrescriptionItems.find(item => {
                           const iName = item.farmaco || "Medicamento sem nome";
                           const iComm = item.receita?.nome_comercial || iName;
                           return (iName + iComm) === itemId;
                       });
                       const currentDays = selectedItemState ? selectedItemState.dias_tratamento : (med.receita?.dias_sugeridos || 5);

                       return (
                         <div 
                           key={idx} 
                           onClick={() => canSelect && togglePrescriptionItem(med)}
                           className={`bg-white rounded-xl border p-5 shadow-sm transition-all relative overflow-hidden group ${canSelect ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''} ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'border-gray-200'}`}
                         >
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isSelected ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                            {canSelect && (<div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-transparent'}`}><CheckCircle2 size={14} /></div>)}
                            
                            <div className="absolute top-4 right-12">
                               <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getMedTypeColor(medType)}`}>{getMedTypeIcon(medType)} {medType}</span>
                            </div>

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3 pl-3 pr-20">
                               <div>
                                  <div className="flex items-center gap-2"><h4 className="text-xl font-bold text-slate-800">{med.farmaco}</h4></div>
                                  <span className="text-sm text-slate-500 italic">{med.indicacao}</span>
                               </div>
                               {med.via && <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">{med.via}</span>}
                            </div>
                            
                            <div className="bg-slate-50 rounded-lg p-3 ml-3 mb-3 font-mono text-sm text-slate-700 border border-slate-100"><strong className="text-slate-500 block text-xs uppercase mb-1">Sugestão de Uso / Dose:</strong>{med.sugestao_uso || med.dose || med.receita?.instrucoes}</div>
                            
                            {canSelect && isSelected && (
                              <div className="ml-3 mb-3 animate-in slide-in-from-top-1" onClick={(e) => e.stopPropagation()}>
                                 <label className="text-xs font-bold text-blue-700 flex items-center gap-1 mb-1"><CalendarDays size={12} /> Duração (Dias):</label>
                                 <input type="number" min="1" className="w-20 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-blue-900 font-bold" value={currentDays} onChange={(e) => updateItemDays(itemId || med.farmaco, parseInt(e.target.value))} />
                              </div>
                            )}

                            <div className="grid sm:grid-cols-2 gap-4 ml-3 text-sm">
                               {isInjectable && med.diluicao && (<div className="flex gap-2 text-blue-700"><FlaskConical size={16} className="shrink-0 mt-0.5"/><span><strong>Diluição:</strong> {med.diluicao}</span></div>)}
                               {isInjectable && med.modo_admin && (<div className="flex gap-2 text-purple-700"><Timer size={16} className="shrink-0 mt-0.5"/><span><strong>Infusão:</strong> {med.modo_admin} {med.tempo_infusao ? `(${med.tempo_infusao})` : ''}</span></div>)}
                               {med.cuidados && <div className="flex gap-2 text-amber-700 col-span-2"><AlertTriangle size={16} className="shrink-0 mt-0.5"/><span><strong>Atenção:</strong> {med.cuidados}</span></div>}
                            </div>
                         </div>
                       );
                     })
                   )}
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
                {['USO ORAL', 'USO TÓPICO', 'USO RETAL', 'USO INALATÓRIO', 'USO OFTÁLMICO', 'USO OTOLÓGICO', 'USO INJETÁVEL', 'OUTROS'].map((usoType) => {
                  const items = selectedPrescriptionItems.filter(item => {
                      const usoItem = item.receita?.uso?.toUpperCase() || 'OUTROS';
                      // Se o usoType for 'OUTROS', pega tudo que não caiu nos anteriores
                      if (usoType === 'OUTROS') {
                          const knownTypes = ['USO ORAL', 'USO TÓPICO', 'USO RETAL', 'USO INALATÓRIO', 'USO OFTÁLMICO', 'USO OTOLÓGICO', 'USO INJETÁVEL'];
                          return !knownTypes.includes(usoItem);
                      }
                      // Senão, faz match exato ou parcial (removendo 'USO ')
                      return usoItem.includes(usoType.replace('USO ', '')) || usoItem === usoType;
                  });
                  
                  if (items.length === 0) return null;
                  
                  return (
                    <div key={usoType}>
                      <div className="flex items-center gap-4 mb-4"><h3 className="font-bold text-lg underline decoration-2 underline-offset-4">{usoType}</h3></div>
                      <ul className="space-y-6 list-none">{items.map((item, index) => (<li key={index} className="relative pl-6"><span className="absolute left-0 top-0 font-bold text-lg">{index + 1}.</span><div className="flex items-end mb-1 w-full"><span className="font-bold text-xl">{item.receita.nome_comercial}</span><div className="flex-1 mx-2 border-b-2 border-dotted border-slate-400 mb-1.5"></div><span className="font-bold text-lg whitespace-nowrap">{item.receita.quantidade}</span></div><p className="text-base leading-relaxed text-slate-800 mt-1 pl-2 border-l-4 border-slate-200">{item.receita.instrucoes}</p></li>))}</ul>
                    </div>
                  )
                })}
              </div>
              <footer className="mt-auto pt-12"><div className="flex justify-between items-end"><div className="text-sm"><p className="font-bold">Data:</p><div className="w-40 border-b border-slate-800 mt-4 text-center relative top-1">{new Date().toLocaleDateString('pt-BR')}</div></div><div className="text-center"><div className="w-64 border-b border-slate-800 mb-2"></div><p className="font-bold uppercase text-sm">{currentUser?.name}</p><p className="text-xs text-slate-500">Assinatura e Carimbo</p></div></div><div className="text-center mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 uppercase">Rua da Medicina, 123 • Centro • Cidade/UF • Tel: (00) 1234-5678</div></footer>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FAVORITOS */}
      {showFavoritesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex justify-between items-center">
              <div className="flex items-center gap-2 text-yellow-800 font-bold"><Star size={20} fill="currentColor" /> Meus Favoritos</div>
              <button onClick={() => setShowFavoritesModal(false)} className="p-2 hover:bg-yellow-100 rounded-full text-yellow-700 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto bg-slate-50">
              {favorites.length === 0 ? (<div className="text-center p-8 text-slate-400 text-sm">Você ainda não tem favoritos.</div>) : (<div className="space-y-2">{favorites.map((fav) => (<div key={fav.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-colors"><button onClick={() => loadFavoriteConduct(fav)} className="flex-1 text-left"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full shrink-0 ${fav.room === 'verde' ? 'bg-emerald-500' : 'bg-rose-500'}`} /><span className="font-bold text-slate-700 text-sm">{fav.query}</span></div><span className="text-[10px] text-slate-400 ml-4">{new Date(fav.lastAccessed).toLocaleDateString()}</span></button><button onClick={(e) => { e.stopPropagation(); removeFavoriteFromList(fav.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Remover"><Trash2 size={16} /></button></div>))}</div>)}
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
