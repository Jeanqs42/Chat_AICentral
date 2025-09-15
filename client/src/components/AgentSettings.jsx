import React, { useState, useEffect } from 'react';
import { Settings, Bot, Save, X, FileText } from 'lucide-react';
import AgentTemplates from './AgentTemplates';

const AgentSettings = ({ socket, isOpen, onClose }) => {
  const [agentConfig, setAgentConfig] = useState({
    name: 'Assistente Virtual',
    personality: 'profissional',
    prompt: '',
    welcomeMessage: 'Olá! Como posso ajudá-lo hoje?',
    awayMessage: 'Obrigado pela mensagem! Retornaremos em breve.',
    autoReply: true,
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
    workingHours: {
      enabled: false,
      start: '09:00',
      end: '18:00',
      timezone: 'America/Sao_Paulo'
    },
    keywords: []
  });
  const [showTemplates, setShowTemplates] = useState(false);



  const personalityOptions = [
    { value: 'profissional', label: 'Profissional' },
    { value: 'amigavel', label: 'Amigável' },
    { value: 'casual', label: 'Casual' }
  ];

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div>
        <h4 className="font-medium text-gray-900">{label}</h4>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
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
    if (socket) {
      socket.on('agent_config_loaded', (data) => {
        setAgentConfig(prev => ({ ...prev, ...data.config }));
      });

      return () => {
        socket.off('agent_config_loaded');
      };
    }
  }, [socket]);

  const handleSave = () => {
    socket.emit('save_agent_config', agentConfig);
    onClose();
  };

  const handleApplyTemplate = (template) => {
    setAgentConfig(prevConfig => ({
      ...prevConfig,
      name: template.name,
      personality: template.personality,
      prompt: template.prompt,
      welcomeMessage: template.welcomeMessage,
      awayMessage: template.awayMessage,
      autoReply: template.autoReply,
      respondToGroups: template.respondToGroups,
      autoGreeting: template.autoGreeting,
      responseDelay: template.responseDelay,
      maxResponseLength: template.maxResponseLength,
      rateLimitPerContact: template.rateLimitPerContact,
      workingHours: template.workingHours,
      keywords: template.keywords || []
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bot className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">⚙️ Configurações do Agente</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Header Tab */}
        <div className="flex items-center justify-between border-b border-gray-200">
          <div className="px-6 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600 bg-blue-50">
            ⚙️ Configurações Gerais
          </div>
          <div className="px-6 py-3">
            <button
              onClick={() => setShowTemplates(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <FileText className="w-4 h-4" />
              <span>🤖 Templates Prontos</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
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

              {/* Comportamento Básico */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🤖 Comportamento</h3>
                
                <div className="space-y-3">
                  <ToggleSwitch
                    enabled={agentConfig.autoReply}
                    onChange={() => setAgentConfig(prev => ({ ...prev, autoReply: !prev.autoReply }))}
                    label="Resposta Automática"
                    description="Responder automaticamente às mensagens recebidas"
                  />
                  
                  <ToggleSwitch
                    enabled={agentConfig.autoGreeting}
                    onChange={() => setAgentConfig(prev => ({ ...prev, autoGreeting: !prev.autoGreeting }))}
                    label="Saudação Automática"
                    description="Enviar mensagem de boas-vindas automaticamente"
                  />
                  

                  
                  <ToggleSwitch
                    enabled={agentConfig.pauseAfterHuman}
                    onChange={() => setAgentConfig(prev => ({ ...prev, pauseAfterHuman: !prev.pauseAfterHuman }))}
                    label="Pausar Após Atendimento Humano"
                    description="Pausar agente automaticamente quando um humano responder"
                  />
                  
                  {agentConfig.pauseAfterHuman && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duração da Pausa (horas)</label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={agentConfig.pauseDurationHours}
                        onChange={(e) => setAgentConfig(prev => ({ ...prev, pauseDurationHours: parseInt(e.target.value) || 12 }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Tempo em horas para pausar o agente após intervenção humana</p>
                    </div>
                  )}
                  
                  <ToggleSwitch
                    enabled={agentConfig.ignoreForwardedMessages}
                    onChange={() => setAgentConfig(prev => ({ ...prev, ignoreForwardedMessages: !prev.ignoreForwardedMessages }))}
                    label="Ignorar Mensagens Encaminhadas"
                    description="Não responder automaticamente a mensagens que foram encaminhadas"
                  />
                  
                  <ToggleSwitch
                    enabled={!agentConfig.ignoreMediaMessages}
                    onChange={() => setAgentConfig(prev => ({ ...prev, ignoreMediaMessages: !prev.ignoreMediaMessages }))}
                    label="Responder a Mensagens de Mídia"
                    description="Permitir respostas automáticas para imagens, vídeos e documentos"
                  />
                </div>
              </div>
              
              {/* Configurações de Performance */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">⚡ Performance e Limites</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Delay de Resposta (ms)</label>
                    <input
                      type="number"
                      value={agentConfig.responseDelay}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, responseDelay: parseInt(e.target.value) || 2000 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="500"
                      max="10000"
                      step="500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Tempo de espera antes de responder (500-10000ms)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Máximo de Caracteres</label>
                    <input
                      type="number"
                      value={agentConfig.maxResponseLength}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, maxResponseLength: parseInt(e.target.value) || 500 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="100"
                      max="2000"
                      step="50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Limite de caracteres por resposta</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Limite por Contato/Hora</label>
                    <input
                      type="number"
                      value={agentConfig.rateLimitPerContact}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, rateLimitPerContact: parseInt(e.target.value) || 5 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Máximo de respostas por contato por hora</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Horas de Pausa</label>
                    <input
                      type="number"
                      value={agentConfig.pauseDurationHours}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, pauseDurationHours: parseInt(e.target.value) || 12 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="72"
                    />
                    <p className="text-xs text-gray-500 mt-1">Tempo de pausa após atendimento humano</p>
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
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fuso Horário</label>
                        <select
                          value={agentConfig.workingHours.timezone}
                          onChange={(e) => setAgentConfig(prev => ({ 
                            ...prev, 
                            workingHours: { ...prev.workingHours, timezone: e.target.value }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                          <option value="America/New_York">Nova York (GMT-5)</option>
                          <option value="Europe/London">Londres (GMT+0)</option>
                          <option value="Europe/Paris">Paris (GMT+1)</option>
                          <option value="Asia/Tokyo">Tóquio (GMT+9)</option>
                        </select>
                      </div>
                    </div>
                  )}
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
                  
                  <div className="bg-white p-3 rounded border border-green-200">
                    <div className="text-sm text-gray-700">
                      <p className="font-medium mb-1">📋 Configuração Simplificada</p>
                      <p className="text-xs text-gray-600">
                        • <strong>Ativado:</strong> O agente responderá em todos os grupos
                      </p>
                      <p className="text-xs text-gray-600">
                        • <strong>Desativado:</strong> O agente não responderá em nenhum grupo
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Configurações de Rate Limiting */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">⚡ Rate Limiting</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Máximo de Mensagens por Contato</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={agentConfig.rateLimitPerContact}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, rateLimitPerContact: parseInt(e.target.value) || 5 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Limite de mensagens por período de tempo</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Janela de Tempo (minutos)</label>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={agentConfig.rateLimitWindow}
                      onChange={(e) => setAgentConfig(prev => ({ ...prev, rateLimitWindow: parseInt(e.target.value) || 60 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Período em minutos para o rate limit</p>
                  </div>
                </div>
              </div>
              
              {/* Configurações de Palavras-chave */}
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🔑 Palavras-chave</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Palavras-chave para Ativação</label>
                  <textarea
                    value={agentConfig.keywords.join('\n')}
                    onChange={(e) => setAgentConfig(prev => ({ 
                      ...prev, 
                      keywords: e.target.value.split('\n').filter(k => k.trim())
                    }))}
                    placeholder="Digite as palavras-chave (uma por linha)\nExemplo:\najuda\nsuporte\ninfo\npreço"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Deixe vazio para responder a todas as mensagens. Se preenchido, o agente só responderá mensagens que contenham essas palavras</p>
                </div>
              </div>

            </div>
            
            {/* Status do Agente */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Status</h3>
              <div className="text-sm text-gray-700">
                <p>✅ Configurações avançadas disponíveis</p>
                <p>🤖 Agente com controles de performance</p>
                <p>💬 Mensagens e horários personalizáveis</p>
                <p>⚡ Rate limiting e pausas configuráveis</p>
              </div>
            </div>
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
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Salvar</span>
          </button>
        </div>
      </div>
      
      {/* Templates Modal */}
      {showTemplates && (
        <AgentTemplates
          onSelectTemplate={handleApplyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
};

export default AgentSettings;