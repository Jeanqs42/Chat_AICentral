import React, { useState } from 'react';
import { Bot, Copy, Edit3, Save, X } from 'lucide-react';

const AgentTemplates = ({ onSelectTemplate, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const agentTemplates = [
    {
      id: 'atendimento-comercial',
      name: '🛍️ Atendimento Comercial',
      description: 'Agente especializado em vendas e suporte comercial',
      personality: 'profissional',
      prompt: 'Você é um assistente comercial especializado em vendas e atendimento ao cliente. Seja sempre educado, prestativo e focado em ajudar o cliente a encontrar a melhor solução. Responda de forma clara e objetiva, oferecendo informações sobre produtos, preços e condições de pagamento quando solicitado.',
      welcomeMessage: '👋 Olá! Bem-vindo(a)! Sou seu assistente comercial e estou aqui para ajudá-lo(a) com informações sobre nossos produtos e serviços. Como posso ajudá-lo(a) hoje?',
      awayMessage: '⏰ Obrigado pelo contato! No momento estamos fora do horário de atendimento, mas retornaremos em breve. Deixe sua mensagem que responderemos assim que possível!',
      autoReply: true,
      respondToGroups: false,
      autoGreeting: true,
      responseDelay: 2000,
      maxResponseLength: 300,
      rateLimitPerContact: 8,
      workingHours: {
        enabled: true,
        start: '08:00',
        end: '18:00',
        timezone: 'America/Sao_Paulo'
      },
      keywords: ['preço', 'produto', 'comprar', 'vendas', 'orçamento', 'info', 'informação']
    },
    {
      id: 'suporte-tecnico',
      name: '🔧 Suporte Técnico',
      description: 'Agente para suporte técnico e resolução de problemas',
      personality: 'profissional',
      prompt: 'Você é um assistente de suporte técnico especializado em resolver problemas e dúvidas técnicas. Seja paciente, didático e sempre busque entender completamente o problema antes de oferecer soluções. Forneça instruções claras e passo a passo quando necessário.',
      welcomeMessage: '🔧 Olá! Sou seu assistente de suporte técnico. Estou aqui para ajudá-lo(a) a resolver qualquer problema ou dúvida técnica. Descreva sua situação que encontraremos a melhor solução juntos!',
      awayMessage: '🛠️ Recebemos sua solicitação de suporte! Nossa equipe técnica está temporariamente indisponível, mas retornaremos em breve para resolver sua questão.',
      autoReply: true,
      respondToGroups: true,
      autoGreeting: true,
      responseDelay: 3000,
      maxResponseLength: 500,
      rateLimitPerContact: 10,
      workingHours: {
        enabled: true,
        start: '09:00',
        end: '17:00',
        timezone: 'America/Sao_Paulo'
      },
      keywords: ['problema', 'erro', 'bug', 'ajuda', 'suporte', 'técnico', 'não funciona', 'dúvida']
    },
    {
      id: 'recepcao-agendamento',
      name: '📅 Recepção e Agendamento',
      description: 'Agente para recepção e agendamento de consultas/serviços',
      personality: 'amigavel',
      prompt: 'Você é uma recepcionista virtual especializada em agendamentos e atendimento inicial. Seja sempre cordial, organizada e eficiente. Ajude os clientes a agendar horários, forneça informações sobre disponibilidade e procedimentos. Mantenha um tom acolhedor e profissional.',
      welcomeMessage: '📅 Olá! Bem-vindo(a) à nossa recepção virtual! Sou responsável pelos agendamentos e informações gerais. Posso ajudá-lo(a) a agendar um horário ou esclarecer dúvidas sobre nossos serviços. Como posso ajudá-lo(a)?',
      awayMessage: '🕐 Obrigado pelo contato! Nossa recepção está temporariamente fechada. Deixe sua mensagem com seus dados e preferência de horário que entraremos em contato para confirmar seu agendamento!',
      autoReply: true,
      respondToGroups: false,
      autoGreeting: true,
      responseDelay: 1500,
      maxResponseLength: 250,
      rateLimitPerContact: 6,
      workingHours: {
        enabled: true,
        start: '07:00',
        end: '19:00',
        timezone: 'America/Sao_Paulo'
      },
      keywords: ['agendar', 'agendamento', 'consulta', 'horário', 'disponibilidade', 'marcar', 'reservar']
    },
    {
      id: 'atendimento-educacional',
      name: '🎓 Atendimento Educacional',
      description: 'Agente para instituições de ensino e cursos',
      personality: 'amigavel',
      prompt: 'Você é um assistente educacional especializado em informações sobre cursos, matrículas e vida acadêmica. Seja sempre educativo, paciente e motivador. Ajude estudantes e interessados com informações sobre cursos, processos seletivos, documentação e orientações acadêmicas.',
      welcomeMessage: '🎓 Olá! Bem-vindo(a) à nossa instituição de ensino! Sou seu assistente educacional e estou aqui para ajudá-lo(a) com informações sobre nossos cursos, matrículas e vida acadêmica. Como posso ajudá-lo(a) hoje?',
      awayMessage: '📚 Obrigado pelo interesse em nossa instituição! No momento nossa equipe está em horário de aula, mas retornaremos em breve com todas as informações que você precisa!',
      autoReply: true,
      respondToGroups: true,
      autoGreeting: true,
      responseDelay: 2500,
      maxResponseLength: 400,
      rateLimitPerContact: 7,
      workingHours: {
        enabled: true,
        start: '08:00',
        end: '22:00',
        timezone: 'America/Sao_Paulo'
      },
      keywords: ['curso', 'matrícula', 'inscrição', 'vestibular', 'enem', 'bolsa', 'mensalidade', 'grade']
    },
    {
      id: 'delivery-restaurante',
      name: '🍕 Delivery e Restaurante',
      description: 'Agente para pedidos de delivery e atendimento gastronômico',
      personality: 'amigavel',
      prompt: 'Você é um assistente de delivery especializado em pedidos de comida e atendimento gastronômico. Seja sempre simpático, rápido e eficiente. Ajude os clientes com o cardápio, pedidos, informações sobre entrega e promoções. Mantenha um tom caloroso e acolhedor.',
      welcomeMessage: '🍕 Olá! Bem-vindo(a) ao nosso delivery! Sou seu assistente gastronômico e estou aqui para ajudá-lo(a) com nosso cardápio, pedidos e entregas. Que tal conhecer nossas deliciosas opções hoje?',
      awayMessage: '🕐 Obrigado pelo contato! Nossa cozinha está temporariamente fechada, mas voltaremos em breve com pratos fresquinhos! Deixe sua mensagem que entraremos em contato!',
      autoReply: true,
      respondToGroups: false,
      autoGreeting: true,
      responseDelay: 1000,
      maxResponseLength: 200,
      rateLimitPerContact: 12,
      workingHours: {
        enabled: true,
        start: '11:00',
        end: '23:00',
        timezone: 'America/Sao_Paulo'
      },
      keywords: ['cardápio', 'pedido', 'delivery', 'entrega', 'pizza', 'lanche', 'promoção', 'desconto']
    },
    {
      id: 'imobiliaria',
      name: '🏠 Imobiliária',
      description: 'Agente para corretores e imobiliárias',
      personality: 'profissional',
      prompt: 'Você é um assistente imobiliário especializado em compra, venda e locação de imóveis. Seja sempre profissional, detalhista e confiável. Ajude clientes com informações sobre imóveis, documentação, financiamento e visitas. Demonstre conhecimento do mercado imobiliário.',
      welcomeMessage: '🏠 Olá! Bem-vindo(a) à nossa imobiliária! Sou seu assistente imobiliário e estou aqui para ajudá-lo(a) a encontrar o imóvel dos seus sonhos ou realizar o melhor negócio. Como posso ajudá-lo(a) hoje?',
      awayMessage: '🏢 Obrigado pelo contato! Nossa equipe de corretores está em atendimento externo, mas retornaremos em breve para ajudá-lo(a) com seu imóvel ideal!',
      autoReply: true,
      respondToGroups: false,
      autoGreeting: true,
      responseDelay: 2000,
      maxResponseLength: 350,
      rateLimitPerContact: 8,
      workingHours: {
        enabled: true,
        start: '08:00',
        end: '18:00',
        timezone: 'America/Sao_Paulo'
      },
      keywords: ['imóvel', 'casa', 'apartamento', 'aluguel', 'venda', 'compra', 'financiamento', 'visita']
    }
  ];

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate({ ...template });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    // Aqui você pode implementar a lógica para salvar o template editado
    setIsEditing(false);
    setEditingTemplate(null);
  };

  const handleUseTemplate = (template) => {
    onSelectTemplate(template);
    onClose();
  };

  if (isEditing && editingTemplate) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">✏️ Editando Template: {editingTemplate.name}</h3>
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Template</label>
              <input
                type="text"
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
              <input
                type="text"
                value={editingTemplate.description}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prompt do Agente</label>
              <textarea
                value={editingTemplate.prompt}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, prompt: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem de Boas-vindas</label>
              <textarea
                value={editingTemplate.welcomeMessage}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20 resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem de Ausência</label>
              <textarea
                value={editingTemplate.awayMessage}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, awayMessage: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20 resize-none"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Salvar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bot className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">🤖 Templates de Agentes Prontos</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentTemplates.map((template) => (
              <div
                key={template.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSelectTemplate(template)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTemplate(template);
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Editar template"
                  >
                    <Edit3 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>Personalidade:</span>
                    <span className="capitalize font-medium">{template.personality}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Horário:</span>
                    <span className="font-medium">
                      {template.workingHours.enabled 
                        ? `${template.workingHours.start}-${template.workingHours.end}`
                        : '24h'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Grupos:</span>
                    <span className="font-medium">
                      {template.respondToGroups ? '✅ Sim' : '❌ Não'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Palavras-chave:</span>
                    <span className="font-medium">{template.keywords.length}</span>
                  </div>
                </div>
                
                {selectedTemplate?.id === template.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseTemplate(template);
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Usar Este Template</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            💡 Selecione um template e clique em "Usar Este Template" para aplicar as configurações
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentTemplates;