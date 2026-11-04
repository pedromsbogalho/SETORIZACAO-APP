# TODO

## Objetivo
Aplicar mudanças pedidas pelo usuário no projeto SETORIZACAO-APP.

## Checklist de implementação
- [x] Remover opção de mudar tema (dark/light) do App.

- [x] Garantir que alterações feitas em uma tela reflitam em todas as outras.


- [x] Quando editar a Estrutura JC (ex.: responsavel do setor/AM), atualizar automaticamente o campo exibido na lista de membros (coluna SETOR/AM) e também refletir na navegação/relatórios.

- [x] Quando apagar um responsável (AM) da Estrutura JC, também atualizar/aplicar impacto nos membros relacionados.

- [x] Rodar `npm run build` e `npm run dev` (ou `npm run lint`) para validar.
- [x] Mostrar o setor no card da pessoa na lista de aniversariantes (já implementado — badge + linha "Setor:")

## Notas
- O VSCode está sem `ripgrep`, então inspeção/edição deve ser feita lendo arquivos específicos.
- A correção de “tudo influencia outra tela” deve ser feita no nível de estado/sincronização entre `structure` e `people` (provável: re-enrich/normalizar `people` com base na `structure`).

