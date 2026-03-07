import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { LegacyRouteRenderer } from '../src/next/LegacyRouteRenderer'
import { AuthError, requireAuthFromRequest } from '@/server/profile'

type SearchParams = Record<string, string | string[] | undefined>

type MatchResult = {
  routeKey: string
  params: Record<string, string>
}

function parseCompanyPath(pathname: string): { companyId: string | null; innerPathname: string } {
  const m = /^\/empresa\/([^/]+)(\/.*)?$/.exec(pathname)
  if (!m) return { companyId: null, innerPathname: pathname }
  const companyId = decodeURIComponent(m[1] || '').trim()
  const innerPathname = m[2] ? String(m[2]) : '/'
  return { companyId: companyId || null, innerPathname }
}

function buildCompanyPath(companyId: string | null, innerPathname: string) {
  if (!companyId) return innerPathname
  const base = `/empresa/${encodeURIComponent(companyId)}`
  return innerPathname === '/' ? base : `${base}${innerPathname}`
}

const ROUTES: Array<{ pattern: string; routeKey: string }> = [
  { pattern: '/', routeKey: 'Landing' },
  { pattern: '/login', routeKey: 'Login' },
  { pattern: '/gestao-estrategica', routeKey: 'DirecionamentoEstrategico' },
  { pattern: '/gestao-estrategica/cenario', routeKey: 'CenarioOrganizacional' },
  { pattern: '/gestao-estrategica/partes-interessadas', routeKey: 'PartesInteressadas' },
  { pattern: '/gestao-estrategica/swot', routeKey: 'AnaliseSwot' },
  { pattern: '/gestao-estrategica/objetivos', routeKey: 'ObjetivosEstrategicos' },
  { pattern: '/gestao-estrategica/comunicacao', routeKey: 'PlanoComunicacao' },
  { pattern: '/gestao-estrategica/plano-acao', routeKey: 'PlanoAcaoEstrategico' },
  { pattern: '/gestao-estrategica/tarefas', routeKey: 'TarefasConsolidadas' },
  { pattern: '/gestao-estrategica/analise-critica', routeKey: 'AnaliseCritica' },

  { pattern: '/gestao-riscos', routeKey: 'RiscosDashboard' },
  { pattern: '/gestao-riscos/registro', routeKey: 'RiscosRegistro' },
  { pattern: '/gestao-riscos/matriz', routeKey: 'RiscosMatriz' },
  { pattern: '/gestao-riscos/tratamento', routeKey: 'RiscosTratamento' },
  { pattern: '/gestao-riscos/historico', routeKey: 'RiscosHistorico' },

  { pattern: '/acoes-corretivas/plano-acao', routeKey: 'PlanoAcaoCorretiva' },
  { pattern: '/acoes-corretivas/tarefas', routeKey: 'TarefasGlobaisConsolidadas' },

  { pattern: '/documentos/dashboard', routeKey: 'DashboardDocumentos' },
  { pattern: '/documentos/internos', routeKey: 'DocumentosInternos' },
  { pattern: '/documentos/internos/novo', routeKey: 'DocumentoInternoEditor' },
  { pattern: '/documentos/internos/:id', routeKey: 'DocumentoInternoEditor' },
  { pattern: '/documentos/internos/:id/editar', routeKey: 'DocumentoInternoEditor' },
  { pattern: '/documentos/internos/:id/visualizar', routeKey: 'DocumentoVisualizacao' },
  { pattern: '/documentos/clientes', routeKey: 'DocumentosClientesNovo' },
  { pattern: '/documentos/clientes/novo', routeKey: 'DocumentoClienteEditor' },
  { pattern: '/documentos/clientes/:id', routeKey: 'DocumentoClienteEditor' },
  { pattern: '/documentos/clientes/:id/editar', routeKey: 'DocumentoClienteEditor' },
  { pattern: '/documentos/clientes/:id/visualizar', routeKey: 'DocumentoVisualizacao' },
  { pattern: '/documentos/externos', routeKey: 'DocumentosExternosNovo' },
  { pattern: '/documentos/externos/novo', routeKey: 'DocumentoExternoEditor' },
  { pattern: '/documentos/externos/:id', routeKey: 'DocumentoExternoEditor' },
  { pattern: '/documentos/externos/:id/editar', routeKey: 'DocumentoExternoEditor' },
  { pattern: '/documentos/externos/:id/visualizar', routeKey: 'DocumentoVisualizacao' },
  { pattern: '/documentos/licencas', routeKey: 'DocumentosLicencas' },
  { pattern: '/documentos/licencas/novo', routeKey: 'DocumentoLicencaEditor' },
  { pattern: '/documentos/licencas/:id', routeKey: 'DocumentoLicencaEditor' },
  { pattern: '/documentos/licencas/:id/editar', routeKey: 'DocumentoLicencaEditor' },
  { pattern: '/documentos/licencas/:id/visualizar', routeKey: 'DocumentoVisualizacao' },
  { pattern: '/documentos/certidoes', routeKey: 'DocumentosCertidoes' },
  { pattern: '/documentos/certidoes/novo', routeKey: 'DocumentoCertidaoEditor' },
  { pattern: '/documentos/certidoes/:id', routeKey: 'DocumentoCertidaoEditor' },
  { pattern: '/documentos/certidoes/:id/editar', routeKey: 'DocumentoCertidaoEditor' },
  { pattern: '/documentos/certidoes/:id/visualizar', routeKey: 'DocumentoVisualizacao' },
  { pattern: '/documentos/tipos', routeKey: 'TiposDocumentos' },

  { pattern: '/recursos-humanos', routeKey: 'RecursosHumanos' },
  { pattern: '/recursos-humanos/descricao-funcoes', routeKey: 'DescricaoFuncoes' },
  { pattern: '/recursos-humanos/integracao', routeKey: 'IntegracaoColaboradores' },
  { pattern: '/recursos-humanos/avaliacao-experiencia', routeKey: 'AvaliacaoExperiencia' },
  { pattern: '/recursos-humanos/avaliacao-desempenho', routeKey: 'AvaliacaoDesempenho' },
  { pattern: '/recursos-humanos/dashboard', routeKey: 'DashboardPessoas' },
  { pattern: '/recursos-humanos/matriz-qualificacao', routeKey: 'MatrizQualificacao' },
  { pattern: '/recursos-humanos/plano-qualificacao', routeKey: 'PlanoQualificacao' },
  { pattern: '/recursos-humanos/colaboradores', routeKey: 'Colaboradores' },

  { pattern: '/fornecedores', routeKey: 'FornecedoresDashboard' },
  { pattern: '/fornecedores/cadastro', routeKey: 'FornecedorCadastro' },
  { pattern: '/fornecedores/homologacao', routeKey: 'HomologacaoLista' },
  { pattern: '/fornecedores/homologacao/:id', routeKey: 'FornecedorHomologacao' },
  { pattern: '/fornecedores/avaliacoes', routeKey: 'FornecedorAvaliacoes' },
  { pattern: '/fornecedores/rof', routeKey: 'FornecedorROF' },
  { pattern: '/fornecedores/recebimento', routeKey: 'FornecedorRecebimento' },
  { pattern: '/fornecedores/pedidos', routeKey: 'PedidoCompras' },
  { pattern: '/fornecedores/ranking', routeKey: 'FornecedorRanking' },
  { pattern: '/fornecedores/configuracoes', routeKey: 'FornecedorConfiguracoes' },
  { pattern: '/fornecedores/visualizar/:id', routeKey: 'FornecedorVisualizar' },

  { pattern: '/kpi', routeKey: 'KPI' },
  { pattern: '/matriz-kpi', routeKey: 'MatrizKPI' },

  { pattern: '/instrumentos-medicao', routeKey: 'InstrumentosDashboard' },
  { pattern: '/instrumentos-medicao/instrumentos', routeKey: 'InstrumentosMedicao' },
  { pattern: '/instrumentos-medicao/padroes', routeKey: 'InstrumentosPadroes' },
  { pattern: '/instrumentos-medicao/tipos', routeKey: 'TiposInstrumentos' },
  { pattern: '/instrumentos-medicao/calendario', routeKey: 'InstrumentosCalendario' },

  { pattern: '/manutencao', routeKey: 'ManutencaoDashboard' },
  { pattern: '/manutencao/equipamentos', routeKey: 'ManutencaoEquipamentos' },
  { pattern: '/manutencao/plano', routeKey: 'ManutencaoPlano' },
  { pattern: '/manutencao/os', routeKey: 'ManutencaoOS' },
  { pattern: '/manutencao/corretivas', routeKey: 'ManutencaoCorretivas' },
  { pattern: '/manutencao/historico', routeKey: 'ManutencaoHistorico' },
  { pattern: '/manutencao/indicadores', routeKey: 'ManutencaoIndicadores' },
  { pattern: '/manutencao/agenda', routeKey: 'ManutencaoAgenda' },
  { pattern: '/manutencao/configuracao', routeKey: 'ManutencaoConfiguracao' },

  { pattern: '/processos', routeKey: 'Processos' },
  { pattern: '/processos/novo', routeKey: 'NovoProcesso' },
  { pattern: '/processos/mapa', routeKey: 'MapaProcessos' },
  { pattern: '/processos/mapa/:id/visualizar', routeKey: 'MapaProcessoVisualizar' },
  { pattern: '/processos/relatorios', routeKey: 'RelatoriosProcessos' },
  { pattern: '/processos/:id', routeKey: 'ProcessoDetalhes' },

  { pattern: '/perfil', routeKey: 'Perfil' },

  { pattern: '/configuracoes/usuarios', routeKey: 'Usuarios' },
  { pattern: '/configuracoes/departamentos', routeKey: 'Departamentos' },
  { pattern: '/configuracoes/funcoes', routeKey: 'Funcoes' },
  { pattern: '/configuracoes/tipos-documentos', routeKey: 'TiposDocumentos' },

  { pattern: '/design-system', routeKey: 'DesignSystemV2' },
  { pattern: '/layout-base', routeKey: 'LayoutBaseV2' },
]

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

