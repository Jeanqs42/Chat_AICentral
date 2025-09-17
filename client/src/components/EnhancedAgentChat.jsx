import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Eye, EyeOff, Settings, BookOpen, Sparkles, Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import AgentConfigModal from './AgentConfigModal';

function EnhancedAgentChat({ 
  socket, 
  whatsappMessages, 
  whatsappChats, 
  selectedWhatsappChat,
  agentEnabled,
  onToggleAgent 
}) {
  const [agentMessages, setAgentMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatAnalysis, setChatAnalysis] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [agentConfig, setAgentConfig] = useState({
    name: 'Assistente IA',
    personality: 'profissional',
    prompt: '',
    enabled: false
  });
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [agentMessages]);

  // Análise automática da conversa quando há mudanças
  useEffect(() => {
    if (selectedWhatsappChat && whatsappMessages.length > 0) {
      const analysis = {
        totalMessages: whatsappMessages.length,
        lastActivity: whatsappMessages[whatsappMessages.length - 1]?.timestamp,
        userMessages: whatsappMessages.filter(m => !m.fromMe).length,
        myMessages: whatsappMessages.filter(m => m.fromMe).length,
        conversationStatus: whatsappMessages.length > 10 ? 'Ativa' : whatsappMessages.length > 3 ? 'Moderada' : 'Iniciando'
      };
      setChatAnalysis(analysis);
    } else {
      setChatAnalysis(null);
    }
  }, [selectedWhatsappChat, whatsappMessages]);

  useEffect(() => {
    if (socket) {
      // Listeners para respostas dos agentes
      socket.on('agent-response', (data) => {
        const newMessage = {
          id: Date.now().toString(),
          content: data.text || data.message,
          role: 'assistant',
          timestamp: new Date()
        };
        setAgentMessages(prev => [...prev, newMessage]);
        setIsTyping(false);
      });

      socket.on('user-assistant-response', (data) => {
        const newMessage = {
          id: Date.now().toString(),
          content: data.content || data.message,
          role: 'assistant',
          timestamp: new Date()
        };
        setAgentMessages(prev => [...prev, newMessage]);
        setIsTyping(false);
      });
      
      socket.on('support-agent-response', (data) => {
        const newMessage = {
          id: Date.now().toString(),
          content: data.content || data.message,
          role: 'assistant',
          timestamp: new Date()
        };
        setAgentMessages(prev => [...prev, newMessage]);
        setIsTyping(false);
      });

      // Listeners para configuração do agente
      socket.on('agent-config-saved', (data) => {
        if (data.config) {
          setAgentConfig(data.config);
          console.log('Configuração do agente atualizada:', data.config);
        }
      });

      socket.on('agent-config-updated', (data) => {
        if (data.config) {
          setAgentConfig(data.config);
          console.log('Configuração do agente carregada:', data.config);
        }
      });

      // Solicitar configuração atual do agente
      socket.emit('get-agent-config');

      return () => {
        socket.off('agent-response');
        socket.off('user-assistant-response');
        socket.off('support-agent-response');
        socket.off('agent-config-saved');
        socket.off('agent-config-updated');
      };
    }
  }, [socket]);

  const sendMessage = async (message) => {
    if (!message.trim() || isTyping) return;

    const userMessage = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date()
    };

    setAgentMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Preparar contexto completo
      const fullPrompt = agentConfig.prompt 
        ? `${agentConfig.prompt}\n\nUsuário: ${message}`
        : message;

      // Enviar para o agente via socket com contexto do WhatsApp
      if (socket) {
        socket.emit('agent-query', {
          message: fullPrompt,
          context: {
            selectedChat: selectedWhatsappChat,
            recentMessages: whatsappMessages.slice(-10),
            allChats: whatsappChats,
            analysis: chatAnalysis,
            agentConfig: agentConfig
          },
          sessionId: sessionId || undefined
        });
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setIsTyping(false);
    }
  };

  const resetSession = () => {
    setAgentMessages([]);
    setSessionId('');
    if (socket) {
      socket.emit('reset-agent-session');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  const handleConfigSave = (config) => {
    setAgentConfig(config);
    // Configuração salva - ativação deve ser feita manualmente nas configurações
  };

  const remainingRequests = "ilimitadas"; // Pode ser configurado conforme necessário

  return (
    <div className="flex flex-col h-full bg-white max-h-[600px]">
      {/* Sidebar */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{agentConfig.name}</h2>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${agentEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-xs text-gray-600">
                  {agentEnabled ? 'Online no WhatsApp' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Configurar Agente"
            >
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
            
            <button
              onClick={resetSession}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Nova Conversa"
            >
              <RotateCcw className="w-4 h-4 text-gray-600" />
            </button>

            <button
              onClick={onToggleAgent}
              className={`p-2 rounded-full transition-colors ${
                agentEnabled 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-600'
              }`}
              title={agentEnabled ? 'Desativar agente no WhatsApp' : 'Ativar agente no WhatsApp'}
            >
              {agentEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>Personalidade: <span className="text-blue-600 font-medium capitalize">{agentConfig.personality}</span></p>
          <p>Requests restantes: <span className="text-gray-900">{remainingRequests}</span></p>
        </div>

        {/* Agent Status */}
        {agentConfig.prompt && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Agente Configurado</span>
            </div>
            <p className="text-xs text-blue-700 truncate">
              {agentConfig.prompt.substring(0, 60)}...
            </p>
          </div>
        )}
      </div>

      {/* Contexto compacto do WhatsApp */}
      {selectedWhatsappChat && (
        <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
          <div className="text-xs text-blue-700 flex items-center justify-between">
            <span><strong>📱</strong> {selectedWhatsappChat.name}</span>
            <span>{whatsappMessages.length} msgs</span>
          </div>
        </div>
      )}

      {/* Chat Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h1 className="font-semibold text-gray-900">Chat com Agente IA</h1>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 flex flex-col scroll-smooth"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      >
        {/* Spacer para empurrar mensagens para baixo */}
        <div className="flex-1"></div>
        
        {/* Container das mensagens */}
        <div className="space-y-4 max-w-4xl mx-auto w-full">
          {agentMessages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2 text-gray-900">Olá! Como posso ajudá-lo hoje?</h3>
              <p className="text-gray-600">
                {selectedWhatsappChat 
                  ? `Estou analisando a conversa com ${selectedWhatsappChat.name}` 
                  : 'Faça uma pergunta ou configure o agente para começar.'}
              </p>
              {selectedWhatsappChat && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 max-w-md mx-auto">
                  💡 Dica: Pergunte "Como está a conversa?" ou "Sugira uma resposta"
                </div>
              )}
            </div>
          )}

          {agentMessages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isTyping && (
            <div className="flex w-full mb-4 justify-start">
              <div className="flex items-end gap-2 max-w-[70%]">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 shadow-md flex items-center justify-center mb-1">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 shadow-lg border border-gray-100 relative">
                  <div className="absolute bottom-0 left-0 w-0 h-0 border-r-[8px] border-r-white border-t-[8px] border-t-transparent -translate-x-1" />
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{animationDelay: '0.1s'}} />
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{animationDelay: '0.2s'}} />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
          <input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedWhatsappChat ? `Pergunte sobre ${selectedWhatsappChat.name}...` : "Digite sua mensagem..."}
            disabled={isTyping}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button 
            type="submit" 
            disabled={isTyping || !inputMessage.trim()}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
        {selectedWhatsappChat && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            💡 Dica: Pergunte "Como está a conversa?" ou "Sugira uma resposta"
          </div>
        )}
      </div>

      {/* Agent Config Modal */}
      <AgentConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        socket={socket}
        currentConfig={agentConfig}
        onSave={handleConfigSave}
      />
    </div>
  );
}

// Componente MessageBubble integrado
function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end gap-2 max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mb-1 ${
          isUser 
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-md' 
            : 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-md'
        }`}>
          {isUser ? (
            <User className="h-4 w-4 text-white" />
          ) : (
            <Bot className="h-4 w-4 text-white" />
          )}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`rounded-2xl px-4 py-3 shadow-lg relative ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              : 'bg-white text-gray-800 border border-gray-100'
          }`}>
            {/* Seta do balão */}
            <div className={`absolute bottom-0 w-0 h-0 ${
              isUser 
                ? 'right-0 border-l-[8px] border-l-blue-600 border-t-[8px] border-t-transparent translate-x-1'
                : 'left-0 border-r-[8px] border-r-white border-t-[8px] border-t-transparent -translate-x-1'
            }`} />
            
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
          
          {/* Timestamp */}
          <span className={`text-xs text-gray-400 mt-1 px-2 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {message.timestamp instanceof Date 
              ? message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }
          </span>
        </div>
      </div>
    </div>
  );
}

export default EnhancedAgentChat;