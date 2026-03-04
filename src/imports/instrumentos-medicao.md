Você é um especialista em UX para SaaS B2B voltado a empresas certificadas ISO 9001.

Crie o MÓDULO DE INSTRUMENTOS DE MEDIÇÃO para um sistema de gestão (SaaS).

O módulo deve atender ao item 7.1.5 da ISO 9001:2015.
Foco: controle, rastreabilidade, validade e evidências documentadas.
Evitar complexidade e excesso de campos.
Incluir:
- Calibração externa (quando aplicável)
- Verificação interna (quando aplicável)
- Biblioteca de Padrões (somente cadastro básico + certificado com visualização)

OBJETIVO:
Garantir que instrumentos estejam identificados, controlados e com validade ativa.
Permitir verificação interna usando um padrão com certificado arquivado em local único, sem duplicar uploads.

========================================================
1) MENU / NAVEGAÇÃO DO MÓDULO

O módulo deve ter 2 áreas:

A) Instrumentos
B) Biblioteca de Padrões

========================================================
2) ÁREA A – INSTRUMENTOS

2.1) Tela principal – Listagem de Instrumentos

Tabela com colunas:
- Código
- Descrição
- Processo vinculado
- Tipo de controle (Calibração / Verificação Interna / Não aplicável)
- Criticidade (Alta / Média / Baixa)
- Próxima validade (próxima calibração ou próxima verificação)
- Status visual:
   Verde = válido
   Amarelo = vence em 30 dias
   Vermelho = vencido
   Cinza = bloqueado
- Responsável

Filtros:
- Processo
- Tipo de controle
- Criticidade
- Status

Ações na listagem:
- Novo instrumento
- Abrir detalhes
- Bloquear / Desbloquear (com justificativa)
- Exportar lista (opcional)

--------------------------------------------------------
2.2) Cadastro do Instrumento (Detalhe)

BLOCO 1 – Identificação (somente o necessário)
- Código
- Descrição
- Fabricante (opcional)
- Modelo (opcional)
- Nº de série (opcional)
- Localização
- Processo vinculado
- Departamento
- Responsável
- Criticidade (Alta / Média / Baixa)

BLOCO 2 – Tipo de Controle (obrigatório)
Campo:
Tipo de controle:
  ( ) Calibração externa
  ( ) Verificação interna
  ( ) Não aplicável

Se “Não aplicável”, exigir justificativa em texto.

BLOCO 3 – Dados técnicos (enxuto)
- Unidade (opcional)
- Observações técnicas (opcional)

Abas condicionais:
- Se Calibração externa: mostrar aba “Calibração”
- Se Verificação interna: mostrar aba “Verificação Interna”
- Se Não aplicável: ocultar as duas abas

--------------------------------------------------------
2.3) Aba – Calibração Externa (quando aplicável)

Campos:
- Periodicidade (meses)
- Última calibração (data)
- Próxima calibração (calculada automaticamente)
- Nº do certificado
- Resultado (Aprovado / Reprovado)
- Upload do certificado (PDF)

REQUISITO DE UX:
Após upload, permitir VISUALIZAÇÃO EM TELA (preview embutido) sem baixar.
Ter botão opcional de download.

Regras:
- Alerta 30 dias antes do vencimento.
- Se vencido: status automático BLOQUEADO.
- Se reprovado: status BLOQUEADO e sugerir abertura de ação corretiva (botão/link).
- Histórico obrigatório de calibrações.

--------------------------------------------------------
2.4) Aba – Verificação Interna (quando aplicável)

Objetivo:
Controlar instrumentos que não recebem calibração externa, usando um PADRÃO da Biblioteca.

BLOCO 4.1 – Configuração da Verificação
- Periodicidade da verificação (meses)
- Padrão utilizado (selecionar da Biblioteca de Padrões)
- Tolerância aceitável de verificação (ex.: ±1 mm)
- Próxima verificação (automática)

Quando selecionar o padrão:
Mostrar automaticamente (somente leitura):
- Código do padrão
- Nº do certificado do padrão
- Validade do padrão
- Status do padrão (Válido/Vencido)

BLOCO 4.2 – Nova Verificação (registro)
Ao clicar “Nova verificação”, abrir formulário:

- Data
- Padrão utilizado (já preenchido)
- Medição/checagem (campos simples):
   - Ponto/trecho verificado (opcional)
   - Valor padrão (opcional)
   - Valor encontrado (opcional)
   - Desvio (se houver valores, calcular automaticamente)
- Resultado:
   ( ) Conforme
   ( ) Não conforme
- Observação
- Anexo opcional (foto/arquivo)

Regras:
- Se padrão estiver VENCIDO, bloquear o registro de verificação e orientar a atualizar o padrão.
- Se verificação vencida: instrumento BLOQUEADO automaticamente.
- Se resultado “Não conforme”: instrumento BLOQUEADO automaticamente e sugerir ação corretiva.

--------------------------------------------------------
2.5) Histórico completo do Instrumento

Cada instrumento deve ter histórico cronológico de:
- Calibrações (se aplicável)
- Verificações internas (se aplicável)
- Bloqueios / desbloqueios (com justificativa e usuário)
- Ações corretivas vinculadas (apenas referência)

========================================================
3) ÁREA B – BIBLIOTECA DE PADRÕES (ENXUTA)

Objetivo:
Guardar certificados de padrões de referência em local único.
Sem excesso de informações.
Serve apenas para identificação e evidência documental.

3.1) Listagem de Padrões

Tabela com colunas:
- Código do padrão
- Descrição
- Nº do certificado
- Validade
- Status (Válido/Vencido)
- Ação: Visualizar certificado

Filtros:
- Status
- Validade (vence em 30 dias)

--------------------------------------------------------
3.2) Cadastro do Padrão (mínimo)

Campos:
- Código do padrão (obrigatório)
- Descrição (obrigatório)
- Nº do certificado (obrigatório)
- Data da calibração (opcional)
- Validade (obrigatório)
- Upload do certificado (PDF) (obrigatório)

UX obrigatório:
Preview embutido do PDF para visualização rápida sem baixar.
Botão opcional de download.

Regras:
- Alerta 30 dias antes da validade do padrão.
- Se vencido: status VENCIDO.
- Instrumentos que usam padrão vencido devem exibir alerta e não permitir nova verificação até atualização do padrão.

========================================================
4) MINI DASHBOARD DO MÓDULO (simples)

Cards:
- Total de instrumentos
- Instrumentos válidos
- Instrumentos vencidos
- Instrumentos bloqueados
- Instrumentos críticos vencidos
- Padrões vencidos (da biblioteca)
- Padrões vencendo em 30 dias

========================================================
5) REGRAS GERAIS

- Instrumento vencido/bloqueado não pode ser selecionado em registros que dependam de medição (quando houver integração futura).
- Toda ação de bloqueio/desbloqueio exige justificativa e registra usuário/data.
- Validade do instrumento é sempre baseada na última calibração aprovada OU na última verificação interna conforme.

========================================================
6) DESIGN

- Visual corporativo, limpo, consistente com o restante do sistema.
- Ícones discretos, sem poluição.
- Componentes com bordas e espaçamentos padronizados.
- Fluxo rápido: cadastrar, anexar, visualizar, validar.