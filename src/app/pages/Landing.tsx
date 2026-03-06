import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Sparkles,
  Target,
  Truck,
  Users,
  Wrench,
  ChevronRight,
  Menu,
  X,
  Play
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { LoadingSpinner } from '../components/ui/loading';
import { trackEvent } from '../utils/helpers';
import logoSisteQ from '@/assets/1616e31d08200cd9b4972fe7b1780df810c21f8a.png';

// --- Components ---

const Badge = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 ${className}`}>
    {children}
  </span>
);

const SectionHeading = ({ 
  badge, 
  title, 
  subtitle, 
  align = 'center',
  light = false 
}: { 
  badge?: string, 
  title: string, 
  subtitle?: string, 
  align?: 'left' | 'center',
  light?: boolean
}) => (
  <div className={`flex flex-col ${align === 'center' ? 'items-center text-center' : 'items-start text-left'} mb-12 md:mb-20`}>
    {badge && (
      <Badge className="mb-4">{badge}</Badge>
    )}
    <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 ${light ? 'text-white' : 'text-slate-900'}`}>
      {title}
    </h2>
    {subtitle && (
      <p className={`text-lg md:text-xl max-w-2xl leading-relaxed ${light ? 'text-slate-300' : 'text-slate-600'}`}>
        {subtitle}
      </p>
    )}
  </div>
);

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: { icon: any, title: string, description: string, delay?: number }) => (
  <div 
    className="group relative p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out"
    style={{ transitionDelay: `${delay}ms` }}
  >
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-t-3xl" />
    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
      <Icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors">
      {title}
    </h3>
    <p className="text-slate-600 leading-relaxed">
      {description}
    </p>
  </div>
);

const StatCard = ({ value, label, sublabel }: { value: string, label: string, sublabel?: string }) => (
  <div className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors">
    <div className="text-3xl md:text-4xl font-extrabold text-blue-600 mb-1">
      {value}
    </div>
    <div className="font-semibold text-slate-900 text-sm md:text-base text-center">
      {label}
    </div>
    {sublabel && (
      <div className="text-xs text-slate-500 mt-1 text-center">
        {sublabel}
      </div>
    )}
  </div>
);

