import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Sparkles, Settings, MessageSquare, User, Zap, Bot, Save, RotateCcw } from 'lucide-react';

const EXAMPLE_PROMPTS = [
  {
    title: "Atendimento ao Cliente",
    description: "Suporte profissional e prestativo",
    prompt: `Você é um assistente de atendimento ao cliente experiente e prestativo. Sempre responda de forma cordial, profissional e eficiente.

Diretrizes:
- Seja empático e compreensivo
- Forneça soluções claras e práticas
- Pergunte detalhes quando necessário
- Mantenha um tom amigável mas profissional
- Se não souber algo, seja honesto e ofereça alternativas`
  },
  {
    title: "Especialista em Tecnologia",
    description: "Suporte técnico detalhado",
    prompt: `Você é um especialista em tecnologia com amplo conhecimento em desenvolvimento, sistemas e soluções digitais.

Diretrizes:
- Explique conceitos técnicos de forma clara
- Forneça exemplos práticos quando possível
- Sugira melhores práticas e soluções eficientes
- Adapte o nível técnico conforme o contexto
- Mantenha-se atualizado com as tendências tecnológicas`
  },
  {
    title: "FAQ Automático",
    description: "Respostas rápidas e precisas",
    prompt: `Você é um assistente especializado em responder perguntas frequentes de forma rápida e precisa.

Diretrizes:
- Vá direto ao ponto nas respostas
- Use listas e tópicos quando apropriado
- Antecipe perguntas relacionadas
- Forneça links ou referências quando relevante
- Mantenha as respostas organizadas e fáceis de entender`
  },
  {
    title: "Consultor de Negócios",
    description: "Orientação estratégica e insights",
    prompt: `Você é um consultor de negócios experiente, especializado em estratégia, crescimento e soluções empresariais.

Diretrizes:
- Analise situações de forma estratégica
- Forneça insights baseados em dados e experiência
- Sugira soluções práticas e implementáveis
- Considere aspectos financeiros e operacionais
- Mantenha foco em resultados mensuráveis`
  },
  {
    title: "Agendamento",
    description: "Agente para marcar consultas e reuniões",
    prompt: `Você é um assistente especializado em agendamentos. Ajude os clientes a marcar consultas, reuniões ou serviços de forma eficiente.

Diretrizes:
- Verifique disponibilidade de horários
- Confirme todos os detalhes do agendamento
- Colete informações necessárias (nome, contato, tipo de serviço)
- Envie lembretes e confirmações
- Seja organizado e mantenha agenda atualizada`
  },
  {
    title: "Educacional",
    description: "Agente para ensinar e explicar conceitos",
    prompt: `Você é um tutor educacional paciente e didático. Sua função é explicar conceitos, tirar dúvidas acadêmicas e ajudar no aprendizado.

Diretrizes:
- Use linguagem clara e adaptada ao nível do estudante
- Forneça exemplos práticos e analogias
- Faça perguntas para verificar compreensão
- Incentive o aprendizado e a curiosidade
- Divida conceitos complexos em partes menores`
  },
  {
    title: "Reservas e Pedidos",
    description: "Agente para processar pedidos e reservas",
    prompt: `Você é um assistente especializado em processar pedidos e reservas. Colete informações, confirme detalhes e finalize transações.

Diretrizes:
- Colete todas as informações necessárias
- Confirme detalhes do pedido/reserva
- Calcule valores e prazos corretamente
- Informe sobre políticas de cancelamento e troca
- Forneça confirmações e números de protocolo`
  }
];

function AgentConfigModal({ isOpen, onClose, socket, currentConfig, onSave }) {
  const [agentName, setAgentName] = useState('');
  const [agentPersonality, setAgentPersonality] = useState('profissional');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [workingDays, setWorkingDays] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false
  });
  const [workingHours, setWorkingHours] = useState({
    start: '09:00',
    end: '18:00'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setAgentName(currentConfig.name || 'Assistente IA');
      setAgentPersonality(currentConfig.personality || 'profissional');
      setAgentPrompt(currentConfig.prompt || '');
      setIsEnabled(currentConfig.enabled || false);
    }
  }, [currentConfig]);

  const toggleWorkingDay = (day) => {
    setWorkingDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const config = {
      name: agentName,
      personality: agentPersonality,
      prompt: agentPrompt,
      enabled: isEnabled,
      schedule: {
        enabled: scheduleEnabled,
        workingDays: workingDays,
        workingHours: workingHours
      }
    };

    try {
      // Enviar configuração via socket
      if (socket) {
        socket.emit('updateAgentConfig', config);
      }
      
      // Callback para o componente pai
      if (onSave) {
        onSave(config);
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const copyPrompt = async (prompt, index) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar prompt:', error);
    }
  };

  const useExample = (prompt) => {
    setAgentPrompt(prompt);
  };

  const resetConfig = () => {
    setAgentName('Assistente IA');
    setAgentPersonality('profissional');
    setAgentPrompt('');
    setIsEnabled(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Configurações do Agente</h2>
                <p className="text-blue-100 text-sm">Configure o comportamento do assistente IA</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-1">
            {/* Status Principal */}
            <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Agente Ativo</h3>
                  <p className="text-sm text-gray-500">Ativar resposta automática no WhatsApp</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Divisor */}
            <div className="border-t border-gray-200 my-2"></div>

            {/* Nome do Agente */}
            <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Nome do Agente</h3>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="mt-1 text-sm text-gray-500 bg-transparent border-none outline-none focus:text-gray-700 w-full"
                    placeholder="Nome do assistente"
                  />
                </div>
              </div>
            </div>

            {/* Personalidade */}
            <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Personalidade</h3>
                  <select
                    value={agentPersonality}
                    onChange={(e) => setAgentPersonality(e.target.value)}
                    className="mt-1 text-sm text-gray-500 bg-transparent border-none outline-none focus:text-gray-700 w-full cursor-pointer"
                  >
                    <option value="profissional">Profissional</option>
                    <option value="amigavel">Amigável</option>
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Prompt Personalizado */}
             <div className="p-4 hover:bg-gray-50 rounded-lg transition-colors">
               <div className="flex items-start space-x-3">
                 <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center mt-1">
                   <MessageSquare className="h-5 w-5 text-orange-600" />
                 </div>
                 <div className="flex-1">
                   <h3 className="font-medium text-gray-900 mb-2">Instruções do Agente</h3>
                   <p className="text-xs text-gray-500 mb-3">
                     Defina como o agente deve se comportar e responder
                   </p>
                   <textarea
                     value={agentPrompt}
                     onChange={(e) => setAgentPrompt(e.target.value)}
                     rows={6}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                     placeholder="Digite as instruções para o seu agente aqui..."
                   />
                 </div>
               </div>
             </div>

             {/* Divisor */}
             <div className="border-t border-gray-200 my-2"></div>

             {/* Horários de Atendimento */}
             <div className="p-4 hover:bg-gray-50 rounded-lg transition-colors">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center space-x-3">
                   <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                     <Settings className="h-5 w-5 text-indigo-600" />
                   </div>
                   <div>
                     <h3 className="font-medium text-gray-900">Horários de Atendimento</h3>
                     <p className="text-sm text-gray-500">Definir quando o agente deve responder</p>
                   </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                   <input
                     type="checkbox"
                     checked={scheduleEnabled}
                     onChange={(e) => setScheduleEnabled(e.target.checked)}
                     className="sr-only peer"
                   />
                   <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                 </label>
               </div>

               {scheduleEnabled && (
                 <div className="ml-13 space-y-4">
                   {/* Dias da Semana */}
                   <div>
                     <h4 className="text-sm font-medium text-gray-700 mb-3">Dias de Funcionamento</h4>
                     <div className="grid grid-cols-2 gap-2">
                       {[
                         { key: 'monday', label: 'Segunda-feira' },
                         { key: 'tuesday', label: 'Terça-feira' },
                         { key: 'wednesday', label: 'Quarta-feira' },
                         { key: 'thursday', label: 'Quinta-feira' },
                         { key: 'friday', label: 'Sexta-feira' },
                         { key: 'saturday', label: 'Sábado' },
                         { key: 'sunday', label: 'Domingo' }
                       ].map((day) => (
                         <div key={day.key} className="flex items-center justify-between p-2 bg-white rounded border">
                           <span className="text-sm text-gray-700">{day.label}</span>
                           <label className="relative inline-flex items-center cursor-pointer">
                             <input
                               type="checkbox"
                               checked={workingDays[day.key]}
                               onChange={() => toggleWorkingDay(day.key)}
                               className="sr-only peer"
                             />
                             <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                           </label>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Horário de Funcionamento */}
                   <div>
                     <h4 className="text-sm font-medium text-gray-700 mb-3">Horário de Funcionamento</h4>
                     <div className="flex items-center space-x-3">
                       <div className="flex-1">
                         <label className="block text-xs text-gray-500 mb-1">Início</label>
                         <input
                           type="time"
                           value={workingHours.start}
                           onChange={(e) => setWorkingHours(prev => ({ ...prev, start: e.target.value }))}
                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                         />
                       </div>
                       <div className="flex-1">
                         <label className="block text-xs text-gray-500 mb-1">Fim</label>
                         <input
                           type="time"
                           value={workingHours.end}
                           onChange={(e) => setWorkingHours(prev => ({ ...prev, end: e.target.value }))}
                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                         />
                       </div>
                     </div>
                   </div>
                 </div>
               )}
             </div>

            {/* Exemplos Rápidos */}
            <div className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">Exemplos Rápidos</h4>
              <div className="grid grid-cols-2 gap-2">
                {EXAMPLE_PROMPTS.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => useExample(example.prompt)}
                    className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-sm text-gray-900">{example.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{example.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex-shrink-0">
          <div className="flex justify-between">
            <button
              onClick={resetConfig}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Resetar</span>
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Agente'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentConfigModal;