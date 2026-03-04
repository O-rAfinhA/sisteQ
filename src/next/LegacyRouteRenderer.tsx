import { useMemo } from 'react'
import { Toaster } from 'sonner'
import { RouterCompatProvider } from '@/router'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'
import RootLayout from '@/app/components/RootLayout'

import DirecionamentoEstrategico from '@/app/pages/DirecionamentoEstrategico'
import CenarioOrganizacional from '@/app/pages/CenarioOrganizacional'
import AnaliseSwot from '@/app/pages/AnaliseSwot'
import PartesInteressadas from '@/app/pages/PartesInteressadas'
import ObjetivosEstrategicos from '@/app/pages/ObjetivosEstrategicos'
import PlanoAcaoEstrategicoPage from '@/app/pages/PlanoAcaoEstrategico'
import TarefasConsolidadasPage from '@/app/pages/TarefasConsolidadas'
import { AnaliseCritica } from '@/app/pages/AnaliseCritica'
import PlanoAcaoCorretiva from '@/app/pages/PlanoAcaoCorretiva'
import TarefasGlobaisConsolidadas from '@/app/pages/TarefasGlobaisConsolidadas'

import DocumentoVisualizacao from '@/app/pages/DocumentoVisualizacao'
import DocumentosInternos from '@/app/pages/DocumentosInternos'
import DocumentosClientesNovo from '@/app/pages/DocumentosClientesNovo'
import DocumentosExternosNovo from '@/app/pages/DocumentosExternosNovo'
import DocumentosLicencas from '@/app/pages/DocumentosLicencas'
import DocumentosCertidoes from '@/app/pages/DocumentosCertidoes'
import DashboardDocumentos from '@/app/pages/DashboardDocumentos'
import DocumentoInternoEditor from '@/app/pages/DocumentoInternoEditor'
import DocumentoClienteEditor from '@/app/pages/DocumentoClienteEditor'
import DocumentoExternoEditor from '@/app/pages/DocumentoExternoEditor'
import DocumentoLicencaEditor from '@/app/pages/DocumentoLicencaEditor'
import DocumentoCertidaoEditor from '@/app/pages/DocumentoCertidaoEditor'

import RecursosHumanos from '@/app/pages/RecursosHumanos'
import { Colaboradores } from '@/app/pages/Colaboradores'
import { DescricaoFuncoes } from '@/app/pages/DescricaoFuncoes'
import { IntegracaoColaboradores } from '@/app/pages/IntegracaoColaboradores'
import { AvaliacaoExperiencia } from '@/app/pages/AvaliacaoExperiencia'
import { AvaliacaoDesempenho } from '@/app/pages/AvaliacaoDesempenho'
import { DashboardPessoas } from '@/app/pages/DashboardPessoas'
import { MatrizQualificacao } from '@/app/pages/MatrizQualificacao'
import PlanoQualificacao from '@/app/pages/PlanoQualificacao'

import { RiscosDashboard } from '@/app/pages/gestao-riscos/Dashboard'
import { RiscosRegistro } from '@/app/pages/gestao-riscos/Registro'
import { RiscosMatriz } from '@/app/pages/gestao-riscos/Matriz'
import { RiscosTratamento } from '@/app/pages/gestao-riscos/Tratamento'
import { RiscosHistorico } from '@/app/pages/gestao-riscos/Historico'

import { FornecedoresDashboard } from '@/app/pages/fornecedores/Dashboard'
import { FornecedorCadastro } from '@/app/pages/fornecedores/Cadastro'
import { FornecedorHomologacao } from '@/app/pages/fornecedores/Homologacao'
import { HomologacaoLista } from '@/app/pages/fornecedores/HomologacaoLista'
import { FornecedorAvaliacoes } from '@/app/pages/fornecedores/Avaliacoes'
import { FornecedorROF } from '@/app/pages/fornecedores/ROF'
import { FornecedorRanking } from '@/app/pages/fornecedores/Ranking'
import { FornecedorConfiguracoes } from '@/app/pages/fornecedores/Configuracoes'
import { FornecedorVisualizar } from '@/app/pages/fornecedores/Visualizar'
import { FornecedorRecebimento } from '@/app/pages/fornecedores/Recebimento'
import { PedidoCompras } from '@/app/pages/fornecedores/PedidoCompras'

