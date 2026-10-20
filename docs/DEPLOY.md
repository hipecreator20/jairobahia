# Fluxo de publicação e estado confirmado

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
