# Hype Creator Studio — Firebase + Vercel

Repositório permanente: https://github.com/hipecreator20/jairobahia.git
Espaço Vercel informado: https://vercel.com/mhrsuporteti-5479

## Execução

Node >= 22.12.0. Execute npm ci, copie .env.example para .env, preencha GEMINI_API_KEY e execute npm run dev.
Validação: npm run lint, npm run build, npm test.

## Implantação

Importe o repositório no espaço Vercel informado, usando framework Other, build npm run build e saída dist. vercel.json encaminha /api para Express e as páginas para a SPA. Configure GEMINI_API_KEY apenas no servidor; os modelos são configuráveis por GEMINI_TEXT_MODEL e GEMINI_IMAGE_MODEL. Não use prefixo VITE_ para segredos.

O Firebase público está em firebase-applet-config.json. Projeto: gen-lang-client-0704234685; banco: ai-studio-23b8da44-a156-4670-8dcd-03a6cf972fab. Para aprovação de usuários e cotas no servidor, configure FIREBASE_SERVICE_ACCOUNT_JSON como segredo da Vercel (Preview e Production). Nunca coloque esse JSON em VITE_ nem no Git.

No Firebase Authentication, habilite Google e autorize o domínio real da aplicação Vercel. O UID Master confirmado é FTqparyG04fCf9eDgUTa6e2tWgp2. Novos logins Google ficam pendentes até aprovação no painel /admin; apenas esse UID pode aprovar acessos. Configure VITE_FIREBASE_APPCHECK_SITE_KEY e FIREBASE_APP_CHECK_REQUIRED=true depois de registrar o App Check Web no Firebase.

Antes de publicar regras, valide Firestore e Storage no emulador. As regras permitem apenas perfil próprio para usuários, dados de estúdio para aprovados e administração para o UID Master. Storage usa custom claim approved e aceita imagens PNG/JPEG/WebP abaixo de 10 MB. O projeto Firestore usa banco nomeado, então Storage não consulta permissões nele diretamente.

## Correções locais

- API exige token Firebase válido, status aprovado e cota mensal transacional; o e-mail do corpo não concede acesso.
- Configuração Vercel para SPA e API Express, sem abrir porta durante execução serverless.
- Upload persistente pelo Firebase Storage; falhas não gravam base64 no Firestore nem disco efêmero.
- Imagens demonstrativas em public/assets/images para funcionar no build.
- Status Gemini não faz chamadas pagas automáticas; teste ao vivo permanece explícito.
- Conflito esbuild/Vite corrigido; scripts compatíveis com Windows.

## Limites e pendências

A publicação de produção depende de revisão e merge do PR. FIREBASE_SERVICE_ACCOUNT_JSON e GEMINI_API_KEY ainda precisam ser configurados na Vercel. Nunca enviar segredos pelo chat.
O limite de corpo da API é 4 MB. Imagens maiores precisam de upload direto para Storage e fluxo de edição por referência (ainda não implementado). Resultados base64 grandes também podem exceder o limite de resposta da Vercel. Bloqueio de concorrência atual é local à instância, não distribuído.
Login real, regras em emulador e geração Gemini precisam de validação com as contas do projeto. URLs /src/assets antigas já persistidas em documentos podem exigir migração.

## Validação local registrada

TypeScript, dois testes e build em diretório local isolado aprovados; bundle acima de 500 kB. As regras Firebase ainda precisam de validação no emulador antes da implantação.

Documentação utilizada: https://vercel.com/docs/frameworks/backend/express e https://firebase.google.com/docs/auth/admin/verify-id-tokens e https://ai.google.dev/gemini-api/docs/image-generation .

## Publicação com revisão

Fluxo e estado remoto em docs/DEPLOY.md. A branch main exige aprovação e checks validate/preview-smoke. A Vercel precisa estar vinculada ao repositório existente; nenhum projeto ou domínio novo foi criado.
