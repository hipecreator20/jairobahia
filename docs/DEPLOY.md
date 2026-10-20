# Fluxo de publicação e estado confirmado

## Estado mais recente — continuação, áudio e créditos (20/10/2026)

- Código publicado em Production pela Vercel após autorização expressa do proprietário: commit `b6bcab72b170a6b21050cac63ff356c0de012cc7`, deployment `dpl_7xptdmEtRn4knXkM6HjviDwQV8Y2`, READY, alias https://jairobahia.vercel.app . `/api/health` confirmou o SHA exato. `/`, `/login`, `/dashboard` e `/admin` responderam HTTP 200; `/api/billing` e `/api/gemini/analyze-audio` sem token responderam HTTP 401.
- Branch `codex/story-continuity-reference`, commit de código acima. PR incremental #4: https://github.com/hipecreator20/jairobahia/pull/4 , base `codex/admin-content-polish` (PR #3), que segue empilhado sobre PR #1/main. PR #4 recebeu 4/4 checks verdes (validate, preview-smoke, Vercel deployment e feedback); não houve merge nem alteração de proteção. O PR #1 continua precisando de revisão independente para integração a `main`.
- Entregue: prompts sequenciais com identidade fixa e enquadramento temporal; upload de imagem por arquivo; cue sheet musical estimada pelo Gemini, ajustável por milissegundo e anexada à exportação de cada clipe; carteira de moedas e histórico; cobrança atômica por geração e administração manual de pagamento/plano usando UID Master no servidor. Valores iniciais: Free 10 mil, Pro R$39,90/1 milhão e Premium R$79,90/3 milhões; texto 1 mil, imagem 10 mil e áudio 10 mil moedas; histórias descontam por cena. Admin pode configurar valores. São créditos internos; não existe processamento de pagamento.
- Checks locais e CI: TypeScript, 14 testes e build passaram. Build reporta bundle JavaScript 1.055 kB (limite de aviso 500 kB). Nenhuma IA paga ou gravação de pagamento foi feita nos testes. A análise musical é uma estimativa, precisa ser revisada e não garante sincronização labial precisa.
- Storage persistente segue desativado: projeto Firebase no Spark, sem upgrade Blaze, `MEDIA_UPLOADS_ENABLED` não habilitada; portanto não há cota efetiva de 20 GB nem retenção persistente de uploads. O componente de referência usa arquivo local de forma temporária; áudio é processado na sessão e não é gravado, somente sua cue sheet. Nenhuma regra Storage foi publicada. Cron protegido requer `CRON_SECRET` ainda não configurado. Não ativar cobrança/Storage sem confirmação específica de limite mensal do proprietário.
- Testes ponta a ponta ainda pendentes: segunda conta Google aprovada/suspensa, atualização e renovação real de custom claims, ações reais do Admin e geração Gemini real sob teto de gastos. Confirmar antes de chamar isso de operação completa.

Prompt de continuidade completo para o próximo agente: `docs/CONTINUACAO_JARINHO.md`.

## Rodada atual — conteúdo visual e controles (20/10/2026)

Esta seção é o estado mais recente e prevalece sobre os relatos históricos abaixo.

- Produção foi publicada diretamente pela Vercel com autorização explícita do proprietário, a partir do commit já enviado `6f6f0d1cfe6f5e076f11423406659caeff9f6ed5`. Deployment `dpl_CqBMbdMnbp4ZrNHekB1vdvuTov2j`, estado READY, domínio https://jairobahia.vercel.app. Saúde HTTP 200 com SHA exato; /, /login, /dashboard e /admin HTTP 200. Isso não confirma fluxos autenticados. PR #1 segue aberto e sem merge; proteções GitHub não foram alteradas. Main ainda precisa ser alinhada à produção por revisão/merge.
- Nova branch local `codex/admin-content-polish`, baseada em `origin/codex/automatic-deploy-pipeline` no commit acima. Três referências visuais no Dashboard reutilizam imagens existentes, com briefings expansíveis e cópia com feedback. Nenhum exemplo é gravado nas coleções do usuário.
- Leituras de projetos, personagens, histórias, cenas, imagens e prompts usam o ID real do documento para edição/exclusão. Histórias só são apagadas depois da limpeza das cenas, consultadas por ownerId e storyId. Se parte da limpeza falhar, a história permanece para nova tentativa; a exclusão não é atômica e cenas já removidas não são restauradas. Falhas no Storage preservam o registro da imagem, exceto objeto já ausente.
- Admin: trava contra envio repetido de planos/alertas, feedback de sucesso/erro, exclusão de alertas com confirmação e preservação de alterações de planos ainda não salvas. Preferências exibem falhas e recusam sucesso falso para perfil inexistente. Prompt Lab e Story Studio usam feedback compartilhado e bloqueio durante exclusão.
- Validação: TypeScript, build e 7 testes locais passaram; novo teste com Firestore simulado verifica ID real, consulta por dono, ordem de exclusão e preservação da história em falha. O primeiro teste no sandbox encontrou EPERM; a execução autorizada fora dessa restrição passou. Build mantém aviso existente de bundle acima de 500 kB. Nenhuma chamada paga ou operação sobre dados reais.
- Não houve teste real de todos os botões em sessão autenticada. Pendentes: inspeção visual autenticada, salvar/excluir registros controlados, segunda conta Google, IA real/cotas, Storage Blaze/regras e App Check.
- Esta nova rodada está preparada localmente. Push gera Preview automático e exige nova autorização depois da apresentação dos resultados, conforme AGENTS.md; não reutilizar a aprovação da publicação anterior. Production continua no commit acima até uma nova publicação explicitamente aprovada.

## Regra do proprietário — aprovação antes de cada deploy

### Rodada autorizada por voz — acesso, Admin e prompts

O proprietário relatou que a segunda conta não conseguia usar recursos, faltava confirmação no Admin, exclusões não funcionavam e queria prompts Gemini com diversidade. Autorizou o push desta rodada e o Preview automático. Depois solicitou atualizar o domínio oficial; a publicação em Production será apresentada com os resultados finais para autorização específica, conforme a regra abaixo.

- Removidos cinco bloqueios antigos por e-mail do proprietário nos endpoints de IA. A autorização existente por token verificado, UID Master ou perfil aprovado e cotas permanece no middleware; chaves de concorrência de imagem agora usam o UID verificado no servidor.
- Admin mantém a estrutura do estúdio, com cartões, status/plano destacados, estado salvando, bloqueio de ações simultâneas, erro/sucesso visível e proteção da conta Master. IDs vêm dos documentos, não de um campo editável de perfil.
- Removida a criação automática de demonstrações ao abrir Dashboard, Image Lab e Prompt Lab. Listas vazias permanecem vazias; exemplos excluídos não são recriados. Nenhum dado existente foi apagado. Dashboard/Biblioteca agora mostram confirmação/erro de exclusão. Não afirmar que todas as exclusões reais foram testadas.
- Prompt Lab continua usando o SDK oficial Google GenAI, sem exigir plugin novo. Instrução de sistema separada, esquema JSON e validação de conteúdo; direção visual focada no pedido, sem fórmulas obrigatórias de pele/grão/anamórfica nem versões fixas de plataforma. O histórico recente de até 12 prompts da própria conta orienta diversidade. Backend bloqueia cópias normalizadas e semelhança lexical >=85% nesse histórico, e mantém fingerprints exatos desde a ativação. Gravações transacionais evitam aprovar cópias simultâneas. Não garante originalidade semântica mundial nem qualidade superior ao mercado. Prompts anteriores à ativação não são indexados retroativamente. Não há retry pago automático; uma resposta rejeitada pode ter consumido chamada/cota.
- Histórico/fingerprints ficam em novas coleções privadas, negadas ao cliente pelas regras atuais e acessadas pelo Admin SDK; não foi preciso publicar regras ou migrar dados. O histórico recente completo é limitado a 12 respostas; fingerprints exatos persistem por conta.
- Verificação local: TypeScript e **6 testes passaram**, incluindo integração de cinco rotas com segunda conta simulada, conta pending e cota esgotada, além de validação/repetição de prompts. Firebase inteiramente simulado nesse teste, chave local descartável, sem credenciais reais ou chamadas de IA. A suíte de 15 verificações de regras já passou antes desta rodada; regras não foram modificadas.

Pendentes nesta rodada: build/CI/Preview do novo commit, inspeção visual autenticada do Admin, segunda conta Google real, exclusões reais controladas e avaliação de uma geração Gemini real com custo combinado. A implementação de qualidade não equivale a uma avaliação humana dos resultados.

Em 20/10/2026, o proprietário determinou: antes de cada publicação, apresentar o que mudou e os resultados dos testes, identificar o destino e perguntar se pode publicar. A regra inclui Preview automático disparado por push; portanto novos pushes que acionem a integração aguardam autorização específica. Preparação, testes e commits locais podem continuar. A aprovação anterior não autoriza novas publicações. Regra permanente também em AGENTS.md. Não desativar integração nem proteções para contorná-la.

## Continuação — correção de plano Admin (20/10/2026)

Continuação por voz: corrigida a ordem de aprovação para publicar status approved no perfil somente após atualizar custom claims. Negação/suspensão continua bloqueando pelo perfil antes de alterar claims/revogar sessões. O cliente força renovação do ID token ao observar aprovação, inclusive no primeiro snapshot aprovado; em falha orienta novo login. TypeScript e os três testes locais passaram novamente. A suíte atual não simula o fluxo Google/claims ponta a ponta; essa validação com segunda conta permanece pendente. Alteração enviada à mesma branch do PR #2, sem publicação em produção; o CI citado abaixo valida o commit anterior, não este ajuste novo.

Resultado final confirmado: commit de código `90c7cf9e79e0c1bccdd0e42b201caee222885f9b`, push na mesma origem e PR incremental em rascunho https://github.com/hipecreator20/jairobahia/pull/2 (base codex/automatic-deploy-pipeline). CI Linux completo **success**, incluindo build e preview-smoke: https://github.com/hipecreator20/jairobahia/actions/runs/39370866212 . Build Windows ficou sem conclusão após transformar 1714 módulos; foi interrompido após a confirmação do CI Linux, sem contabilizá-lo como aprovado.

O script isolado anterior foi localizado em `work/firebase-testing/security.cjs` da sessão de 19/10 e reexecutado com Firebase emulators:exec no projeto **demo-hype-security**, Firestore 8085 e Storage 9195. Resultado final: **SECURITY CHECKS PASSED: 15**, script exit 0. A cópia das regras Firestore foi comparada com esta branch por SHA256 e é idêntica (`272FE429B0CB3FB8114CCEC121DDAFA140A065EDEA919FEA54DCD4E157D562FC`). Cobertura: cadastro pending, bloqueio de autoaprovação/plano/Master, acesso pending, projeto próprio aprovado, isolamento entre contas, listagem de usuários restrita ao Master, status via backend, anônimo bloqueado e quatro cenários Storage (pending, imagem própria aprovada, outra conta e executável). Isso confirma uma nova execução isolada; não recupera o resultado histórico anterior nem substitui autenticação Google real. Nenhuma regra foi publicada.

Branch `codex/admin-plan-backend`, baseada em `b7ce583`. O seletor de plano usa agora PATCH `/api/admin/users/:uid/plan`, sem escrita direta no perfil. Backend verifica token com revogação, exige UID Master, aceita somente free/pro/premium e grava plano e auditoria no mesmo batch. Layout, regras, configuração Firebase e dados remotos preservados. Nenhuma chamada paga de IA realizada.

Verificações: TypeScript e três testes locais passaram, incluindo a nova matriz de autorização/validação de plano com dependências simuladas. A primeira execução no sandbox falhou com EPERM; testes passaram fora dessa restrição. Esses testes não substituem testes das regras no emulador ou com segunda conta. O resultado histórico anterior não foi recuperado; a nova execução isolada está confirmada acima. CI anterior de b7ce583 confirmado como success: https://github.com/hipecreator20/jairobahia/actions/runs/39368369955 .

Produção consultada em `/api/health`: https://jairobahia.vercel.app continua servindo `53c24f6e3273e97ba16bf0b0cd27767dc163cacc`. PR #1 confirmado aberto e em rascunho, base main, head b7ce583. Nenhum merge ou deploy de produção nesta continuação.

Claims: o cliente não força getIdToken(true) ao receber mudança de status; a API e as regras consultam o perfil para autorização. Renovação após aprovação e recuperação após revogação continuam exigindo teste real. Pendentes: segunda conta (cadastro/aprovação/suspensão), troca de plano ponta a ponta, geração e limites com gasto controlado. Storage continua sem upgrade Blaze e regras não publicadas; App Check não ativado. Próximo passo: validar Preview, revisar a correção e integrá-la à branch do PR #1 antes do merge aprovado em main. Deploy de produção, gastos/upgrade e ativação de serviços dependem de autorização específica; nenhuma proteção deve ser removida.

## Identidades existentes

