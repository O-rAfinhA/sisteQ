import { Navigate, useLocation } from 'react-router';

interface RedirectWithQueryParamsProps {
  to: string;
}

// Generic redirect component that preserves query parameters
export function RedirectWithQueryParams({ to }: RedirectWithQueryParamsProps) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

// Redirect from old /plano-acao-corretiva to new /acoes-corretivas/plano-acao
export function RedirectToPlanoAcaoCorretiva() {
  return <RedirectWithQueryParams to="/acoes-corretivas/plano-acao" />;
}

// Redirect from old /plano-acao to new /gestao-estrategica/plano-acao
export function RedirectToPlanoAcao() {
  return <RedirectWithQueryParams to="/gestao-estrategica/plano-acao" />;
}