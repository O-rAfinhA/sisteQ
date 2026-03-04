import { FileText, Plus, Edit2, Trash2, FileEdit, Paperclip, ToggleLeft, ToggleRight, Download, X, Building2, Users, FileCheck, Scale, Award, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { MetricCard } from '../../components/ui/metric-card';
import { InfoBox } from '../../components/InfoBox';
import { toast } from 'sonner';
import { generateId, getFromStorage } from '../../utils/helpers';
import { formatarDataHoje } from '../../utils/formatters';

export interface TipoDocumento {
  id: string;
  nome: string; // Ex: "Procedimento Sistêmico", "Fluxo de Processo", "Instrução de Trabalho"
  sigla: string; // Ex: "PS", "FLX", "IT"
  modo: 'editor' | 'anexo'; // editor = criar no sistema | anexo = anexar arquivo
  permitirExportarPDF: boolean; // Para modo editor
  prefixoCodigo: string; // Ex: "PS-", "FLX-", "IT-"
  descricao: string;
  templateHtml?: string; // Template HTML pré-configurado para o tipo
  ativo: boolean;
  dataCriacao: string;
  validadeDias?: number; // Dias de validade (undefined ou 0 = sem vencimento)
}

type CategoriaDocumento = 'internos' | 'clientes' | 'externos' | 'licencas' | 'certidoes';

interface CategoriaConfig {
  key: CategoriaDocumento;
  nome: string;
  storageKey: string;
  icone: typeof Building2;
  descricao: string;
  exemplos: TipoDocumento[];
}

const CATEGORIAS: CategoriaConfig[] = [
  {
    key: 'internos',
    nome: 'Documentos Internos',
    storageKey: 'sisteq-tipos-docs-internos',
    icone: Building2,
    descricao: 'Procedimentos, instruções, manuais e fluxos de processos internos',
    exemplos: [
      {
        id: '1',
        nome: 'Procedimento Sistêmico',
        sigla: 'PS',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'PS-',
        descricao: 'Procedimentos gerais do sistema de gestão',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '2',
        nome: 'POP - Procedimento Operacional Padrão',
        sigla: 'POP',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'POP-',
        descricao: 'Procedimentos operacionais padronizados',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '3',
        nome: 'Instrução de Trabalho',
        sigla: 'IT',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'IT-',
        descricao: 'Instruções detalhadas para execução de atividades',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '4',
        nome: 'Instrução de Montagem',
        sigla: 'IM',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'IM-',
        descricao: 'Instruções para montagem de produtos e componentes',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '5',
        nome: 'Instrução Técnica',
        sigla: 'ITE',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'ITE-',
        descricao: 'Instruções técnicas especializadas',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '6',
        nome: 'Plano de Controle',
        sigla: 'PC',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'PC-',
        descricao: 'Planos de controle de qualidade e processos',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '7',
        nome: 'Plano de Inspeção',
        sigla: 'PI',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'PI-',
        descricao: 'Planos de inspeção e verificação',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '8',
        nome: 'Manual',
        sigla: 'MAN',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'MAN-',
        descricao: 'Manuais do sistema de gestão',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '9',
        nome: 'Política',
        sigla: 'POL',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'POL-',
        descricao: 'Políticas organizacionais',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '10',
        nome: 'Fluxograma de Processo',
        sigla: 'FLX',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'FLX-',
        descricao: 'Fluxogramas e mapeamentos de processos',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '11',
        nome: 'Especificação Interna',
        sigla: 'EI',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'EI-',
        descricao: 'Especificações técnicas internas',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '12',
        nome: 'Diretriz',
        sigla: 'DIR',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'DIR-',
        descricao: 'Diretrizes e orientações gerais',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '13',
        nome: 'Norma Interna',
        sigla: 'NI',
        modo: 'editor',
        permitirExportarPDF: true,
        prefixoCodigo: 'NI-',
        descricao: 'Normas internas da organização',
        ativo: true,
        dataCriacao: formatarDataHoje()
      }
    ]
  },
  {
    key: 'clientes',
    nome: 'Documentos de Clientes',
    storageKey: 'sisteq-tipos-docs-clientes',
    icone: Users,
    descricao: 'Contratos, propostas, especificações e documentos relacionados a clientes',
    exemplos: [
      {
        id: '1',
        nome: 'Desenho Técnico',
        sigla: 'DT',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'DT-',
        descricao: 'Desenhos técnicos de clientes',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '2',
        nome: 'Especificação do Cliente',
        sigla: 'EC',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'EC-',
        descricao: 'Especificações técnicas fornecidas por clientes',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '3',
        nome: 'Requisito Técnico',
        sigla: 'RT',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'RT-',
        descricao: 'Requisitos técnicos de clientes',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '4',
        nome: 'Contrato',
        sigla: 'CONT',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CONT-',
        descricao: 'Contratos com clientes',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '5',
        nome: 'Aditivo Contratual',
        sigla: 'AD',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'AD-',
        descricao: 'Aditivos de contratos',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '6',
        nome: 'Pedido de Compra',
        sigla: 'PDC',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'PDC-',
        descricao: 'Pedidos de compra de clientes',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '7',
        nome: 'Ordem de Serviço',
        sigla: 'OS',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'OS-',
        descricao: 'Ordens de serviço de clientes',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '8',
        nome: 'Plano de Controle do Cliente',
        sigla: 'PCC',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'PCC-',
        descricao: 'Planos de controle fornecidos por clientes',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '9',
        nome: 'Manual do Cliente',
        sigla: 'MC',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'MC-',
        descricao: 'Manuais e guias de clientes',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '10',
        nome: 'Procedimento do Cliente',
        sigla: 'PROC',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'PROC-',
        descricao: 'Procedimentos fornecidos por clientes',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '11',
        nome: 'Norma do Cliente',
        sigla: 'NC',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'NC-',
        descricao: 'Normas e padrões de clientes',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '12',
        nome: 'Requisito Específico de Cliente (CSR)',
        sigla: 'CSR',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CSR-',
        descricao: 'Customer Specific Requirements',
        ativo: true,
        dataCriacao: formatarDataHoje()
      }
    ]
  },
  {
    key: 'externos',
    nome: 'Documentos Externos',
    storageKey: 'sisteq-tipos-docs-externos',
    icone: FileCheck,
    descricao: 'Normas, regulamentos e documentos de origem externa',
    exemplos: [
      {
        id: '1',
        nome: 'Norma Técnica (ABNT, ISO, ASTM etc.)',
        sigla: 'NT',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'NT-',
        descricao: 'Normas técnicas externas',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '2',
        nome: 'Legislação',
        sigla: 'LEG',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'LEG-',
        descricao: 'Legislações e leis aplicáveis',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '3',
        nome: 'Decreto',
        sigla: 'DEC',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'DEC-',
        descricao: 'Decretos governamentais',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '4',
        nome: 'Portaria',
        sigla: 'PORT',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'PORT-',
        descricao: 'Portarias de órgãos reguladores',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '5',
        nome: 'Regulamento',
        sigla: 'REG',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'REG-',
        descricao: 'Regulamentos e diretrizes externas',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '6',
        nome: 'Resolução',
        sigla: 'RES',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'RES-',
        descricao: 'Resoluções de órgãos reguladores',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '7',
        nome: 'Instrução Normativa',
        sigla: 'IN',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'IN-',
        descricao: 'Instruções normativas de órgãos reguladores',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '8',
        nome: 'Manual do Fabricante',
        sigla: 'MF',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'MF-',
        descricao: 'Manuais de fabricantes de equipamentos',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '9',
        nome: 'Especificação Técnica Externa',
        sigla: 'ETE',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ETE-',
        descricao: 'Especificações técnicas de origem externa',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '10',
        nome: 'Guia Técnico',
        sigla: 'GT',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'GT-',
        descricao: 'Guias técnicos de referência',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '11',
        nome: 'Requisito de Órgão Regulador',
        sigla: 'ROR',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ROR-',
        descricao: 'Requisitos de órgãos reguladores',
        ativo: true,
        dataCriacao: formatarDataHoje()
      }
    ]
  },
  {
    key: 'licencas',
    nome: 'Licenças e Obrigações Legais',
    storageKey: 'sisteq-tipos-licencas',
    icone: Scale,
    descricao: 'Licenças, alvarás, autorizações e obrigações legais',
    exemplos: [
      // CATEGORIA 1 – Administrativas e Fiscais
      {
        id: '1',
        nome: 'Alvará de Funcionamento',
        sigla: 'ALV',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ALV-',
        descricao: 'Administrativas e Fiscais',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '2',
        nome: 'Licença do Corpo de Bombeiros (AVCB / CLCB)',
        sigla: 'AVCB',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'AVCB-',
        descricao: 'Administrativas e Fiscais',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '3',
        nome: 'Inscrição Estadual',
        sigla: 'IE',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'IE-',
        descricao: 'Administrativas e Fiscais',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '4',
        nome: 'Inscrição Municipal',
        sigla: 'IM',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'IM-',
        descricao: 'Administrativas e Fiscais',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '5',
        nome: 'Contrato Social / Última Alteração Contratual',
        sigla: 'CS',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CS-',
        descricao: 'Administrativas e Fiscais',
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '6',
        nome: 'Certidão Negativa Federal (Receita / PGFN)',
        sigla: 'CNF',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CNF-',
        descricao: 'Administrativas e Fiscais',
        validadeDias: 180,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '7',
        nome: 'Certidão Estadual',
        sigla: 'CE',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CE-',
        descricao: 'Administrativas e Fiscais',
        validadeDias: 180,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '8',
        nome: 'Certidão Municipal',
        sigla: 'CM',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CM-',
        descricao: 'Administrativas e Fiscais',
        validadeDias: 180,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '9',
        nome: 'Certidão FGTS (CRF)',
        sigla: 'CRF',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CRF-',
        descricao: 'Administrativas e Fiscais',
        validadeDias: 30,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '10',
        nome: 'Certidão Trabalhista (CNDT)',
        sigla: 'CNDT',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CNDT-',
        descricao: 'Administrativas e Fiscais',
        validadeDias: 180,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '11',
        nome: 'Certificado Digital (e-CNPJ)',
        sigla: 'ECNPJ',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ECNPJ-',
        descricao: 'Administrativas e Fiscais',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },

      // CATEGORIA 2 – Saúde e Segurança do Trabalho (empresa)
      {
        id: '12',
        nome: 'PGR (Programa de Gerenciamento de Riscos)',
        sigla: 'PGR',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'PGR-',
        descricao: 'Saúde e Segurança do Trabalho',
        validadeDias: 730,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '13',
        nome: 'PCMSO (programa institucional)',
        sigla: 'PCMSO',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'PCMSO-',
        descricao: 'Saúde e Segurança do Trabalho',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '14',
        nome: 'LTCAT',
        sigla: 'LTCAT',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'LTCAT-',
        descricao: 'Saúde e Segurança do Trabalho',
        validadeDias: 730,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '15',
        nome: 'Laudo de Insalubridade',
        sigla: 'LI',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'LI-',
        descricao: 'Saúde e Segurança do Trabalho',
        validadeDias: 730,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '16',
        nome: 'Laudo de Periculosidade',
        sigla: 'LP',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'LP-',
        descricao: 'Saúde e Segurança do Trabalho',
        validadeDias: 730,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '17',
        nome: 'Laudo Ergonômico',
        sigla: 'LE',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'LE-',
        descricao: 'Saúde e Segurança do Trabalho',
        validadeDias: 730,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '18',
        nome: 'Plano de Emergência',
        sigla: 'PE',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'PE-',
        descricao: 'Saúde e Segurança do Trabalho',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '19',
        nome: 'Certificado de Brigada de Incêndio (empresa)',
        sigla: 'CBI',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CBI-',
        descricao: 'Saúde e Segurança do Trabalho',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },

      // CATEGORIA 3 – Ambientais (quando aplicável)
      {
        id: '20',
        nome: 'Licença Prévia (LP)',
        sigla: 'LPA',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'LPA-',
        descricao: 'Ambientais',
        validadeDias: 1825,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '21',
        nome: 'Licença de Instalação (LI)',
        sigla: 'LIA',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'LIA-',
        descricao: 'Ambientais',
        validadeDias: 1825,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '22',
        nome: 'Licença de Operação (LO)',
        sigla: 'LO',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'LO-',
        descricao: 'Ambientais',
        validadeDias: 1825,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '23',
        nome: 'Outorga de Uso de Água',
        sigla: 'OUA',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'OUA-',
        descricao: 'Ambientais',
        validadeDias: 1825,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '24',
        nome: 'Cadastro Técnico Federal (IBAMA)',
        sigla: 'CTF',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CTF-',
        descricao: 'Ambientais',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '25',
        nome: 'CADRI',
        sigla: 'CADRI',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CADRI-',
        descricao: 'Ambientais',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '26',
        nome: 'Plano de Gerenciamento de Resíduos (PGRS)',
        sigla: 'PGRS',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'PGRS-',
        descricao: 'Ambientais',
        validadeDias: 730,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '27',
        nome: 'Certificado de Destinação de Resíduos',
        sigla: 'CDR',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CDR-',
        descricao: 'Ambientais',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },

      // CATEGORIA 4 – Regulatórias / Setoriais
      {
        id: '28',
        nome: 'Registro ANVISA (empresa)',
        sigla: 'ANVISA',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ANVISA-',
        descricao: 'Regulatórias / Setoriais',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '29',
        nome: 'Autorização MAPA',
        sigla: 'MAPA',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'MAPA-',
        descricao: 'Regulatórias / Setoriais',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '30',
        nome: 'Registro CREA (empresa)',
        sigla: 'CREA',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CREA-',
        descricao: 'Regulatórias / Setoriais',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '31',
        nome: 'Registro CRF / CRM (empresa)',
        sigla: 'CRF',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CRF-',
        descricao: 'Regulatórias / Setoriais',
        validadeDias: 365,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '32',
        nome: 'Licença ANTT',
        sigla: 'ANTT',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ANTT-',
        descricao: 'Regulatórias / Setoriais',
        validadeDias: 1825,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '33',
        nome: 'RNTRC',
        sigla: 'RNTRC',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'RNTRC-',
        descricao: 'Regulatórias / Setoriais',
        validadeDias: 1825,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '34',
        nome: 'Autorização Polícia Federal',
        sigla: 'APF',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'APF-',
        descricao: 'Regulatórias / Setoriais',
        validadeDias: 1095,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '35',
        nome: 'Registro Exército (CR)',
        sigla: 'CR',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CR-',
        descricao: 'Regulatórias / Setoriais',
        validadeDias: 1095,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },

      // CATEGORIA 5 – Certificações
      {
        id: '36',
        nome: 'Certificado ISO 9001',
        sigla: 'ISO9001',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ISO9001-',
        descricao: 'Certificações',
        validadeDias: 1095,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '37',
        nome: 'Certificado ISO 14001',
        sigla: 'ISO14001',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ISO14001-',
        descricao: 'Certificações',
        validadeDias: 1095,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '38',
        nome: 'Certificado ISO 45001',
        sigla: 'ISO45001',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ISO45001-',
        descricao: 'Certificações',
        validadeDias: 1095,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '39',
        nome: 'Certificado ISO 27001',
        sigla: 'ISO27001',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ISO27001-',
        descricao: 'Certificações',
        validadeDias: 1095,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '40',
        nome: 'Certificado ISO 37001',
        sigla: 'ISO37001',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ISO37001-',
        descricao: 'Certificações',
        validadeDias: 1095,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '41',
        nome: 'Certificado PBQP-H',
        sigla: 'PBQPH',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'PBQPH-',
        descricao: 'Certificações',
        validadeDias: 1095,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '42',
        nome: 'Certificado IATF 16949',
        sigla: 'IATF',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'IATF-',
        descricao: 'Certificações',
        validadeDias: 1095,
        ativo: true,
        dataCriacao: formatarDataHoje()
      }
    ]
  },
  {
    key: 'certidoes',
    nome: 'Certidões e Regularidade Fiscal',
    storageKey: 'sisteq-tipos-certidoes',
    icone: Award,
    descricao: 'Certidões negativas, CND e documentos de regularidade fiscal',
    exemplos: [
      // Certidões Federais
      {
        id: '1',
        nome: 'Certidão Conjunta Receita Federal / PGFN',
        sigla: 'CNDRFB',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CNDRFB-',
        descricao: 'Certidões Federais',
        validadeDias: 180,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '2',
        nome: 'Certidão FGTS (CRF)',
        sigla: 'CRF',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CRF-',
        descricao: 'Certidões Federais',
        validadeDias: 30,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '3',
        nome: 'Certidão Trabalhista (CNDT)',
        sigla: 'CNDT',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CNDT-',
        descricao: 'Certidões Federais',
        validadeDias: 180,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },

      // Certidões Estaduais
      {
        id: '4',
        nome: 'Certidão de Débitos Estaduais',
        sigla: 'CNDE',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CNDE-',
        descricao: 'Certidões Estaduais',
        validadeDias: 180,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '5',
        nome: 'Certidão ICMS',
        sigla: 'ICMS',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ICMS-',
        descricao: 'Certidões Estaduais',
        validadeDias: 180,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '6',
        nome: 'Outras específicas do estado',
        sigla: 'OEST',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'OEST-',
        descricao: 'Certidões Estaduais',
        validadeDias: 180,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },

      // Certidões Municipais
      {
        id: '7',
        nome: 'Certidão de Débitos Municipais',
        sigla: 'CNDM',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'CNDM-',
        descricao: 'Certidões Municipais',
        validadeDias: 180,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '8',
        nome: 'ISS',
        sigla: 'ISS',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'ISS-',
        descricao: 'Certidões Municipais',
        validadeDias: 180,
        ativo: true,
        dataCriacao: formatarDataHoje()
      },
      {
        id: '9',
        nome: 'Tributos municipais',
        sigla: 'TRMUN',
        modo: 'anexo',
        permitirExportarPDF: false,
        prefixoCodigo: 'TRMUN-',
        descricao: 'Certidões Municipais',
        validadeDias: 180,
        ativo: true,
        dataCriacao: formatarDataHoje()
      }
    ]
  }
];

export function TiposDocumentos() {
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<CategoriaDocumento>('internos');
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modoValidadePersonalizado, setModoValidadePersonalizado] = useState(false);
  const [formData, setFormData] = useState<Omit<TipoDocumento, 'id' | 'dataCriacao'>>({
    nome: '',
    sigla: '',
    modo: 'editor',
    permitirExportarPDF: true,
    prefixoCodigo: '',
    descricao: '',
    templateHtml: '',
    ativo: true
  });

  // Carregar dados do localStorage
  useEffect(() => {
    const categoriaConfig = CATEGORIAS.find(c => c.key === categoriaSelecionada);
    if (!categoriaConfig) return;

    // Migração automática: Se for "internos" e não houver dados no novo storage, copiar do antigo
    if (categoriaSelecionada === 'internos') {
      const novoData = getFromStorage<TipoDocumento[]>(categoriaConfig.storageKey, []);
      const antigoData = getFromStorage<TipoDocumento[]>('sisteq-tipos-documentos', []);
      
      if (novoData.length === 0 && antigoData.length > 0) {
        // Migrar dados do storage antigo para o novo
        localStorage.setItem(categoriaConfig.storageKey, JSON.stringify(antigoData));
      }
    }

    const dadosCarregados = getFromStorage<TipoDocumento[]>(categoriaConfig.storageKey, []);

    // Se não há dados salvos OU o array está vazio, carregar exemplos padrão
    if (dadosCarregados.length === 0) {
      const tiposExemplo: TipoDocumento[] = categoriaConfig.exemplos || [];
      setTipos(tiposExemplo);
      localStorage.setItem(categoriaConfig.storageKey, JSON.stringify(tiposExemplo));
    } else {
      setTipos(dadosCarregados);
    }
  }, [categoriaSelecionada]);

  // Salvar no localStorage
  const saveToLocalStorage = (data: TipoDocumento[]) => {
    localStorage.setItem(CATEGORIAS.find(c => c.key === categoriaSelecionada)?.storageKey || '', JSON.stringify(data));
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      sigla: '',
      modo: 'editor',
      permitirExportarPDF: true,
      prefixoCodigo: '',
      descricao: '',
      templateHtml: '',
      ativo: true
    });
    setModoValidadePersonalizado(false);
  };

  const handleAdd = () => {
    if (!formData.nome || !formData.sigla || !formData.prefixoCodigo) {
      toast.error('Preencha Nome, Sigla e Prefixo de Código');
      return;
    }

    // Verificar se já existe sigla ou prefixo duplicado
    const siglaDuplicada = tipos.some(t => t.sigla.toUpperCase() === formData.sigla.toUpperCase());
    const prefixoDuplicado = tipos.some(t => t.prefixoCodigo === formData.prefixoCodigo);

    if (siglaDuplicada) {
      toast.error('Já existe um tipo com esta sigla');
      return;
    }

    if (prefixoDuplicado) {
      toast.error('Já existe um tipo com este prefixo de código');
      return;
    }

    const novoTipo: TipoDocumento = {
      id: generateId(),
      ...formData,
      sigla: formData.sigla.toUpperCase(),
      dataCriacao: formatarDataHoje()
    };

    const updated = [...tipos, novoTipo];
    setTipos(updated);
    saveToLocalStorage(updated);
    resetForm();
    setIsAdding(false);
    toast.success('Tipo de documento criado com sucesso!');
  };

  const handleEdit = (tipo: TipoDocumento) => {
    setEditingId(tipo.id);
    setFormData({
      nome: tipo.nome,
      sigla: tipo.sigla,
      modo: tipo.modo,
      permitirExportarPDF: tipo.permitirExportarPDF,
      prefixoCodigo: tipo.prefixoCodigo,
      descricao: tipo.descricao,
      templateHtml: tipo.templateHtml,
      ativo: tipo.ativo,
      validadeDias: tipo.validadeDias
    });
    
    // Verificar se a validade é personalizada (não está nas opções padrão)
    const opcoesPreDefinidas = [0, 30, 60, 90, 180, 365, 730, 1095, 1825];
    const ehPersonalizado = tipo.validadeDias !== undefined && 
                            tipo.validadeDias > 0 && 
                            !opcoesPreDefinidas.includes(tipo.validadeDias);
    setModoValidadePersonalizado(ehPersonalizado);
  };

  const handleUpdate = () => {
    if (!formData.nome || !formData.sigla || !formData.prefixoCodigo) {
      toast.error('Preencha Nome, Sigla e Prefixo de Código');
      return;
    }

    // Verificar duplicatas (excluindo o item sendo editado)
    const siglaDuplicada = tipos.some(
      t => t.id !== editingId && t.sigla.toUpperCase() === formData.sigla.toUpperCase()
    );
    const prefixoDuplicado = tipos.some(
      t => t.id !== editingId && t.prefixoCodigo === formData.prefixoCodigo
    );

    if (siglaDuplicada) {
      toast.error('Já existe um tipo com esta sigla');
      return;
    }

    if (prefixoDuplicado) {
      toast.error('Já existe um tipo com este prefixo de código');
      return;
    }

    const updated = tipos.map(tipo =>
      tipo.id === editingId
        ? { ...tipo, ...formData, sigla: formData.sigla.toUpperCase() }
        : tipo
    );

    setTipos(updated);
    saveToLocalStorage(updated);
    setEditingId(null);
    resetForm();
    toast.success('Tipo de documento atualizado com sucesso!');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Deseja realmente excluir este tipo de documento? Esta ação não pode ser desfeita.')) {
      return;
    }

    const updated = tipos.filter(tipo => tipo.id !== id);
    setTipos(updated);
    saveToLocalStorage(updated);
    toast.success('Tipo de documento excluído com sucesso!');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    resetForm();
  };

  const handleRestaurarPadroes = () => {
    if (!confirm('Isso irá SUBSTITUIR TODOS os tipos atuais pelos padrões do sistema. Deseja continuar?')) {
      return;
    }

    const categoriaConfig = CATEGORIAS.find(c => c.key === categoriaSelecionada);
    if (!categoriaConfig) return;

    const tiposExemplo: TipoDocumento[] = categoriaConfig.exemplos || [];
    setTipos(tiposExemplo);
    saveToLocalStorage(tiposExemplo);
    toast.success(`✅ ${tiposExemplo.length} tipos padrão restaurados com sucesso!`);
  };

  const tiposAtivos = tipos.filter(t => t.ativo).length;
  const tiposInativos = tipos.filter(t => !t.ativo).length;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-gray-900 tracking-tight flex items-center gap-3" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
              <FileText className="w-8 h-8 text-blue-600" />
              Tipos de Documentos
            </h1>
            <p className="text-gray-600 mt-2">
              Configure os tipos de documentos organizados por categorias (Internos, Clientes, Externos, etc.)
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRestaurarPadroes} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Restaurar Padrões
            </Button>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Tipo
            </Button>
          </div>
        </div>

        <InfoBox>
          <p className="text-sm text-blue-800">
            <strong>Modo Editor:</strong> Permite criar e editar documentos diretamente no sistema com editor de texto rico.
            <br />
            <strong>Modo Anexo:</strong> Permite anexar arquivos externos (PDF, DOCX, etc.) ao sistema.
          </p>
        </InfoBox>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Total de Tipos"
          value={tipos.length}
          icon={FileText}
          variant="default"
        />
        <MetricCard
          label="Tipos Ativos"
          value={tiposAtivos}
          icon={ToggleRight}
          variant="success"
        />
        <MetricCard
          label="Tipos Inativos"
          value={tiposInativos}
          icon={ToggleLeft}
          variant="default"
        />
      </div>

      {/* Tabs de Categorias */}
      <div>
        <div className="mb-3">
          <h2 className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
            Categorias de Documentos
          </h2>
        </div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {CATEGORIAS.map((categoria) => {
              const Icone = categoria.icone;
              const isActive = categoriaSelecionada === categoria.key;
              
              return (
                <button
                  key={categoria.key}
                  onClick={() => {
                    setCategoriaSelecionada(categoria.key);
                    setIsAdding(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className={`
                    group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icone className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  {categoria.nome}
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Descrição da categoria selecionada */}
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-700">
            {CATEGORIAS.find(c => c.key === categoriaSelecionada)?.descricao}
          </p>
        </div>
      </div>

      {/* Formulário de Adição/Edição */}
      {(isAdding || editingId) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-gray-900 mb-4" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            {editingId ? 'Editar Tipo de Documento' : 'Novo Tipo de Documento'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Tipo <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Procedimento Sistêmico"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sigla <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.sigla}
                onChange={(e) => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })}
                placeholder="Ex: PS"
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prefixo de Código <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.prefixoCodigo}
                onChange={(e) => setFormData({ ...formData, prefixoCodigo: e.target.value })}
                placeholder="Ex: PS-"
              />
              <p className="text-xs text-gray-500 mt-1">Será usado para gerar códigos como PS-001, PS-002...</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modo de Criação <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.modo}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  modo: e.target.value as 'editor' | 'anexo',
                  permitirExportarPDF: e.target.value === 'editor' // Auto-habilitar PDF para modo editor
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="editor">Editor Integrado</option>
                <option value="anexo">Arquivo Anexado</option>
              </select>
            </div>

            {/* Campo de Validade - Apenas para categorias específicas */}
            {(categoriaSelecionada === 'internos' || categoriaSelecionada === 'clientes' || categoriaSelecionada === 'externos' || categoriaSelecionada === 'licencas' || categoriaSelecionada === 'certidoes') && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validade (Dias)
                </label>
                <div className="flex gap-2">
                  <select
                    value={modoValidadePersonalizado ? 'personalizado' : (formData.validadeDias || 0)}
                    onChange={(e) => {
                      const valor = e.target.value;
                      if (valor === 'personalizado') {
                        setModoValidadePersonalizado(true);
                        setFormData({ ...formData, validadeDias: undefined });
                      } else {
                        setModoValidadePersonalizado(false);
                        const dias = parseInt(valor);
                        setFormData({ 
                          ...formData, 
                          validadeDias: dias === 0 ? undefined : dias
                        });
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="0">Sem vencimento</option>
                    <option value="30">30 dias</option>
                    <option value="60">60 dias</option>
                    <option value="90">90 dias</option>
                    <option value="180">180 dias (6 meses)</option>
                    <option value="365">365 dias (1 ano)</option>
                    <option value="730">730 dias (2 anos)</option>
                    <option value="1095">1095 dias (3 anos)</option>
                    <option value="1825">1825 dias (5 anos)</option>
                    <option value="personalizado">📝 Personalizado</option>
                  </select>
                  
                  {modoValidadePersonalizado && (
                    <Input
                      type="number"
                      min="1"
                      max="9999"
                      value={formData.validadeDias || ''}
                      onChange={(e) => {
                        const dias = parseInt(e.target.value) || undefined;
                        setFormData({ ...formData, validadeDias: dias });
                      }}
                      placeholder="Digite a quantidade de dias"
                      className="flex-1"
                    />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.validadeDias && formData.validadeDias > 0 
                    ? `Documentos deste tipo vencerão ${formData.validadeDias} dias após a data de emissão/vigência`
                    : 'Documentos deste tipo não terão vencimento automático'
                  }
                </p>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <Input
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva o propósito deste tipo de documento"
            />
          </div>

          {/* Template HTML - Somente para modo Editor */}
          {formData.modo === 'editor' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template HTML (Estrutura Inicial)
              </label>
              <textarea
                value={formData.templateHtml || ''}
                onChange={(e) => setFormData({ ...formData, templateHtml: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
                rows={12}
                placeholder="<h1>1. Objetivo</h1>&#10;<p>Descreva o objetivo do documento...</p>&#10;&#10;<h2>2. Escopo</h2>&#10;<p>Defina o escopo de aplicação...</p>&#10;&#10;<h2>3. Responsabilidades</h2>&#10;<table>&#10;  <tr>&#10;    <th>Função</th>&#10;    <th>Responsabilidade</th>&#10;  </tr>&#10;  <tr>&#10;    <td>Gerente</td>&#10;    <td>Aprovar documentos</td>&#10;  </tr>&#10;</table>&#10;&#10;<h2>4. Registros</h2>&#10;<ul>&#10;  <li>Registro 1</li>&#10;  <li>Registro 2</li>&#10;</ul>"
              />
              <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                <p className="text-xs text-amber-900">
                  <strong>⚠️ Importante:</strong> Este template é apenas uma <strong>estrutura inicial</strong> que será carregada no editor para você preencher manualmente.
                  <br />
                  Não use placeholders como <code>{'{{doc.codigo}}'}</code> - insira apenas HTML estático com a estrutura desejada.
                </p>
              </div>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>💡 Tags suportadas:</strong> &lt;h1&gt;, &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;table&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;hr&gt;
                  <br />
                  O sistema aplicará estilos profissionais automaticamente.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-6 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-200 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Tipo Ativo</span>
            </label>

            {formData.modo === 'editor' && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.permitirExportarPDF}
                  onChange={(e) => setFormData({ ...formData, permitirExportarPDF: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-200 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Permitir Exportar PDF</span>
              </label>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={editingId ? handleUpdate : handleAdd} className="gap-2">
              <FileEdit className="w-4 h-4" />
              {editingId ? 'Atualizar' : 'Salvar'}
            </Button>
            <Button onClick={cancelEdit} variant="outline" className="gap-2">
              <X className="w-4 h-4" />
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Tabela de Tipos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
            Tipos de Documentos da Categoria: {CATEGORIAS.find(c => c.key === categoriaSelecionada)?.nome}
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Configure os tipos específicos dentro desta categoria de documentos
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Sigla
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Prefixo
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Modo
                </th>
                {(categoriaSelecionada === 'internos' || categoriaSelecionada === 'clientes' || categoriaSelecionada === 'externos' || categoriaSelecionada === 'licencas' || categoriaSelecionada === 'certidoes') && (
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Validade
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Recursos
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tipos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Nenhum tipo de documento configurado. Clique em &quot;Adicionar Tipo&quot; para começar.
                  </td>
                </tr>
              ) : (
                tipos.map((tipo) => (
                  <tr key={tipo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {tipo.modo === 'editor' ? (
                          <FileEdit className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Paperclip className="w-5 h-5 text-purple-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 text-left">{tipo.nome}</div>
                          {tipo.descricao && (
                            <div className="text-xs text-gray-500 text-left">{tipo.descricao}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded" style={{ fontWeight: 600 }}>
                        {tipo.sigla}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-600">
                        {tipo.prefixoCodigo}###
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {tipo.modo === 'editor' ? (
                        <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                          Editor
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200">
                          Anexo
                        </Badge>
                      )}
                    </td>
                    {(categoriaSelecionada === 'internos' || categoriaSelecionada === 'clientes' || categoriaSelecionada === 'externos' || categoriaSelecionada === 'licencas' || categoriaSelecionada === 'certidoes') && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {tipo.validadeDias ? (
                          <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {tipo.validadeDias} dias
                          </span>
                        ) : (
                          <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            Sem vencimento
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {tipo.modo === 'editor' && tipo.permitirExportarPDF && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            <Download className="w-3 h-3" />
                            PDF
                          </div>
                        )}
                        {tipo.modo === 'anexo' && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            <Paperclip className="w-3 h-3" />
                            Upload
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {tipo.ativo ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-gray-100 text-gray-800 border-gray-200">
                          Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleEdit(tipo)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(tipo.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h4 className="text-sm text-gray-900 mb-3" style={{ fontWeight: 600 }}>Modos de Criação:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <FileEdit className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-gray-900">Editor Integrado:</strong>
              <p className="text-gray-600 mt-1">
                Documentos criados e editados diretamente no sistema com formatação rica (negrito, listas, tabelas, etc.). 
                Permite exportação para PDF.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Paperclip className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-gray-900">Arquivo Anexado:</strong>
              <p className="text-gray-600 mt-1">
                Documentos externos (PDF, DOCX, XLSX, etc.) anexados ao sistema. 
                Ideal para normas técnicas e documentos de terceiros.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}