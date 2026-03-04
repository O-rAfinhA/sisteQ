# Componentes KPI

## Estrutura

### ModalKPI.tsx
Modal para criação e edição de indicadores.

**Props:**
- `open`: boolean - controla se o modal está aberto
- `onClose`: função - callback para fechar o modal
- `indicador`: Indicador | null - indicador sendo editado (null para novo)
- `onSave`: função - callback ao salvar o indicador

**Blocos do Formulário:**
1. **Identificação**: Dados básicos do indicador
2. **Estrutura Técnica**: Configurações de cálculo e medição
3. **Meta e Critério**: Definição de metas e limites
4. **Resultado**: Lançamento de resultados

### DrawerKPI.tsx
Drawer lateral para visualização detalhada do indicador.

**Props:**
- `open`: boolean - controla se o drawer está aberto
- `onClose`: função - callback para fechar o drawer
- `indicador`: Indicador | null - indicador sendo visualizado
- `onEdit`: função - callback para editar o indicador
- `calcularStatus`: função - função para calcular o status do indicador

**Seções:**
- Cards de destaque (Meta, Resultado, Acumulado)
- Gráfico de evolução (Recharts)
- Informações completas
- Análise crítica
- Histórico de resultados
- Alerta para indicadores fora da meta

## Personalização

### Cores de Status
```typescript
const getStatusColor = (status: StatusIndicador): string => {
  switch (status) {
    case 'Dentro da Meta': return 'bg-green-100 text-green-700 border-green-200';
    case 'Atenção': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'Fora da Meta': return 'bg-red-100 text-red-700 border-red-200';
  }
};
```

### Ícones de Tendência
- **Crescente**: TrendingUp (verde)
- **Decrescente**: TrendingDown (vermelho)
- **Estável**: Minus (azul)

## Dependências

- lucide-react: ícones
- recharts: gráficos
- ../ui/button: botões
- ../ui/badge: badges de status
- ../../hooks/useProcessos: integração com processos
- ../../types/kpi: tipos TypeScript