import { PlanoComunicacao } from '@/app/pages/PlanoComunicacao'
import Processos from '@/app/pages/Processos'
import MapaProcessos from '@/app/pages/MapaProcessos'
import MapaProcessoVisualizar from '@/app/pages/MapaProcessoVisualizar'
import RelatoriosProcessos from '@/app/pages/RelatoriosProcessos'
import ProcessoDetalhes from '@/app/pages/ProcessoDetalhes'
import NovoProcesso from '@/app/pages/NovoProcesso'

import InstrumentosMedicao from '@/app/pages/InstrumentosMedicao'
import { InstrumentosDashboard } from '@/app/pages/instrumentos/Dashboard'
import { InstrumentosPadroes } from '@/app/pages/instrumentos/Padroes'
import { InstrumentosCalendario } from '@/app/pages/instrumentos/Calendario'
import TiposInstrumentos from '@/app/pages/TiposInstrumentos'

import { ManutencaoDashboard } from '@/app/pages/manutencao/Dashboard'
import { ManutencaoEquipamentos } from '@/app/pages/manutencao/Equipamentos'
import { ManutencaoPlano } from '@/app/pages/manutencao/PlanoManutencao'
import { ManutencaoOS } from '@/app/pages/manutencao/OrdensServico'
import { ManutencaoCorretivas } from '@/app/pages/manutencao/Corretivas'
import { ManutencaoHistorico } from '@/app/pages/manutencao/HistoricoEquipamentos'
import { ManutencaoIndicadores } from '@/app/pages/manutencao/Indicadores'
import { ManutencaoAgenda } from '@/app/pages/manutencao/AgendaManutencao'
import { ManutencaoConfiguracao } from '@/app/pages/manutencao/ConfiguracaoManutencao'

import { KPI } from '@/app/pages/KPI'
import { MatrizKPI } from '@/app/pages/MatrizKPI'

import { Usuarios } from '@/app/pages/config/Usuarios'
import { Departamentos } from '@/app/pages/config/Departamentos'
import { Funcoes } from '@/app/pages/config/Funcoes'
import { TiposDocumentos } from '@/app/pages/config/TiposDocumentos'

import DesignSystemV2 from '@/app/pages/DesignSystemV2'
import LayoutBaseV2 from '@/app/pages/LayoutBaseV2'
import { Perfil } from '@/app/pages/Perfil'
import Login from '@/app/pages/Login'

import { NotFound } from '@/app/components/NotFound'

type SearchParams = Record<string, string | string[] | undefined>

function toSearchString(searchParams: SearchParams) {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'undefined') continue
    if (Array.isArray(value)) {
      for (const v of value) sp.append(key, v)
      continue
    }
    sp.set(key, value)
  }
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

export function LegacyRouteRenderer({
  routeKey,
  params,
  pathname,
  searchParams,
}: {
  routeKey: string
  params: Record<string, string>
  pathname: string
  searchParams: SearchParams
}) {
  const search = useMemo(() => toSearchString(searchParams), [searchParams])

  const routeElement = useMemo(() => {
    switch (routeKey) {
      case 'DirecionamentoEstrategico':
        return <DirecionamentoEstrategico />
      case 'CenarioOrganizacional':
        return <CenarioOrganizacional />
      case 'PartesInteressadas':
        return <PartesInteressadas />
      case 'AnaliseSwot':
        return <AnaliseSwot />
      case 'ObjetivosEstrategicos':
        return <ObjetivosEstrategicos />
      case 'PlanoComunicacao':
        return <PlanoComunicacao />
      case 'PlanoAcaoEstrategico':
        return <PlanoAcaoEstrategicoPage />
      case 'TarefasConsolidadas':
        return <TarefasConsolidadasPage />
      case 'AnaliseCritica':
        return <AnaliseCritica />

      case 'RiscosDashboard':
        return <RiscosDashboard />
      case 'RiscosRegistro':
        return <RiscosRegistro />
      case 'RiscosMatriz':
        return <RiscosMatriz />
      case 'RiscosTratamento':
        return <RiscosTratamento />
      case 'RiscosHistorico':
        return <RiscosHistorico />

      case 'PlanoAcaoCorretiva':
        return <PlanoAcaoCorretiva />
      case 'TarefasGlobaisConsolidadas':
        return <TarefasGlobaisConsolidadas />

      case 'DashboardDocumentos':
        return <DashboardDocumentos />
      case 'DocumentosInternos':
        return <DocumentosInternos />
      case 'DocumentosClientesNovo':
        return <DocumentosClientesNovo />
      case 'DocumentosExternosNovo':
        return <DocumentosExternosNovo />
      case 'DocumentosLicencas':
        return <DocumentosLicencas />
      case 'DocumentosCertidoes':
        return <DocumentosCertidoes />
      case 'DocumentoInternoEditor':
        return <DocumentoInternoEditor />
      case 'DocumentoClienteEditor':
        return <DocumentoClienteEditor />
      case 'DocumentoExternoEditor':
        return <DocumentoExternoEditor />
      case 'DocumentoLicencaEditor':
        return <DocumentoLicencaEditor />
      case 'DocumentoCertidaoEditor':
        return <DocumentoCertidaoEditor />
      case 'DocumentoVisualizacao':
        return <DocumentoVisualizacao />

      case 'RecursosHumanos':
        return <RecursosHumanos />
      case 'Colaboradores':
        return <Colaboradores />
      case 'DescricaoFuncoes':
        return <DescricaoFuncoes />
      case 'IntegracaoColaboradores':
        return <IntegracaoColaboradores />
      case 'AvaliacaoExperiencia':
        return <AvaliacaoExperiencia />
      case 'AvaliacaoDesempenho':
        return <AvaliacaoDesempenho />
      case 'DashboardPessoas':
        return <DashboardPessoas />
      case 'MatrizQualificacao':
        return <MatrizQualificacao />
      case 'PlanoQualificacao':
        return <PlanoQualificacao />

      case 'FornecedoresDashboard':
        return <FornecedoresDashboard />
      case 'FornecedorCadastro':
        return <FornecedorCadastro />
      case 'HomologacaoLista':
        return <HomologacaoLista />
      case 'FornecedorHomologacao':
        return <FornecedorHomologacao />
      case 'FornecedorAvaliacoes':
        return <FornecedorAvaliacoes />
      case 'FornecedorROF':
        return <FornecedorROF />
      case 'FornecedorRecebimento':
        return <FornecedorRecebimento />
      case 'PedidoCompras':
        return <PedidoCompras />
      case 'FornecedorRanking':
        return <FornecedorRanking />
      case 'FornecedorConfiguracoes':
        return <FornecedorConfiguracoes />
      case 'FornecedorVisualizar':
        return <FornecedorVisualizar />

      case 'KPI':
        return <KPI />
      case 'MatrizKPI':
        return <MatrizKPI />

      case 'InstrumentosDashboard':
        return <InstrumentosDashboard />
      case 'InstrumentosMedicao':
        return <InstrumentosMedicao />
      case 'InstrumentosPadroes':
        return <InstrumentosPadroes />
      case 'TiposInstrumentos':
        return <TiposInstrumentos />
      case 'InstrumentosCalendario':
        return <InstrumentosCalendario />

      case 'ManutencaoDashboard':
        return <ManutencaoDashboard />
      case 'ManutencaoEquipamentos':
        return <ManutencaoEquipamentos />
      case 'ManutencaoPlano':
        return <ManutencaoPlano />
      case 'ManutencaoOS':
        return <ManutencaoOS />
      case 'ManutencaoCorretivas':
        return <ManutencaoCorretivas />
      case 'ManutencaoHistorico':
        return <ManutencaoHistorico />
      case 'ManutencaoIndicadores':
        return <ManutencaoIndicadores />
      case 'ManutencaoAgenda':
        return <ManutencaoAgenda />
      case 'ManutencaoConfiguracao':
        return <ManutencaoConfiguracao />

      case 'Processos':
        return <Processos />
      case 'NovoProcesso':
        return <NovoProcesso />
      case 'MapaProcessos':
        return <MapaProcessos />
      case 'MapaProcessoVisualizar':
        return <MapaProcessoVisualizar />
      case 'RelatoriosProcessos':
        return <RelatoriosProcessos />
      case 'ProcessoDetalhes':
        return <ProcessoDetalhes />

      case 'Usuarios':
        return <Usuarios />
      case 'Departamentos':
        return <Departamentos />
      case 'Funcoes':
        return <Funcoes />
      case 'TiposDocumentos':
        return <TiposDocumentos />

      case 'DesignSystemV2':
        return <DesignSystemV2 />
      case 'LayoutBaseV2':
        return <LayoutBaseV2 />
      case 'Perfil':
        return <Perfil />
      case 'Login':
        return <Login />

      default:
        return <NotFound />
    }
  }, [routeKey])

  const useRootLayout = routeKey !== 'Login'

  return (
    <RouterCompatProvider pathname={pathname} search={search} params={params}>
      <ErrorBoundary>
        {useRootLayout ? <RootLayout>{routeElement}</RootLayout> : routeElement}
        <Toaster position="top-right" />
      </ErrorBoundary>
    </RouterCompatProvider>
  )
}
