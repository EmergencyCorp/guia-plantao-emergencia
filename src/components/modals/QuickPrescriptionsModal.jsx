// Arquivo: src/components/modals/QuickPrescriptionsModal.jsx
import React, { useState, useMemo } from 'react';
import { 
  X, Search, ChevronRight, ArrowLeft, FileText, Activity, 
  Wind, Brain, Stethoscope, Utensils, Zap, Pill, 
  Ear, Sun, Bone, Flower2, Apple 
} from 'lucide-react';

// --- BASE DE DADOS DE RECEITAS ---
const PRESCRIPTIONS_DB = [
  {
    category: 'Cardiologia',
    icon: Activity,
    color: 'text-rose-500',
    pathologies: [
      {
        name: 'Síndrome Coronariana Aguda (SCA)',
        drugs: [
          { name: 'AAS', dose: '300mg (3 cp de 100mg)', obs: 'Mastigar. Dose de ataque. Manutenção 100mg/dia.', route: 'VO', ref: '' },
          { name: 'Clopidogrel', dose: '300mg (4 cp de 75mg)', obs: 'Dose de ataque (600mg se for para Angioplastia). Manutenção 75mg/dia.', route: 'VO', ref: '' },
          { name: 'Enoxaparina', dose: '1 mg/kg', obs: 'De 12/12h. Ajustar se ClCr < 30 ou Idade > 75.', route: 'SC', ref: '' },
          { name: 'Atorvastatina', dose: '40mg', obs: 'Alta potência. Tomar 1x ao dia.', route: 'VO', ref: '' },
          { name: 'Isordil', dose: '5mg', obs: 'Sublingual se dor (máx 3 doses). Evitar se uso de Viagra/Cialis ou Infarto de VD.', route: 'SL', ref: '' }
        ]
      },
      {
        name: 'Edema Agudo de Pulmão (EAP)',
        drugs: [
          { name: 'Furosemida', dose: '20-40mg (1-2 ampolas)', obs: 'Ou 1-2.5x a dose habitual do paciente.', route: 'IV', ref: '' },
          { name: 'Nitroglicerina (Tridil)', dose: 'Início 5mcg/min', obs: 'Se PAS > 90mmHg. Titular a cada 5-10 min.', route: 'IV (BIC)', ref: '' },
          { name: 'Morfina', dose: '2-4mg', obs: 'Com parcimônia se muita ansiedade/dispneia.', route: 'IV', ref: '' }
        ]
      },
      {
        name: 'Fibrilação Atrial (Controle de FC)',
        drugs: [
          { name: 'Metoprolol', dose: '5mg', obs: 'Fazer em 2 min. Pode repetir a cada 5 min (máx 15mg).', route: 'IV', ref: '' },
          { name: 'Deslanosídeo', dose: '0.4mg (1 ampola)', obs: 'Lentamente. Opção se IC descompensada.', route: 'IV', ref: '' }
        ]
      },
      {
        name: 'Taquicardia Supraventricular',
        drugs: [
          { name: 'Manobra Vagal', dose: '---', obs: 'Primeira linha (Valsalva modificada).', route: '---', ref: '' },
          { name: 'Adenosina', dose: '6mg', obs: 'Bolus rápido + Flush 20ml SF + Elevação membro. Se falha: 12mg.', route: 'IV', ref: '' }
        ]
      },
      {
        name: 'Dor Torácica (Exames Iniciais)',
        drugs: [
          { name: 'Solicitação', dose: 'ECG + Troponina + RX Tórax', obs: 'Para descartar SCA e Pneumotórax.', route: 'Exames', ref: 'APS' }
        ]
      }
    ]
  },
  {
    category: 'Pneumologia',
    icon: Wind,
    color: 'text-blue-500',
    pathologies: [
      {
        name: 'Crise Asmática',
        drugs: [
          { name: 'Salbutamol (Aerolin)', dose: '4-10 jatos', obs: 'Via espaçador. Repetir a cada 20 min na 1ª hora.', route: 'Inalatório', ref: '' },
          { name: 'Ipratrópio (Atrovent)', dose: '40 gotas (500mcg) ou 4 jatos', obs: 'Associar ao beta-agonista na 1ª hora.', route: 'NBZ/Inal', ref: '' },
          { name: 'Prednisolona', dose: '40-60mg', obs: 'Dose única matinal por 5-7 dias.', route: 'VO', ref: '' },
          { name: 'Hidrocortisona', dose: '100-500mg', obs: 'Se intolerância oral ou caso grave.', route: 'IV', ref: '' }
        ]
      },
      {
        name: 'Pneumonia Adquirida na Comunidade (PAC)',
        drugs: [
          { name: 'Amoxicilina + Clavulanato', dose: '875/125mg', obs: 'De 12/12h por 7 dias.', route: 'VO', ref: '' },
          { name: 'Azitromicina', dose: '500mg', obs: '1x ao dia por 5 dias.', route: 'VO', ref: '' },
          { name: 'Ceftriaxona', dose: '1g - 2g', obs: '1x ao dia (Internação/Sala Amarela).', route: 'IV', ref: '' }
        ]
      },
      {
        name: 'DPOC Exacerbado',
        drugs: [
          { name: 'Salbutamol + Ipratrópio', dose: '---', obs: 'Manter broncodilatação frequente.', route: 'Inalatório', ref: '' },
          { name: 'Prednisona', dose: '40mg', obs: '1x ao dia por 5 dias.', route: 'VO', ref: '' },
          { name: 'Levofloxacino', dose: '750mg', obs: 'Se indicação de ATB (Escarro purulento, aumento volume, dispneia).', route: 'VO', ref: '' }
        ]
      }
    ]
  },
  {
    category: 'Otorrinolaringologia',
    icon: Ear,
    color: 'text-orange-500',
    pathologies: [
      {
        name: 'Labirintite / Vertigem',
        drugs: [
          { name: 'Betaistina (Betina)', dose: '24mg', obs: '1 cp de 12/12h. Tratamento contínuo.', route: 'VO', ref: 'APS' },
          { name: 'Dimenidrato (Dramin)', dose: '50mg', obs: 'De 6/6h se crise aguda.', route: 'VO/IV', ref: 'APS' },
          { name: 'Meclizina', dose: '25mg', obs: 'De 6/6h se crise aguda.', route: 'VO', ref: 'APS' }
        ]
      },
      {
        name: 'Sintomas Gripais (Resfriado/Gripe)',
        drugs: [
          { name: 'Acetilcisteína', dose: '600mg', obs: '1x ao dia ou fracionado (mucolítico).', route: 'VO', ref: 'APS' },
          { name: 'Loratadina', dose: '10mg', obs: '1x ao dia por 5 dias (secreção/congestão).', route: 'VO', ref: 'APS' },
          { name: 'Prednisolona', dose: '40mg', obs: '1x ao dia pela manhã por 4 dias (anti-inflamatório potente).', route: 'VO', ref: 'APS' },
          { name: 'Dipirona', dose: '1g', obs: 'De 6/6h se dor ou febre.', route: 'VO', ref: 'APS' },
          { name: 'Lavagem Nasal', dose: 'SF 0.9%', obs: '10-20ml em cada narina 3x/dia.', route: 'Nasal', ref: 'APS' },
          { name: 'Budesonida (Busonid)', dose: '50mcg', obs: '1 jato cada narina 12/12h por 5 dias.', route: 'Nasal', ref: 'APS' }
        ]
      },
      {
        name: 'Otite Média Aguda',
        drugs: [
          { name: 'Amoxicilina + Clavulanato', dose: '875mg', obs: '12/12h por 10-14 dias.', route: 'VO', ref: '' },
          { name: 'Dipirona/Ibuprofeno', dose: 'Analgesia', obs: 'Horário fixo nos primeiros dias.', route: 'VO', ref: '' }
        ]
      },
      {
        name: 'Sinusite Aguda',
        drugs: [
          { name: 'Amoxicilina + Clavulanato', dose: '875mg', obs: '12/12h por 10-14 dias (se bacteriana).', route: 'VO', ref: '' },
          { name: 'Lavagem Nasal', dose: 'Abundante', obs: 'Essencial para drenagem.', route: 'Nasal', ref: '' },
          { name: 'Prednisolona', dose: '20-40mg', obs: '1x ao dia por 5 dias (reduz edema).', route: 'VO', ref: '' }
        ]
      }
    ]
  },
  {
    category: 'Dermatologia',
    icon: Sun,
    color: 'text-yellow-600',
    pathologies: [
      {
        name: 'Dermatoses (Responsivas a corticoide)',
        drugs: [
          { name: 'Quadriderm (ou similar)', dose: 'Camada fina', obs: 'Aplicar na lesão 2x ao dia por 10 dias.', route: 'Tópico', ref: 'APS' }
        ]
      },
      {
        name: 'Escabiose (Sarna)',
        drugs: [
          { name: 'Ivermectina 6mg', dose: '0,5 cp / 15kg', obs: 'Dose única. Repetir em 7 dias.', route: 'VO', ref: 'APS' },
          { name: 'Permetrina 5% (Loção)', dose: 'Corpo todo', obs: 'Aplicar à noite (exceto face), lavar pela manhã. Repetir após 7 dias.', route: 'Tópico', ref: 'APS' },
          { name: 'Dexclorfeniramina', dose: '2mg', obs: 'De 8/8h para coceira.', route: 'VO', ref: 'APS' }
        ]
      },
      {
        name: 'Alergia Cutânea / Urticária',
        drugs: [
          { name: 'Loratadina', dose: '10mg', obs: '1x à noite por 5 dias.', route: 'VO', ref: 'APS' },
          { name: 'Bilastina', dose: '20mg', obs: '1x ao dia longe das refeições.', route: 'VO', ref: 'APS' },
          { name: 'Hidratação', dose: 'Creme Ureia/Nivea', obs: '3x ao dia (recuperação barreira cutânea).', route: 'Tópico', ref: 'APS' }
        ]
      },
      {
        name: 'Foliculite',
        drugs: [
          { name: 'Cefalexina', dose: '500mg', obs: '6/6h por 7 dias.', route: 'VO', ref: 'APS' },
          { name: 'Dipirona', dose: '1g', obs: '6/6h se dor.', route: 'VO', ref: 'APS' },
          { name: 'Compressa Morna', dose: '3x ao dia', obs: 'Auxilia drenagem.', route: 'Local', ref: 'APS' }
        ]
      }
    ]
  },
  {
    category: 'Neurologia',
    icon: Brain,
    color: 'text-purple-500',
    pathologies: [
      {
        name: 'Crise Convulsiva',
        drugs: [
          { name: 'Diazepam', dose: '10mg', obs: 'Lentamente. Pode repetir após 5 min.', route: 'IV', ref: '' },
          { name: 'Fenitoína', dose: '15-20mg/kg', obs: 'Dose de ataque. Diluir em SF 0.9% (Não usar SG).', route: 'IV', ref: '' }
        ]
      },
      {
        name: 'Enxaqueca / Cefaleia',
        drugs: [
          { name: 'Dipirona', dose: '1g', obs: 'Diluída.', route: 'IV', ref: '' },
          { name: 'Cetoprofeno', dose: '100mg', obs: 'Diluir em 100ml SF. Correr em 20 min.', route: 'IV', ref: '' },
          { name: 'Dexametasona', dose: '10mg', obs: 'Previne recorrência.', route: 'IV/IM', ref: '' },
          { name: 'Metoclopramida', dose: '10mg', obs: 'Se náuseas.', route: 'IV', ref: '' }
        ]
      },
      {
        name: 'Alteração Neurológica Súbita (Idoso)',
        drugs: [
          { name: 'Exames Iniciais', dose: 'Solicitação', obs: 'Hemograma, Glicemia, Ur/Cr, Eletrólitos, TSH, B12, VDRL, TC Crânio.', route: 'Exames', ref: 'APS' }
        ]
      }
    ]
  },
  {
    category: 'Ortopedia',
    icon: Bone,
    color: 'text-stone-500',
    pathologies: [
      {
        name: 'Lombalgia / Cervicalgia',
        drugs: [
          { name: 'Dipirona', dose: '1g', obs: '6/6h se dor.', route: 'VO', ref: 'APS' },
          { name: 'Ciclobenzaprina', dose: '10mg', obs: '1cp à noite (relaxante muscular, causa sono).', route: 'VO', ref: 'APS' },
          { name: 'Diclofenaco', dose: '50mg', obs: '8/8h se dor forte (cuidado com estômago/rins).', route: 'VO', ref: 'APS' }
        ]
      },
      {
        name: 'Dor Articular (Crônica/Aguda)',
        drugs: [
          { name: 'Dipirona', dose: '1g', obs: '6/6h.', route: 'VO', ref: 'APS' },
          { name: 'Diclofenaco', dose: '50mg', obs: '8/8h por curto período.', route: 'VO', ref: 'APS' },
          { name: 'Beta 30 (Dipropionato de Betametasona)', dose: '1 ampola', obs: 'Dose única (Corticoide de depósito). Aferir PA antes.', route: 'IM', ref: 'APS' },
          { name: 'Glicosamina + Condroitina', dose: '1.5/1.2g', obs: '1 sachê ao dia (manutenção).', route: 'VO', ref: 'APS' }
        ]
      }
    ]
  },
  {
    category: 'Infectologia',
    icon: Stethoscope,
    color: 'text-emerald-500',
    pathologies: [
      {
        name: 'Infecção Urinária (Cistite)',
        drugs: [
          { name: 'Ciprofloxacino', dose: '500mg', obs: '12/12h por 7 dias (APS).', route: 'VO', ref: 'APS' },
          { name: 'Fosfomicina', dose: '3g (1 envelope)', obs: 'Dose única (preferencialmente à noite).', route: 'VO', ref: '' },
          { name: 'Nitrofurantoína', dose: '100mg', obs: 'De 6/6h por 5-7 dias.', route: 'VO', ref: '' }
        ]
      },
      {
        name: 'Pielonefrite (Não complicada)',
        drugs: [
          { name: 'Ciprofloxacino', dose: '500mg', obs: 'De 12/12h por 7-10 dias.', route: 'VO', ref: '' },
          { name: 'Ceftriaxona', dose: '1g', obs: '1x ao dia (se internação ou dia-hospital).', route: 'IV/IM', ref: '' }
        ]
      },
      {
        name: 'Sífilis',
        drugs: [
          { name: 'Penicilina Benzatina (1ª/2ª)', dose: '2.400.000 UI', obs: '1.2MI em cada glúteo. Dose única.', route: 'IM', ref: 'APS' },
          { name: 'Penicilina Benzatina (Tardia/Latente)', dose: '2.400.000 UI', obs: '1x por semana por 3 semanas (Total 7.2MI).', route: 'IM', ref: 'APS' }
        ]
      },
      {
        name: 'Dengue',
        drugs: [
          { name: 'Dipirona', dose: '1g', obs: '6/6h.', route: 'VO', ref: '' },
          { name: 'Hidratação Oral', dose: '60-80ml/kg/dia', obs: '1/3 SRO + 2/3 Líquidos Claros.', route: 'VO', ref: '' },
          { name: 'Não usar', dose: 'AINEs/AAS', obs: 'Risco de sangramento.', route: 'Contraindicação', ref: '' }
        ]
      }
    ]
  },
  {
    category: 'Gastroenterologia',
    icon: Utensils,
    color: 'text-amber-500',
    pathologies: [
      {
        name: 'Diarreia Aguda / GECA',
        drugs: [
          { name: 'Soro de Reidratação Oral', dose: 'Ad libitum', obs: '1 copo após cada episódio de diarreia/vômito.', route: 'VO', ref: 'APS' },
          { name: 'Floratil (Saccharomyces)', dose: '200mg', obs: '12/12h (probiótico).', route: 'VO', ref: 'APS' },
          { name: 'Racecadotrila (Tiorfan)', dose: '100mg', obs: '8/8h (antissecretor).', route: 'VO', ref: 'APS' },
          { name: 'Ondansetrona', dose: '8mg', obs: '8/8h se náuseas.', route: 'VO', ref: 'APS' },
          { name: 'Ciprofloxacino', dose: '500mg', obs: '12/12h por 3 dias (se disenteria/bacteriana).', route: 'VO', ref: 'APS' }
        ]
      },
      {
        name: 'Constipação Intestinal',
        drugs: [
          { name: 'Tamarine Geleia', dose: '1 colher', obs: 'Pela manhã.', route: 'VO', ref: 'APS' },
          { name: 'PEG 4000', dose: '15g (1 envelope)', obs: 'Diluir em água, 1x ao dia. Dose máx 20g.', route: 'VO', ref: 'APS' }
        ]
      },
      {
        name: 'Dor Abdominal Inespecífica (Dispepsia)',
        drugs: [
          { name: 'Omeprazol', dose: '20mg', obs: '1cp em jejum.', route: 'VO', ref: 'APS' },
          { name: 'Albendazol', dose: '400mg', obs: '1x ao dia por 3 dias (desparasitação empírica).', route: 'VO', ref: 'APS' },
          { name: 'Bromoprida/Plasil', dose: '10mg', obs: '8/8h se náusea.', route: 'VO', ref: 'APS' }
        ]
      },
      {
        name: 'Hemorragia Digestiva Alta',
        drugs: [
          { name: 'Omeprazol', dose: '40mg (ou 80mg bolus)', obs: 'Seguido de 40mg 12/12h ou BIC.', route: 'IV', ref: '' },
          { name: 'Ondansetrona', dose: '8mg', obs: 'Controle de náusea.', route: 'IV', ref: '' },
          { name: 'Terlipressina', dose: '2mg', obs: 'Se suspeita de varizes (bolus).', route: 'IV', ref: '' }
        ]
      }
    ]
  },
  {
    category: 'Saúde da Mulher & Homem',
    icon: Flower2,
    color: 'text-pink-500',
    pathologies: [
      {
        name: 'Climatério / Menopausa',
        drugs: [
          { name: 'Tibolona (Iziz)', dose: '2.5mg', obs: '1 cp ao dia (Controle fogacho).', route: 'VO', ref: 'APS' },
          { name: 'Isoflavona (Soyfemme)', dose: '---', obs: 'Fitoterápico.', route: 'VO', ref: 'APS' },
          { name: 'Cimicifuga (Clifemin)', dose: '---', obs: 'Fitoterápico.', route: 'VO', ref: 'APS' },
          { name: 'Solicitar Exames', dose: 'Perfil Hormonal', obs: 'FSH, LH, Estradiol, TSH, Prolactina.', route: 'Exames', ref: 'APS' }
        ]
      },
      {
        name: 'Candidíase Vaginal',
        drugs: [
          { name: 'Fluconazol', dose: '150mg', obs: 'Dose única.', route: 'VO', ref: 'APS' },
          { name: 'Miconazol Creme', dose: '1 aplicador', obs: 'À noite por 7-14 dias.', route: 'Vaginal', ref: 'APS' }
        ]
      },
      {
        name: 'Impotência Sexual / Libido',
        drugs: [
          { name: 'Maca Peruana + Tribulus', dose: '500mg', obs: '1x ao dia.', route: 'VO', ref: 'APS' },
          { name: 'Testosterona Gel (Androgel)', dose: 'Pump', obs: 'Custo elevado. Avaliar níveis antes.', route: 'Tópico', ref: 'APS' },
          { name: 'Tadalafila', dose: '5mg ou 20mg', obs: 'Uso diário ou sob demanda.', route: 'VO', ref: '' }
        ]
      }
    ]
  },
  {
    category: 'Nutrologia & Metabolismo',
    icon: Apple,
    color: 'text-green-600',
    pathologies: [
      {
        name: 'Reposição de Vitamina D (Adulto Jovem)',
        drugs: [
          { name: 'Ataque', dose: '50.000 UI', obs: '1x por semana por 8 semanas.', route: 'VO', ref: 'APS' },
          { name: 'Manutenção', dose: '7.000 - 15.000 UI', obs: 'Semanal, após corrigir níveis.', route: 'VO', ref: 'APS' }
        ]
      },
      {
        name: 'Reposição de Vitamina D (Idoso < 20ng/mL)',
        drugs: [
          { name: 'Ataque', dose: '7.000 UI', obs: 'Diário por 8-12 semanas.', route: 'VO', ref: 'APS' },
          { name: 'Opção Semanal', dose: '15.000 UI', obs: '1x semana por 3 meses.', route: 'VO', ref: 'APS' }
        ]
      },
      {
        name: 'Reposição de Ferro (Anemia Ferropriva)',
        drugs: [
          { name: 'Sulfato Ferroso', dose: '300mg (40mg Fe)', obs: '3-4x ao dia, jejum, com suco cítrico.', route: 'VO', ref: 'APS' },
          { name: 'Noripurum Oral', dose: '100mg (1 cp)', obs: '2x ao dia (menos efeitos gastrointestinais).', route: 'VO', ref: 'APS' },
          { name: 'Noripurum IV', dose: 'Calculada', obs: '(Hb alvo - Hb atual) x Peso x 2.4 + 500mg. Diluir em SF.', route: 'IV', ref: 'APS' }
        ]
      },
      {
        name: 'Deficiência de B12 / Anemia Megaloblástica',
        drugs: [
          { name: 'Cianocobalamina', dose: '1000mcg', obs: '1x/dia por 7 dias -> 1x/sem por 4 sem -> Mensal.', route: 'IM', ref: 'APS' },
          { name: 'Mecobalamina (MecoBê)', dose: '1000mcg', obs: 'Sublingual. Uso diário por 3 meses.', route: 'SL', ref: 'APS' }
        ]
      },
      {
        name: 'Cansaço / Desânimo',
        drugs: [
          { name: 'Androsten Uno', dose: '280mg', obs: 'Fitoterápico. 1x ao dia.', route: 'VO', ref: 'APS' }
        ]
      }
    ]
  },
  {
    category: 'Endocrinologia',
    icon: Zap,
    color: 'text-indigo-500',
    pathologies: [
      {
        name: 'Cetoacidose Diabética',
        drugs: [
          { name: 'Hidratação (SF 0.9%)', dose: '15-20 ml/kg', obs: 'Na primeira hora.', route: 'IV', ref: '' },
          { name: 'Insulina Regular', dose: '0.1 U/kg/h', obs: 'Bomba de infusão contínua. Só iniciar se K > 3.3.', route: 'IV', ref: '' },
          { name: 'Reposição de K', dose: '20-30 mEq/L', obs: 'Adicionar ao soro de manutenção se K < 5.2.', route: 'IV', ref: '' }
        ]
      },
      {
        name: 'Hipoglicemia Grave',
        drugs: [
          { name: 'Glicose 50%', dose: '40ml (4 ampolas)', obs: 'Bolus IV. Repetir se necessário.', route: 'IV', ref: '' },
          { name: 'Glucagon', dose: '1mg', obs: 'Se sem acesso venoso.', route: 'IM', ref: '' }
        ]
      }
    ]
  },
  {
    category: 'Analgesia',
    icon: Pill,
    color: 'text-teal-500',
    pathologies: [
      {
        name: 'Dor Leve',
        drugs: [
          { name: 'Dipirona', dose: '500mg-1g', obs: 'Até 6/6h.', route: 'VO/IV', ref: '' },
          { name: 'Paracetamol', dose: '500-750mg', obs: 'Até 6/6h.', route: 'VO', ref: '' }
        ]
      },
      {
        name: 'Dor Moderada (Lombalgia/Cólica)',
        drugs: [
          { name: 'Cetoprofeno', dose: '100mg', obs: 'Diluído em 100ml SF.', route: 'IV', ref: '' },
          { name: 'Tramadol', dose: '50-100mg', obs: 'Diluído. Pode causar náusea.', route: 'IV', ref: '' }
        ]
      },
      {
        name: 'Dor Intensa (Cólicas Nefréticas/Trauma)',
        drugs: [
          { name: 'Morfina', dose: '2-5mg (titular)', obs: 'Diluir para 1mg/ml. Fazer lento.', route: 'IV', ref: '' }
        ]
      }
    ]
  }
];

