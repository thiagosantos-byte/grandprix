# HYDROVISION — Industrial Control Center

Plataforma demonstrativa para monitoramento e simulação de um sistema de bombeamento hidráulico. A experiência central é um modelo 3D interativo com visual industrial, iluminação e materiais PBR, controles de câmera e experimentos que alteram a cena e os indicadores.

## O que está incluído

- Dashboard horizontal sem menu lateral fixo.
- Indicadores operacionais na parte superior.
- Digital Twin 3D navegável, renderizado em WebGL com geometrias reais (não é uma imagem de fundo): tanque, visor com fluido, bomba centrífuga, rotor animado, motor aletado, tubulações, flanges, válvulas e instrumentos.
- Central de experimentos com execução progressiva, pausa, retomada e reinício: cavitação, entrada de ar, nível baixo e falha de instrumentação.
- Comparação antes/depois após aplicar uma solução virtual, com recuperação animada dos parâmetros.
- Interação direta com a bomba, válvulas e sensor de pressão no inspetor 3D.
- Câmera com foco animado em componentes selecionados; depois do foco, a órbita manual continua livre.
- Fluxo de partículas, bolhas e nível do tanque ligados aos parâmetros da simulação.
- HYDRO AI em painel lateral de análise; Control Deck inferior com operação, experimentos, telemetria e eventos.
- Tema claro/escuro com preferência salva no navegador.
- Modo apresentação.
- API Express para saúde, assistente e registro de execuções.
- Integração opcional com OpenAI e persistência opcional no Supabase.

## Requisitos

- Node.js 20 ou superior.
- npm.
- Navegador com WebGL habilitado para a visualização 3D.

## Instalação

```bash
npm install
cp .env.example .env
npm run dev
```

No Windows, também é possível iniciar com duplo clique em `START-HYDROVISION.bat`. O script confere se o `package.json` está na pasta e chama a instalação e o servidor.

No Windows PowerShell ou Git Bash, se `npm` for bloqueado pela política de execução, use:

```powershell
npm.cmd install
npm.cmd run dev
```

A aplicação abre em `http://localhost:5173` e a API em `http://localhost:3001`. Abra o endereço no Chrome ou Edge instalado no Windows, em uma janela normal, em vez de usar uma prévia embutida no VS Code. Em máquinas com pouca memória, feche abas e aplicativos que não estiver usando antes de abrir a cena 3D. Em produção, configure `VITE_API_BASE_URL` com a URL pública do backend no ambiente da Vercel.

## Como testar os experimentos

1. Abra a aba **Experimentos** no Control Deck.
2. Escolha Cavitação, Entrada de ar, Nível baixo ou Instrumentação.
3. Clique em **Executar cenário** e observe os parâmetros e as animações 3D evoluírem durante alguns segundos.
4. Use **Pausar simulação** e **Continuar simulação** para controlar a execução.
5. Clique em **Aplicar solução** para animar a recuperação; abra **Telemetria** para comparar antes e depois.
6. Clique diretamente no tanque, bomba, motor, manômetro ou válvula. O modelo aproxima a câmera e abre o inspetor. Nas válvulas, use o botão do inspetor para abrir/fechar; na bomba, para ligar/desligar; no manômetro, para desconectar/restaurar o sensor.
7. Fechar uma válvula ou desligar a bomba altera a vazão exibida e o movimento das partículas. Desconectar o sensor marca a pressão como indisponível e gera alerta.

Os experimentos são didáticos: o índice 0–100 não é probabilidade de falha e os valores não representam ensaio físico ou cálculo hidráulico validado. A cavitação real requer, entre outros dados, comparar NPSHa e NPSHr com pressão absoluta, temperatura, perdas e curva do fabricante.

## HYDRO AI

Sem `OPENAI_API_KEY`, o assistente funciona em modo técnico local, com respostas contextualizadas às variáveis e ao experimento selecionado. Para habilitar um modelo de linguagem, preencha no `.env` do backend:

```env
OPENAI_API_KEY=sua_chave
OPENAI_MODEL=gpt-4.1-mini
```

A chave fica somente no servidor. Nunca coloque a chave no frontend.

## Supabase (opcional)

1. Crie um projeto no Supabase.
2. Abra o SQL Editor e execute `supabase/schema.sql`.
3. Preencha `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no `.env` do backend.
4. Reinicie a API.

O backend grava as execuções da Central de Experimentos em `execucoes_simulacao`. A chave `service_role` deve permanecer somente no servidor. O SQL ativa RLS e não cria políticas públicas abertas.

## Build de produção

```bash
npm run build
npm run start
```

Para deploy separado, publique o frontend na Vercel e o servidor Express em Render ou Railway. O arquivo `vercel.json` prepara a build estática e `render.yaml` descreve a API. Configure `VITE_API_BASE_URL` no projeto Vercel com o domínio público do backend e `CLIENT_ORIGIN` no backend com o domínio da Vercel.

## Modelo 3D e fidelidade

A instalação é renderizada em tempo real pelo Three.js/React Three Fiber. A prévia HTML antiga usada anteriormente era apenas uma maquete visual estática; não use aquele HTML para avaliar o Digital Twin. Tanque, bomba, rotor, motor, tubos, flanges, válvulas, instrumentos, suportes e o fluido visível são geometrias 3D construídas no código; a cena não usa fotografia ou imagem plana como instalação. A câmera permite orbitar, aproximar e selecionar componentes. Os experimentos alteram o volume de fluido, a presença de bolhas, os indicadores e o estado dos sensores.

Os materiais usam propriedades físicas (metalness, roughness, clearcoat e transmissão) e um ambiente de estúdio para reflexos. A cena é uma representação didática procedural, não um arquivo CAD certificado nem um gêmeo físico calibrado. Para fidelidade dimensional de uma bomba ou tanque específico, complemente o modelo com arquivos CAD/GLB aprovados pelo fabricante.

O renderizador limita a resolução e usa mapas de sombra e sombras de contato de baixa resolução para equilibrar aparência e consumo de recursos. Em computadores com pouca memória gráfica, feche abas pesadas e abra a aplicação no Chrome ou Edge instalado, não na prévia embutida do VS Code.

## Segurança e limites

- Todos os valores pré-carregados são identificados como dados demonstrativos.
- A interface utiliza Sora para títulos, IBM Plex Sans para leitura e IBM Plex Mono para telemetria. As fontes são carregadas pelo Google Fonts e usam alternativas locais caso a rede esteja indisponível.
- O índice de risco é didático e não representa probabilidade física de falha.
- As ações de solução alteram somente o cenário virtual.
- A aplicação não controla motores, bombas, válvulas ou intertravamentos reais.
- Qualquer proteção operacional física deve ser projetada e validada em CLP/controladores adequados por profissionais habilitados.
