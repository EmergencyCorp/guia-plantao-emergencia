export default async function handler(req, res) {
  // 1. Configuração CORS e Métodos
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { searchQuery, activeRoom } = req.body;
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API Key ausente.' });

  // 2. Definição de Contexto
  const roomContext = activeRoom === 'verde' ? 'SALA VERDE (AMBULATORIAL)' : 'SALA VERMELHA (EMERGÊNCIA/UTI)';
  let promptExtra = "";

  if (activeRoom === 'verde') {
    promptExtra += `
    CONTEXTO: SALA VERDE (ALTA/AMBULATORIAL)
    - Foco: Receita médica para casa.
    - "prescricao_alta": OBRIGATÓRIO para cada medicamento.
    - "uso": "USO ORAL", "USO TÓPICO", etc.
    - "qtd_calculo": Números para calcular caixas (ex: 1 comprimido 3x ao dia).
    `;
  } else {
    promptExtra += `
    CONTEXTO: SALA VERMELHA (CRÍTICO/BIC)
    - Foco: Estabilização e Drogas Vasoativas/Sedação.
    - "parametros_bic": OBRIGATÓRIO para drogas de infusão contínua (Nora, Dobuta, Fentanil, Midazolam, Propofol).
    - "dose_padrao": A dose inicial numérica (ex: 0.1 para nora).
    - "concentracao_solucao": A concentração final da solução padrão em mg/ml ou mcg/ml.
    `;
  }

  // 3. O Prompt
  const promptText = `Atue como médico especialista em emergência.
  Gere conduta para "${searchQuery}" na ${roomContext}.
  ${promptExtra}
  
  REGRAS DE OURO (JSON PURO):
  1. "tratamento_medicamentoso": ARRAY. Se houver apresentações diferentes (ex: Dipirona Comp e Dipirona Injetável), CRIE DOIS ITENS SEPARADOS.
  2. "tipo": Escolha UM: ['Comprimido', 'Cápsula', 'Xarope', 'Suspensão', 'Gotas', 'Injetável', 'Tópico', 'Inalatório'].
  3. "farmaco": Nome + Concentração (Ex: "Dipirona 1g").
  
  ESTRUTURA JSON ESPERADA:
  {
    "condicao": "Nome da Doença",
    "estadiamento": "Classificação (ou null)",
    "classificacao": "${roomContext}",
    "resumo_clinico": "Texto técnico detalhado sobre fisiopatologia e quadro clínico...",
    "xabcde_trauma": null, // OU objeto {x,a,b,c,d,e} APENAS SE FOR TRAUMA
    "avaliacao_inicial": { 
      "sinais_vitais_alvos": ["PAM > 65mmHg", "SatO2 > 94%"], 
      "exames_prioridade1": ["..."], 
      "exames_complementares": ["..."] 
    },
    "achados_exames": { "ecg": "...", "laboratorio": "...", "imagem": "..." },
    "criterios_gravidade": ["..."],
    "tratamento_medicamentoso": [ 
      { 
        "farmaco": "Nome Genérico + Conc", 
        "apresentacao": "Ex: Ampola 2ml / Comp 500mg",
        "tipo": "Injetável", // Use a lista fechada
        "posologia_texto": "Texto descritivo (ex: 1 ampola EV lento...)",
        "indicacao": "Motivo do uso",
        "cuidados": "Cuidados de enfermagem/interação",
        
        // PREENCHER APENAS NA SALA VERDE (RECEITA)
        "prescricao_alta": {
           "uso": "USO ORAL",
           "nome_comercial": "Nome Comercial Sugerido",
           "instrucoes_paciente": "Tomar 1 comprimido de 8/8h...",
           "unidade_frasco_cx": "comprimidos", // ou 'ml', 'frascos'
           "dose_unitaria_num": 1, // qts toma por vez
           "freq_diaria_num": 3 // qts vezes ao dia
        },

        // PREENCHER APENAS NA SALA VERMELHA (BOMBA DE INFUSÃO)
        // Se não for droga de bomba, mande null
        "parametros_bic": {
           "dose_inicial_num": 0.1, // Apenas numero
           "unidade_dose": "mcg/kg/min", // ou mg/kg/h, mcg/min
           "concentracao_solucao_num": 64, // Concentração final da solução
           "unidade_concentracao": "mcg/ml", // ou mg/ml
           "texto_diluicao": "4 ampolas (4mg/4ml) em 234ml SG5%"
        }
      } 
    ],
    "escalonamento_terapeutico": [ { "passo": "1ª Linha", "descricao": "..." } ],
    "criterios_internacao": ["..."],
    "criterios_alta": ["..."],
    "guideline_referencia": "Fonte"
  }
  Doses adulto 70kg.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) throw new Error(`Erro Google API: ${response.status}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json(JSON.parse(text));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno." });
  }
}