export default function QuickPrescriptionsModal({ isOpen, onClose, isDarkMode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPathology, setSelectedPathology] = useState(null);

  const filteredPathologies = useMemo(() => {
    if (!searchTerm) return [];
    const results = [];
    PRESCRIPTIONS_DB.forEach(cat => {
      cat.pathologies.forEach(path => {
        if (path.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({ ...path, categoryName: cat.category, categoryColor: cat.color });
        }
      });
    });
    return results;
  }, [searchTerm]);

  if (!isOpen) return null;

  const handleBack = () => {
    if (selectedPathology) {
      setSelectedPathology(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      onClose();
    }
  };

  const renderContent = () => {
    if (searchTerm) {
      return (
        <div className="space-y-2 p-4">
          <h4 className={`text-xs font-bold uppercase mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Resultados da busca</h4>
          {filteredPathologies.length === 0 ? (
            <p className="text-sm text-center py-8 opacity-50">Nenhuma patologia encontrada.</p>
          ) : (
            filteredPathologies.map((path, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedPathology(path); setSearchTerm(''); }}
                className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}
              >
                <div>
                  <span className={`text-xs font-bold uppercase mb-1 block ${path.categoryColor}`}>{path.categoryName}</span>
                  <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{path.name}</span>
                </div>
                <ChevronRight size={16} className="opacity-50"/>
              </button>
            ))
          )}
        </div>
      );
    }

    if (selectedPathology) {
      return (
        <div className="p-6 overflow-y-auto h-full animate-in slide-in-from-right-4 duration-300">
          <div className="mb-6">
            <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              Prescrição Sugerida
            </span>
            <h2 className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{selectedPathology.name}</h2>
          </div>

          <div className="space-y-4">
            {selectedPathology.drugs.map((drug, idx) => (
              <div key={idx} className={`p-4 rounded-xl border border-l-4 ${isDarkMode ? 'bg-slate-800/50 border-slate-700 border-l-blue-500' : 'bg-white border-gray-200 border-l-blue-600'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-bold text-lg ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>{drug.name}</h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>{drug.route}</span>
                </div>
                <div className={`text-sm font-mono mb-2 p-2 rounded ${isDarkMode ? 'bg-slate-900 text-emerald-400' : 'bg-slate-50 text-emerald-700'}`}>
                  <strong>Dose:</strong> {drug.dose}
                </div>
                {drug.obs && (
                  <p className={`text-sm italic ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="font-bold not-italic">Obs:</span> {drug.obs}
                  </p>
                )}
                {drug.ref && <p className="text-[10px] text-right mt-1 opacity-30">Ref: {drug.ref}</p>}
              </div>
            ))}
          </div>
          
          <div className={`mt-8 p-4 rounded-xl text-center text-xs border ${isDarkMode ? 'bg-yellow-900/10 border-yellow-900/30 text-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
            ⚠ Atenção: Confira doses e alergias antes de prescrever. Este é um guia de consulta rápida.
          </div>
        </div>
      );
    }

    if (selectedCategory) {
      return (
        <div className="p-4 space-y-2 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'} ${selectedCategory.color}`}>
              <selectedCategory.icon size={24} />
            </div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{selectedCategory.category}</h2>
          </div>
          
          {selectedCategory.pathologies.map((path, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedPathology(path)}
              className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center group ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'}`}
            >
              <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{path.name}</span>
              <ChevronRight size={18} className={`opacity-30 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}/>
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto">
        {PRESCRIPTIONS_DB.map((cat, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedCategory(cat)}
            className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200'}`}
          >
            <div className={`p-3 rounded-full mb-3 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'} ${cat.color}`}>
              <cat.icon size={28} />
            </div>
            <span className={`text-xs font-bold uppercase text-center ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{cat.category}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50'}`}>
        
        <div className={`p-4 border-b flex items-center gap-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'}`}>
          {(selectedCategory || selectedPathology) ? (
            <button onClick={handleBack} className={`p-2 rounded-full hover:bg-opacity-20 hover:bg-gray-500`}>
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <FileText size={20} />
            </div>
          )}
          
          <div className="flex-1">
            {(selectedCategory || selectedPathology) ? (
               <h3 className="font-bold text-sm">Voltar</h3>
            ) : (
               <h3 className="font-bold text-lg">Receitas Rápidas</h3>
            )}
          </div>

          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-slate-500'}`}>
            <X size={20}/>
          </button>
        </div>

        {!selectedPathology && (
          <div className={`p-4 border-b ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Pesquisar patologia (ex: Pneumonia, IAM...)" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none border focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-slate-800'}`} 
              />
              <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-opacity-50">
          {renderContent()}
        </div>

      </div>
    </div>
  );
}