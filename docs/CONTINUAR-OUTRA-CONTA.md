# PROMPT DE CONTINUAÇÃO PARA A OUTRA CONTA (Jairinho)

Continue o HYPE CREATOR STUDIO 2.0 no mesmo GitHub: https://github.com/hipecreator20/jairobahia . Sincronize o remoto, leia AGENTS.md e docs/DEPLOY.md antes de editar, preserve trabalho existente e use alterações pequenas. O histórico de chats não se sincroniza entre contas.

## Regra do proprietário

Antes de **cada deploy**, apresente alterações, resultados reais dos testes e destino, e pergunte se pode publicar. Push gera Preview e também exige aprovação. O push da rodada de acesso/Admin/prompts foi autorizado por voz. O proprietário quer atualizar o domínio oficial, mas a publicação final será apresentada para aprovação específica após o Preview. Não herdar aprovação para outra rodada. Não desativar proteção ou integração. Antes de encerrar ou esgotar contexto, atualize este prompt e entregue resumo copiável.

## Estado e referências

- Branch de trabalho: `codex/admin-plan-backend`.
- PR incremental: https://github.com/hipecreator20/jairobahia/pull/2 ; base `codex/automatic-deploy-pipeline`.
- PR original continua em rascunho: https://github.com/hipecreator20/jairobahia/pull/1 ; base main. Não houve merge.
- Commits já enviados antes desta rodada: `90c7cf9` (troca de plano pelo backend Master), `361dc4a` (resultados de segurança), `5745f3c` (ordem da aprovação e renovação do token). Consulte o HEAD remoto e os checks para obter o commit final desta rodada; não suponha que o SHA deste documento seja o último código validado.
- Produção confirmada em https://jairobahia.vercel.app/api/health: `53c24f6e3273e97ba16bf0b0cd27767dc163cacc`. Reconfirme antes de relatar publicação nova.
- Firebase existente: projeto `gen-lang-client-0704234685`, banco `ai-studio-23b8da44-a156-4670-8dcd-03a6cf972fab`. Master somente pelo UID validado no servidor: `FTqparyG04fCf9eDgUTa6e2tWgp2`. Nunca confiar apenas no e-mail ou perfil do cliente.
- Segredos Gemini e Firebase Admin já existem em Preview e Production. Não imprimir nem pedir os valores sem necessidade comprovada. Pagamentos desativados. Free 10, Pro 300 e Premium 1000 prompts/mês; preços R$39,90 e R$79,90.

## Alterações desta rodada

Removidos cinco bloqueios legados por e-mail que impediam usuários aprovados de usar IA; mantidos token, aprovação e cotas. Admin com status claro, progresso e sucesso/erro; Master protegido. Removida recriação automática de exemplos quando listas ficam vazias; feedback de exclusão no Dashboard/Biblioteca. Prompt Lab usa Gemini com instrução de sistema, esquema e validação, histórico próprio de 12 prompts, bloqueio de semelhança lexical e fingerprints exatos em transação. Sem retry pago automático. Sem promessa comprovada de “melhores do mercado” ou originalidade semântica absoluta. Histórico novo usa coleções privadas; regras e dados existentes preservados.

## Testes e limites

TypeScript e seis testes locais passaram nesta rodada. Incluem cinco rotas de IA com segunda conta simulada, pending bloqueado e cota mensal bloqueada; sem Firebase remoto ou IA paga. Antes desta rodada, 15 verificações Firestore/Storage passaram no emulador demo; isso não publica Storage. CI de `90c7cf9` passou com build Linux e smoke Preview. Build Windows anterior ficou sem conclusão e foi interrompido, sem contar como aprovado. Verifique o CI/Preview do HEAD novo antes de declarar sucesso. Não foi feita geração paga para avaliar qualidade, nem fluxo Google completo ou inspeção autenticada do novo Admin.

## Próximos passos

1. Conferir SHA/checks/Preview do HEAD remoto e atualizar o registro de resultados reais.
2. Validar segunda conta real: cadastro pending, aprovação pelo Master, novo token, acesso e suspensão. O usuário já relatou falha antes destas correções; não chamar isso de resolvido sem verificar.
3. Inspecionar visualmente o Admin e executar exclusões controladas autorizadas; não excluir dados reais do usuário como teste. Revisar também cenas vinculadas a histórias e feedback de erros.
4. Avaliar uma geração Gemini real com gasto combinado e checar qualidade/diversidade/cotas, sem retries automáticos. Qualidade exige evidência, não promessa de marketing.
5. Apresentar escopo/testes/destino e pedir aprovação para produção. Preservar revisão/merge do PR original e alinhar Git/produção sem desativar proteções. Não marcar o projeto pronto enquanto esses fluxos estiverem pendentes.
6. Storage depende de Blaze, ainda sem upgrade ou regras publicadas; App Check não ativado. Essas mudanças exigem autorização própria.

Ao terminar, faça commit/push quando autorizado e produza novo resumo para continuidade com branch, commits, PRs, testes, URL/SHA realmente publicados, pendências e autorizações. Nunca incluir credenciais.