function matchPattern(pattern: string, pathname: string, routeKey: string): MatchResult | null {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)

  if (patternParts.length !== pathParts.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i]
    const pv = pathParts[i]
    if (pp.startsWith(':')) {
      params[pp.slice(1)] = decodeURIComponent(pv)
      continue
    }
    if (pp !== pv) return null
  }

  return { routeKey, params }
}

function resolveRoute(pathname: string): MatchResult {
  for (const route of ROUTES) {
    const match = matchPattern(route.pattern, pathname, route.routeKey)
    if (match) return match
  }
  return { routeKey: 'NotFound', params: {} }
}

function toQueryString(searchParams: SearchParams) {
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

export const getServerSideProps: GetServerSideProps<{
  pathname: string
  routeKey: string
  params: Record<string, string>
  searchParams: SearchParams
}> = async context => {
  const [rawPathname] = context.resolvedUrl.split('?')
  const pathname = normalizePathname(rawPathname || '/')

  const { path: _path, ...queryWithoutPath } = context.query
  const searchParams: SearchParams = queryWithoutPath

  const { companyId, innerPathname: rawInnerPathname } = parseCompanyPath(pathname)
  const innerPathname = normalizePathname(rawInnerPathname || '/')

  if (innerPathname === '/login' && companyId) {
    return {
      redirect: {
        destination: `/login${toQueryString(searchParams)}`,
        permanent: false,
      },
    }
  }

  if (innerPathname === '/plano-acao-corretiva') {
    return {
      redirect: {
        destination: `${buildCompanyPath(companyId, '/acoes-corretivas/plano-acao')}${toQueryString(searchParams)}`,
        permanent: false,
      },
    }
  }

  if (innerPathname === '/plano-acao') {
    return {
      redirect: {
        destination: `${buildCompanyPath(companyId, '/gestao-estrategica/plano-acao')}${toQueryString(searchParams)}`,
        permanent: false,
      },
    }
  }

  const match = resolveRoute(innerPathname)

  const fullPath = `${pathname}${toQueryString(searchParams)}`
  const reqForAuth = { headers: context.req.headers as any, method: 'GET' } as any
  const adminOnlyRouteKeys = new Set([
    'Usuarios',
    'Departamentos',
    'Funcoes',
    'TiposDocumentos',
    'DesignSystemV2',
    'LayoutBaseV2',
  ])

  if (match.routeKey !== 'Login' && match.routeKey !== 'Landing') {
    try {
      const auth = await requireAuthFromRequest(reqForAuth)

      if (auth.mustChangePassword) {
        const wantsPasswordTab =
          match.routeKey === 'Perfil' && typeof searchParams.tab === 'string' && searchParams.tab === 'password'
        if (!wantsPasswordTab) {
          return {
            redirect: {
              destination: `${buildCompanyPath(auth.tenantId, '/perfil')}?tab=password`,
              permanent: false,
            },
          }
        }
      }

      if (adminOnlyRouteKeys.has(match.routeKey) && auth.role !== 'Admin') {
        return {
          redirect: {
            destination: buildCompanyPath(auth.tenantId, '/gestao-estrategica'),
            permanent: false,
          },
        }
      }

      if (!companyId) {
        return {
          redirect: {
            destination: `${buildCompanyPath(auth.tenantId, innerPathname)}${toQueryString(searchParams)}`,
            permanent: false,
          },
        }
      }

      if (companyId !== auth.tenantId) {
        return {
          redirect: {
            destination: `${buildCompanyPath(auth.tenantId, innerPathname)}${toQueryString(searchParams)}`,
            permanent: false,
          },
        }
      }
    } catch (e: any) {
      if (e instanceof AuthError) {
        return {
          redirect: {
            destination: `/login?next=${encodeURIComponent(fullPath)}`,
            permanent: false,
          },
        }
      }
      throw e
    }
  } else if (match.routeKey === 'Login') {
    try {
      const auth = await requireAuthFromRequest(reqForAuth)
      const rawNext = typeof searchParams.next === 'string' ? searchParams.next : '/'
      const safeNext = rawNext.startsWith('/') ? rawNext : '/'
      const parsedNext = parseCompanyPath(normalizePathname(safeNext))
      const nextInner = normalizePathname(parsedNext.innerPathname || '/')
      return {
        redirect: {
          destination: buildCompanyPath(auth.tenantId, nextInner),
          permanent: false,
        },
      }
    } catch (e: any) {
      if (!(e instanceof AuthError)) throw e
    }
  } else if (match.routeKey === 'Landing') {
    try {
      const auth = await requireAuthFromRequest(reqForAuth)
      return {
        redirect: {
          destination: buildCompanyPath(auth.tenantId, '/gestao-estrategica'),
          permanent: false,
        },
      }
    } catch (e: any) {
      if (!(e instanceof AuthError)) throw e
    }
  }

  return {
    props: {
      pathname: innerPathname,
      routeKey: match.routeKey,
      params: companyId ? { ...match.params, companyId } : match.params,
      searchParams,
    },
  }
}

export default function CatchAllPage(
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  return (
    <LegacyRouteRenderer
      routeKey={props.routeKey}
      params={props.params}
      pathname={props.pathname}
      searchParams={props.searchParams}
    />
  )
}
