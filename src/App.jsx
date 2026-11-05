import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, BrainCircuit,
  Check, CheckCircle2, ChevronDown, ChevronRight, Cpu, Droplets, Expand,
  FlaskConical, Gauge, History, Layers3, MessageCircle, Minimize2, Moon,
  PanelBottomClose, PanelBottomOpen, Pause, Play, RotateCcw, Send, ShieldCheck,
  Signal, SlidersHorizontal, Sparkles, Sun, Waves, X, Zap
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';
import HydraulicScene from './components/HydraulicScene.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const initialValues = {
  level: 78, suction: 4.8, discharge: 7.2, flow: 32.5, temperature: 38,
  air: 0, running: true, solutionApplied: false, sensorOnline: true, suctionValveOpen: true, dischargeValveOpen: true
};

const initialTrend = [
  { time: '14:00', pressure: 4.7, flow: 31.8, level: 82 },
  { time: '14:05', pressure: 4.8, flow: 32.1, level: 81 },
  { time: '14:10', pressure: 4.8, flow: 32.4, level: 80 },
  { time: '14:15', pressure: 4.7, flow: 32.3, level: 80 },
  { time: '14:20', pressure: 4.9, flow: 32.8, level: 79 },
  { time: '14:25', pressure: 4.8, flow: 32.5, level: 78 },
  { time: '14:30', pressure: 4.8, flow: 32.5, level: 78 }
];

const scenarios = [
  { id: 'cavitation', number: '01', name: 'Cavitação', description: 'Pressão de sucção insuficiente', icon: Waves, color: 'amber' },
  { id: 'air', number: '02', name: 'Entrada de ar', description: 'Ar na linha hidráulica', icon: Droplets, color: 'blue' },
  { id: 'low-level', number: '03', name: 'Nível baixo', description: 'Pouco fluido no tanque', icon: ArrowDownRight, color: 'amber' },
  { id: 'instrumentation', number: '04', name: 'Instrumentação', description: 'Perda de sinal de sensor', icon: Signal, color: 'red' }
];

const scenarioTargets = {
  cavitation: { ...initialValues, level: 34, suction: 1.45, discharge: 5.0, flow: 17.8, temperature: 45.2, air: 0 },
  air: { ...initialValues, level: 70, suction: 2.85, discharge: 5.7, flow: 19.2, temperature: 41.4, air: 76 },
  'low-level': { ...initialValues, level: 16, suction: 2.05, discharge: 4.9, flow: 15.6, temperature: 43.1, air: 0 },
  instrumentation: { ...initialValues, sensorOnline: false }
};

const transitionFields = ['level', 'suction', 'discharge', 'flow', 'temperature', 'air'];

const componentInfo = {
  tank: { title: 'Tanque principal', code: 'TNQ-001', detail: 'Reservatório vertical · visor de nível e radar superior', value: '78%', status: 'Monitorado' },
  pump: { title: 'Bomba centrífuga', code: 'BMB-001', detail: 'Bomba horizontal · conjunto de sucção e descarga', value: '1.750 rpm', status: 'Em operação' },
  motor: { title: 'Motor elétrico', code: 'MTR-001', detail: 'Motor de indução com aletas de dissipação', value: '38 °C', status: 'Em operação' },
  suction: { title: 'Linha de sucção', code: 'SUC-001', detail: 'Trecho entre o tanque e o bocal de sucção', value: '4,8 bar', status: 'Monitorada' },
  discharge: { title: 'Linha de descarga', code: 'DSC-001', detail: 'Tubulação de recalque após a bomba', value: '7,2 bar', status: 'Monitorada' },
  'sensor-level': { title: 'Radar de nível', code: 'SEN-NVL-01', detail: 'Medição contínua do nível do tanque', value: '78%', status: 'Conectado' },
  'sensor-pressure': { title: 'Manômetro de sucção', code: 'SEN-PRS-01', detail: 'Instrumentação da linha de sucção', value: '4,8 bar', status: 'Conectado' },
  'sensor-flow': { title: 'Medidor de vazão', code: 'SEN-VAZ-01', detail: 'Medição da vazão na linha de descarga', value: '32,5 m³/h', status: 'Conectado' },
  'suction-valve': { title: 'Válvula de sucção', code: 'VLV-SUC-01', detail: 'Válvula de bloqueio instalada na linha de sucção', value: 'Aberta', status: 'Permite passagem' },
  'discharge-valve': { title: 'Válvula de descarga', code: 'VLV-DSC-01', detail: 'Válvula de bloqueio instalada na linha de descarga', value: 'Aberta', status: 'Permite passagem' }
};

function getRisk(values, scenario) {
  if (values.solutionApplied) return 6;
  if (!values.sensorOnline) return 84;
  if (scenario === 'instrumentation') return 8;
  if (!values.running) return scenario === 'low-level' && values.level < 25 ? 38 : 0;
  if (values.suctionValveOpen === false) return 92;
  if (values.dischargeValveOpen === false) return 72;
  if (scenario === 'air') {
    return Math.min(98, Math.round(values.air * 0.78 + Math.max(0, 3.8 - values.suction) * 9 + Math.max(0, 24 - values.flow) * 0.35));
  }
  if (scenario === 'low-level') {
    return Math.min(98, Math.round(Math.max(0, 42 - values.level) * 2.35 + Math.max(0, 3.5 - values.suction) * 8 + Math.max(0, 22 - values.flow) * 0.28));
  }
  if (scenario === 'cavitation') {
    return Math.min(98, Math.round(Math.max(0, 4.2 - values.suction) * 24 + Math.max(0, 55 - values.level) * 0.8 + Math.max(0, 24 - values.flow) * 0.45 + values.air * 0.18));
  }
  return Math.min(98, Math.round(Math.max(0, 35 - values.level) * 0.7 + values.air * 0.3));
}

