# Continuação do HYPE CREATOR STUDIO 2.0

Leia este arquivo e `docs/DEPLOY.md` antes de continuar. Repositório: https://github.com/hipecreator20/jairobahia . Produção: https://jairobahia.vercel.app . Preserve Firebase, layout, dados existentes e proteções da `main`. Trabalhe em branch; nunca exponha segredos.

## Entrega desta rodada

Implementei personagens fictícios com DNA visual fixo, prompts de cena encadeados e referência por upload; análise audiovisual com marcações editáveis em milissegundos inseridas na exportação de prompts; carteira de moedas Free/Pro/Premium e cobrança atômica antes de cada geração; pagamento manual e período controlados pela Master no Admin; e upload privado com quota e expiração preparado, mas desativado até Storage estar habilitado. Os preços/quantidades ficam configuráveis no Admin. Valores iniciais: Free 10.000 moedas, Pro R$39,90/1.000.000, Premium R$79,90/3.000.000; geração de texto 1.000, imagem 10.000 e áudio 10.000 moedas. Uma geração de história custa por cena. Pagamento não é processado pelo app.

A Master é autorizada exclusivamente pelo UID validado no servidor `FTqparyG04fCf9eDgUTa6e2tWgp2`; não conceda privilégios por e-mail ou campos do cliente. Firestore Admin SDK acessa coleções privadas de carteira e marcações; não afrouxe as regras.

## Limitações verificadas

Todos os 14 testes locais, TypeScript e build passaram; build alerta bundle JavaScript acima de 500 kB. Nenhuma IA paga, gravação real de pagamento, login Google secundário ou exclusão remota foi acionada nesta rodada. A análise musical é uma estimativa de Gemini; exige revisão manual e não promete lip-sync milimétrico. Arquivos de áudio só são mantidos no navegador durante a sessão; limite 2,5 MB/10 minutos nesta versão.

O projeto Firebase permanece no Spark. Não habilite upload persistente nem prometa 20 GB até o proprietário habilitar Storage/Blaze. A retenção prevista é acesso por 24h para arquivo temporário, ou até vencer o plano pago; exclusão física por cron diário é eventual e exige `CRON_SECRET`. A flag `MEDIA_UPLOADS_ENABLED` deve permanecer desligada até confirmação de bucket e custo. Não altere plano Firebase nem habilite cobrança sem autorização específica e limite de gasto.

## GitHub, Preview e produção

Branch de trabalho `codex/story-continuity-reference`, derivada de `codex/admin-content-polish`; PR incremental deve apontar para a branch anterior (PR #3), cujo PR #1 segue destinado à `main`. Publicação desta rodada foi autorizada pelo proprietário. Registre aqui os SHA, PR, checks, Preview, deployment e SHA confirmado no `/api/health` após concluir. Não afirme publicação antes de verificar. Produção já estava no commit `bb58de790224b485f777d581adf83e492a5759aa` no início desta rodada; PRs seguem sujeitos à revisão independente/proteção normal.

## Próximas ações para concluir

1. Revisar os endpoints e o estado desativado do Storage, rodar `npm run lint`, `npm test` e `npm run build`.
2. Fazer commit e push nesta branch; abrir PR incremental contra `codex/admin-content-polish` e salvar os checks/Preview.
3. Publicar somente a versão validada na Vercel conforme a autorização já dada; verificar alias oficial, `/api/health` com SHA exato, login e endpoints protegidos. Não mesclar nem alterar proteção de `main`.
4. Atualizar `docs/DEPLOY.md` com resultados concretos e este prompt de continuação.
5. Para Storage persistente: solicitar ao proprietário confirmação do upgrade Blaze e teto mensal; verificar bucket, configurar `CRON_SECRET` sem imprimi-lo, depois habilitar Storage e testar com conta controlada. Não executar agora.
6. Próximas validações reais: segunda conta Google aprovada/suspensa, ações do Admin, sincronização de token/claims, geração Gemini com teto de gasto explícito, e exclusão de arquivo temporário/pago. Registrar o que não foi testado.

Antes de qualquer publicação futura, mostrar o que mudou, testes e destino, e pedir autorização do proprietário. A aprovação atual cobre apenas esta rodada.
