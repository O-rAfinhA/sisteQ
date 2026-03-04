/**
 * Decodifica URI de forma segura, retornando string vazia em caso de erro
 */
export function safeDecodeURIComponent(str: string | null | undefined): string {
  if (!str) return '';
  
  // Se for apenas caracteres problemáticos, retornar vazio
  if (str.trim() === '%' || str.trim() === '') return '';
  
  try {
    return decodeURIComponent(str);
  } catch (error) {
    // Em caso de erro de decodificação, retornar string vazia
    // (melhor que retornar valor malformado)
    console.warn('Erro ao decodificar URI, retornando vazio:', str);
    return '';
  }
}