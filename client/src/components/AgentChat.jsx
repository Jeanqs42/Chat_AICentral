import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Eye, EyeOff, Settings, BookOpen } from 'lucide-react';

function AgentChat({ 
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
  const [showTraining, setShowTraining] = useState(false);
  const [trainingText, setTrainingText] = useState('Você é um assistente de atendimento ao cliente profissional e prestativo. Responda sempre de forma educada, clara e objetiva. Mantenha um tom amigável e procure resolver as dúvidas dos clientes da melhor forma possível.');
  const [agentName, setAgentName] = useState('Assistente IA');
  const [agentPersonality, setAgentPersonality] = useState('profissional');
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
      socket.on('user-assistant-response', (data) => {
        setAgentMessages(prev => [...prev, {
          id: Date.now(),
          text: data.content || data.message,
          sender: 'agent',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      });
      
      socket.on('support-agent-response', (data) => {
        setAgentMessages(prev => [...prev, {
          id: Date.now(),
          text: data.content || data.message,
          sender: 'agent',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      });

      return () => {
        socket.off('user-assistant-response');
        socket.off('support-agent-response');
      };
    }
  }, [socket]);

  const sendToAgent = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setAgentMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Enviar mensagem para o agente via socket
    if (socket) {
      socket.emit('user-assistant', {
        message: inputMessage,
        whatsappContext: {
          selectedChat: selectedWhatsappChat,
          recentMessages: whatsappMessages.slice(-10),
          allChats: whatsappChats,
          analysis: chatAnalysis
        }
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendToAgent();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header do Chat do Agente */}
      <div className="bg-blue-600 text-white p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="w-6 h-6" />
            <div>
              <h2 className="font-semibold">Agente IA</h2>
              <p className="text-sm opacity-90">Assistente para WhatsApp</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {agentEnabled ? 'Ativo no WhatsApp' : 'Inativo no WhatsApp'}
            </span>
            <button
              onClick={() => setShowTraining(!showTraining)}
              className={`p-2 rounded-full transition-colors ${
                showTraining 
                  ? 'bg-yellow-500 hover:bg-yellow-600' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
              title="Configurar treinamento do agente"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleAgent}
              className={`p-2 rounded-full transition-colors ${
                agentEnabled 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-gray-500 hover:bg-gray-600'
              }`}
              title={agentEnabled ? 'Desativar agente no WhatsApp' : 'Ativar agente no WhatsApp'}
            >
              {agentEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Contexto do WhatsApp */}
      {selectedWhatsappChat && (
        <div className="bg-gray-50 p-3 border-b">
          <div className="text-sm text-gray-600">
            <strong>📱 Monitorando:</strong> {selectedWhatsappChat.name}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {whatsappMessages.length} mensagens no histórico
          </div>
        </div>
      )}

      {/* Context Panel */}
      {selectedWhatsappChat && chatAnalysis && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">📊 Contexto da Conversa</h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-yellow-700">
            <div>💬 Total: {chatAnalysis.totalMessages}</div>
            <div>📤 Enviadas: {chatAnalysis.myMessages}</div>
            <div>📥 Recebidas: {chatAnalysis.userMessages}</div>
            <div>📈 Status: {chatAnalysis.conversationStatus}</div>
          </div>
          {chatAnalysis.lastActivity && (
            <div className="text-xs text-yellow-600 mt-2">
              🕒 Última atividade: {new Date(chatAnalysis.lastActivity).toLocaleTimeString('pt-BR')}
            </div>
          )}
        </div>
      )}

      {/* Seção de Treinamento */}
      {showTraining && (
        <div className="bg-purple-50 border-b border-purple-200 p-4">
          <h3 className="text-sm font-medium text-purple-800 mb-3 flex items-center">
            <BookOpen className="w-4 h-4 mr-2" />
            Configuração do Agente
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-700 mb-1">
                Nome do Agente
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Nome do assistente"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-purple-700 mb-1">
                Personalidade
              </label>
              <select
                value={agentPersonality}
                onChange={(e) => setAgentPersonality(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="profissional">Profissional</option>
                <option value="amigavel">Amigável</option>
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-purple-700 mb-1">
                Instruções de Treinamento
              </label>
              <textarea
                value={trainingText}
                onChange={(e) => setTrainingText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Descreva como o agente deve se comportar e responder..."
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // Aqui você pode salvar as configurações
                  console.log('Salvando configurações:', { agentName, agentPersonality, trainingText });
                  setShowTraining(false);
                }}
                className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-md text-sm hover:bg-purple-700 transition-colors"
              >
                Salvar Configurações
              </button>
              <button
                onClick={() => setShowTraining(false)}
                className="px-3 py-2 border border-purple-300 text-purple-700 rounded-md text-sm hover:bg-purple-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {agentMessages.length === 0 ? (
          <div className="text-center text-gray-500 mt-4">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Assistente pronto</p>
            <p className="text-xs mt-1 text-gray-400">Monitora conversas e responde perguntas</p>
            {selectedWhatsappChat && (
              <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                💡 Estou analisando a conversa com {selectedWhatsappChat.name}
              </div>
            )}
          </div>
        ) : (
          agentMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'user' 
                    ? 'bg-green-500' 
                    : 'bg-gray-300'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-gray-600" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex flex-col max-w-xs lg:max-w-md ${
                  message.sender === 'user' ? 'items-end' : 'items-start'
                }`}>
                  <div className={`rounded-lg p-3 shadow-sm ${
                    message.sender === 'user'
                      ? 'bg-green-500 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                  </div>
                  
                  {/* Timestamp */}
                  <span className="text-xs text-gray-500 mt-1 px-1">
                    {message.timestamp && message.timestamp instanceof Date 
                    ? message.timestamp.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : new Date().toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                  }
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Auto insights */}
        {selectedWhatsappChat && whatsappMessages.length > 0 && agentMessages.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-green-800 font-medium">Análise Automática</p>
                <p className="text-xs text-green-700 mt-1">
                  {whatsappMessages.length > 5 
                    ? `Conversa ativa com ${whatsappMessages.length} mensagens. Posso ajudar com análise ou sugestões de resposta.`
                    : 'Nova conversa detectada. Monitoro para fornecer insights quando necessário.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <span className="text-xs opacity-75">Agente</span>
              </div>
              <div className="flex space-x-1 mt-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedWhatsappChat ? `Pergunte sobre ${selectedWhatsappChat.name}...` : "Digite sua mensagem para o agente..."}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <button
            onClick={sendToAgent}
            disabled={!inputMessage.trim()}
            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {selectedWhatsappChat && (
          <div className="mt-2 text-xs text-gray-500">
            💡 Dica: Pergunte "Como está a conversa?" ou "Sugira uma resposta"
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentChat;