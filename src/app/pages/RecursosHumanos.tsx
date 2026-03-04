import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export default function RecursosHumanos() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona para a página de colaboradores
    navigate('/recursos-humanos/colaboradores', { replace: true });
  }, [navigate]);

  return null;
}
