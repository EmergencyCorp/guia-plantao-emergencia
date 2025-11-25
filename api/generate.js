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
      
      // Tenta extrair o JSON se vier encapsulado, senão usa o texto puro
      let finalAnalysis = textResponse;
      try {
         const parsed = JSON.parse(textResponse);
         if(parsed.analysis) finalAnalysis = parsed.analysis;
         else if (parsed.analise_ecg) finalAnalysis = JSON.stringify(parsed.analise_ecg); // Fallback
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
    1. **Alvos Terapêuticos:** Defina metas numéricas precisas.
    2. **Exames:** Seja específico.
    3. **Cálculo de Doses:** Usa peso, unidade base, concentração padrão.
    4. **CATEGORIZAÇÃO RIGOROSA:** Classifique os medicamentos em: 'Dieta', 'Hidratação', 'Drogas Vasoativas', 'Antibiótico', 'Sintomáticos', 'Profilaxias', 'Outros'.
    `;
  } else {
    roleDefinition = "Você é um médico generalista experiente em pronto atendimento.";
    promptExtra += `
    CONTEXTO SALA VERDE (AMBULATORIAL):
    - Foco em alívio sintomático e tratamento domiciliar.
    - "receita": OBRIGATÓRIO preencher.
    `;
  }

  // Protocolos específicos
  if (lowerQuery.includes('dengue')) promptExtra += ` PROTOCOLO DENGUE (MS BRASIL)... `;
  if (lowerQuery.includes('sepse') || lowerQuery.includes('septico')) promptExtra += ` PROTOCOLO SEPSE... `;
  if (lowerQuery.includes('iam') || lowerQuery.includes('infarto')) promptExtra += ` PROTOCOLO IAM... `;
  if (lowerQuery.includes('trauma')) promptExtra += ` PROTOCOLO TRAUMA... `;

  const promptText = `${roleDefinition}
  Gere a conduta clínica IMPECÁVEL para "${searchQuery}" na ${roomContext}.
  ${promptExtra}
  
  REGRAS DE FORMATO (JSON):
  Retorne APENAS JSON válido.
  ESTRUTURA JSON ESPERADA:
  {
    "condicao": "...",
    "estadiamento": "...",
    "classificacao": "${roomContext}",
    "resumo_clinico": "...",
    "xabcde_trauma": null,
    "avaliacao_inicial": { ... },
    "achados_exames": { ... },
    "criterios_gravidade": [...],
    "tratamento_medicamentoso": [...],
    "escalonamento_terapeutico": [...],
    "medidas_gerais": [...],
    "criterios_internacao": [...],
    "criterios_alta": [...],
    "guideline_referencia": "..."
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

    // --- CORREÇÃO ROBUSTA DE JSON ---
    // 1. Remove blocos Markdown
    let cleanText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    // 2. Extrai APENAS o objeto JSON (do primeiro '{' ao último '}')
    // Isso evita erros se a IA responder: "Aqui está o JSON: { ... }"
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    try {
        res.status(200).json(JSON.parse(cleanText));
    } catch (parseError) {
        console.error("Erro Fatal Parse JSON:", parseError);
        console.log("Texto recebido da IA:", textResponse); // Log para debug
        throw new Error("A IA retornou um formato inválido (não é JSON).");
    }

  } catch (error) {
    console.error("Erro interno na API:", error);
    res.status(500).json({ error: "Erro ao processar conduta clínica.", details: error.message });
  }
}
