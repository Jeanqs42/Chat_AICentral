import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, MoreVertical, Phone, Video, Search, MessageCircle, Bot, User, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ChatArea = ({ selectedChat, messages, onSendMessage, whatsappReady, socket, agentEnabled, agentConfig }) => {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [humanMode, setHumanMode] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (socket) {
      socket.on('human-mode-changed', (data) => {
        if (selectedChat && data.chatId === selectedChat.id._serialized) {
          setHumanMode(data.humanMode);
        }
      });

      // Escutar eventos de digitação da IA
      socket.on('ai_typing_start', (data) => {
        if (selectedChat && data.chatId === selectedChat.id._serialized) {
          setAiTyping(true);
        }
      });

      socket.on('ai_typing_stop', (data) => {
        if (selectedChat && data.chatId === selectedChat.id._serialized) {
          setAiTyping(false);
        }
      });

      return () => {
        socket.off('human-mode-changed');
        socket.off('ai_typing_start');
        socket.off('ai_typing_stop');
      };
    }
  }, [socket, selectedChat]);

  const toggleHumanMode = () => {
    if (socket && selectedChat) {
      const newHumanMode = !humanMode;
      socket.emit('toggle-human-mode', {
        chatId: selectedChat.id._serialized,
        humanMode: newHumanMode
      });
    }
  };



  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (messageText.trim() && selectedChat && whatsappReady) {
      onSendMessage(messageText.trim());
      setMessageText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e) => {
    setMessageText(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp * 1000);
      return format(date, 'HH:mm');
    } catch (error) {
      return '';
    }
  };

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp * 1000);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Hoje';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
      } else {
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
      }
    } catch (error) {
      return '';
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    messages.forEach(message => {
      const dateKey = formatMessageDate(message.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  if (!whatsappReady) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <MessageCircle className="w-20 h-20 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-medium mb-2">WhatsApp - AI Central</h3>
          <p className="text-sm mb-4">Conecte seu WhatsApp para começar a usar</p>
          <div className="bg-white p-4 rounded-lg shadow-sm max-w-md">
            <h4 className="font-medium mb-2">Como usar:</h4>
            <ol className="text-sm text-left space-y-1">
              <li>1. Configure sua API Key do AI Central</li>
              <li>2. Conecte seu WhatsApp escaneando o QR Code</li>
              <li>3. As mensagens serão processadas automaticamente pela IA</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Selecione um chat</h3>
          <p className="text-sm">Escolha uma conversa na barra lateral para começar</p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full">
      {/* Chat Header */}
      <div className="chat-header bg-white shadow-sm p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{selectedChat.name}</h3>
            <p className="text-sm text-gray-500">
              {selectedChat.isGroup ? 'Grupo' : 'Contato'} • Online
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {agentEnabled && (
            <div className="flex items-center space-x-2 mr-2">
              {/* Agent Status */}
              <div className="flex flex-col items-center space-y-1">
                <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 rounded-full">
                  <Sparkles className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">
                    Agente Ativo
                  </span>
                </div>
                <span className="text-xs text-green-600 font-medium">
                  {agentConfig?.name || 'Assistente IA'}
                </span>
              </div>
              
              {/* Mode Toggle */}
              <button
                onClick={toggleHumanMode}
                className={`p-2 rounded-full transition-colors ${
                  humanMode 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
                title={humanMode ? 'Ativar atendimento automático' : 'Assumir atendimento humano'}
              >
                {humanMode ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </button>
            </div>
          )}
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Phone className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Video className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages Area - Aproveitando todo o espaço disponível */}
      <div 
        className="flex-1 overflow-y-auto p-4 flex flex-col scroll-smooth"
        style={{
          height: 'calc(100vh - 200px)',
          minHeight: '400px',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      >
        {/* Spacer para empurrar mensagens para baixo */}
        <div className="flex-1 min-h-0"></div>
        
        {/* Container das mensagens */}
        <div className="space-y-4">
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex justify-center mb-4">
              <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-600 shadow-sm">
                {date}
              </span>
            </div>
            
            {/* Messages for this date */}
            <div className="space-y-2">
              {dateMessages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`message-bubble max-w-xs lg:max-w-md px-4 py-2 rounded-lg break-words ${
                      message.fromMe
                        ? 'bg-whatsapp-primary text-white sent'
                        : 'bg-white text-gray-800 received shadow-sm'
                    }`}
                  >
                    {!message.fromMe && selectedChat.isGroup && (
                      <div className="text-xs font-medium text-whatsapp-primary mb-1">
                        {message.contact?.name || 'Contato'}
                      </div>
                    )}
                    
                    <div className="text-sm leading-relaxed">
                      {message.body || 'Mensagem sem conteúdo'}
                    </div>
                    
                    <div className={`text-xs mt-1 ${
                      message.fromMe ? 'text-green-100' : 'text-gray-500'
                    }`}>
                      {formatMessageTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {(isTyping || aiTyping) && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2">
                {aiTyping && (
                  <div className="flex items-center space-x-1">
                    <Bot className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">
                      {agentConfig?.name || 'IA'} está digitando
                    </span>
                  </div>
                )}
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input - Fixo na parte inferior */}
      <div className="chat-footer bg-white border-t border-gray-200 p-4">
        <div className="flex items-end space-x-3">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Smile className="w-5 h-5 text-gray-600" />
          </button>
          
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Paperclip className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={messageText}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder="Digite uma mensagem..."
              className="w-full px-4 py-3 bg-gray-100 rounded-full resize-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-whatsapp-primary text-sm max-h-32"
              rows={1}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || !whatsappReady}
            className={`p-3 rounded-full transition-colors ${
              messageText.trim() && whatsappReady
                ? 'bg-whatsapp-primary text-white hover:bg-whatsapp-secondary'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;