function statusForRisk(risk) {
  if (risk >= 65) return { label: 'Condição crítica', tone: 'critical' };
  if (risk >= 30) return { label: 'Atenção operacional', tone: 'warning' };
  return { label: 'Operação estável', tone: 'good' };
}

function Metric({ label, value, unit, icon: Icon, sub, tone = 'normal' }) {
  return (
    <div className={`metric metric-${tone}`}>
      <div className="metric-top"><span>{label}</span><Icon size={15}/></div>
      <div className="metric-value-row"><strong>{value}</strong>{unit && <span>{unit}</span>}</div>
      <div className="metric-foot"><span>{sub}</span></div>
    </div>
  );
}

function DeckTab({ active, onClick, icon: Icon, label, count }) {
  return <button className={`deck-tab ${active ? 'active' : ''}`} onClick={onClick}><Icon size={15}/><span>{label}</span>{count > 0 && <small>{count}</small>}</button>;
}

function MarkdownLite({ text }) {
  return <div className="message-copy">{String(text).split('\n').map((line, index) => {
    const cleaned = line.replace(/\*\*(.*?)\*\*/g, '$1');
    if (cleaned.startsWith('- ')) return <div className="message-bullet" key={index}><span>•</span>{cleaned.slice(2)}</div>;
    if (/^\d+\. /.test(cleaned)) return <div className="message-bullet" key={index}><span>{cleaned.match(/^\d+/)[0]}.</span>{cleaned.replace(/^\d+\. /, '')}</div>;
    return <div key={index}>{cleaned || '\u00a0'}</div>;
  })}</div>;
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('hydrovision-theme') || 'dark');
  const [section, setSection] = useState('overview');
  const [deckTab, setDeckTab] = useState('experiments');
  const [deckOpen, setDeckOpen] = useState(true);
  const [scenario, setScenario] = useState('normal');
  const [values, setValues] = useState(initialValues);
  const [selected, setSelected] = useState(null);
  const [presentMode, setPresentMode] = useState(false);
  const [trend, setTrend] = useState(initialTrend);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou a HYDRO AI. Analiso os parâmetros do laboratório virtual, explico as condições hidráulicas e sugiro verificações técnicas. Os valores desta instalação estão identificados como demonstração.' }
  ]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState('local');
  const [apiOnline, setApiOnline] = useState(false);
  const [toast, setToast] = useState('');
  const [history, setHistory] = useState([]);
  const [simulationStatus, setSimulationStatus] = useState('idle');
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simulationTarget, setSimulationTarget] = useState(null);
  const [simulationKind, setSimulationKind] = useState('fault');
  const [transition, setTransition] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [viewResetKey, setViewResetKey] = useState(0);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const operatingValues = useMemo(() => ({
    ...values,
    suction: values.running && values.suctionValveOpen ? values.suction : 0,
    discharge: values.running && values.dischargeValveOpen ? values.discharge : 0,
    flow: values.running && values.suctionValveOpen && values.dischargeValveOpen ? values.flow : 0
  }), [values]);
  const risk = getRisk(operatingValues, scenario);
  const state = risk >= 30 ? statusForRisk(risk) : !values.running ? { label: 'Bomba parada', tone: 'warning' } : statusForRisk(risk);
  const currentScenario = scenarios.find((item) => item.id === scenario);
  const selectedBaseInfo = selected ? componentInfo[selected] : null;
  const selectedDynamic = {
    tank: { value: `${values.level}%`, status: values.level < 25 ? 'Nível baixo' : 'Monitorado' },
    suction: { value: `${operatingValues.suction.toFixed(1)} bar`, status: !values.running ? 'Bomba parada' : values.suctionValveOpen ? 'Linha pressurizada' : 'Válvula fechada' },
    discharge: { value: `${operatingValues.discharge.toFixed(1)} bar`, status: !values.running ? 'Bomba parada' : values.dischargeValveOpen ? 'Linha pressurizada' : 'Válvula fechada' },
    pump: { value: values.running ? '1.750 rpm' : '0 rpm', status: values.running ? 'Em operação' : 'Parada' },
    motor: { value: `${values.temperature.toFixed(1)} °C`, status: values.running ? 'Em operação' : 'Parado' },
    'sensor-level': { value: `${values.level}%`, status: 'Conectado' },
    'sensor-pressure': { value: values.sensorOnline ? `${operatingValues.suction.toFixed(1)} bar` : '— · sem sinal', status: values.sensorOnline ? 'Conectado' : 'Sem comunicação' },
    'sensor-flow': { value: `${operatingValues.flow.toFixed(1)} m³/h`, status: 'Conectado' },
    'suction-valve': { value: values.suctionValveOpen ? '100% · aberta' : '0% · fechada', status: values.suctionValveOpen ? 'Passagem liberada' : 'Sucção bloqueada' },
    'discharge-valve': { value: values.dischargeValveOpen ? '100% · aberta' : '0% · fechada', status: values.dischargeValveOpen ? 'Passagem liberada' : 'Descarga bloqueada' }
  };
  const selectedInfo = selectedBaseInfo ? { ...selectedBaseInfo, ...(selectedDynamic[selected] || {}) } : null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('hydrovision-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetch(`${API_BASE}/api/health`).then((r) => r.json()).then((d) => {
      setApiOnline(true);
      if (d.aiProvider) setAiMode(d.aiProvider === 'openai' ? 'openai' : 'local');
    }).catch(() => setApiOnline(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const sample = valuesRef.current;
      setTrend((current) => [...current.slice(-17), {
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        pressure: sample.sensorOnline ? Number((sample.suctionValveOpen ? sample.suction : 0.25).toFixed(2)) : null,
        flow: Number((sample.suctionValveOpen && sample.dischargeValveOpen ? sample.flow : 0).toFixed(1)),
        level: Number(sample.level.toFixed(0))
      }]);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!transition) return undefined;
    const timer = setInterval(() => {
      const elapsed = Date.now() - transition.startedAt;
      const linear = Math.min(1, elapsed / transition.duration);
      const eased = linear * linear * (3 - 2 * linear);
      const next = {};
      transitionFields.forEach((key) => {
        next[key] = Number((transition.from[key] + (transition.to[key] - transition.from[key]) * eased).toFixed(2));
      });
      // A perda de sinal aparece durante a execução, não apenas no último frame.
      if (transition.kind === 'fault' && transition.to.sensorOnline === false && linear >= 0.28) {
        next.sensorOnline = false;
      }
      if (linear >= 1) {
        ['running', 'sensorOnline', 'solutionApplied', 'suctionValveOpen', 'dischargeValveOpen'].forEach((key) => {
          if (key in transition.to) next[key] = transition.to[key];
        });
      }
      setValues((current) => ({ ...current, ...next }));
      const progress = transition.progressStart + (1 - transition.progressStart) * linear;
      setSimulationProgress(Math.round(progress * 100));
      if (linear >= 1) {
        setSimulationStatus(transition.kind === 'solution' ? 'recovered' : 'completed');
        setTransition(null);
        const title = transition.kind === 'solution'
          ? `Solução aplicada: ${currentScenario?.name || 'condição operacional'}`
          : `Experimento concluído: ${currentScenario?.name || 'cenário'}`;
        setHistory((items) => [{ id: `EVT-${Date.now()}`, title, time: new Date().toLocaleTimeString('pt-BR'), tone: 'good' }, ...items].slice(0, 8));
        setToast(transition.kind === 'solution' ? 'Condição corrigida no modelo virtual.' : 'Simulação concluída. Analise os indicadores.');
      }
    }, 40);
    return () => clearInterval(timer);
  }, [transition]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateValue = (key, value) => {
    setTransition(null);
    setSimulationStatus('manual');
    setSimulationProgress(100);
    setValues((current) => ({ ...current, [key]: value, solutionApplied: false }));
    setComparison(null);
  };

  const activateScenario = (id) => {
    setScenario(id);
    setValues({ ...initialValues });
    setSimulationStatus('ready');
    setSimulationProgress(0);
    setSimulationTarget(scenarioTargets[id]);
    setSimulationKind('fault');
    setTransition(null);
    setComparison(null);
    setDeckTab('experiments');
    setDeckOpen(true);
    setSection('experiments');
    setSelected(null);
    setToast(`Cenário ${scenarios.find((item) => item.id === id)?.name} preparado. Execute para observar a falha.`);
  };

  const startSimulation = () => {
    if (scenario === 'normal') return;
    const from = simulationStatus === 'manual' ? { ...values } : { ...initialValues };
    const target = scenarioTargets[scenario];
    setValues(from);
    setSimulationTarget(target);
    setSimulationKind('fault');
    setSimulationProgress(0);
    setSimulationStatus('running');
    setTransition({ id: Date.now(), kind: 'fault', from, to: target, duration: 7200, progressStart: 0, startedAt: Date.now() });
    setToast('Simulação iniciada: acompanhe a evolução no modelo 3D.');
  };

  const pauseSimulation = () => {
    setTransition(null);
    setSimulationStatus('paused');
    setToast('Simulação pausada. Você pode continuar de onde parou.');
  };

  const resumeSimulation = () => {
    if (!simulationTarget) return;
    const from = { ...values };
    const totalDuration = simulationKind === 'solution' ? 2600 : 7200;
    const remaining = Math.max(450, totalDuration * (1 - simulationProgress / 100));
    setSimulationStatus(simulationKind === 'solution' ? 'applying' : 'running');
    setTransition({ id: Date.now(), kind: simulationKind, from, to: simulationTarget, duration: remaining, progressStart: simulationProgress / 100, startedAt: Date.now() });
  };

  const restore = () => {
    setTransition(null);
    setSimulationStatus('idle');
    setSimulationProgress(0);
    setSimulationTarget(null);
    setSimulationKind('fault');
    setComparison(null);
    setScenario('normal');
    setValues({ ...initialValues });
    setSelected(null);
    setViewResetKey((value) => value + 1);
    setHistory((items) => [{ id: `EVT-${Date.now()}`, title: 'Condições de referência restauradas', time: new Date().toLocaleTimeString('pt-BR'), tone: 'good' }, ...items].slice(0, 8));
    setToast('Cenário restaurado para condição de referência.');
  };

  const applySolution = async () => {
    if (scenario === 'normal' && risk < 30) {
      setToast('Selecione um experimento antes de aplicar uma solução.');
      return;
    }
    const before = { ...operatingValues };
    const after = {
      ...initialValues,
      level: Math.max(values.level, 78),
      suction: Math.max(4.6, Math.min(5.0, values.suction + 2.8)),
      discharge: 7.1,
      flow: 31.8,
      temperature: Math.min(values.temperature, 38.5),
      air: 0,
      running: true,
      sensorOnline: true,
      suctionValveOpen: true,
      dischargeValveOpen: true,
      solutionApplied: true
    };
    setTransition({ id: Date.now(), kind: 'solution', from: { ...values }, to: after, duration: 2600, progressStart: 0, startedAt: Date.now() });
    setSimulationTarget(after);
    setSimulationKind('solution');
    setSimulationProgress(0);
    setSimulationStatus('applying');
    setComparison({ before, after });
    setToast('Aplicando correções ao cenário virtual...');
    try {
      await fetch(`${API_BASE}/api/simulations/record`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, values: { before, after } }) });
    } catch { /* A demonstração funciona localmente sem o backend. */ }
  };

  const toggleSelectedComponent = () => {
    if (selected === 'suction-valve') {
      updateValue('suctionValveOpen', !values.suctionValveOpen);
      setToast(`Válvula de sucção ${values.suctionValveOpen ? 'fechada' : 'aberta'} no modelo virtual.`);
      return;
    }
    if (selected === 'discharge-valve') {
      updateValue('dischargeValveOpen', !values.dischargeValveOpen);
      setToast(`Válvula de descarga ${values.dischargeValveOpen ? 'fechada' : 'aberta'} no modelo virtual.`);
      return;
    }
    if (selected === 'pump') {
      updateValue('running', !values.running);
      setToast(values.running ? 'Bomba virtual desligada; vazão zerada.' : 'Bomba virtual ligada.');
      return;
    }
    if (selected === 'sensor-pressure') {
      updateValue('sensorOnline', !values.sensorOnline);
      setToast(values.sensorOnline ? 'Sensor de pressão desconectado.' : 'Comunicação do sensor de pressão restaurada.');
    }
  };

  const localFallback = (message) => {
    const lower = message.toLowerCase();
    if (lower.includes('cavita')) return `**Cavitação — análise técnica**\n\nA cavitação está associada à queda da pressão local abaixo da pressão de vapor do líquido. Para avaliar o risco físico, é necessário comparar o NPSH disponível (NPSHa) com o requerido (NPSHr), além de considerar pressão absoluta, temperatura, perdas na sucção e curva da bomba.\n\nNo cenário atual: nível ${operatingValues.level}%, pressão efetiva de sucção ${values.sensorOnline ? `${operatingValues.suction.toFixed(1)} bar` : 'indisponível (sensor sem sinal)'} e índice didático ${risk}/100. Esses valores simulados não confirmam cavitação real.`;
    if (lower.includes('sensor') || lower.includes('instrument')) return `**Instrumentação — análise**\n\nO sensor de pressão está ${values.sensorOnline ? 'conectado' : 'sem comunicação'}. Quando há perda de sinal, o sistema deve marcar a leitura como indisponível ou desatualizada, sem tratar o último valor como medição atual. Verifique alimentação, cabeamento, comunicação e calibração.`;
    if (lower.includes('entrada de ar') || lower.includes('bolha') || /\bar\b/.test(lower)) return `**Entrada de ar — análise**\n\nAr na linha pode provocar escoamento irregular, perda de escorva e instabilidade de vazão. Verifique conexões, juntas, vedações e submergência da sucção. A intensidade de ar configurada nesta demonstração é ${operatingValues.air}%.`;
    if (lower.includes('nível') || lower.includes('tanque')) return `**Nível do tanque — análise**\n\nO nível simulado é ${operatingValues.level}%. Um nível insuficiente pode comprometer a submergência na sucção e reduzir a margem operacional. Verifique a medição do radar, a reposição de fluido e os limites aprovados para a bomba.`;
    return `**HYDRO AI — contexto da instalação**\n\nCenário: ${currentScenario?.name || 'referência'}. Nível: ${operatingValues.level}%. Pressão de sucção: ${values.sensorOnline ? `${operatingValues.suction.toFixed(1)} bar` : 'indisponível (sensor sem sinal)'}. Vazão: ${operatingValues.flow.toFixed(1)} m³/h. Entrada de ar: ${operatingValues.air}%. Índice didático: ${risk}/100.\n\nPosso explicar cavitação, entrada de ar, nível baixo e instrumentação. Estes dados pertencem ao laboratório virtual e não são medições físicas.`;
  };

  const sendMessage = async (preset) => {
    const message = (preset ?? input).trim();
    if (!message || aiLoading) return;
    const nextMessages = [...messages, { role: 'user', content: message }];
    setMessages(nextMessages);
    setInput('');
    setAiLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context: messages.slice(-8), simulation: { scenario, ...operatingValues, risk, origin: 'SIMULADO', simulationStatus } })
      });
      if (!response.ok) throw new Error('API indisponível');
      const data = await response.json();
      setAiMode(data.mode || 'local');
      setMessages((items) => [...items, { role: 'assistant', content: data.answer }]);
    } catch {
      setApiOnline(false);
      setMessages((items) => [...items, { role: 'assistant', content: localFallback(message) }]);
    } finally {
      setAiLoading(false);
    }
  };

  const metrics = useMemo(() => [
    { label: 'Nível do tanque', value: operatingValues.level, unit: '%', icon: Droplets, sub: 'Radar · TNQ-001', tone: operatingValues.level < 30 ? 'warning' : 'normal' },
    { label: 'Pressão de sucção', value: values.sensorOnline ? operatingValues.suction.toFixed(1) : '—', unit: values.sensorOnline ? 'bar' : '', icon: Gauge, sub: values.sensorOnline ? 'SEN-PRS-01' : 'SEN-PRS-01 · sem sinal', tone: !values.sensorOnline || operatingValues.suction < 3 ? 'warning' : 'normal' },
    { label: 'Vazão', value: operatingValues.flow.toFixed(1), unit: 'm³/h', icon: Waves, sub: 'Linha de descarga', tone: operatingValues.flow < 23 ? 'warning' : 'normal' },
    { label: 'Temperatura', value: values.temperature.toFixed(1), unit: '°C', icon: Activity, sub: 'Conjunto motobomba', tone: values.temperature > 42 ? 'warning' : 'normal' },
    { label: 'Bomba principal', value: values.running ? 'ATIVA' : 'PAUSADA', unit: '', icon: Zap, sub: 'BMB-001', tone: values.running ? 'good' : 'warning' }
  ], [values, operatingValues]);

  const navItems = [
    { id: 'overview', label: 'Visão geral', icon: Activity },
    { id: 'digital', label: 'Digital Twin', icon: Layers3 },
    { id: 'experiments', label: 'Experimentos', icon: FlaskConical },
    { id: 'history', label: 'Histórico', icon: History }
  ];

  const changeSection = (id) => {
    setSection(id);
    if (id === 'experiments') { setDeckTab('experiments'); setDeckOpen(true); }
    if (id === 'history') { setDeckTab('alerts'); setDeckOpen(true); }
    if (id === 'digital') { setDeckOpen(false); setSelected(null); }
    if (id === 'overview') { setDeckTab('operation'); setDeckOpen(true); }
  };

  return (
    <div className={`app-shell ${presentMode ? 'presentation-mode' : ''}`}>
      <header className="topbar">
        <button className="brand" onClick={() => changeSection('overview')} aria-label="Ir para visão geral">
          <span className="brand-symbol"><Waves size={20}/></span>
          <span className="brand-copy"><strong>HYDROVISION<span>.</span></strong><small>INDUSTRIAL INTELLIGENCE</small></span>
        </button>
        <div className="installation-tag"><span className="tiny-dot"/> ESTAÇÃO 01 <ChevronDown size={13}/></div>
        <nav className="main-nav" aria-label="Navegação principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={`nav-link ${section === item.id ? 'selected' : ''}`} onClick={() => changeSection(item.id)}><Icon size={15}/>{item.label}</button>;
          })}
          <button className={`nav-link ai-nav ${section === 'ai' ? 'selected' : ''}`} onClick={() => { setSection('ai'); setDeckOpen(false); }}><BrainCircuit size={15}/>HYDRO AI</button>
        </nav>
        <div className="top-actions">
          <div className="live-status"><span className="pulse-dot"/> {apiOnline ? 'API CONECTADA' : 'MODO DEMONSTRAÇÃO'}</div>
          <button className="icon-button" title="Notificações e eventos" onClick={() => { setDeckTab('alerts'); setDeckOpen(true); }}><Bell size={17}/>{risk >= 30 && <i/>}</button>
          <button className="icon-button theme-toggle" title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button>
          <button className="avatar" title="Operador demonstrativo">OP</button>
        </div>
      </header>

      {!presentMode && <section className="metrics-strip" aria-label="Indicadores operacionais">
        <div className="metrics-intro"><span>LIVE PARAMETERS</span><strong>Parâmetros operacionais</strong><small>Telemetria demonstrativa</small></div>
        {metrics.map((metric) => <Metric key={metric.label} {...metric}/ >)}
        <div className={`condition-chip ${state.tone}`}><span className="condition-dot"/><div><small>CONDIÇÃO GERAL</small><strong>{state.label}</strong><em>Índice didático {risk}/100</em></div></div>
      </section>}

      <div className={`workspace-grid ${presentMode ? 'workspace-present' : ''}`}>
      <main className="main-workspace">
        <div className="scene-heading">
          <div><span className="eyebrow">DIGITAL TWIN / ESTAÇÃO DE BOMBEAMENTO 01</span><h1>{section === 'experiments' ? 'Laboratório de simulação' : section === 'history' ? 'Histórico operacional' : section === 'ai' ? 'Central de inteligência' : 'Instalação hidráulica'}</h1></div>
          <div className="scene-heading-actions">
            <span className="demo-tag"><span/> AMBIENTE VIRTUAL · DADOS SIMULADOS</span>
            <button className="small-icon-button" title={presentMode ? 'Sair do modo apresentação' : 'Modo apresentação'} onClick={() => setPresentMode(!presentMode)}>{presentMode ? <Minimize2 size={15}/> : <Expand size={15}/>}</button>
          </div>
        </div>

        <section className="scene-frame">
          <HydraulicScene values={operatingValues} scenario={scenario} risk={risk} selected={selected} setSelected={setSelected} theme={theme} resetKey={viewResetKey}/>
          <div className="scene-top-overlay">
            <div className="scene-caption"><span className="caption-square"/> ESTAÇÃO DE BOMBEAMENTO · MODELO 3D</div>
            <div className={`pump-state ${values.running ? 'running' : 'paused'}`}><span/>{values.running ? 'CONJUNTO EM OPERAÇÃO' : 'CONJUNTO PAUSADO'}</div>
          </div>
          <div className="scene-left-legend">
            <div><i className="legend-water"/> FLUXO DO FLUIDO</div>
            <div><i className="legend-sensor"/> INSTRUMENTAÇÃO</div>
            {risk >= 30 && <div className="legend-alert"><i/> ANORMALIDADE SIMULADA</div>}
          </div>
          {selectedInfo && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="component-inspector">
            <button className="inspector-close" onClick={() => setSelected(null)}><X size={14}/></button>
            <span className="eyebrow">COMPONENTE SELECIONADO · {selectedInfo.code}</span>
            <strong>{selectedInfo.title}</strong><p>{selectedInfo.detail}</p>
            <div className="inspector-bottom"><b>{selectedInfo.value}</b><span>{selectedInfo.status}</span></div>
            {(selected === 'suction-valve' || selected === 'discharge-valve' || selected === 'pump' || selected === 'sensor-pressure') && <button className="inspector-action" onClick={toggleSelectedComponent}>{selected === 'suction-valve' ? (values.suctionValveOpen ? 'Fechar válvula' : 'Abrir válvula') : selected === 'discharge-valve' ? (values.dischargeValveOpen ? 'Fechar válvula' : 'Abrir válvula') : selected === 'pump' ? (values.running ? 'Desligar bomba virtual' : 'Ligar bomba virtual') : (values.sensorOnline ? 'Desconectar sensor' : 'Restaurar comunicação')}</button>}
          </motion.div>}
          <div className="scene-controls"><span><SlidersHorizontal size={13}/> ARRASTE PARA GIRAR · SCROLL PARA ZOOM</span><button onClick={() => { setSelected(null); setViewResetKey((value) => value + 1); }}>REPOSICIONAR CÂMERA</button></div>
        </section>

        <div className="scene-footer">
          <div className="component-shortcuts">
            <button onClick={() => setSelected('tank')} className={selected === 'tank' ? 'active' : ''}><Droplets size={14}/> Tanque</button>
            <button onClick={() => setSelected('pump')} className={selected === 'pump' ? 'active' : ''}><Gauge size={14}/> Bomba</button>
            <button onClick={() => setSelected('motor')} className={selected === 'motor' ? 'active' : ''}><Cpu size={14}/> Motor</button>
            <button onClick={() => setSelected('sensor-level')} className={selected === 'sensor-level' ? 'active' : ''}><Signal size={14}/> Instrumentação</button>
          </div>
          <span className="scene-scale">MODELO 3D INTERATIVO <span>·</span> WEBGL <span>·</span> PBR</span>
        </div>
      </main>

      {!presentMode && <aside className={`ai-side-panel ${section === 'ai' ? 'ai-side-focused' : ''}`}>
        <div className="ai-side-header">
          <div className="ai-avatar"><BrainCircuit size={20}/></div>
          <div><strong>HYDRO AI</strong><small>Copiloto de engenharia · {aiMode === 'openai' ? 'Modelo conectado' : 'Análise técnica local'}</small></div>
          <span className="ai-status-pill"><i/> ATIVO</span>
        </div>
        <div className={`ai-side-summary ${state.tone}`}>
          <div className="ai-summary-mark">{risk >= 65 ? <AlertTriangle size={17}/> : risk >= 30 ? <Activity size={17}/> : <CheckCircle2 size={17}/>}</div>
          <div><strong>{risk >= 65 ? 'Condição crítica simulada' : risk >= 30 ? 'Atenção operacional' : 'Sistema em condição de referência'}</strong><p>{risk >= 65 ? 'As variáveis do cenário indicam uma condição de risco elevado. Consulte os parâmetros e avalie a solução demonstrativa.' : risk >= 30 ? 'Uma ou mais variáveis se afastaram da faixa de referência. Verifique o cenário ativo.' : 'As variáveis disponíveis estão dentro das faixas de referência configuradas para esta demonstração.'}</p></div>
        </div>
        <div className="ai-side-insights">
          <div className="ai-side-section-title"><span>LEITURA DO CENÁRIO</span><b>{risk}/100</b></div>
          <div><span>Nível do tanque</span><strong>{values.level}%</strong></div>
          <div><span>Pressão de sucção</span><strong>{values.sensorOnline ? `${operatingValues.suction.toFixed(1)} bar` : 'Sem sinal'}</strong></div>
          <div><span>Vazão</span><strong>{operatingValues.flow.toFixed(1)} m³/h</strong></div>
          <div><span>Entrada de ar</span><strong>{values.air}%</strong></div>
        </div>
        <div className="ai-side-chat-label"><span>CONVERSA COM A HYDRO AI</span><small>Dados: {scenario === 'normal' ? 'referência simulada' : 'experimento simulado'}</small></div>
        <div className="chat-messages side-chat-messages" aria-live="polite">
          {messages.slice(-5).map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span className="chat-avatar">{message.role === 'assistant' ? <Sparkles size={13}/> : 'OP'}</span><div className="chat-bubble"><MarkdownLite text={message.content}/></div></div>)}
          {aiLoading && <div className="chat-message assistant"><span className="chat-avatar"><Sparkles size={13}/></span><div className="chat-bubble typing"><i/><i/><i/> Analisando...</div></div>}
        </div>
        <div className="ai-side-quick"><button onClick={() => sendMessage('Analise o cenário atual e explique os riscos.')}>Analisar cenário</button><button onClick={() => sendMessage('Quais verificações técnicas ajudam a avaliar cavitação?')}>Risco de cavitação</button></div>
        <form className="ai-input-row ai-side-input" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte sobre a instalação..."/><button type="submit" disabled={!input.trim() || aiLoading}><Send size={16}/></button></form>
        <div className="ai-disclaimer">A IA apoia a interpretação. Não aciona equipamentos físicos nem substitui validação técnica.</div>
      </aside>}
      </div>

      {!presentMode && <section className={`control-deck ${deckOpen ? 'expanded' : 'collapsed'}`}>
        <div className="deck-header">
          <div className="deck-tabs">
            <DeckTab active={deckTab === 'operation'} onClick={() => { setDeckTab('operation'); setDeckOpen(true); }} icon={Activity} label="Operação"/>
            <DeckTab active={deckTab === 'experiments'} onClick={() => { setDeckTab('experiments'); setDeckOpen(true); }} icon={FlaskConical} label="Experimentos"/>
            <DeckTab active={deckTab === 'telemetry'} onClick={() => { setDeckTab('telemetry'); setDeckOpen(true); }} icon={Waves} label="Telemetria"/>
            <DeckTab active={deckTab === 'alerts'} onClick={() => { setDeckTab('alerts'); setDeckOpen(true); }} icon={AlertTriangle} label="Eventos" count={risk >= 30 ? 1 : 0}/>
          </div>
          <div className="deck-tools"><span className="deck-live"><i/> CONTROL DECK</span><button className="deck-collapse" onClick={() => setDeckOpen(!deckOpen)}>{deckOpen ? <PanelBottomClose size={16}/> : <PanelBottomOpen size={16}/>}<span>{deckOpen ? 'Recolher' : 'Expandir'}</span></button></div>
        </div>
        <AnimatePresence initial={false}>
          {deckOpen && <motion.div className="deck-content" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
            {deckTab === 'experiments' && <div className="experiments-panel">
              <div className="experiment-list">
                <div className="panel-intro"><span className="eyebrow">LABORATÓRIO VIRTUAL</span><strong>Escolha uma condição para experimentar</strong><small>Observe as respostas no modelo 3D e ajuste os parâmetros.</small></div>
                <div className="scenario-grid">{scenarios.map((item) => {
                  const Icon = item.icon;
                  return <button key={item.id} className={`scenario-card ${scenario === item.id ? 'active' : ''}`} onClick={() => activateScenario(item.id)}><span className={`scenario-icon ${item.color}`}><Icon size={17}/></span><span className="scenario-number">EXP. {item.number}</span><strong>{item.name}</strong><small>{item.description}</small>{scenario === item.id && <CheckCircle2 className="scenario-check" size={15}/>}</button>;
                })}</div>
              </div>
              <div className="experiment-controls">
                <div className="controls-title"><div><span className="eyebrow">PARÂMETROS DE SIMULAÇÃO</span><strong>{currentScenario?.name || 'Condição de referência'}</strong></div><span className="demo-pill">DEMO</span></div>
                {scenario === 'instrumentation' ? <div className="sensor-toggle-row"><div><Signal size={17}/><span>Sensor de pressão</span></div><button className={`toggle-switch ${values.sensorOnline ? 'on' : ''}`} onClick={() => updateValue('sensorOnline', !values.sensorOnline)} aria-label="Alternar conexão do sensor"><i/></button><b>{values.sensorOnline ? 'ONLINE' : 'OFFLINE'}</b></div> : <>
                  <div className="slider-control"><div><label>Nível do tanque</label><b>{values.level}%</b></div><input type="range" min="0" max="100" value={values.level} onChange={(e) => updateValue('level', Number(e.target.value))}/></div>
                  <div className="slider-control"><div><label>Pressão de sucção</label><b>{values.suction.toFixed(1)} bar</b></div><input type="range" min="0.5" max="6" step="0.1" value={values.suction} onChange={(e) => updateValue('suction', Number(e.target.value))}/></div>
                  <div className="slider-control"><div><label>Entrada de ar</label><b>{values.air}%</b></div><input type="range" min="0" max="100" value={values.air} onChange={(e) => updateValue('air', Number(e.target.value))}/></div>
                </>}
                <div className="simulation-progress-row"><span>ETAPA DA SIMULAÇÃO</span><strong>{simulationStatus === 'running' ? 'EM EXECUÇÃO' : simulationStatus === 'paused' ? 'PAUSADA' : simulationStatus === 'completed' ? 'FALHA REPRODUZIDA' : simulationStatus === 'applying' ? 'APLICANDO SOLUÇÃO' : simulationStatus === 'recovered' ? 'CONDIÇÃO RECUPERADA' : simulationStatus === 'manual' ? 'AJUSTE MANUAL' : simulationStatus === 'ready' ? 'PRONTA PARA EXECUTAR' : 'AGUARDANDO EXPERIMENTO'}</strong><div className="simulation-progress-track"><i style={{ width: `${simulationProgress}%` }}/></div></div>
                <div className="experiment-actions">
                  {simulationStatus === 'running' || simulationStatus === 'applying'
                    ? <button className="button-primary" onClick={pauseSimulation}><Pause size={14}/> Pausar simulação</button>
                    : simulationStatus === 'paused'
                      ? <button className="button-primary" onClick={resumeSimulation}><Play size={14}/> Continuar simulação</button>
                      : <button className="button-primary" disabled={scenario === 'normal'} onClick={startSimulation}><Play size={14}/>{simulationStatus === 'completed' ? 'Executar novamente' : 'Executar cenário'}</button>}
                  <button className="button-secondary" onClick={() => updateValue('running', !values.running)}><Zap size={14}/>{values.running ? 'Desligar bomba' : 'Ligar bomba'}</button>
                  <button className="button-secondary" onClick={applySolution} disabled={scenario === 'normal' || simulationStatus === 'applying'}>Aplicar solução</button>
                  <button className="button-ghost" onClick={restore} title="Restaurar cenário"><RotateCcw size={14}/></button>
                </div>
              </div>
              {values.solutionApplied && <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="solution-result"><CheckCircle2 size={17}/><div><strong>Solução demonstrativa aplicada</strong><span>A recuperação foi animada no modelo. Consulte os valores anteriores e posteriores na telemetria.</span></div><button onClick={() => setDeckTab('telemetry')}>Ver comparação <ChevronRight size={14}/></button></motion.div>}
            </div>}

            {deckTab === 'operation' && <div className="operation-panel">
              <div className="panel-intro"><span className="eyebrow">RESUMO OPERACIONAL</span><strong>Estação principal · BMB-001</strong><small>Estado atual do ambiente demonstrativo.</small></div>
              <div className="operation-stats"><div><small>Pressão de descarga</small><strong>{operatingValues.discharge.toFixed(1)} <i>bar</i></strong><span>DSC-001</span></div><div><small>Disponibilidade simulada</small><strong>99,2<i>%</i></strong><span>Últimos 30 dias · exemplo</span></div><div><small>Eventos ativos</small><strong>{risk >= 30 ? '01' : '00'}</strong><span>{risk >= 30 ? 'Requer análise' : 'Sem eventos críticos'}</span></div><div><small>Tempo de operação</small><strong>08:42<i>h</i></strong><span>Período de demonstração</span></div></div>
              <div className="operation-note"><ShieldCheck size={17}/><span>Ambiente demonstrativo. Nenhum equipamento físico é controlado pela aplicação.</span></div>
            </div>}

            {deckTab === 'telemetry' && <div className="telemetry-panel">
              <div className="chart-heading"><div><span className="eyebrow">TELEMETRIA / ÚLTIMAS AMOSTRAS</span><strong>Comportamento das variáveis</strong></div><span className="demo-pill">DADOS SIMULADOS</span></div>
              <div className="charts-grid">
                <div className="chart-card"><div><span>Pressão de sucção</span><strong>{values.sensorOnline ? `${operatingValues.suction.toFixed(1)} bar` : 'Sem sinal'} </strong></div><ResponsiveContainer width="100%" height={105}><AreaChart data={trend}><defs><linearGradient id="pressureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#27a982" stopOpacity={0.26}/><stop offset="100%" stopColor="#27a982" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--chart-grid)"/><XAxis dataKey="time" hide/><YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']}/><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }}/><Area type="monotone" dataKey="pressure" stroke="#27a982" strokeWidth={2} fill="url(#pressureFill)"/></AreaChart></ResponsiveContainer></div>
                <div className="chart-card"><div><span>Vazão</span><strong>{operatingValues.flow.toFixed(1)} m³/h</strong></div><ResponsiveContainer width="100%" height={105}><LineChart data={trend}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--chart-grid)"/><XAxis dataKey="time" hide/><YAxis hide domain={['dataMin - 3', 'dataMax + 3']}/><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }}/><Line type="monotone" dataKey="flow" stroke="#6b9fce" strokeWidth={2.2} dot={false}/></LineChart></ResponsiveContainer></div>
                <div className="chart-card"><div><span>Nível do tanque</span><strong>{values.level}%</strong></div><ResponsiveContainer width="100%" height={105}><AreaChart data={trend}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--chart-grid)"/><XAxis dataKey="time" hide/><YAxis hide domain={[0, 100]}/><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }}/><Area type="monotone" dataKey="level" stroke="#c59b55" strokeWidth={2} fill="#c59b55" fillOpacity={0.12}/></AreaChart></ResponsiveContainer></div>
              </div>
              {comparison && <div className="comparison-grid"><div className="comparison-heading"><CheckCircle2 size={15}/> ANTES × DEPOIS DA SOLUÇÃO</div>{[['Pressão de sucção', comparison.before.suction, comparison.after.suction, 'bar'], ['Vazão', comparison.before.flow, comparison.after.flow, 'm³/h'], ['Nível do tanque', comparison.before.level, comparison.after.level, '%']].map(([label, beforeValue, afterValue, unit]) => <div className="comparison-item" key={label}><span>{label}</span><b>{Number(beforeValue).toFixed(1)} {unit}</b><ChevronRight size={13}/><strong>{Number(afterValue).toFixed(1)} {unit}</strong></div>)}</div>}
            </div>}

            {deckTab === 'alerts' && <div className="alerts-panel">
              <div className="panel-intro"><span className="eyebrow">CENTRAL DE EVENTOS</span><strong>Ocorrências e alertas</strong><small>Eventos gerados durante a demonstração.</small></div>
              <div className="event-list">
                {risk >= 30 && <div className="event-row critical"><span className="event-icon"><AlertTriangle size={16}/></span><div><strong>{currentScenario?.name || 'Condição anormal'} identificada</strong><small>Condição simulada · {new Date().toLocaleTimeString('pt-BR')}</small></div><span className="event-severity">{risk >= 65 ? 'CRÍTICO' : 'ATENÇÃO'}</span></div>}
                {!values.sensorOnline && <div className="event-row critical"><span className="event-icon"><Signal size={16}/></span><div><strong>Sensor sem comunicação</strong><small>SEN-PRS-01 · telemetria demonstrativa</small></div><span className="event-severity">CRÍTICO</span></div>}
                {history.map((event) => <div className="event-row" key={event.id}><span className="event-icon success"><CheckCircle2 size={16}/></span><div><strong>{event.title}</strong><small>{event.time} · ambiente demonstrativo</small></div><span className="event-severity good">REGISTRADO</span></div>)}
                {risk < 30 && history.length === 0 && <div className="empty-events"><CheckCircle2 size={24}/><strong>Nenhuma ocorrência ativa</strong><span>Execute um experimento para gerar eventos nesta demonstração.</span></div>}
              </div>
            </div>}

          </motion.div>}
        </AnimatePresence>
      </section>}

      {presentMode && <div className="presentation-controls"><button onClick={() => { setPresentMode(false); setDeckOpen(true); }}><Minimize2 size={15}/> Sair da apresentação</button><button onClick={() => { setDeckTab('experiments'); setDeckOpen(true); setPresentMode(false); }}><FlaskConical size={15}/> Abrir experimentos</button><button onClick={restore}><RotateCcw size={15}/> Reiniciar cenário</button></div>}

      {!presentMode && <footer className="statusbar"><span><i/> HYDROVISION CONTROL CENTER</span><span>AMBIENTE DE DEMONSTRAÇÃO · SEM ATUADORES FÍSICOS</span><span>{apiOnline ? 'API CONECTADA' : 'MODO LOCAL'} · v1.1</span></footer>}
      <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}><Check size={15}/>{toast}</motion.div>}</AnimatePresence>
    </div>
  );
}
