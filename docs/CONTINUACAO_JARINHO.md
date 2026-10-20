# Continuação do HYPE CREATOR STUDIO 2.0

Leia este arquivo e `docs/DEPLOY.md` antes de continuar. Repositório: https://github.com/hipecreator20/jairobahia . Produção: https://jairobahia.vercel.app . Preserve Firebase, layout, dados existentes e proteções da `main`. Trabalhe em branch; nunca exponha segredos.

## Gemini API (rodada seguinte)

Branch `codex/gemini-interactions-api` atualiza o código para Gemini Interactions API v1, usa `store:false` e modelo texto padrão `gemini-3.8-flash`; chave atual Vercel foi mantida. Não publique em Production sem pedir autorização específica. Testes sem chamada paga passaram localmente. O screenshot do usuário mostra AI Studio project ID `gen-lang-client-0084582281`, mas nenhum segredo; não confundir com o Firebase atual `gen-lang-client-0704234685`. Para trocar a chave associada àquele projeto, o proprietário deve criar a key em AI Studio e atualizá-la diretamente no segredo Vercel, Preview e Production. Nunca peça/imprima a chave no chat. Veja DEPLOY para registro e próximos passos.

## Entrega desta rodada

Implementei personagens fictícios com DNA visual fixo, prompts de cena encadeados e referência por upload; análise audiovisual com marcações editáveis em milissegundos inseridas na exportação de prompts; carteira de moedas Free/Pro/Premium e cobrança atômica antes de cada geração; pagamento manual e período controlados pela Master no Admin; e upload privado com quota e expiração preparado, mas desativado até Storage estar habilitado. Os preços/quantidades ficam configuráveis no Admin. Valores iniciais: Free 10.000 moedas, Pro R$39,90/1.000.000, Premium R$79,90/3.000.000; geração de texto 1.000, imagem 10.000 e áudio 10.000 moedas. Uma geração de história custa por cena. Pagamento não é processado pelo app.

A Master é autorizada exclusivamente pelo UID validado no servidor `FTqparyG04fCf9eDgUTa6e2tWgp2`; não conceda privilégios por e-mail ou campos do cliente. Firestore Admin SDK acessa coleções privadas de carteira e marcações; não afrouxe as regras.

## Limitações verificadas

Todos os 14 testes locais, TypeScript e build passaram; build alerta bundle JavaScript acima de 500 kB. Nenhuma IA paga, gravação real de pagamento, login Google secundário ou exclusão remota foi acionada nesta rodada. A análise musical é uma estimativa de Gemini; exige revisão manual e não promete lip-sync milimétrico. Arquivos de áudio só são mantidos no navegador durante a sessão; limite 2,5 MB/10 minutos nesta versão.

O projeto Firebase permanece no Spark. Não habilite upload persistente nem prometa 20 GB até o proprietário habilitar Storage/Blaze. A retenção prevista é acesso por 24h para arquivo temporário, ou até vencer o plano pago; exclusão física por cron diário é eventual e exige `CRON_SECRET`. A flag `MEDIA_UPLOADS_ENABLED` deve permanecer desligada até confirmação de bucket e custo. Não altere plano Firebase nem habilite cobrança sem autorização específica e limite de gasto.

## GitHub, Preview e produção

Branch de trabalho `codex/story-continuity-reference`, commit de código `b6bcab72b170a6b21050cac63ff356c0de012cc7`; PR #4 https://github.com/hipecreator20/jairobahia/pull/4 , base PR #3 (`codex/admin-content-polish`), que segue empilhado sobre PR #1/main. PR #4 teve 4/4 checks verdes. Produção foi publicada pela Vercel: deployment `dpl_7xptdmEtRn4knXkM6HjviDwQV8Y2`, READY, https://jairobahia.vercel.app; `/api/health` confirmou o SHA. Páginas principais 200; APIs billing/análise de áudio sem login 401. PRs continuam sujeitos à revisão independente/proteção normal.

## Próximas ações para concluir

1. Verificar o novo commit de documentação nesta branch e manter o relatório de implantação atualizado.
2. Não mesclar PR #4/#3/#1 nem alterar a proteção de `main`; falta revisão independente do PR principal.
3. Próximas validações reais: segunda conta Google aprovada/suspensa, ações do Admin, sincronização de token/claims, geração Gemini com teto de gasto explícito. Não registrar pagamentos/gerar conteúdo com IA real sem combinar teto.
4. Para Storage persistente: pedir confirmação específica do upgrade Blaze e teto mensal; só depois verificar bucket, configurar `CRON_SECRET` sem imprimi-lo, habilitar flag e testar com conta controlada. Upload persistente e cota de 20 GB ainda não estão ativos.

Antes de qualquer publicação futura, mostrar o que mudou, testes e destino, e pedir autorização do proprietário. A aprovação atual cobre apenas esta rodada.
