import React, { useState } from 'react';
import { 
  MessageCircle, 
  Zap, 
  Clock, 
  Users, 
  BarChart3, 
  Shield, 
  CheckCircle, 
  Star,
  ArrowRight,
  Play,
  Bot,
  Smartphone,
  TrendingUp,
  HeadphonesIcon,
  Globe,
  Sparkles
} from 'lucide-react';

const LandingPage = ({ onEnterPlatform }) => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const features = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: "Agente IA Inteligente",
      description: "Crie seu assistente virtual personalizado em minutos com nossa IA avançada"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Atendimento 24/7",
      description: "Seu negócio nunca para. Atenda clientes a qualquer hora, todos os dias"
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "Integração WhatsApp",
      description: "Conecte diretamente ao WhatsApp Business e comece a atender imediatamente"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Aumente suas Vendas",
      description: "Converta mais leads em clientes com respostas rápidas e personalizadas"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Múltiplos Agentes",
      description: "Crie diferentes agentes para vendas, suporte, atendimento e muito mais"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Relatórios Detalhados",
      description: "Acompanhe métricas, conversões e performance em tempo real"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Cadastre-se Grátis",
      description: "Crie sua conta em segundos e acesse nossa plataforma"
    },
    {
      number: "02", 
      title: "Configure seu Agente",
      description: "Escolha um template ou personalize completamente seu assistente"
    },
    {
      number: "03",
      title: "Conecte ao WhatsApp",
      description: "Integre com sua conta WhatsApp Business em poucos cliques"
    },
    {
      number: "04",
      title: "Comece a Atender",
      description: "Seu agente já está pronto para atender seus clientes 24/7"
    }
  ];

  const testimonials = [
    {
      name: "Maria Silva",
      company: "Loja Fashion Style",
      text: "Aumentei minhas vendas em 300% no primeiro mês! O agente responde os clientes mesmo quando estou dormindo.",
      rating: 5,
      avatar: "👩‍💼"
    },
    {
      name: "João Santos",
      company: "TechSolutions",
      text: "Revolucionou nosso atendimento. Agora conseguimos atender 10x mais clientes com a mesma equipe.",
      rating: 5,
      avatar: "👨‍💻"
    },
    {
      name: "Ana Costa",
      company: "Consultoria Empresarial",
      text: "Meus clientes adoram o atendimento rápido. Nunca mais perdi uma oportunidade de negócio.",
      rating: 5,
      avatar: "👩‍🎓"
    }
  ];

  const plans = [
    {
      name: "Starter",
      price: "Grátis",
      period: "para sempre",
      description: "Perfeito para testar e pequenos negócios",
      features: [
        "1 Agente IA",
        "100 mensagens/mês",
        "Templates básicos",
        "Suporte por email"
      ],
      popular: false,
      buttonText: "Começar Grátis"
    },
    {
      name: "Professional",
      price: "R$ 97",
      period: "/mês",
      description: "Ideal para empresas em crescimento",
      features: [
        "5 Agentes IA",
        "5.000 mensagens/mês",
        "Templates avançados",
        "Relatórios detalhados",
        "Suporte prioritário",
        "Integração API"
      ],
      popular: true,
      buttonText: "Teste 7 dias grátis"
    },
    {
      name: "Enterprise",
      price: "R$ 297",
      period: "/mês",
      description: "Para grandes empresas e agências",
      features: [
        "Agentes ilimitados",
        "Mensagens ilimitadas",
        "White label",
        "Suporte 24/7",
        "Gerente dedicado",
        "Customizações"
      ],
      popular: false,
      buttonText: "Falar com Vendas"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Chat AICentral
                </span>
                <span className="text-xs text-gray-500">by Vexpro</span>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Recursos</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">Como Funciona</a>
              <a href="#demo" className="text-gray-600 hover:text-blue-600 transition-colors">Demonstração</a>
            </nav>

            <div className="flex items-center space-x-4">
              <button 
                onClick={onEnterPlatform}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-300 font-medium"
              >
                Começar Grátis
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Plataforma 100% Gratuita - Desenvolvida pela Vexpro</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Não Fique Para Trás!
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                Use IA no WhatsApp
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              <strong>Milhares de empresas já usam Inteligência Artificial</strong> para atender clientes automaticamente. 
              Nossa plataforma gratuita conecta você à <strong>API AICentral</strong> - o agente inteligente mais avançado do Brasil.
              <br /><br />
              <span className="text-blue-600 font-semibold">✓ Sem login necessário</span> • 
              <span className="text-blue-600 font-semibold"> ✓ Sem planos pagos</span> • 
              <span className="text-blue-600 font-semibold"> ✓ 100% Gratuito</span>
            </p>
            
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6 mb-12 max-w-4xl mx-auto">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-green-100 rounded-full p-3 mr-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">API AICentral - Plano Gratuito Generoso</h3>
              </div>
              <p className="text-lg text-gray-700 mb-4">
                A <strong>AICentral.store</strong> oferece <strong>100 requisições diárias GRÁTIS</strong> - perfeito para:
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span>Empresas com baixa demanda de atendimento</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span>Assistente pessoal no WhatsApp</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span>Diferencial competitivo para qualquer negócio</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span>Teste completo antes de escalar</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button 
                onClick={onEnterPlatform}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl transition-all duration-300 flex items-center space-x-2 group"
              >
                <span>Começar Agora - 100% Grátis</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <a 
                href="https://www.youtube.com/watch?v=uoP8ks_HWkQ"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Play className="w-5 h-5 ml-1" />
                </div>
                <span className="font-medium">Ver Demonstração</span>
              </a>
            </div>
            
            <div className="mt-16 flex items-center justify-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Setup em 5 minutos</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Suporte em português</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Veja Como é
              <span className="text-blue-600"> Simples</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Interface intuitiva e moderna para criar seu agente de IA no WhatsApp
            </p>
          </div>

          {/* Platform Preview */}
          <div className="mb-16">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-500">Chat AICentral - Plataforma Gratuita</div>
                </div>
                
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Assistente IA</h3>
                        <p className="text-blue-100 text-sm">Online • Powered by AICentral</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="flex justify-end">
                      <div className="bg-blue-500 text-white px-4 py-2 rounded-2xl rounded-br-sm max-w-xs">
                        Olá! Como posso ajudar sua empresa hoje?
                      </div>
                    </div>
                    
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl rounded-bl-sm max-w-xs">
                        Preciso de um assistente para atendimento ao cliente
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-2xl rounded-br-sm max-w-xs">
                        Perfeito! Posso configurar um assistente inteligente para sua empresa. Com a API AICentral, você tem 100 requisições diárias gratuitas!
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-gray-500 text-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span>Digitando...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Setup Instantâneo</h3>
              <p className="text-gray-600">
                Cole sua API key e comece a usar imediatamente. Sem instalações complexas ou configurações demoradas.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">IA Avançada</h3>
              <p className="text-gray-600">
                Powered by AICentral.store - a API mais avançada do mercado com modelos de última geração.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">100% Gratuito</h3>
              <p className="text-gray-600">
                Plataforma completamente gratuita. Apenas sua API key da AICentral é necessária (100 requests/dia grátis).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Como funciona?
              <span className="text-purple-600"> Simples assim!</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Em apenas 4 passos simples, você terá seu agente de IA funcionando 
              e atendendo seus clientes no WhatsApp.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto group-hover:scale-110 transition-transform">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-purple-200"></div>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-24 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Veja a Plataforma
              <span className="text-blue-600"> em Ação</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Assista como é simples configurar seu agente de IA e começar a atender clientes automaticamente no WhatsApp.
            </p>
            
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <a 
                    href="https://www.youtube.com/watch?v=uoP8ks_HWkQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center space-y-4 hover:scale-105 transition-transform duration-300"
                  >
                    <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl group-hover:shadow-3xl transition-shadow">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Demonstração Completa</h3>
                      <p className="text-gray-600">Veja como configurar em menos de 5 minutos</p>
                    </div>
                  </a>
                </div>
              </div>
              
              <div className="mt-8 grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Interface Intuitiva</h3>
                  <p className="text-gray-600">Design simples e fácil de usar, sem complicações técnicas</p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                    <Bot className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">IA Avançada</h3>
                  <p className="text-gray-600">Powered by AICentral - a IA mais inteligente do Brasil</p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Setup Rápido</h3>
                  <p className="text-gray-600">Configure tudo em minutos e comece a atender hoje mesmo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Não Deixe Seus Concorrentes Saírem na Frente!
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Milhares de empresas já usam IA para atender clientes 24/7. 
            Comece agora mesmo com nossa plataforma 100% gratuita e a API AICentral.
          </p>
          
          <button 
            onClick={onEnterPlatform}
            className="group bg-white text-blue-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center space-x-2 mx-auto"
          >
            <span>Começar Agora - 100% Grátis</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <div className="text-blue-100 text-sm text-center">
            ✓ Plataforma 100% Gratuita • ✓ Sem Login Necessário • ✓ API AICentral Incluída
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold">Chat AICentral</span>
                  <span className="text-xs text-gray-400">by Vexpro</span>
                </div>
              </div>
              <p className="text-gray-400 mb-4">
                Plataforma 100% gratuita para criar agentes de IA no WhatsApp. 
                Desenvolvida pela Vexpro, powered by AICentral.store.
              </p>
              <div className="flex space-x-4">
                <a 
                  href="https://aicentral.store" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <Globe className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Plataforma</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#demo" className="hover:text-white transition-colors">Demonstração</a></li>
                <li><a href="https://aicentral.store" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">API AICentral</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Vexpro</h4>
              <ul className="space-y-2 text-gray-400">
                <li><span className="text-gray-500">Empresa desenvolvedora</span></li>
                <li><span className="text-gray-500">Soluções em IA</span></li>
                <li><a href="https://aicentral.store" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">AICentral.store</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="https://www.youtube.com/watch?v=uoP8ks_HWkQ" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Tutorial em Vídeo</a></li>
                <li><span className="text-gray-500">100% Gratuito</span></li>
                <li><span className="text-gray-500">Sem Login Necessário</span></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Vexpro. Plataforma gratuita powered by AICentral.store
            </p>
            <div className="flex space-x-6 text-sm text-gray-400 mt-4 md:mt-0">
              <span>100% Gratuito</span>
              <span>Sem Login</span>
              <a href="https://aicentral.store" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">AICentral API</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;