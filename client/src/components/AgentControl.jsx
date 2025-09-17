import { useState, useEffect } from 'react';
import { Bot, Settings, Power, MessageSquare, Sparkles, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AGENT_PRESETS = [
  {
    id: 'customer_service',
    name: 'Atendimento ao Cliente',
    description: 'Suporte profissional e prestativo',
    prompt: `Você é um assistente de atendimento ao cliente experiente e prestativo. Sempre responda de forma cordial, profissional e eficiente.

Diretrizes:
- Seja empático e compreensivo
- Forneça soluções claras e práticas
- Pergunte detalhes quando necessário
- Mantenha um tom amigável mas profissional
- Se não souber algo, seja honesto e ofereça alternativas`
  },
  {
    id: 'tech_support',
    name: 'Suporte Técnico',
    description: 'Especialista em tecnologia',
    prompt: `Você é um especialista em tecnologia com amplo conhecimento em desenvolvimento, sistemas e soluções digitais.

Diretrizes:
- Explique conceitos técnicos de forma clara
- Forneça exemplos práticos quando possível
- Sugira melhores práticas e soluções eficientes
- Adapte o nível técnico conforme o contexto
- Mantenha-se atualizado com as tendências tecnológicas`
  },
  {
    id: 'sales_assistant',
    name: 'Assistente de Vendas',
    description: 'Focado em conversão e vendas',
    prompt: `Você é um assistente de vendas experiente, especializado em identificar necessidades e apresentar soluções.

Diretrizes:
- Identifique as necessidades do cliente através de perguntas
- Apresente benefícios claros dos produtos/serviços
- Use técnicas de persuasão ética
- Crie senso de urgência quando apropriado
- Sempre busque fechar a venda ou agendar follow-up`
  },
  {
    id: 'faq_bot',
    name: 'FAQ Automático',
    description: 'Respostas rápidas e precisas',
    prompt: `Você é um assistente especializado em responder perguntas frequentes de forma rápida e precisa.

Diretrizes:
- Vá direto ao ponto nas respostas
- Use listas e tópicos quando apropriado
- Antecipe perguntas relacionadas
- Forneça links ou referências quando relevante
- Mantenha as respostas organizadas e fáceis de entender`
  }
];

const AgentControl = ({ socket, agentEnabled, onAgentToggle }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [agentStats, setAgentStats] = useState({
    messagesProcessed: 0,
    responsesGenerated: 0,
    averageResponseTime: 0
  });

  useEffect(() => {
    if (socket) {
      // Carregar configuração atual do agente
      socket.emit('get-agent-config');
      
      socket.on('agent_config_loaded', (config) => {
        setCurrentAgent(config);
        setCustomPrompt(config?.prompt || '');
        setSelectedPreset(config?.presetId || '');
      });

      socket.on('agent_stats_updated', (stats) => {
        setAgentStats(stats);
      });

      return () => {
        socket.off('agent_config_loaded');
        socket.off('agent_stats_updated');
      };
    }
  }, [socket]);

  const handleToggleAgent = () => {
    if (socket) {
      socket.emit('toggle_agent', { enabled: !agentEnabled });
      onAgentToggle(!agentEnabled);
      toast.success(`Agente ${!agentEnabled ? 'ativado' : 'desativado'} com sucesso!`);
    }
  };

  const handleSaveAgent = () => {
    if (!customPrompt.trim()) {
      toast.error('Por favor, configure um prompt para o agente');
      return;
    }

    const agentConfig = {
      prompt: customPrompt,
      presetId: selectedPreset,
      name: selectedPreset ? AGENT_PRESETS.find(p => p.id === selectedPreset)?.name : 'Agente Personalizado',
      enabled: true,
      timestamp: new Date().toISOString()
    };

    if (socket) {
      socket.emit('save-agent-config', agentConfig);
      setCurrentAgent(agentConfig);
      setShowConfig(false);
      toast.success('Configuração do agente salva com sucesso!');
    }
  };

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.id);
    setCustomPrompt(preset.prompt);
  };

  const handleClearAgent = () => {
    setCustomPrompt('');
    setSelectedPreset('');
    if (socket) {
      socket.emit('clear_agent_config');
      setCurrentAgent(null);
      toast.success('Configuração do agente removida!');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${
            agentEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
          }`}>
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Agente de Atendimento
            </h3>
            <p className="text-sm text-gray-500">
              {currentAgent ? currentAgent.name : 'Não configurado'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowConfig(true)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Configurar Agente"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleToggleAgent}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              agentEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Power className="w-3 h-3" />
            <span>{agentEnabled ? 'Ativo' : 'Inativo'}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      {agentEnabled && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-600">
              {agentStats.messagesProcessed}
            </div>
            <div className="text-xs text-blue-500">Mensagens</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-600">
              {agentStats.responsesGenerated}
            </div>
            <div className="text-xs text-green-500">Respostas</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-semibold text-purple-600">
              {agentStats.averageResponseTime}s
            </div>
            <div className="text-xs text-purple-500">Tempo Médio</div>
          </div>
        </div>
      )}

      {/* Current Agent Info */}
      {currentAgent && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Agente Ativo</span>
          </div>
          <p className="text-xs text-blue-600 truncate">
            {currentAgent.prompt.substring(0, 100)}...
          </p>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Configuração do Agente
                </h2>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Custom Prompt */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prompt Personalizado
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Defina como o agente deve se comportar e responder
                    </p>
                  </div>

                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Digite o prompt do seu agente aqui..."
                    className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveAgent}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Salvar Agente</span>
                    </button>
                    <button
                      onClick={handleClearAgent}
                      className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Presets */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Modelos Prontos
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Clique para usar um modelo pré-configurado
                    </p>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {AGENT_PRESETS.map((preset) => (
                      <div
                        key={preset.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedPreset === preset.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handlePresetSelect(preset)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {preset.name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {preset.description}
                            </p>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            Modelo
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentControl;