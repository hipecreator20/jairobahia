# Hype Creator Studio — Firebase + Vercel

Repositório permanente: https://github.com/hipecreator20/jairobahia.git
Espaço Vercel informado: https://vercel.com/mhrsuporteti-5479

## Execução

Node >= 22.12.0. Execute npm ci, copie .env.example para .env, preencha GEMINI_API_KEY e execute npm run dev.
Validação: npm run lint, npm run build, npm test.

## Implantação

Importe o repositório no espaço Vercel informado, usando framework Other, build npm run build e saída dist. vercel.json encaminha /api para Express e as páginas para a SPA. Configure GEMINI_API_KEY apenas no servidor; os modelos são configuráveis por GEMINI_TEXT_MODEL e GEMINI_IMAGE_MODEL. Não use prefixo VITE_ para segredos.

O Firebase público está em firebase-applet-config.json. Projeto: gen-lang-client-0704234685; banco: ai-studio-23b8da44-a156-4670-8dcd-03a6cf972fab. O servidor verifica tokens Firebase usando o projectId; não precisa de chave de conta de serviço para verificar assinatura de tokens.

No Firebase Authentication, habilite Google e autorize o domínio real da aplicação Vercel. Teste com indicabrasiloficiall@gmail.com, proprietário definido no sistema. Domínios de preview diferentes precisam de autorização explícita.

Antes de publicar regras, confirme a edição e o banco com npx -y firebase-tools@latest firestore:databases:list --project gen-lang-client-0704234685. As regras Firestore existentes foram preservadas e auditadas em AUDITORIA.json. As regras Storage propostas limitam uploads ao proprietário autenticado, imagens PNG/JPEG/WebP e 10 MB. Após revisar e validar em emulador, publique com npx -y firebase-tools@latest deploy --only storage --project gen-lang-client-0704234685.

## Correções locais

- API exige token Firebase válido e e-mail verificado do proprietário; o e-mail do corpo não concede acesso.
- Configuração Vercel para SPA e API Express, sem abrir porta durante execução serverless.
- Upload persistente pelo Firebase Storage; falhas não gravam base64 no Firestore nem disco efêmero.
- Imagens demonstrativas em public/assets/images para funcionar no build.
- Status Gemini não faz chamadas pagas automáticas; teste ao vivo permanece explícito.
- Conflito esbuild/Vite corrigido; scripts compatíveis com Windows.

## Limites e pendências

A publicação não está confirmada. O conector GitHub disponível possui pull=true e push=false. Não foram confirmados acesso administrativo Firebase, autenticação Vercel ou chave Gemini. Nunca enviar segredos pelo chat.
O limite de corpo da API é 4 MB. Imagens maiores precisam de upload direto para Storage e fluxo de edição por referência (ainda não implementado). Resultados base64 grandes também podem exceder o limite de resposta da Vercel. Bloqueio de concorrência atual é local à instância, não distribuído.
Login real, regras em emulador e geração Gemini precisam de validação com as contas do projeto. URLs /src/assets antigas já persistidas em documentos podem exigir migração.

## Validação local registrada

TypeScript e teste da API aprovados. Build de produção aprovado com aviso de bundle acima de 500 kB. npm audit final: zero vulnerabilidades conhecidas após atualização Firebase Admin e override compatível de gRPC. Uma repetição do build em dist encontrou EPERM do Windows ao limpar a saída; o primeiro build completo passou, e uma tentativa em pasta alternativa foi interrompida após não concluir.

Documentação utilizada: https://vercel.com/docs/frameworks/backend/express e https://firebase.google.com/docs/auth/admin/verify-id-tokens e https://ai.google.dev/gemini-api/docs/image-generation .
