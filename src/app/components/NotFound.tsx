import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';

export function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Verifica se é uma rota antiga e redireciona
    const path = location.pathname;
    
    if (path === '/plano-acao-corretiva') {
      navigate(`/acoes-corretivas/plano-acao${location.search}`, { replace: true });
    } else if (path === '/plano-acao') {
      navigate(`/gestao-estrategica/plano-acao${location.search}`, { replace: true });
    } else {
      // Se não for uma rota antiga conhecida, redireciona para home
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Redirecionando...</h2>
        <p className="text-gray-500">Por favor, aguarde.</p>
      </div>
    </div>
  );
}