- GitHub: hipecreator20/jairobahia; produção desejada: main.
- Vercel: espaço informado mhrsuporteti-5479. ID do projeto e domínio oficial não confirmados. Não criar projeto novo antes de localizar o vínculo Git existente.
- Firebase configurado no código: gen-lang-client-0704234685.
- Firestore: ai-studio-23b8da44-a156-4670-8dcd-03a6cf972fab.
- Storage: gen-lang-client-0704234685.firebasestorage.app.
- Plugin Firebase instalado; nenhuma ferramenta MCP Firebase disponibilizada nesta sessão; nenhuma configuração de login Firebase CLI localizada. SDK configurado não comprova acesso ao projeto remoto.
- Plugin Vercel não instalado; nenhuma configuração de login Vercel CLI localizada.

## Arquivos preparados

.github/workflows/ci.yml valida PRs e main com Node 22, npm ci, TypeScript, testes e build. O job preview-smoke aguarda até dez minutos por deployment Preview bem-sucedido do SHA exato do PR e testa seu endereço. O job falha explicitamente para forks, que exigem fluxo de revisão próprio; não satisfaz a proteção por job ignorado.

vercel.json exige lint, testes e build antes de completar qualquer deployment. O código não executa deploy de produção pela CLI ou por Actions. A integração Git nativa da Vercel deve estar ligada ao repositório correto: branches de trabalho geram Preview; main gera Production após merge aprovado. Domínio e aliases existentes devem ser preservados.

## Configuração remota ainda a verificar/aplicar

1. Na Vercel, localizar no espaço informado o projeto cujo Git Repository é hipecreator20/jairobahia. Confirmar Production Branch main, root directory e domínio atual. Habilitar integração Git caso ausente; não duplicar projeto.
2. No GitHub, criar ruleset para main: PR obrigatório, ao menos uma aprovação, dispensar aprovações antigas após novos commits, aprovação do último push por outra pessoa, checks validate e preview-smoke obrigatórios, exigir atualização da branch, bloquear force push e exclusão, e impedir bypass inclusive administrativo conforme suporte do plano. Não habilitar auto-merge sem revisão. Checks só podem ser escolhidos depois da primeira execução. Proteção aplicada e confirmada pela API nesta execução: validate e preview-smoke vinculados ao GitHub Actions (app 15368), uma aprovação, invalidar aprovações antigas, aprovação do último push por outra pessoa, branch atualizada, administradores incluídos, sem force push/exclusão e conversas resolvidas.
3. Variáveis Vercel separadas entre Preview e Production: GEMINI_API_KEY, GEMINI_TEXT_MODEL, GEMINI_IMAGE_MODEL e FIREBASE_PROJECT_ID. Não copiar segredos para o GitHub, pacote ou chat. Valores Firebase públicos continuam no arquivo existente; usar banco de produção em preview exige cautela e não equivale a isolamento. Testes automáticos atuais não escrevem dados nem geram IA.
4. Se Preview usa Deployment Protection, criar/configurar VERCEL_AUTOMATION_BYPASS_SECRET no GitHub com o segredo de automação autorizado da Vercel. O script usa cabeçalho, não URL, e não imprime o valor. Sem esse acesso, o check falha, não aprova.
5. No Firebase, confirmar Google Auth habilitado, domínios autorizados, banco nomeado, edição, regras implantadas e bucket. Fazer login com o proprietário para validar leitura, escrita e Storage com registros de teste controlados em ambiente apropriado. Essas validações reais não ocorreram nesta sessão.

## Alteração não destrutiva de validação

/api/health adiciona deploymentCheck: ready. O teste local e o smoke remoto exigem esse campo para diferenciar o novo código. Não modifica banco, Storage, autenticação, índices ou regras remotas. Regras locais propostas na preparação anterior continuam pendentes de revisão/emulador e não são implantadas por este workflow.

## Operação e rollback

GitHub Actions mantém logs de testes/build e artefato por sete dias; Vercel mantém histórico de deployments e logs conforme o plano. Registrar URL, commit e resultado de cada Preview antes de aprovar o PR. Em incidente, selecionar o deployment de produção anterior já validado e usar rollback da Vercel; verificar domínio, /api/health e login. Rollback de código não desfaz alterações de dados e não deve aplicar regras antigas automaticamente.

## Limite da aprovação

Os arquivos por si só NÃO impõem aprovação: isso depende do ruleset remoto. Branch protection foi confirmada. Até confirmar integração Vercel e preview, o fluxo completo não está operacional nem apto a produção. Nunca enviar diretamente a main. Não foi confirmado endereço de Preview ou Production.

