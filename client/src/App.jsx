import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AgentChat from './components/AgentChat';
import QRCodeModal from './components/QRCodeModal';
import ApiKeyModal from './components/ApiKeyModal';
import AgentSettings from './components/AgentSettings';
import { MessageCircle, Settings, Phone, Bot, LogOut, PhoneOff, Sparkles, Cog, X, User, MessageSquare, Send, Eye, EyeOff, RotateCcw } from 'lucide-react';

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [whatsappReady, setWhatsappReady] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    // Recuperar API key do localStorage ao inicializar
    return localStorage.getItem('aicentral_api_key') || '';
  });
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isValidApiKey, setIsValidApiKey] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState(true);
  const [showAgentChat, setShowAgentChat] = useState(false);
  const [activeAgent, setActiveAgent] = useState('user'); // 'user' ou 'support'
  const [userAssistantMessages, setUserAssistantMessages] = useState([]);
  const [supportAgentMessages, setSupportAgentMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [supportInput, setSupportInput] = useState('');
  const [agentConfig, setAgentConfig] = useState({ name: 'Assistente IA' });
  const supportMessagesEndRef = useRef(null);

  const [showAgentSettings, setShowAgentSettings] = useState(false);

  // Função para rolar para o final das mensagens do simulador
  const scrollToBottomSupport = () => {
    if (supportMessagesEndRef.current) {
      supportMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Rolar automaticamente quando novas mensagens são adicionadas ao simulador
  useEffect(() => {
    scrollToBottomSupport();
  }, [supportAgentMessages]);

  useEffect(() => {
    // Verificar se há API key salva
    if (apiKey) {
      validateApiKey(apiKey);
    } else {
      setShowApiKeyModal(true);
    }

    // Manter login persistente - usuário só sai quando clicar em logout manualmente
  }, [socket]);

  // Efeito para reconectar automaticamente ao recarregar a página
  useEffect(() => {
    const savedApiKey = localStorage.getItem('aicentral_api_key');
    if (savedApiKey && !socket) {
      console.log('Reconectando automaticamente com API key salva');
      setApiKey(savedApiKey);
    }
  }, []);

  useEffect(() => {
    if (isValidApiKey) {
      initializeSocket();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isValidApiKey]);

  // Atualização automática das mensagens a cada 2 minutos (reduzido para evitar sobrecarga)
  useEffect(() => {
    let messageUpdateInterval;
    
    if (whatsappReady && selectedChat) {
      messageUpdateInterval = setInterval(() => {
        loadMessages(selectedChat.id);
      }, 120000); // 2 minutos
    }

    return () => {
      if (messageUpdateInterval) {
        clearInterval(messageUpdateInterval);
      }
    };
  }, [whatsappReady, selectedChat]);

  // Atualização automática da lista de chats a cada 5 minutos (reduzido para evitar sobrecarga)
  useEffect(() => {
    let chatUpdateInterval;
    
    if (whatsappReady) {
      chatUpdateInterval = setInterval(() => {
        loadChats();
      }, 300000); // 5 minutos
    }

    return () => {
      if (chatUpdateInterval) {
        clearInterval(chatUpdateInterval);
      }
    };
  }, [whatsappReady]);

  const validateApiKey = async (key) => {
    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: key }),
      });

      // Verificar se a resposta tem conteúdo
      const responseText = await response.text();
      
      if (!responseText) {
        throw new Error('Resposta vazia do servidor');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Erro ao fazer parse do JSON:', jsonError);
        console.error('Resposta recebida:', responseText);
        throw new Error('Resposta inválida do servidor');
      }
      
      if (data.ok) {
        setIsValidApiKey(true);
        setApiKey(key);
        localStorage.setItem('aicentral_api_key', key);
        toast.success('API Key validada com sucesso!');
        setShowApiKeyModal(false);
      } else {
        setIsValidApiKey(false);
        toast.error(data.error || 'API Key inválida');
        setShowApiKeyModal(true);
      }
    } catch (error) {
      console.error('Erro ao validar API key:', error);
      toast.error(`Erro ao validar API key: ${error.message}`);
      setShowApiKeyModal(true);
    }
  };

  const initializeSocket = () => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Conectado ao servidor');
      setIsConnected(true);
      toast.success('Conectado ao servidor');
      
      // Autenticar automaticamente após conectar
      if (apiKey) {
        newSocket.emit('authenticate', { apiKey });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado do servidor');
      setIsConnected(false);
      toast.error('Desconectado do servidor');
    });

    // Listener para resposta da autenticação
    newSocket.on('authenticated', (data) => {
      console.log('Autenticado com sucesso:', data);
      setWhatsappReady(data.isReady);
      setQrCode(data.qrCode);
      setAgentEnabled(data.agentEnabled);
      
      if (data.qrCode && !data.isReady) {
        setShowQRModal(true);
      } else if (data.isReady) {
        loadChats();
      }
      
      // Verificar se o WhatsApp estava conectado antes do reload
      const wasWhatsappReady = localStorage.getItem('whatsapp_ready') === 'true';
      if (wasWhatsappReady && !data.isReady) {
        console.log('Tentando reconectar WhatsApp após reload da página');
        // Pequeno delay para garantir que a conexão está estável
        setTimeout(() => {
          newSocket.emit('check_whatsapp_status');
        }, 1000);
      }
    });

    newSocket.on('auth_error', (error) => {
      console.error('Erro de autenticação:', error);
      toast.error(error.message);
      setShowApiKeyModal(true);
    });

    newSocket.on('connection_status', (status) => {
      setWhatsappReady(status.isReady);
      setQrCode(status.qrCode);
      
      if (status.qrCode && !status.isReady) {
        setShowQRModal(true);
      }
    });

    newSocket.on('qr_code', (qrData) => {
      setQrCode(qrData);
      setShowQRModal(true);
      toast('QR Code gerado! Escaneie com seu WhatsApp', {
        icon: '📱',
        duration: 5000
      });
    });

    newSocket.on('whatsapp_ready', () => {
      setWhatsappReady(true);
      setQrCode(null);
      setShowQRModal(false);
      // Salvar estado do WhatsApp no localStorage
      localStorage.setItem('whatsapp_ready', 'true');
      toast.success('WhatsApp conectado com sucesso!');
      loadChats();
      
      // Se há um chat selecionado, recarregar suas mensagens
      if (selectedChat) {
        loadMessages(selectedChat.id);
      }
    });

    newSocket.on('whatsapp_authenticated', () => {
      toast.success('WhatsApp autenticado!');
    });

    newSocket.on('auth_failure', (msg) => {
      toast.error(`Falha na autenticação: ${msg}`);
      setShowQRModal(true);
    });

    newSocket.on('whatsapp_disconnected', (reason) => {
      setWhatsappReady(false);
      // Limpar estado do WhatsApp do localStorage
      localStorage.removeItem('whatsapp_ready');
      if (reason) {
        toast.error(`WhatsApp desconectado: ${reason}`);
      } else {
        // Desconexão manual pelo usuário
        setQrCode(null);
        setShowQRModal(false);
        setChats([]);
        setMessages([]);
        setSelectedChat(null);
      }
    });

    newSocket.on('new_message', (message) => {
      console.log('Nova mensagem recebida no frontend:', message);
      
      // Adicionar nova mensagem se for do chat selecionado
      if (selectedChat && (message.from === selectedChat.id || message.to === selectedChat.id)) {
        setMessages(prev => {
          // Verificar se a mensagem já existe para evitar duplicatas
          const messageExists = prev.some(msg => msg.id === message.id);
          if (!messageExists) {
            return [...prev, message];
          }
          return prev;
        });
      }
      
      // Atualizar lista de chats
      loadChats();
      
      // Notificação
      if (!message.fromMe) {
        toast(`Nova mensagem de ${message.contact.name || message.contact.number}`, {
          icon: '💬'
        });
      }
    });

    newSocket.on('agent-status-changed', (data) => {
      setAgentEnabled(data.enabled);
      toast.success(`Agente ${data.enabled ? 'ativado' : 'desativado'} no WhatsApp`);
    });

    newSocket.on('agent-config-updated', (config) => {
      setAgentConfig(config);
    });

    newSocket.on('ai_response_sent', (data) => {
      toast.success('Resposta da AI enviada!');
    });

    newSocket.on('chats_loaded', (chatList) => {
      console.log('Chats carregados do servidor:', chatList);
      if (chatList && Array.isArray(chatList)) {
        setChats(chatList);
      } else {
        console.error('Lista de chats inválida recebida:', chatList);
      }
    });

    newSocket.on('messages_loaded', (messageList) => {
      console.log('Mensagens carregadas do servidor:', messageList);
      if (messageList && Array.isArray(messageList)) {
        console.log('Total de mensagens:', messageList.length);
        setMessages(messageList);
      } else {
        console.error('Lista de mensagens inválida recebida:', messageList);
        setMessages([]);
      }
    });

    newSocket.on('message_sent', (result) => {
      if (result.success) {
        toast.success('Mensagem enviada!');
      } else {
        toast.error(`Erro ao enviar: ${result.error}`);
      }
    });

    // Listeners para respostas dos agentes IA
    newSocket.on('user-assistant-response', (response) => {
      setUserAssistantMessages(prev => [...prev, response]);
    });

    newSocket.on('support-agent-response', (response) => {
      setSupportAgentMessages(prev => [...prev, response]);
    });

    newSocket.on('session-reset', (data) => {
      if (data.agent === 'user') {
        setUserAssistantMessages([]);
      } else if (data.agent === 'support') {
        setSupportAgentMessages([]);
      }
    });

    // Listeners para erros
    newSocket.on('chats_error', (error) => {
      console.error('Erro ao carregar chats:', error);
      toast.error(`Erro ao carregar chats: ${error}`);
    });

    newSocket.on('messages_error', (error) => {
      console.error('Erro ao carregar mensagens:', error);
      toast.error(`Erro ao carregar mensagens: ${error}`);
    });
  };

  const connectWhatsApp = () => {
    if (socket) {
      socket.emit('initialize_whatsapp');
      toast.loading('Inicializando WhatsApp...', { id: 'whatsapp-init' });
    }
  };

  const disconnectWhatsApp = () => {
    if (socket && whatsappReady) {
      socket.emit('disconnect-whatsapp');
      setWhatsappReady(false);
      setQrCode(null);
      setShowQRModal(false);
      setChats([]);
      setMessages([]);
      setSelectedChat(null);
      toast.success('WhatsApp desconectado com sucesso!');
    }
  };

  const loadChats = () => {
    if (socket && whatsappReady) {
      socket.emit('get_chats');
      loadContactsFromSupabase();
    }
  };

  const loadContactsFromSupabase = async () => {
    try {
      const response = await fetch('/api/contacts');
      if (response.ok) {
        const contacts = await response.json();
        console.log('Contatos carregados do Supabase:', contacts.length);
        // Converter formato do Supabase para o formato esperado pelo frontend
        const formattedChats = contacts.map(contact => ({
          id: contact.whatsapp_id,
          name: contact.name || contact.pushname || contact.number,
          lastMessage: '',
          timestamp: contact.updated_at,
          unreadCount: 0,
          contact: {
            name: contact.name || contact.pushname,
            number: contact.number,
            profilePicUrl: contact.profile_pic_url
          }
        }));
        setChats(prevChats => {
          // Mesclar com chats existentes, evitando duplicatas
          const existingIds = prevChats.map(chat => chat.id);
          const newChats = formattedChats.filter(chat => !existingIds.includes(chat.id));
          return [...prevChats, ...newChats];
        });
      }
    } catch (error) {
       console.error('Erro ao carregar contatos do Supabase:', error);
     }
   };

   const selectChat = (chat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
  };

  const loadMessages = async (chatId) => {
    // Usar apenas socket para evitar conflitos e sobrecarga
    if (socket && whatsappReady) {
      socket.emit('get_messages', chatId);
    }
  };

  const sendMessage = (message) => {
    if (socket && selectedChat) {
      socket.emit('send_message', {
        to: selectedChat.id,
        message: message
      });
    }
  };

  const handleApiKeySubmit = (key) => {
    validateApiKey(key);
  };

  const openApiKeyModal = () => {
    setShowApiKeyModal(true);
  };

  const handleLogout = () => {
    // MANTER WhatsApp conectado para que o agente continue atendendo
    // Não desconectar WhatsApp - apenas limpar interface
    
    // Limpar dados locais
    localStorage.removeItem('aicentral_api_key');
    
    // Desconectar socket
    if (socket) {
      socket.disconnect();
    }
    
    // Resetar apenas estados da interface, mantendo WhatsApp ativo
    setSocket(null);
    setIsConnected(false);
    setApiKey('');
    setIsValidApiKey(false);
    // NÃO resetar whatsappReady - manter conexão ativa
    setQrCode(null);
    setShowQRModal(false);
    setChats([]);
    setSelectedChat(null);
    setMessages([]);
    setShowAgentChat(false);
    // NÃO resetar agentEnabled - manter agente ativo
    setUserAssistantMessages([]);
    setSupportAgentMessages([]);
    setUserInput('');
    setSupportInput('');
    
    // Mostrar modal de API key
    setShowApiKeyModal(true);
    
    toast.success('Logout realizado! WhatsApp permanece conectado para atendimento automático.');
  };

  const toggleAgent = () => {
    if (socket) {
      socket.emit('toggle-agent', { enabled: !agentEnabled });
    }
  };

  if (!isValidApiKey) {
    return (
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onSubmit={handleApiKeySubmit}
        onClose={() => setShowApiKeyModal(false)}
      />
    );
  }

  // Funções para enviar mensagens dos agentes
  const sendUserMessage = async () => {
    if (!userInput.trim()) return;
    
    const userMessage = {
      content: userInput,
      timestamp: new Date(),
      type: 'user'
    };
    
    setUserAssistantMessages(prev => [...prev, userMessage]);
    
    // Enviar para API AI Central - Sessão do Usuário
    if (socket) {
      socket.emit('user-assistant-query', {
        message: userInput,
        sessionId: 'user-assistant',
        context: {
          selectedChat,
          messages: messages.slice(-10),
          chats
        }
      });
    }
    
    setUserInput('');
  };
  
  const sendSupportMessage = async () => {
    if (!supportInput.trim()) return;
    
    const userMessage = {
      content: supportInput,
      timestamp: new Date(),
      type: 'user'
    };
    
    setSupportAgentMessages(prev => [...prev, userMessage]);
    
    // Enviar para API AI Central - Usando a configuração do agente do usuário
    if (socket) {
      socket.emit('support-agent-query', {
        message: supportInput,
        sessionId: `test-agent-${Date.now()}`, // Sessão única para teste
        agentConfig: agentConfig, // Usar configuração do agente do usuário
        context: {
          selectedChat,
          messages: messages.slice(-10),
          customerInfo: selectedChat,
          isTestMode: true // Indica que é modo de teste
        }
      });
    }
    
    setSupportInput('');
  };

  return (
    <div className="flex h-screen bg-whatsapp-gray-light">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-whatsapp-primary text-white p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6" />
            <h1 className="text-xl font-semibold">WhatsApp - AI Central</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                whatsappReady ? 'bg-green-400' : isConnected ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
              <span className="text-sm">
                {whatsappReady ? 'WhatsApp Conectado' : isConnected ? 'Servidor Conectado' : 'Desconectado'}
              </span>
            </div>
            {/* Chat do Assistente IA - Sempre Disponível */}
            <button
              onClick={() => {
                setShowAgentChat(!showAgentChat);
                if (!showAgentChat) {
                  setActiveAgent('user');
                }
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              title={showAgentChat ? "Fechar Chat dos Assistentes IA" : "Abrir Chat dos Assistentes IA"}
            >
              <Bot className="w-5 h-5" />
              <span className="font-medium">{showAgentChat ? '✕ Fechar Chat' : '💬 Assistente IA'}</span>
            </button>

            {/* Controles do WhatsApp */}
            {whatsappReady && (
              <div className="flex items-center space-x-2 bg-black bg-opacity-20 rounded-lg p-1">
                <button
                  onClick={toggleAgent}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    agentEnabled
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-red-500 text-white shadow-md'
                  }`}
                  title={agentEnabled ? 'Desativar Atendimento WhatsApp' : 'Ativar Atendimento WhatsApp'}
                >
                  {agentEnabled ? '🟢 Ativo' : '🔴 Inativo'}
                </button>
                <div className="text-xs text-white opacity-75">
                  Atendimento
                </div>
              </div>
            )}

            <button
              onClick={openApiKeyModal}
              className="p-2 hover:bg-whatsapp-secondary rounded-full transition-colors"
              title="Configurar API Key"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-600 rounded-full transition-colors"
              title="Sair da Aplicação"
            >
              <LogOut className="w-5 h-5" />
            </button>
            {whatsappReady ? (
              <button
                onClick={disconnectWhatsApp}
                className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full transition-colors"
                title="Desconectar WhatsApp"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Desconectar</span>
              </button>
            ) : (
              <button
                onClick={connectWhatsApp}
                className="flex items-center space-x-2 bg-whatsapp-secondary px-4 py-2 rounded-full hover:bg-opacity-80 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Conectar WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full pt-16">
        {/* Sidebar - Lista de Contatos */}
        <Sidebar
          chats={chats}
          selectedChat={selectedChat}
          onSelectChat={selectChat}
          whatsappReady={whatsappReady}
          onRefresh={loadChats}
        />
        
        {/* Chat Principal do WhatsApp - Sempre Visível no Centro */}
        <div className="flex-1">
          <ChatArea
             selectedChat={selectedChat}
             messages={messages}
             onSendMessage={sendMessage}
             whatsappReady={whatsappReady}
             socket={socket}
             agentEnabled={agentEnabled}
           />
        </div>
        
        {/* Chat dos Assistentes - Painel Lateral Direito - Sempre Visível */}
        {showAgentChat && (
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
            {/* Agent Header - Sempre Visível */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">
                  {activeAgent === 'user' ? '👤 Assistente Pessoal' : `🎧 ${agentConfig.name || 'Agente de Atendimento'}`}
                </h2>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${activeAgent === 'support' ? (agentEnabled ? 'bg-green-500' : 'bg-red-500') : 'bg-green-500'}`}></div>
                  <span className="text-sm text-gray-600">{activeAgent === 'support' ? (agentEnabled ? 'Ativo' : 'Inativo') : 'Sempre Online'}</span>
                </div>
              </div>
              
              {/* Mode Toggle Buttons - Sempre Visível */}
              <div className="flex bg-gray-100 rounded-lg p-1 mb-3">
                <button
                  onClick={() => setActiveAgent('user')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeAgent === 'user'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  👤 Pessoal
                </button>
                <button
                  onClick={() => setActiveAgent('support')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeAgent === 'support'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🎧 Atendimento
                </button>
              </div>
            </div>
            
            {activeAgent === 'support' ? (
              <div className="flex flex-col h-full bg-white max-h-[600px]">
                {/* Agent Header - Design Limpo */}
                <div className="bg-gray-50 border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">{agentConfig.name || 'Agente de Atendimento'}</h2>
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
                        onClick={() => setShowAgentSettings(true)}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                        title="Configurar Agente"
                      >
                        <Settings className="w-4 h-4 text-gray-600" />
                      </button>
                      
                      <button
                        onClick={() => setSupportAgentMessages([])}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                        title="Nova Conversa"
                      >
                        <RotateCcw className="w-4 h-4 text-gray-600" />
                      </button>

                      <button
                        onClick={toggleAgent}
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

                  {/* Agent Info */}
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Personalidade: <span className="text-green-600 font-medium capitalize">{agentConfig.personality || 'profissional'}</span></p>
                    <p>Status: <span className="text-gray-900">{agentEnabled ? 'Ativo no WhatsApp' : 'Inativo'}</span></p>
                  </div>

                  {/* Agent Status */}
                  {agentConfig.prompt && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Agente Configurado</span>
                      </div>
                      <p className="text-xs text-green-700 truncate">
                        {agentConfig.prompt.substring(0, 60)}...
                      </p>
                    </div>
                  )}
                </div>

                {/* Chat Header */}
                <div className="p-4 bg-white border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <h1 className="font-semibold text-gray-900">Simulador de Atendimento</h1>
                      <p className="text-sm text-gray-600">🤖 Agente: {agentConfig.name || 'Assistente IA'}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div 
                  ref={supportMessagesEndRef}
                  className="flex-1 overflow-y-auto p-4 flex flex-col scroll-smooth"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                  }}
                >
                  {/* Spacer para empurrar mensagens para baixo */}
                  <div className="flex-1"></div>
                  
                  {/* Container das mensagens */}
                  <div className="space-y-4 max-w-4xl mx-auto w-full">
                    {supportAgentMessages.length === 0 && (
                      <div className="text-center py-12">
                        <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2 text-gray-900">Teste seu agente de atendimento!</h3>
                        <p className="text-gray-600">
                          Simule conversas para verificar como o agente responderá no WhatsApp.
                        </p>
                        <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700 max-w-md mx-auto">
                          💡 Dica: Use os comandos rápidos ou digite uma mensagem personalizada
                        </div>
                      </div>
                    )}

                    {supportAgentMessages.map((message, index) => (
                      <div key={index} className={`flex items-start gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.type === 'user' 
                            ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
                            : 'bg-green-100'
                        }`}>
                          {message.type === 'user' ? (
                            <User className="h-4 w-4 text-white" />
                          ) : (
                            <Bot className="h-4 w-4 text-green-600" />
                          )}
                        </div>

                        {/* Message Content */}
                        <div className={`flex flex-col max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl ${
                          message.type === 'user' ? 'items-end' : 'items-start'
                        }`}>
                          <div className={`rounded-2xl p-3 shadow-sm ${
                            message.type === 'user'
                              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md'
                              : 'bg-gray-100 text-gray-800 rounded-bl-md border border-gray-200'
                          }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                          </div>
                          
                          {/* Timestamp */}
                          <span className="text-xs text-gray-500 mt-1 px-1">
                            {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                    {/* Elemento para rolagem automática */}
                    <div ref={supportMessagesEndRef} />
                  </div>
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-200">
                  <form onSubmit={(e) => { e.preventDefault(); sendSupportMessage(); }} className="flex gap-2 max-w-4xl mx-auto">
                    <input
                      value={supportInput}
                      onChange={(e) => setSupportInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendSupportMessage()}
                      placeholder="Digite uma mensagem de teste..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <button 
                      type="submit" 
                      disabled={!supportInput.trim()}
                      className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                  
                  {/* Comandos Rápidos */}
                  <div className="mt-3 max-w-4xl mx-auto">
                    <div className="text-xs text-gray-500 mb-2">💡 Comandos Rápidos:</div>
                    <div className="flex gap-2 justify-center">
                      <button 
                        onClick={() => setSupportInput('Olá, preciso de ajuda')}
                        className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded hover:bg-blue-100 transition-colors"
                      >
                        👋 Saudação
                      </button>
                      <button 
                        onClick={() => setSupportInput('Qual o horário de funcionamento?')}
                        className="text-xs bg-purple-50 text-purple-700 px-3 py-2 rounded hover:bg-purple-100 transition-colors"
                      >
                        🕒 Horário
                      </button>
                      <button 
                        onClick={() => setSupportInput('Preciso verificar meu pedido')}
                        className="text-xs bg-orange-50 text-orange-700 px-3 py-2 rounded hover:bg-orange-100 transition-colors"
                      >
                        📦 Verificar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Agent Content for Personal Assistant */}
                <div className="p-4 border-b border-gray-200">

              {/* Agent Info */}
              <div className={`flex rounded-lg p-2 justify-center ${
                activeAgent === 'user' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                <span className={`text-sm font-medium ${
                  activeAgent === 'user' ? 'text-blue-800' : 'text-green-800'
                }`}>
                  {activeAgent === 'user' ? '👤 Assistente IA Pessoal' : '🎧 Agente de Atendimento WhatsApp'}
                </span>
              </div>
              
              {/* Agent Description */}
             <div className="flex items-center justify-between mt-2">
               <div className="text-sm text-gray-600">
                 <p>{activeAgent === 'user' 
                   ? '💡 Assistente IA para análise, insights e conversas - Funciona independente do WhatsApp'
                   : '🤖 Agente automático para atendimento no WhatsApp - Responde mensagens automaticamente'
                 }</p>
               </div>
               <div className="flex items-center space-x-1">
                 <button
                   onClick={() => {
                     if (activeAgent === 'user') {
                       // Reset do agente pessoal
                       setUserAssistantMessages([]);
                       socket?.emit('reset-user-session');
                       toast.success('Sessão do assistente pessoal resetada!');
                     } else {
                       // Reset do agente de suporte
                       setSupportAgentMessages([]);
                       socket?.emit('reset-support-session');
                       toast.success('Sessão do agente de atendimento resetada!');
                     }
                   }}
                   className={`text-xs px-2 py-1 rounded hover:bg-red-200 transition-colors ${
                     activeAgent === 'user' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                   }`}
                   title="Resetar sessão do assistente"
                 >
                   🔄 Reset
                 </button>
               </div>
             </div>
           </div>

            {/* Context Display */}
            {selectedChat && (
              <div className="p-3 border-b bg-blue-50 border-blue-200">
                <h3 className="text-sm font-medium mb-2 text-blue-800">
                  📊 Contexto Atual
                </h3>
                <div className="text-xs text-blue-700">
                  <p>📱 Contato: {selectedChat.name || 'Sem nome'}</p>
                  <p>📞 Número: {selectedChat.contact?.number || 'N/A'}</p>
                  <p>💬 Mensagens: {messages.length}</p>
                  <p>🕒 Última atividade: {messages.length > 0 ? new Date(messages[messages.length - 1]?.timestamp).toLocaleTimeString('pt-BR') : 'N/A'}</p>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(activeAgent === 'user' ? userAssistantMessages : supportAgentMessages).length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    activeAgent === 'user' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {activeAgent === 'user' ? (
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    {activeAgent === 'user' ? 'Assistente IA Pronto' : 'Agente de Atendimento Pronto'}
                  </p>
                  <p className="text-xs mt-1 text-gray-400">
                    {activeAgent === 'user' 
                      ? 'Faça perguntas sobre análises, insights ou qualquer assunto'
                      : 'Configure e teste o agente automático para WhatsApp'
                    }
                  </p>
                  {selectedChat && activeAgent === 'user' && (
                    <div className="mt-3 p-2 rounded text-xs bg-blue-50 text-blue-700">
                      💡 Analisando conversa com {selectedChat.name || 'este contato'}
                    </div>
                  )}
                  {activeAgent === 'support' && (
                    <div className="mt-3 p-2 rounded text-xs bg-green-50 text-green-700">
                      🤖 Assistente IA - Status: {agentEnabled ? 'Ativo no WhatsApp' : 'Inativo - Configure e ative'}
                    </div>
                  )}
                </div>
              ) : (
                (activeAgent === 'user' ? userAssistantMessages : supportAgentMessages).map((message, index) => (
                  <div key={index} className={`border rounded-lg p-3 ${
                    activeAgent === 'user' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-start space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.type === 'user' 
                          ? 'bg-gray-500' 
                          : activeAgent === 'user' ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        {message.type === 'user' ? (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{message.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={activeAgent === 'user' ? userInput : supportInput}
                  onChange={(e) => activeAgent === 'user' ? setUserInput(e.target.value) : setSupportInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (activeAgent === 'user' ? sendUserMessage() : sendSupportMessage())}
                  placeholder={activeAgent === 'user' 
                    ? "Pergunte sobre análises, insights ou qualquer assunto..."
                    : "Teste o agente de atendimento ou configure suas respostas..."
                  }
                  className={`flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm ${
                    activeAgent === 'user' ? 'focus:ring-blue-500' : 'focus:ring-green-500'
                  }`}
                />
                <button
                  onClick={activeAgent === 'user' ? sendUserMessage : sendSupportMessage}
                  className={`text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                    activeAgent === 'user' 
                      ? 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
                      : 'bg-green-500 hover:bg-green-600 focus:ring-green-500'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              
              {/* Quick Commands */}
              <div className="mt-2 flex flex-wrap gap-1">
                {activeAgent === 'user' ? (
                  <>
                    <button 
                      onClick={() => setUserInput('análise')}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      📊 Análise
                    </button>
                    <button 
                      onClick={() => setUserInput('resumo')}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      📝 Resumo
                    </button>
                    <button 
                      onClick={() => setUserInput('sugestão')}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      💡 Sugestão
                    </button>
                    <button 
                      onClick={() => setUserInput('ajuda')}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      ❓ Ajuda
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setSupportInput('Olá! Como posso ajudá-lo hoje?')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      👋 Saudação
                    </button>
                    <button 
                      onClick={() => setSupportInput('Obrigado por entrar em contato. Vou verificar isso para você.')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      🔍 Verificar
                    </button>
                    <button 
                      onClick={() => setSupportInput('Posso ajudá-lo com mais alguma coisa?')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      ❓ Mais Ajuda
                    </button>
                    <button 
                      onClick={() => setSupportInput('Tenha um ótimo dia!')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      👋 Despedida
                    </button>
                  </>
                )}
              </div>
            </div>
                </>
              )}
          </div>
        )}
      </div>

      {/* Agent Settings */}
      {showAgentSettings && (
        <AgentSettings
          socket={socket}
          isOpen={showAgentSettings}
          onClose={() => setShowAgentSettings(false)}
        />
      )}

      {/* Modals */}
      <QRCodeModal
        isOpen={showQRModal}
        qrCode={qrCode}
        onClose={() => setShowQRModal(false)}
        onRetry={connectWhatsApp}
      />

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onSubmit={handleApiKeySubmit}
        onClose={() => setShowApiKeyModal(false)}
        currentKey={apiKey}
      />
    </div>
  );
}

export default App;