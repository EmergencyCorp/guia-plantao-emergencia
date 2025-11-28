// Este arquivo roda nos servidores da Vercel (Serverless Function).
// Localização: /api/generate.js na raiz do projeto.

// REMOVIDO: import { GoogleGenAI } from '@google/genai';

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

  // Desestrutura os campos, incluindo o histórico para o chat
  const { searchQuery, activeRoom, image, prompt, mode, anamnesis, exams, history } = req.body;
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const modelName = 'gemini-2.5-flash'; 

  if (!apiKey) {
    return res.status(500).json({ error: 'Configuração de servidor ausente (API Key).' });
  }
  
  // --- LÓGICA DE CHAT EM TEMPO REAL ---
  if (mode === 'chat') {
    if (!history || history.length === 0) {
        return res.status(400).json({ error: 'Histórico de chat ausente.' });
    }

    const systemInstruction = `
        Você é um Médico Preceptor Sênior, experiente em emergências e clínica médica.
        Sua função é fornecer feedback rigoroso, educacional e em tempo real para um Residente que está apresentando ou discutindo um caso.
        Seu tom deve ser profissional, direto, mas sempre construtivo.

        Diretrizes de Resposta:
        1. Mantenha o contexto do caso, referenciando as mensagens anteriores.
        2. Seja breve e objetivo. Não gere planos de tratamento completos, mas sim, diretrizes ou perguntas para guiar o Residente.
        3. Use Markdown para estruturar o texto (listas, negrito).
        4. O Residente começará o caso.
    `;
    
    // Converte o histórico simples [role: text] para o formato 'contents' do Gemini
    const contents = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model', 
        parts: [{ text: msg.text }]
    }));
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    // Adiciona a instrução do sistema como primeira parte (se o modelo suportar)
                    { role: 'user', parts: [{ text: `INSTRUÇÃO DE SISTEMA: ${systemInstruction}\n\nINÍCIO DO CHAT:\n` }] }, 
                    ...contents
                ],
                // Configuração para forçar a instrução de sistema
                config: {
                   systemInstruction: systemInstruction,
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erro API Chat: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar a resposta.";
        
        res.status(200).json({ text: textResponse });
        return;

    } catch (error) {
        console.error("Erro Chat:", error);
        res.status(500).json({ error: "Erro ao processar mensagem do chat.", details: error.message });
        return;
    }
  }


  // --- LÓGICA BEDSIDE (EXISTENTE) ---
  if (mode === 'bedside') {
    if (!anamnesis) {
      return res.status(400).json({ error: 'Anamnese é obrigatória para BedSide.' });
    }
    
    const bedsidePrompt = `
      Você é um Médico Preceptor Sênior discutindo um caso clínico detalhado à beira leito (BedSide).
      
      DADOS DO CASO:
      **Anamnese/História:** ${anamnesis}
      **Exames Complementares/Sinais:** ${exams || "Não informados"}

      TAREFA:
      Gere uma conduta clínica completa e personalizada para este paciente específico.
      
      FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
      {
        "hipoteses_diagnosticas": ["Hipótese Principal", "Diagnóstico Diferencial 1"],
        "racional_clinico": "Breve explicação do raciocínio clínico ligando a história aos exames.",
        "conduta_terapeutica": [
           { "tipo": "Medicamento", "detalhe": "Nome + Dose + Via + Frequência (ex: Ceftriaxona 2g EV 24/24h)" },
           { "tipo": "Suporte", "detalhe": "Ex: O2 suplementar, cabeceira elevada..." }
        ],
        "solicitacao_exames": ["Exame para confirmar hipótese", "Exame de controle"],
        "encaminhamentos": ["Especialidade ou Setor (ex: UTI, Cardiologia)"],
        "cuidados_gerais": ["Jejum", "Controle de Glicemia", "Balanço Hídrico"],
        "orientacoes_paciente": ["Explicação para o paciente/família sobre o quadro e próximos passos"]
      }
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: bedsidePrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) throw new Error(`Erro API BedSide: ${response.status}`);
      
      const data = await response.json();
      let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      
      res.status(200).json(JSON.parse(textResponse));
      return;

    } catch (error) {
      console.error("Erro BedSide:", error);
      res.status(500).json({ error: "Erro ao processar caso clínico.", details: error.message });
      return;
    }
  }

  // --- LÓGICA DE ANÁLISE DE IMAGEM (EXISTENTE) ---
  if (image) {
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório para Análise de Imagem.' });
    }
    
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
      4. Responda DIRETAMENTE em texto corrido e tópicos (Markdown). NÃO use formato JSON.
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: visionPrompt },
              { inlineData: { mimeType: mimeType, data: base64Data } }
            ]
          }]
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

  // --- LÓGICA PADRÃO DE TEXTO (EXISTENTE) ---

  if (!searchQuery) {
    return res.status(400).json({ error: 'Busca vazia.' });
  }
  
  // Definição de contextos baseados na sala
  let roomContext = '';
  let roleDefinition = '';
  let promptExtra = '';

  if (activeRoom === 'vermelha') {
    roomContext = 'SALA VERMELHA (EMERGÊNCIA/UTI)';
    roleDefinition = "Você é um médico INTENSIVISTA e EMERGENCISTA SÊNIOR. Sua prioridade é salvar a vida do paciente com precisão absoluta e tolerância zero para erros.";
    promptExtra += `
    CRITICIDADE MÁXIMA (SALA VERMELHA):
    1. **Alvos Terapêuticos (Obrigatório):** Defina metas numéricas precisas (PAM, SatO2, Diurese, etc).
    2. **Exames (Obrigatório):** Seja específico (ex: "Angio-TC protocolo TEP").
    3. **Cálculo de Doses:** - "usa_peso": true para drogas vasoativas/sedação.
    4. **CATEGORIZAÇÃO RIGOROSA:** Classifique CADA item corretamente (Drogas Vasoativas, Antibiótico, etc).
    `;
  } else if (activeRoom === 'amarela') {
    roomContext = 'SALA DE OBSERVAÇÃO (SALA AMARELA - GRAVIDADE MODERADA)';
    roleDefinition = "Você é um médico HOSPITALISTA e EMERGENCISTA experiente. O paciente não tem alta imediata, mas não requer suporte invasivo agora. O foco é estabilização, investigação diagnóstica rápida e observação clínica.";
    promptExtra += `
    CONTEXTO SALA AMARELA (OBSERVAÇÃO):
    - O paciente apresenta sinais de alerta ou necessita de exames seriados/tratamento endovenoso que impede a alta.
    - **Foco da Conduta:** Monitorização, hidratação venosa, controle álgico potente, antibióticos IV se necessário, exames de imagem e laboratoriais de urgência.
    - **Decisão Clínica:** Defina critérios claros para piora (ir para Vermelha) ou melhora (ir para Verde/Alta).
    - **Prescrição:** Deve ser completa para um paciente internado em observação (Dieta, Hidratação, Sintomáticos, Profilaxias TVP/TEP se indicado).
    - **Baseado em Evidência:** Cite scores de risco (ex: HEART score, CURB-65, Glasgow) se aplicável para justificar a observação.
    `;
  } else { // Verde
    roomContext = 'SALA VERDE (AMBULATORIAL)';
    roleDefinition = "Você é um médico generalista experiente em pronto atendimento.";
    promptExtra += `
    CONTEXTO SALA VERDE (AMBULATORIAL):
    - Foco em alívio sintomático e tratamento domiciliar.
    - **"sugestao_uso":** OBRIGATÓRIO ser detalhado tecnicamente. Ex: "500mg VO de 6/6h por 5 dias".
    - **"receita":** OBRIGATÓRIO preencher objeto completo para prescrição de alta.
    - **"receita.instrucoes":** Use linguagem clara para o paciente.
    `;
  }

  const lowerQuery = searchQuery.toLowerCase();

  // 2. Lógica Clínica Específica (Protocolos)
  if (lowerQuery.includes('dengue')) {
    promptExtra += `
    PROTOCOLO DENGUE (MS BRASIL):
    - Classifique: Grupo A, B, C ou D.
    - Grupo C/D (Vermelha/Amarela): Fase de Expansão Rápida.
    - Grupo B (Amarela): Observação até resultado de exames, hidratação venosa se vômitos.
    - Grupo A (Verde): Hidratação oral.
    `;
  }

  if (lowerQuery.includes('sepse') || lowerQuery.includes('septico')) {
    promptExtra += `
    PROTOCOLO SEPSE (Surviving Sepsis Campaign):
    - Pacote de 1 hora.
    - Se Sala Amarela: Iniciar antibiótico na primeira hora e coletar culturas. Monitorar lactato e diurese rigorosamente. Se hipotensão refratária a volume -> Sala Vermelha.
    `;
  }

  if (lowerQuery.includes('trauma')) {
    promptExtra += `
    PROTOCOLO TRAUMA (ATLS 10ª Ed):
    - OBRIGATÓRIO preencher "xabcde_trauma".
    `;
  }

  const promptText = `${roleDefinition}
  Gere a conduta clínica IMPECÁVEL para "${searchQuery}" na ${roomContext}.
  ${promptExtra}
  
  REGRAS DE FORMATO (JSON):
  1. Retorne APENAS JSON válido.
  2. Separe apresentações diferentes em objetos diferentes no array "tratamento_medicamentoso".
  3. "tipo": OBRIGATÓRIO da lista: ['Comprimido', 'Cápsula', 'Xarope', 'Suspensão', 'Gotas', 'Solução Oral', 'Injetável', 'Tópico', 'Inalatório', 'Supositório'].
  
  ESTRUTURA JSON ESPERADA:
  {
    "condicao": "Nome Técnico Completo",
    "estadiamento": "Classificação de Risco/Gravidade",
    "classificacao": "${roomContext}",
    "resumo_clinico": "Texto técnico detalhado sobre fisiopatologia e justificativa do nível de atenção...",
    "xabcde_trauma": {
        "X": "...", "A": "...", "B": "...", "C": "...", "D": "...", "E": "..."
    }, // Preencher APENAS se for trauma, senão null
    "avaliacao_inicial": { 
      "sinais_vitais_alvos": ["PAM ≥ 65mmHg", ...], 
      "exames_prioridade1": ["..."], 
      "exames_complementares": ["..."] 
    },
    "achados_exames": { 
      "ecg": "...", 
      "laboratorio": "...", 
      "imagem": "..." 
    },
    "criterios_gravidade": ["Sinal 1", "Sinal 2"],
    "tratamento_medicamentoso": [ 
      { 
        "farmaco": "Nome + Concentração", 
        "tipo": "Injetável",
        "categoria": "Antibiótico", 
        "sugestao_uso": "Texto TÉCNICO detalhado",
        "diluicao": "Ex: 1 amp em 100ml SF0.9%", 
        "modo_admin": "BIC / Bolus Lento", 
        "cuidados": "...", 
        "indicacao": "...",
        "receita": {
           "nome_comercial": "...",
           "quantidade": "...",
           "instrucoes": "...",
           "dias_sugeridos": 7
        }, // Receita obrigatória APENAS se sala VERDE. Se Amarela/Vermelha focar na prescrição hospitalar.
        "usa_peso": false
      } 
    ],
    "escalonamento_terapeutico": [ 
      { "passo": "1. Admissão/Estabilização", "descricao": "..." },
      { "passo": "2. Tratamento Específico", "descricao": "..." }
    ],
    "medidas_gerais": ["Dieta", "Cabeceira", "Monitorização"],
    "criterios_internacao": ["Critério para manter em observação ou subir para UTI"],
    "criterios_alta": ["Critério para alta domiciliar"],
    "guideline_referencia": "Fonte (Ex: Uptodate, Guidelines Nacionais)"
  }
  Baseie-se em doses para adulto 70kg (padrão).`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
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

    let cleanText = textResponse.replace(/```json/g, '').replace(/```/g, '').replace(/```/g, '').trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    try {
        res.status(200).json(JSON.parse(cleanText));
    } catch (parseError) {
        console.error("Erro Fatal Parse JSON:", parseError);
        throw new Error("A IA retornou um formato inválido (não é JSON).");
    }

  } catch (error) {
    console.error("Erro interno na API:", error);
    res.status(500).json({ error: "Erro ao processar conduta clínica.", details: error.message });
  }
}