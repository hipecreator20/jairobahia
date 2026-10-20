# Autorização de publicação

Regra solicitada pelo proprietário em 20/10/2026:

- Antes de qualquer deploy/publicação, apresentar as alterações, os resultados reais dos testes e o destino (Preview ou Production) e pedir autorização explícita ao proprietário.
- A aprovação vale somente para a publicação apresentada; não autoriza publicações futuras.
- Pode preparar, editar, testar e fazer commits locais dentro do escopo autorizado.
- Nesta integração, push em branch dispara Preview automaticamente. Pedir autorização antes desse push também. Não alterar a integração Git para contornar esta regra.
- Não fazer merge em main ou promover produção sem aprovação explícita correspondente. Preservar proteções, dados e segredos.
- Documentar commits, testes, estado de produção e pendências em docs/DEPLOY.md e no resumo de retorno, sem credenciais.
- Antes de encerrar a sessão ou chegar ao limite de contexto/tokens, produzir um PROMPT DE CONTINUAÇÃO PARA A OUTRA CONTA (Jairinho), pronto para copiar. Incluir objetivo, repositório, branches/commits/PRs, alterações, testes e limitações reais, URL/SHA efetivamente em produção, pendências em ordem e autorizações. Não pressupor sincronização de chats nem incluir segredos. Salvar também a continuidade no GitHub quando o push estiver autorizado.
