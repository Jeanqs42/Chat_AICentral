import React, { useState, useEffect } from 'react';
import { Settings, Bot, Save, X, FileText, Cog } from 'lucide-react';

const AgentSettings = ({ socket, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('config');
  const [agentConfig, setAgentConfig] = useState({
    name: 'Assistente Virtual',
    personality: 'profissional',
    prompt: '',
    welcomeMessage: 'Olá! Como posso ajudá-lo hoje?',
    awayMessage: 'Obrigado pela mensagem! Retornaremos em breve.',
    respondToGroups: false,
    autoGreeting: true,
    responseDelay: 2000,
    pauseAfterHuman: true,
    pauseDurationHours: 12,
    maxResponseLength: 500,
    rateLimitPerContact: 5,
    ignoreForwardedMessages: true,
    ignoreMediaMessages: false,
    rateLimitWindow: 60,
    enableTextCommands: true,
    workingHours: {
      enabled: false,
      start: '09:00',
      end: '18:00',
      timezone: 'America/Sao_Paulo'
    },
    keywords: []
  });

  const [templates] = useState([
    {
      id: 'ecommerce',
      name: 'E-commerce',
      description: 'Ideal para lojas online e vendas',
      icon: '🛒',
      config: {
        name: 'Assistente de Vendas',
        personality: 'amigavel',
        welcomeMessage: 'Olá! Bem-vindo à nossa loja! Como posso ajudá-lo hoje? 😊',
        awayMessage: 'Obrigado pelo interesse! Nossa equipe retornará em breve para ajudá-lo com sua compra.',
        prompt: 'Você é um assistente de vendas especializado em e-commerce. Seja prestativo, entusiasmado e focado em ajudar o cliente a encontrar o que precisa. Sempre pergunte sobre preferências, tamanhos, cores e ofereça produtos relacionados. Mantenha um tom amigável e use emojis apropriados.'
      }
    },
    {
      id: 'restaurant',
      name: 'Restaurante',
      description: 'Para restaurantes e delivery',
      icon: '🍕',
      config: {
        name: 'Atendente do Restaurante',
        personality: 'amigavel',
        welcomeMessage: 'Olá! Bem-vindo ao nosso restaurante! Posso ajudá-lo com seu pedido? 🍽️',
        awayMessage: 'Obrigado pelo contato! Estamos fora do horário de funcionamento, mas retornaremos em breve.',
        prompt: 'Você é um atendente de restaurante. Seja cordial, eficiente e conhecedor do cardápio. Ajude com pedidos, tire dúvidas sobre pratos, ingredientes e tempo de entrega. Sempre confirme os detalhes do pedido e endereço de entrega.'
      }
    },
    {
      id: 'healthcare',
      name: 'Saúde',
      description: 'Para clínicas e consultórios',
      icon: '🏥',
      config: {
        name: 'Assistente de Saúde',
        personality: 'profissional',
        welcomeMessage: 'Olá! Como posso ajudá-lo com seu agendamento ou dúvida médica?',
        awayMessage: 'Obrigado pelo contato. Nossa equipe médica retornará em breve.',
        prompt: 'Você é um assistente de uma clínica médica. Seja profissional, empático e cuidadoso. Ajude com agendamentos, tire dúvidas sobre procedimentos e horários. NUNCA dê conselhos médicos específicos, sempre direcione para consulta com profissional.'
      }
    },
    {
      id: 'services',
      name: 'Serviços',
      description: 'Para prestadores de serviços',
      icon: '🔧',
      config: {
        name: 'Assistente de Serviços',
        personality: 'profissional',
        welcomeMessage: 'Olá! Como posso ajudá-lo com nossos serviços hoje?',
        awayMessage: 'Obrigado pelo interesse em nossos serviços. Retornaremos em breve.',
        prompt: 'Você é um assistente de uma empresa de serviços. Seja profissional, detalhista e focado em entender as necessidades do cliente. Colete informações sobre o serviço desejado, localização, urgência e forneça orçamentos quando possível.'
      }
    },
    {
      id: 'education',
      name: 'Educação',
      description: 'Para escolas e cursos',
      icon: '📚',
      config: {
        name: 'Assistente Educacional',
        personality: 'profissional',
        welcomeMessage: 'Olá! Como posso ajudá-lo com informações sobre nossos cursos?',
        awayMessage: 'Obrigado pelo interesse em nossa instituição. Retornaremos em breve.',
        prompt: 'Você é um assistente educacional. Seja informativo, paciente e motivador. Ajude com informações sobre cursos, matrículas, horários e metodologia. Sempre incentive o aprendizado e esclareça dúvidas acadêmicas.'
      }
    },
    {
      id: 'custom',
      name: 'Personalizado',
      description: 'Configure do zero',
      icon: '⚙️',
      config: {
        name: 'Assistente Virtual',
        personality: 'profissional',
        welcomeMessage: 'Olá! Como posso ajudá-lo hoje?',
        awayMessage: 'Obrigado pela mensagem! Retornaremos em breve.',
        prompt: ''
      }
    }
  ]);

  const personalityOptions = [
    { value: 'profissional', label: 'Profissional' },
    { value: 'amigavel', label: 'Amigável' },
    { value: 'casual', label: 'Casual' }
  ];

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        {description && <div className="text-sm text-gray-500">{description}</div>}
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  useEffect(() => {
    if (socket && isOpen) {
      socket.emit('getAgentConfig');
      
      const handleConfigUpdate = (config) => {
        setAgentConfig(config);
      };

      socket.on('agentConfigUpdated', handleConfigUpdate);
      
      return () => {
        socket.off('agentConfigUpdated', handleConfigUpdate);
      };
    }
  }, [socket, isOpen]);

  const applyTemplate = (template) => {
    setAgentConfig(prev => ({
      ...prev,
      ...template.config
    }));
  };

  const saveConfig = () => {
    if (socket) {
      socket.emit('updateAgentConfig', agentConfig);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bot className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Configurações do Agente</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Cog className="h-4 w-4 inline mr-2" />
            Configurações Gerais
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Templates
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">👤 Informações do Agente</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Agente</label>
                    <input
                      type="text"
                      value={agentConfig.name}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome do seu agente"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Personalidade</label>
                    <select
                      value={agentConfig.personality}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, personality: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {personalityOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Mensagens */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">💬 Mensagens</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem de Boas-vindas</label>
                    <textarea
                      value={agentConfig.welcomeMessage}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="2"
                      placeholder="Mensagem inicial para novos contatos"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem de Ausência</label>
                    <textarea
                      value={agentConfig.awayMessage}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, awayMessage: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="2"
                      placeholder="Mensagem quando fora do horário de funcionamento"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instruções Personalizadas</label>
                    <textarea
                      value={agentConfig.prompt}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, prompt: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="3"
                      placeholder="Descreva como o agente deve se comportar (opcional)"
                    />
                  </div>
                </div>
              </div>

              {/* Controle do Agente */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🎮 Controle do Agente</h3>
                
                <div className="space-y-3">
                  <ToggleSwitch
                    enabled={agentConfig.enableTextCommands}
                    onChange={() => setAgentConfig(prev => ({ ...prev, enableTextCommands: !prev.enableTextCommands }))}
                    label="Comandos por Texto"
                    description="Permitir ativar/desativar agente com /on e /off no WhatsApp"
                  />
                  
                  <div className="bg-white p-3 rounded border border-green-200">
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">📋 Comandos Disponíveis</p>
                      <p className="text-xs text-gray-600">
                        • <strong>/on</strong> - Ativa o agente para responder automaticamente
                      </p>
                      <p className="text-xs text-gray-600">
                        • <strong>/off</strong> - Desativa o agente (pausa as respostas automáticas)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Horário de Funcionamento */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🕒 Horário de Funcionamento</h3>
                
                <div className="space-y-4">
                  <ToggleSwitch
                    enabled={agentConfig.workingHours.enabled}
                    onChange={() => setAgentConfig(prev => ({ 
                      ...prev, 
                      workingHours: { ...prev.workingHours, enabled: !prev.workingHours.enabled }
                    }))}
                    label="Ativar Horário de Funcionamento"
                    description="Restringir respostas automáticas a horários específicos"
                  />
                  
                  {agentConfig.workingHours.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Início</label>
                        <input
                          type="time"
                          value={agentConfig.workingHours.start}
                          onChange={(e) => setAgentConfig(prev => ({ 
                            ...prev, 
                            workingHours: { ...prev.workingHours, start: e.target.value }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Fim</label>
                        <input
                          type="time"
                          value={agentConfig.workingHours.end}
                          onChange={(e) => setAgentConfig(prev => ({ 
                            ...prev, 
                            workingHours: { ...prev.workingHours, end: e.target.value }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Configurações de Atendimento */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🤝 Configurações de Atendimento</h3>
                
                <div className="space-y-4">
                  <ToggleSwitch
                    enabled={agentConfig.pauseAfterHuman}
                    onChange={() => setAgentConfig(prev => ({ ...prev, pauseAfterHuman: !prev.pauseAfterHuman }))}
                    label="Parar após Humano Assumir"
                    description="Pausar agente automaticamente quando um humano assumir o atendimento"
                  />
                  
                  {agentConfig.pauseAfterHuman && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duração da Pausa (horas)</label>
                      <input
                        type="number"
                        min="1"
                        max="72"
                        value={agentConfig.pauseDurationHours}
                        onChange={(e) => setAgentConfig(prev => ({ ...prev, pauseDurationHours: parseInt(e.target.value) || 12 }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="12"
                      />
                      <p className="text-xs text-gray-500 mt-1">Tempo em horas que o agente ficará pausado após humano assumir</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Intervalos Disponíveis</label>
                    <select
                      value={agentConfig.responseDelay}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, responseDelay: parseInt(e.target.value) }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={1000}>1 segundo</option>
                      <option value={2000}>2 segundos</option>
                      <option value={3000}>3 segundos</option>
                      <option value={5000}>5 segundos</option>
                      <option value={10000}>10 segundos</option>
                      <option value={15000}>15 segundos</option>
                      <option value={30000}>30 segundos</option>
                      <option value={60000}>1 minuto</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Tempo de espera antes do agente responder às mensagens</p>
                  </div>
                </div>
              </div>

              {/* Configurações de Grupos */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">👥 Configurações de Grupos</h3>
                
                <div className="space-y-4">
                  <ToggleSwitch
                    enabled={agentConfig.respondToGroups}
                    onChange={() => setAgentConfig(prev => ({ ...prev, respondToGroups: !prev.respondToGroups }))}
                    label="Responder em Grupos"
                    description="Ativar/desativar respostas automáticas em todos os grupos do WhatsApp"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">🎯 Templates de Agente</h3>
                <p className="text-gray-600">Escolha um template pré-configurado para seu tipo de negócio</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => applyTemplate(template)}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-3">{template.icon}</div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h4>
                      <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                      
                      <div className="bg-gray-50 rounded-lg p-3 text-left">
                        <div className="text-xs text-gray-500 mb-1">Mensagem de boas-vindas:</div>
                        <div className="text-xs text-gray-700 truncate">"{template.config.welcomeMessage}"</div>
                      </div>
                      
                      <button className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors group-hover:bg-blue-700">
                        Usar Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-yellow-600 text-xl">💡</div>
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">Como usar os templates</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Clique em qualquer template para aplicar suas configurações</li>
                      <li>• Você pode personalizar as configurações após aplicar o template</li>
                      <li>• Use "Personalizado" para começar do zero</li>
                      <li>• Lembre-se de salvar suas alterações</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={saveConfig}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentSettings;