import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '1mb' }));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const localRuns = [];
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabase = Boolean(supabaseUrl && supabaseKey);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    aiProvider: openai ? 'openai' : 'local',
    persistence: hasSupabase ? 'supabase' : 'memory',
    timestamp: new Date().toISOString()
  });
});

function localTechnicalAnswer(message, simulation = {}) {
  const text = String(message || '').toLowerCase();
  const level = Number(simulation.level ?? 78);
  const suction = Number(simulation.suction ?? 4.8);
  const air = Number(simulation.air ?? 0);
  const risk = Number(simulation.risk ?? 0);
  const scenario = simulation.scenario || 'normal';
  const source = 'Os valores citados pertencem ao laboratório virtual e não são medições de campo.';

  if (text.includes('cavita') || scenario === 'cavitation') {
    return `**Cavitação — análise técnica**\n\nA cavitação está associada à queda da pressão local abaixo da pressão de vapor do líquido. Para avaliar o risco real, é necessário comparar o NPSH disponível (NPSHa) com o NPSH requerido (NPSHr), considerando pressão absoluta, temperatura, perdas na sucção e curva da bomba.\n\n**Verificações recomendadas:**\n- Confirmar nível do tanque e submergência da sucção.\n- Inspecionar filtro, válvulas, conexões e possíveis restrições.\n- Conferir pressão absoluta e temperatura do fluido.\n- Consultar a curva e o NPSHr do fabricante.\n\n**Cenário atual:** nível ${level}%, pressão indicada de sucção ${suction.toFixed(1)} bar e índice didático ${risk}/100. ${source}`;
  }
  if (text.includes('entrada de ar') || text.includes('bolha') || /\bar\b/.test(text) || scenario === 'air') {
    return `**Entrada de ar — análise técnica**\n\nAr na linha pode provocar escoamento irregular, perda de escorva, ruído e instabilidade de vazão. A animação representa esse comportamento de maneira didática.\n\n**Verificações recomendadas:** conexões na sucção, juntas, vedações, nível mínimo do tanque e pontos de entrada de ar. Intensidade simulada atual: ${air}%. ${source}`;
  }
  if (text.includes('nível') || text.includes('tanque') || scenario === 'low-level') {
    return `**Nível baixo — análise técnica**\n\nO nível atual simulado é ${level}%. Nível insuficiente pode reduzir a submergência da entrada e comprometer as condições de sucção.\n\n**Ações possíveis:** validar a leitura do radar, verificar a reposição de fluido, avaliar o poço de sucção e configurar limites operacionais aprovados pela equipe técnica. ${source}`;
  }
  if (text.includes('instrument') || scenario === 'instrumentation') {
    return `**Instrumentação — análise técnica**\n\nA perda de comunicação impede confiar na atualização do sensor afetado. A interface deve marcar a leitura como indisponível ou desatualizada, e não manter o último valor como se fosse atual.\n\n**Verificações:** alimentação, cabeamento, conectores, rede, gateway, calibração e diagnóstico do instrumento. ${source}`;
  }
  if (text.includes('solução') || text.includes('resolver') || text.includes('corrigir')) {
    return `**Plano de verificação sugerido**\n\n1. Confirmar a qualidade e a calibração dos instrumentos.\n2. Conferir nível do tanque, linha de sucção, válvulas e filtros.\n3. Comparar as condições medidas com a curva da bomba e os limites aprovados.\n4. Registrar a intervenção e acompanhar a estabilidade após a correção.\n\nA solução aplicada no laboratório virtual altera apenas os parâmetros demonstrativos; não comanda equipamentos físicos.`;
  }
  const suctionText = simulation.sensorOnline === false ? 'indisponível (sensor sem sinal)' : `${suction.toFixed(1)} bar`;
  const flowText = Number(simulation.flow ?? 0).toFixed(1);
  return `**HYDRO AI — análise do contexto**\n\nCenário: ${scenario}. Nível: ${level}%. Pressão de sucção: ${suctionText}. Vazão simulada: ${flowText} m³/h. Entrada de ar: ${air}%. Índice didático: ${risk}/100.\n\nPosso explicar cavitação, entrada de ar, nível baixo e falha de instrumentação. ${source}`;
}

app.post('/api/ai/chat', async (req, res) => {
  const { message, context = [], simulation = {} } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Informe uma mensagem para a HYDRO AI.' });
  }

  if (!openai) {
    return res.json({ answer: localTechnicalAnswer(message, simulation), mode: 'local' });
  }

  try {
    const system = `Você é a HYDRO AI, assistente técnico de uma plataforma acadêmica de monitoramento e simulação de bombeamento hidráulico. Responda em português brasileiro, com clareza e cautela. Diferencie medições reais, simulações, estimativas e hipóteses. Nunca declare uma falha como confirmada sem evidências. Ao falar de cavitação, explique que a avaliação exige NPSHa versus NPSHr, pressão absoluta, temperatura do fluido, perdas na sucção e dados da bomba. Não dê instruções para acionar ou desligar fisicamente equipamentos. A plataforma é supervisória; intertravamentos reais devem ficar em controladores industriais adequados. O contexto desta instalação é de demonstração, salvo indicação explícita em contrário.`;
    const input = [
      ...context.slice(-8).map((item) => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: String(item.content || '') })),
      { role: 'user', content: `Contexto atual da simulação: ${JSON.stringify(simulation)}\n\nPergunta: ${message}` }
    ];
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: system,
      input,
      max_output_tokens: 750
    });
    res.json({ answer: response.output_text || localTechnicalAnswer(message, simulation), mode: 'openai' });
  } catch (error) {
    console.error('HYDRO AI error:', error?.message || error);
    res.status(200).json({
      answer: localTechnicalAnswer(message, simulation),
      mode: 'local-fallback',
      note: 'O serviço de IA externa está indisponível; foi utilizada a análise técnica local.'
    });
  }
});

async function saveRun(record) {
  if (!hasSupabase) {
    localRuns.unshift(record);
    localRuns.splice(40);
    return { persistence: 'memory' };
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/execucoes_simulacao`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      cenario: record.scenario,
      parametros: record.values?.before || {},
      resultado: record.values?.after || {},
      origem: 'DEMO'
    })
  });
  if (!response.ok) throw new Error(`Supabase retornou ${response.status}: ${await response.text()}`);
  return { persistence: 'supabase', data: await response.json() };
}

app.post('/api/simulations/record', async (req, res) => {
  const { scenario, values } = req.body || {};
  const record = {
    id: `SIM-${Date.now()}`,
    scenario: scenario || 'normal',
    values: values || {},
    recordedAt: new Date().toISOString(),
    source: 'DEMO'
  };
  try {
    const stored = await saveRun(record);
    res.status(201).json({ ...record, persistence: stored.persistence });
  } catch (error) {
    console.error('Simulation persistence error:', error?.message || error);
    res.status(502).json({ error: 'Não foi possível persistir a execução no Supabase.', fallback: record });
  }
});

app.get('/api/simulations/recent', (_req, res) => {
  res.json({ items: localRuns.slice(0, 20), persistence: hasSupabase ? 'supabase' : 'memory' });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`HYDROVISION API disponível em http://localhost:${port}`));