export default function Landing() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navTarget, setNavTarget] = useState<'login' | 'register' | null>(null);

  const loginHref = useMemo(() => {
    const next = encodeURIComponent('/gestao-estrategica');
    return `/login?next=${next}`;
  }, []);

  const signupHref = useMemo(() => {
    const next = encodeURIComponent('/gestao-estrategica');
    return `/login?mode=register&next=${next}`;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Initial tracking
    trackEvent('landing_view', { page: 'landing_v2' });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const onLogin = (cta: string) => {
    trackEvent('landing_cta_click', { cta });
    setNavTarget('login');
    navigate(loginHref);
  };

  const onSignup = (cta: string) => {
    trackEvent('landing_cta_click', { cta });
    setNavTarget('register');
    navigate(signupHref);
  };

  const features = [
    {
      title: 'Gestão de Documentos',
      description: 'Controle versões, validades e acessos de documentos internos e externos com rastreabilidade total.',
      icon: FileText,
    },
    {
      title: 'KPIs e Metas',
      description: 'Dashboards em tempo real com indicadores estratégicos, táticos e operacionais integrados.',
      icon: BarChart3,
    },
    {
      title: 'Gestão de Riscos',
      description: 'Matrizes de risco interativas, planos de mitigação e monitoramento contínuo de ameaças.',
      icon: ShieldCheck,
    },
    {
      title: 'Plano de Ação',
      description: 'Acompanhe status, prazos e responsabilidades de ações corretivas e preventivas.',
      icon: CheckCircle2,
    },
    {
      title: 'Gestão de Fornecedores',
      description: 'Avaliação, homologação e monitoramento de performance da sua cadeia de suprimentos.',
      icon: Truck,
    },
    {
      title: 'Manutenção',
      description: 'Controle de ordens de serviço, planos preventivos e indicadores de confiabilidade.',
      icon: Wrench,
    },
    {
      title: 'Mapeamento de Processos',
      description: 'Desenhe, padronize e otimize fluxos de trabalho para garantir consistência operacional.',
      icon: Target,
    },
    {
      title: 'Gestão de Pessoas',
      description: 'Matriz de competências, avaliações de desempenho e planos de desenvolvimento individual.',
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Navbar */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          isScrolled ? 'bg-white/90 backdrop-blur-md border-slate-200 py-3 shadow-sm' : 'bg-transparent border-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <a
            href="/"
            title="Ir para a página inicial"
            className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:opacity-90 active:opacity-80"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <img
              src={(logoSisteQ as any).src ?? (logoSisteQ as any)}
              alt="SisteQ"
              className="h-9 md:h-10 w-auto object-contain"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </a>

          <div className="hidden md:flex items-center gap-8">
            <nav className="flex gap-6">
              <button onClick={() => document.getElementById('funcionalidades')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Funcionalidades</button>
              <button onClick={() => document.getElementById('beneficios')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Benefícios</button>
              <button onClick={() => document.getElementById('seguranca')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Segurança</button>
            </nav>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <Button
                variant="ghost"
                className="text-slate-700 hover:text-blue-700 hover:bg-blue-50"
                disabled={navTarget !== null}
                onClick={() => onLogin('nav_secondary')}
              >
                {navTarget === 'login' ? (
                  <>
                    <LoadingSpinner size="sm" className="border-slate-300 border-t-slate-700" />
                    Entrar
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 transition-all"
                disabled={navTarget !== null}
                onClick={() => onSignup('nav_primary')}
              >
                {navTarget === 'register' ? (
                  <>
                    <LoadingSpinner size="sm" className="border-white/30 border-t-white" />
                    Criar conta grátis
                  </>
                ) : (
                  'Criar conta grátis'
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-6 shadow-xl animate-in slide-in-from-top-5">
            <nav className="flex flex-col gap-4">
              <button onClick={() => { setMobileMenuOpen(false); document.getElementById('funcionalidades')?.scrollIntoView({ behavior: 'smooth' }) }} className="text-left py-2 font-medium text-slate-700">Funcionalidades</button>
              <button onClick={() => { setMobileMenuOpen(false); document.getElementById('beneficios')?.scrollIntoView({ behavior: 'smooth' }) }} className="text-left py-2 font-medium text-slate-700">Benefícios</button>
              <button onClick={() => { setMobileMenuOpen(false); document.getElementById('seguranca')?.scrollIntoView({ behavior: 'smooth' }) }} className="text-left py-2 font-medium text-slate-700">Segurança</button>
              <div className="h-px bg-slate-100 my-2" />
              <Button
                variant="outline"
                className="w-full justify-center"
                disabled={navTarget !== null}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogin('mobile_nav_login');
                }}
              >
                {navTarget === 'login' ? (
                  <>
                    <LoadingSpinner size="sm" className="border-slate-200 border-t-slate-700" />
                    Entrar
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
              <Button
                className="w-full justify-center bg-blue-600"
                disabled={navTarget !== null}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignup('mobile_nav_signup');
                }}
              >
                {navTarget === 'register' ? (
                  <>
                    <LoadingSpinner size="sm" className="border-white/30 border-t-white" />
                    Criar conta grátis
                  </>
                ) : (
                  'Criar conta grátis'
                )}
              </Button>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none z-0">
            <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl opacity-60 mix-blend-multiply animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute top-40 -left-20 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl opacity-60 mix-blend-multiply animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              Plataforma unificada para Gestão e Qualidade
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-8 max-w-4xl mx-auto leading-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
              Transforme dados complexos em <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">decisões simples</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              Centralize documentos, riscos, indicadores e processos. Elimine planilhas desconectadas e tenha visibilidade total da sua operação.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <Button 
                className="h-14 px-8 text-lg rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200 hover:shadow-2xl hover:shadow-blue-300 hover:-translate-y-0.5 transition-all duration-300"
                onClick={() => onSignup('hero_primary')}
              >
                Começar Gratuitamente
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                className="h-14 px-8 text-lg rounded-full border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 transition-all"
                onClick={() => {
                  trackEvent('landing_cta_click', { cta: 'hero_demo' });
                  document.getElementById('funcionalidades')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Play className="mr-2 w-4 h-4 fill-slate-700" />
                Ver como funciona
              </Button>
            </div>

            {/* Dashboard Mockup Placeholder */}
            <div className="mt-20 relative mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 p-2 md:p-4">
              <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-100 aspect-[16/9] flex items-center justify-center relative group">
                {/* Simulated UI Content */}
                <div className="absolute inset-0 bg-white grid grid-cols-12 gap-4 p-6 opacity-80 group-hover:opacity-100 transition-opacity duration-500">
                   {/* Sidebar */}
                   <div className="col-span-2 hidden md:block space-y-3">
                     <div className="h-8 w-24 bg-slate-100 rounded-md mb-8"></div>
                     {[1,2,3,4,5].map(i => <div key={i} className="h-6 w-full bg-slate-50 rounded-md"></div>)}
                   </div>
                   {/* Main Content */}
                   <div className="col-span-12 md:col-span-10 space-y-6">
                      <div className="flex justify-between">
                        <div className="h-8 w-48 bg-slate-100 rounded-md"></div>
                        <div className="flex gap-2">
                           <div className="h-8 w-8 rounded-full bg-slate-100"></div>
                           <div className="h-8 w-8 rounded-full bg-slate-100"></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-blue-50/50 border border-blue-100 rounded-xl"></div>)}
                      </div>
                      <div className="grid grid-cols-3 gap-4 h-64">
                        <div className="col-span-2 bg-slate-50 border border-slate-100 rounded-xl"></div>
                        <div className="col-span-1 bg-slate-50 border border-slate-100 rounded-xl"></div>
                      </div>
                   </div>
                </div>
                
                {/* Overlay Text */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-transparent to-transparent md:bg-none">
                  <span className="px-4 py-2 bg-white/90 backdrop-blur border border-slate-200 rounded-lg text-sm font-medium text-slate-600 shadow-sm">
                    Interface intuitiva e focada em dados
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof / Stats */}
        <section className="py-12 border-y border-slate-100 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatCard value="11+" label="Módulos Integrados" sublabel="Tudo em um só lugar" />
              <StatCard value="100%" label="Web & Mobile" sublabel="Acesse de onde estiver" />
              <StatCard value="0" label="Instalação Local" sublabel="100% Nuvem Segura" />
              <StatCard value="24/7" label="Disponibilidade" sublabel="Monitoramento contínuo" />
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="funcionalidades" className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeading 
              badge="Funcionalidades"
              title="Tudo o que você precisa para gerenciar"
              subtitle="Uma suíte completa de ferramentas conectadas para elevar o nível da sua gestão."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <FeatureCard 
                  key={f.title} 
                  icon={f.icon} 
                  title={f.title} 
                  description={f.description} 
                  delay={i * 50}
                />
              ))}
            </div>
            
            <div className="mt-16 text-center">
              <Button size="lg" className="h-12 px-8 rounded-full bg-slate-900 text-white hover:bg-slate-800" onClick={() => onSignup('features_bottom')}>
                Explorar todas as funcionalidades
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Value Proposition / Bento Grid */}
        <section id="beneficios" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeading 
              title="Benefícios que você pode medir"
              subtitle="Não é apenas sobre organizar papéis. É sobre ter controle real da operação."
              align="left"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
              {/* Card 1: Large */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-700 mb-4">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Visibilidade em Tempo Real</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Abandone os relatórios mensais que já nascem velhos. Acompanhe indicadores, pendências e alertas no momento em que acontecem.
                  </p>
                  <ul className="space-y-2 mt-4">
                    {['Dashboards dinâmicos', 'Filtros por área', 'Histórico de evolução'].map(item => (
                      <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="w-full md:w-1/2 aspect-video bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center p-4">
                   {/* Abstract Chart */}
                   <div className="w-full h-full flex items-end justify-between gap-2 px-4 pb-4">
                      {[40, 60, 45, 70, 50, 80, 75].map((h, i) => (
                        <div key={i} className="w-full bg-blue-500 rounded-t-sm opacity-80" style={{ height: `${h}%` }} />
                      ))}
                   </div>
                </div>
              </div>

              {/* Card 2: Tall */}
              <div className="bg-slate-900 rounded-3xl p-8 shadow-xl text-white flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white mb-6">
                    <Target className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Foco no Resultado</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Identifique gargalos e atue onde realmente importa. O sistema destaca o que está fora da meta ou atrasado.
                  </p>
                </div>
                <div className="mt-8 pt-8 border-t border-white/10">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-sm text-slate-400">Meta atingida</span>
                     <span className="text-lg font-bold text-green-400">94%</span>
                   </div>
                   <div className="w-full bg-white/10 rounded-full h-2">
                     <div className="bg-green-500 h-2 rounded-full" style={{ width: '94%' }} />
                   </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Compliance Simplificado</h3>
                <p className="text-slate-600 text-sm">
                  Esteja sempre pronto para auditorias. Histórico de alterações, aprovações e versões controladas automaticamente.
                </p>
              </div>

              {/* Card 4 */}
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Comece em minutos, não meses</h3>
                    <p className="text-blue-100 max-w-md">
                      Sem setup complexo. Crie sua conta, convide seu time e comece a usar.
                    </p>
                  </div>
                  <Button
                    className="bg-white text-blue-700 hover:bg-blue-50 border-none"
                    disabled={navTarget !== null}
                    onClick={() => onSignup('bento_cta')}
                  >
                    {navTarget === 'register' ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Criar conta agora
                      </>
                    ) : (
                      'Criar conta agora'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Governance */}
        <section id="seguranca" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeading 
              badge="Segurança"
              title="Construído para confiança"
              subtitle="Sua operação protegida com os melhores padrões de segurança e privacidade."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { 
                  title: 'Multi-tenant Seguro', 
                  desc: 'Isolamento lógico rigoroso de dados por organização. Seus dados são apenas seus.',
                  icon: ShieldCheck 
                },
                { 
                  title: 'Autenticação Robusta', 
                  desc: 'Proteção contra ataques de força bruta, sessões seguras (HttpOnly) e verificação de identidade.',
                  icon: Users 
                },
                { 
                  title: 'Audit Trail Completo', 
                  desc: 'Rastreabilidade de quem fez o quê e quando. Logs detalhados para auditoria.',
                  icon: FileText 
                },
              ].map(item => (
                <div key={item.title} className="flex flex-col items-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 text-slate-400">
                    <item.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-24 bg-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl">
             <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/30 rounded-full blur-[100px]" />
             <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Pronto para profissionalizar sua gestão?
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Junte-se a gestores que transformaram o caos em controle. Comece gratuitamente hoje mesmo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-14 px-10 text-lg rounded-full bg-white text-slate-900 hover:bg-slate-100 font-bold"
                disabled={navTarget !== null}
                onClick={() => onSignup('footer_cta_primary')}
              >
                {navTarget === 'register' ? (
                  <>
                    <LoadingSpinner size="sm" className="border-slate-200 border-t-slate-900" />
                    Criar minha conta
                  </>
                ) : (
                  'Criar minha conta'
                )}
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-10 text-lg rounded-full border-slate-700 text-white hover:bg-slate-800 hover:text-white bg-transparent" onClick={() => onSignup('footer_cta_secondary')}>
                Falar com consultor
              </Button>
            </div>
            <p className="mt-8 text-sm text-slate-500">
              Sem cartão de crédito necessário para começar.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <a
            href="/"
            title="Ir para a página inicial"
            className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:opacity-90 active:opacity-80"
          >
            <img
              src={(logoSisteQ as any).src ?? (logoSisteQ as any)}
              alt="SisteQ"
              className="h-8 w-auto object-contain"
              loading="lazy"
              decoding="async"
            />
          </a>
          <div className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} sisteQ. Todos os direitos reservados.
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors">Termos</a>
            <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors">Privacidade</a>
            <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors">Contato</a>
          </div>
        </div>
      </footer>
      
      {/* Sticky Mobile CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-slate-200 z-50">
        <Button
          className="w-full h-12 rounded-xl bg-blue-600 text-white shadow-lg"
          disabled={navTarget !== null}
          onClick={() => onSignup('sticky_mobile')}
        >
          {navTarget === 'register' ? (
            <>
              <LoadingSpinner size="sm" className="border-white/30 border-t-white" />
              Criar conta grátis
            </>
          ) : (
            'Criar conta grátis'
          )}
        </Button>
      </div>
    </div>
  );
}