Referências: https://vercel.com/docs/git/vercel-for-github e https://vercel.com/docs/git .

## Resultado desta execução

TypeScript e dois testes locais passaram. O build completo no Windows encontrou EPERM durante cópia de assets; a compilação isolada passou. GitHub Actions confirmou npm ci, TypeScript, testes e build completos no Linux para d91371d, no run 39356394366. O check de preview aguarda deployment. Nenhuma URL de deployment confirmada.

PR em rascunho: https://github.com/hipecreator20/jairobahia/pull/1 . Branch publicada: codex/automatic-deploy-pipeline. O conector GitHub é somente leitura, mas a autenticação Git local tem escrita/admin e foi usada sem expor credenciais. Nenhum merge realizado.

## Integração Vercel confirmada

A CLI autenticada confirmou o vínculo do projeto existente jairobahia, no espaço mhrsuporteti-5479, com hipecreator20/jairobahia e Production Branch main. O domínio existente é https://jairobahia.vercel.app; a página inicial retornou HTTP 200 e /api/health retornou 404 na publicação original. Esta atualização em branch separada testa o disparo nativo de Preview.

Firebase: projeto gen-lang-client-0704234685 e banco nomeado confirmados no console da conta proprietária. UID Master confirmado na Authentication: FTqparyG04fCf9eDgUTa6e2tWgp2. Google Auth habilitado e jairobahia.vercel.app autorizado. Nenhum dado foi removido ou alterado.

## Teste real e compatibilidade serverless

Previews passaram a ser gerados automaticamente pelos pushes da branch. Foram corrigidos o import ESM da entrada serverless e a incompatibilidade da dependência jwks-rsa/jose no runtime da Vercel. TypeScript e testes locais passaram; npm audit retornou zero vulnerabilidades. Um preview corrigido já passou no teste real de página, saúde da API e bloqueio sem autenticação.

O segredo VERCEL_AUTOMATION_BYPASS_SECRET foi cadastrado criptografado no GitHub Actions, usando a credencial de automação do projeto, sem exibir seu conteúdo. A descoberta do preview também aceita o status Vercel do commit e o comentário do bot oficial, pois esta integração não publica registros GitHub Deployments. O teste exige que /api/health retorne o commit exato do PR.

## Acesso multiusuário — 20/10/2026

Branch preparada com cadastro Google pendente, Master identificado pelo UID no cliente, nas regras e no backend, painel /admin com dados em tempo real, gestão de status e planos, alertas, acessos e cotas. APIs verificam aprovação e aplicam limites mensais transacionais; pagamentos seguem desativados. O selo “Fase 1” foi removido.

Validação local: TypeScript, dois testes e build passaram. Regras Firestore/Storage ainda precisam ser testadas no emulador e implantadas após revisão. A Vercel requer FIREBASE_SERVICE_ACCOUNT_JSON para ações Admin e cotas, GEMINI_API_KEY para IA e, se App Check for ativado, sua chave pública. Storage requer Blaze; o projeto segue no Spark. Nenhum merge, deploy de produção ou alteração remota de regras foi realizado.

## Publicação aprovada — 20/10/2026

O usuário aprovou explicitamente a publicação em produção e pediu para ignorar o teste adicional de acesso. FIREBASE_SERVICE_ACCOUNT_JSON e GEMINI_API_KEY foram configuradas como segredos em Preview e Production. A chave Gemini respondeu HTTP 200 na listagem de modelos; a credencial Admin confirmou leituras da conta Master e do Firestore existente.

As regras firestore.rules desta branch foram publicadas no banco nomeado pelo console proprietário. A Vercel publicou o commit 53c24f6e3273e97ba16bf0b0cd27767dc163cacc em Production, após build aprovado. Domínio: https://jairobahia.vercel.app . Verificação real: /, /login, /dashboard e /admin retornaram 200; /api/health confirmou o commit; API de geração sem login retornou 401. Página de login renderizada com cadastro Google sujeito à aprovação, sem selo Fase 1.

Publicação aprovada foi feita pela CLI a partir do Preview, sem alterar a proteção de main. O PR continua em rascunho e main ainda precisa de revisão/merge para alinhar o histórico Git com a produção. Login Google completo, aprovação de outro usuário e geração paga não foram testados ponta a ponta. Storage segue dependente do plano Blaze; regras Storage locais ainda não foram publicadas. App Check permanece opcional e não ativado. Ferramentas de teste foram instaladas fora do aplicativo; o teste extra no emulador foi dispensado pelo usuário.
