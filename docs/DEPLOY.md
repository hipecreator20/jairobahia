# Fluxo de publicação e estado confirmado

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
