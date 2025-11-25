// Este arquivo roda nos servidores da Vercel (Serverless Function).
// Localização: /api/generate.js na raiz do projeto.

export default async function handler(req, res) {
  // Configurações de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { searchQuery, activeRoom, image, prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Configuração de servidor ausente (API Key).' });
  }

  // --- LÓGICA DE ANÁLISE DE IMAGEM (IA VISION) ---
  if (image) {
    const base64Data = image.split(',')[1];
    const mimeType = image.split(';')[0].split(':')[1];
    const userPrompt = prompt || "Analise esta imagem médica e descreva os achados.";

    const visionPrompt = `
      Você é um médico especialista em radiologia e diagnóstico por imagem (Cardiologista para ECGs).
      Tarefa: Analisar a imagem fornecida e responder à pergunta do usuário: "${userPrompt}"
      Diretrizes:
      1. Seja extremamente técnico e preciso.
      2. Se for um ECG: Descreva ritmo, frequência, eixo, ondas P, complexo QRS, segmento ST e ondas T. Conclua com o diagnóstico provável.
      3. Se for Raio-X/TC: Descreva a qualidade da imagem e os achados patológicos visíveis.
      4. Formate a resposta em Markdown claro e legível (lista com bullets).
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: visionPrompt },
              { inlineData: { mimeType: mimeType, data: base64Data } }
            ]
          }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erro na API Vision: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      let finalAnalysis = textResponse;
      try {
         const parsed = JSON.parse(textResponse);
         if(parsed.analysis) finalAnalysis = parsed.analysis;
         else if (parsed.analise_ecg) finalAnalysis = JSON.stringify(parsed.analise_ecg);
      } catch(e) {}

      res.status(200).json({ analysis: finalAnalysis });
      return;

    } catch (error) {
      console.error("Erro interno Vision:", error);
      res.status(500).json({ error: "Erro ao analisar imagem.", details: error.message });
      return;
    }
  }

  // --- LÓGICA PADRÃO DE TEXTO (Geração de Conduta) ---

  if (!searchQuery) {
    return res.status(400).json({ error: 'Busca vazia.' });
  }

  const roomContext = activeRoom === 'verde' ? 'SALA VERDE (AMBULATORIAL)' : 'SALA VERMELHA (EMERGÊNCIA/UTI)';
  const lowerQuery = searchQuery.toLowerCase();
  
  let promptExtra = "";
  let roleDefinition = "";

  if (activeRoom === 'vermelha') {
    roleDefinition = "Você é um médico INTENSIVISTA e EMERGENCISTA SÊNIOR. Sua prioridade é salvar a vida do paciente com precisão absoluta e tolerância zero para erros.";
    promptExtra += `
    CRITICIDADE MÁXIMA (SALA VERMELHA):
    1. **Alvos Terapêuticos (Obrigatório):** Defina metas numéricas precisas. Inclua PAM (Pressão Arterial Média), PAS/PAD, FC, FR, SatO2, Diurese (>0.5ml/kg/h), Lactato e Glicemia se pertinente.
    2. **Exames (Obrigatório):** Seja específico. Não peça "Laboratório", peça "Gasometria Arterial c/ Lactato, Troponina US, Creatinina...". Em imagem, especifique o protocolo (ex: "Angio-TC de Tórax protocolo TEP").
    3. **Cálculo de Doses:** - "usa_peso": true
       - "dose_padrao_kg": número exato (ex: 0.05 a 2 mcg/kg/min para Nora, use o valor inicial padrão)
       - "unidade_base": ex: "mcg/kg/min", "mg/kg"
       - "concentracao_mg_ml": Concentração da solução padrão da sua instituição fictícia (ex: Nora 4mg/4ml em 250ml SG5% = 64mcg/ml -> Se for ampola pura, use a da ampola).
       - "diluicao_contexto": Ex: "4mg em 250ml SG5% (Solução Padrão)"
    4. **CATEGORIZAÇÃO RIGOROSA:** Você DEVE classificar CADA item de medicamento em uma das seguintes categorias:
       - 'Dieta'
       - 'Hidratação'
       - 'Drogas Vasoativas'
       - 'Antibiótico'
       - 'Sintomáticos'
       - 'Profilaxias'
       - 'Outros'
    `;
  } else {
    roleDefinition = "Você é um médico generalista experiente em pronto atendimento.";
    promptExtra += `
    CONTEXTO SALA VERDE (AMBULATORIAL):
    - Foco em alívio sintomático e tratamento domiciliar.
    - **"sugestao_uso":** OBRIGATÓRIO ser detalhado tecnicamente. Ex: "500mg VO de 6/6h por 5 dias".
    - **"receita":** OBRIGATÓRIO preencher objeto completo para prescrição de alta.
    - **"receita.instrucoes":** Use linguagem clara para o paciente. Deve incluir quantidade por tomada, frequência e observações (ex: "Tomar 1 comprimido por via oral a cada 8 horas após as refeições. Se dor, manter uso.").
    - **"receita.dias_sugeridos":** Inteiro (ex: 5).
    - **"receita.quantidade":** Ex: "1 Caixa" ou "20 Comprimidos".
    `;
  }

  // 2. Lógica Clínica Específica (Protocolos Restaurados)
  if (lowerQuery.includes('dengue')) {
    promptExtra += `
    PROTOCOLO DENGUE (MS BRASIL):
    - Classifique: Grupo A, B, C ou D.
    - Grupo C/D (Sala Vermelha): Fase de Expansão Rápida (20ml/kg em 20 min). Reavaliação a cada etapa.
    - Grupo A/B (Sala Verde): Hidratação oral escalonada.
    `;
  }

  if (lowerQuery.includes('sepse') || lowerQuery.includes('septico')) {
    promptExtra += `
    PROTOCOLO SEPSE (Surviving Sepsis Campaign):
    - Pacote de 1 hora: Lactato, Hemoculturas, Antibiótico amplo espectro, Cristaloide 30ml/kg (se hipotensão/lactato > 4), Vasopressor (se PAM < 65 pós volume).
    `;
  }

  if (lowerQuery.includes('iam') || lowerQuery.includes('infarto') || lowerQuery.includes('scs')) {
    promptExtra += `
    PROTOCOLO IAM (SBC/AHA):
    - Tempo porta-balão ou porta-agulha.
    - Dupla antiagregação + Anticoagulação.
    - Estatinas alta potência.
    `;
  }

  if (lowerQuery.includes('trauma') || lowerQuery.includes('acid') || lowerQuery.includes('poli')) {
    promptExtra += `
    PROTOCOLO TRAUMA (ATLS 10ª Ed):
    - OBRIGATÓRIO preencher objeto "xabcde_trauma" com a estrutura exata: chaves X, A, B, C, D, E.
    - X: Controle de hemorragia exsanguinante.
    - A: Via aérea + Colar.
    `;
  }

  const promptText = `${roleDefinition}
  Gere a conduta clínica IMPECÁVEL para "${searchQuery}" na ${roomContext}.
  ${promptExtra}
  
  REGRAS DE FORMATO (JSON):
  1. Retorne APENAS JSON válido.
  2. Separe apresentações diferentes (Comprimido vs Injetável) em objetos diferentes no array "tratamento_medicamentoso".
  3. "tipo": OBRIGATÓRIO da lista: ['Comprimido', 'Cápsula', 'Xarope', 'Suspensão', 'Gotas', 'Solução Oral', 'Injetável', 'Tópico', 'Inalatório', 'Supositório'].
  
  ESTRUTURA JSON ESPERADA:
  {
    "condicao": "Nome Técnico Completo",
    "estadiamento": "Classificação de Risco/Gravidade",
    "classificacao": "${roomContext}",
    "resumo_clinico": "Texto técnico detalhado sobre fisiopatologia...",
    "xabcde_trauma": {
       "X": "Controle de Hemorragia...",
       "A": "Via Aérea...",
       "B": "Respiração...",
       "C": "Circulação...",
       "D": "Neurológico...",
       "E": "Exposição..."
    }, // Preencher APENAS se for trauma, senão null
    "avaliacao_inicial": { 
      "sinais_vitais_alvos": ["PAM ≥ 65mmHg", "FC < 100bpm", "Lactato < 2mmol/L", "SatO2 > 94%"], 
      "exames_prioridade1": ["Gasometria Arterial", "Lactato", "Hemoculturas x2"], 
      "exames_complementares": ["..."] 
    },
    "achados_exames": { 
      "ecg": "Descrição precisa das alterações (ex: Infra ST > 0.5mm em V5-V6)", 
      "laboratorio": "Alterações esperadas e valores críticos", 
      "imagem": "Padrão radiológico específico" 
    },
    "criterios_gravidade": ["Sinal 1", "Sinal 2"],
    "tratamento_medicamentoso": [ 
      { 
        "farmaco": "Nome + Concentração", 
        "tipo": "Injetável",
        "categoria": "Antibiótico", // OBRIGATÓRIO na sala vermelha
        "sugestao_uso": "Texto TÉCNICO detalhado (dose, via, intervalo)",
        "diluicao": "Ex: 1 amp em 100ml SF0.9%", 
        "modo_admin": "BIC / Bolus Lento", 
        "cuidados": "Monitorizar QT, Risco de hipotensão...", 
        "indicacao": "Indicação precisa",
        "receita": {
           "nome_comercial": "Nome comercial comum",
           "quantidade": "Ex: 1 Caixa (30cps)",
           "instrucoes": "Instrução detalhada para o PACIENTE (ex: Tomar 1cp VO 12/12h...)",
           "dias_sugeridos": 7
        }, 
        "usa_peso": true,
        "dose_padrao_kg": 0.0,
        "unidade_base": "mcg/kg/min",
        "concentracao_mg_ml": 0.0,
        "diluicao_contexto": "Ex: Solução Padrão (4mg/4ml em 246ml SF)"
      } 
    ],
    "escalonamento_terapeutico": [ 
      { "passo": "1. Estabilização Inicial", "descricao": "..." },
      { "passo": "2. Terapia Específica", "descricao": "..." }
    ],
    "medidas_gerais": ["Cabeceira elevada", "Jejum", "Acesso venoso calibroso"],
    "criterios_internacao": ["Critério UTI 1", "..."],
    "criterios_alta": ["Critério Estabilidade 1", "..."],
    "guideline_referencia": "Fonte (Ex: Surviving Sepsis Campaign 2021)"
  }
  Baseie-se em doses para adulto 70kg (padrão).`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erro Gemini API:", response.status, errText);
      throw new Error(`Erro na API IA: ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    // --- CORREÇÃO ROBUSTA DE JSON (Mantida) ---
    let cleanText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    try {
        res.status(200).json(JSON.parse(cleanText));
    } catch (parseError) {
        console.error("Erro Fatal Parse JSON:", parseError);
        console.log("Texto recebido da IA:", textResponse); 
        throw new Error("A IA retornou um formato inválido (não é JSON).");
    }

  } catch (error) {
    console.error("Erro interno na API:", error);
    res.status(500).json({ error: "Erro ao processar conduta clínica.", details: error.message });
  }
}
