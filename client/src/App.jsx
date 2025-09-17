import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AgentChat from './components/AgentChat';
import QRCodeModal from './components/QRCodeModal';
import ApiKeyModal from './components/ApiKeyModal';
import AgentSettings from './components/AgentSettings';
import LandingPage from './components/LandingPage';
import MobileApp from './components/MobileApp';
import useIsMobile from './hooks/useIsMobile';
import { MessageCircle, Settings, Phone, Bot, LogOut, PhoneOff, Sparkles, Cog, X, User, MessageSquare, Send, Eye, EyeOff, RotateCcw } from 'lucide-react';

function App() {
  // Hook para detectar dispositivos móveis
  const isMobile = useIsMobile();
  
  // Estado para controlar se deve mostrar landing page ou plataforma
  const [showLandingPage, setShowLandingPage] = useState(() => {
    // Verificar se já tem API key salva para decidir se mostra landing page
    const savedApiKey = localStorage.getItem('aicentral_api_key');
    return !savedApiKey; // Se não tem API key, mostra landing page
  });
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
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [agentConfig, setAgentConfig] = useState({
    name: 'Assistente de Atendimento',
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

  // Carregar configurações do agente quando conectar
  useEffect(() => {
    if (socket && isValidApiKey) {
      // Solicitar configuração atual do agente ao conectar
      socket.emit('get-agent-config');
      
      socket.on('agent-config-updated', (data) => {
        if (data.config) {
          setAgentConfig(prev => ({ ...prev, ...data.config }));
        }
      });

      return () => {
        socket.off('agent-config-updated');
      };
    }
  }, [socket, isValidApiKey]);

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
      localStorage.setItem('whatsapp_ready', 'true');
      toast.success('WhatsApp conectado com sucesso!');
      loadChats();
      
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
      localStorage.removeItem('whatsapp_ready');
      
      // Só mostrar erro e limpar interface se for uma desconexão inesperada
      if (reason && reason !== 'LOGOUT') {
        toast.error(`WhatsApp desconectado: ${reason}`);
        // Não limpar chats/mensagens automaticamente para evitar perda de dados
        console.log('WhatsApp desconectado inesperadamente, mantendo dados locais');
      } else {
        // Limpeza apenas em logout explícito
        setQrCode(null);
        setShowQRModal(false);
        setChats([]);
        setMessages([]);
        setSelectedChat(null);
      }
    });

    newSocket.on('new_message', (message) => {
      console.log('Nova mensagem recebida no frontend:', message);
      
      // Atualizar mensagens em tempo real se for do chat selecionado
      if (selectedChat && (message.from === selectedChat.id || message.to === selectedChat.id)) {
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === message.id);
          if (!messageExists) {
            return [...prev, message];
          }
          return prev;
        });
      }
      
      // Atualizar lista de chats em tempo real
      setChats(prevChats => {
        const chatIndex = prevChats.findIndex(chat => 
          chat.id === message.from || chat.id === message.to
        );
        
        if (chatIndex !== -1) {
          const updatedChats = [...prevChats];
          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex],
            lastMessage: {
              body: message.body,
              timestamp: message.timestamp
            },
            timestamp: message.timestamp
          };
          
          // Mover chat para o topo se não for do usuário atual
          if (!message.fromMe) {
            const [updatedChat] = updatedChats.splice(chatIndex, 1);
            return [updatedChat, ...updatedChats];
          }
          
          return updatedChats;
        }
        return prevChats;
      });
      
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

    newSocket.on('agent-config-updated', (data) => {
      if (data.config) {
        setAgentConfig(data.config);
        console.log('Configuração do agente atualizada no App:', data.config);
      }
    });

    newSocket.on('agent-config-saved', (data) => {
      if (data.config) {
        setAgentConfig(data.config);
        console.log('Configuração do agente salva no App:', data.config);
      }
    });

    newSocket.on('ai_response_sent', (data) => {
      toast.success('Resposta da AI enviada!');
    });

    newSocket.on('chats_loaded', (response) => {
      console.log('Chats carregados do servidor:', response);
      setIsLoadingChats(false);
      
      if (response && response.chats && Array.isArray(response.chats)) {
        // Se é a primeira página, substitui os chats
        if (response.pagination && response.pagination.offset === 0) {
          setChats(response.chats);
        } else {
          // Se é uma página adicional, adiciona aos chats existentes
          setChats(prevChats => [...prevChats, ...response.chats]);
        }
      } else if (response && Array.isArray(response)) {
        // Compatibilidade com formato antigo
        setChats(response);
      } else {
        console.error('Lista de chats inválida recebida:', response);
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

    newSocket.emit('get-agent-config');

    newSocket.on('chats_error', (error) => {
      console.error('Erro ao carregar chats:', error);
      setIsLoadingChats(false);
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
      console.log('Desconectando WhatsApp por solicitação do usuário');
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
      console.log('Carregando chats do WhatsApp...');
      setIsLoadingChats(true);
      socket.emit('get_chats');
      loadContactsFromDatabase();
    } else {
      console.log('WhatsApp não está pronto, não carregando chats');
    }
  };

  const loadContactsFromDatabase = async () => {
    try {
      const response = await fetch('/api/contacts');
      if (response.ok) {
        const contacts = await response.json();
        console.log('Contatos carregados do banco de dados:', contacts.length);
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
          const existingIds = prevChats.map(chat => chat.id);
          const newChats = formattedChats.filter(chat => !existingIds.includes(chat.id));
          return [...prevChats, ...newChats];
        });
      }
    } catch (error) {
       console.error('Erro ao carregar contatos do banco de dados:', error);
     }
   };

   const selectChat = (chat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
  };

  const loadMessages = async (chatId) => {
    if (socket && whatsappReady && chatId) {
      console.log('Carregando mensagens para chat:', chatId);
      socket.emit('get_messages', chatId);
    } else {
      console.log('Condições não atendidas para carregar mensagens:', {
        socket: !!socket,
        whatsappReady,
        chatId
      });
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

  const openApiKeyModal = () => {
    setShowApiKeyModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('aicentral_api_key');
    
    if (socket) {
      socket.disconnect();
    }
    
    setSocket(null);
    setIsConnected(false);
    setApiKey('');
    setIsValidApiKey(false);
    setQrCode(null);
    setShowQRModal(false);
    setChats([]);
    setSelectedChat(null);
    setMessages([]);
    setShowAgentChat(false);
    setUserAssistantMessages([]);
    setSupportAgentMessages([]);
    setUserInput('');
    setSupportInput('');
    
    setShowApiKeyModal(true);
    
    toast.success('Logout realizado! WhatsApp permanece conectado para atendimento automático.');
  };

  const toggleAgent = () => {
    if (socket) {
      socket.emit('toggle-agent', { enabled: !agentEnabled });
    }
  };

  // Função para lidar com o submit do API key
  const handleApiKeySubmit = (key) => {
    validateApiKey(key);
  };

  // Função para entrar na plataforma
  const handleEnterPlatform = () => {
    setShowLandingPage(false);
    // Se não tem API key, mostrar modal
    if (!apiKey) {
      setShowApiKeyModal(true);
    }
  };

  // Se deve mostrar landing page, renderizar apenas ela
  if (showLandingPage) {
    return <LandingPage onEnterPlatform={handleEnterPlatform} />;
  }

  // Se não tem API key válida, mostrar modal de API key
  if (!isValidApiKey) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <ApiKeyModal
          isOpen={true}
          onSubmit={handleApiKeySubmit}
          onClose={() => {
            // Se não tem API key válida, voltar para landing page
            if (!apiKey) {
              setShowLandingPage(true);
            }
          }}
        />
      </div>
    );
  }

  // Se é mobile, renderizar versão mobile simplificada
  if (isMobile) {
    return (
      <MobileApp
        isConnected={isConnected}
        whatsappReady={whatsappReady}
        qrCode={qrCode}
        showQRModal={showQRModal}
        setShowQRModal={setShowQRModal}
        connectWhatsApp={connectWhatsApp}
        disconnectWhatsApp={disconnectWhatsApp}
        agentConfig={agentConfig}
        socket={socket}
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
    
    if (socket) {
      socket.emit('support-agent-query', {
        message: supportInput,
        sessionId: `test-agent-${Date.now()}`,
        agentConfig: agentConfig,
        context: {
          selectedChat,
          messages: messages.slice(-10),
          customerInfo: selectedChat,
          isTestMode: true
        }
      });
    }
    
    setSupportInput('');
  };

  return (
    <div className="flex h-screen bg-gray-100">
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
        <Sidebar
          chats={chats}
          selectedChat={selectedChat}
          onSelectChat={selectChat}
          whatsappReady={whatsappReady}
          onRefresh={loadChats}
          isLoadingChats={isLoadingChats}
        />
        
        <div className="flex-1">
          <ChatArea
            selectedChat={selectedChat}
            messages={messages}
            onSendMessage={sendMessage}
            whatsappReady={whatsappReady}
            socket={socket}
            agentEnabled={agentEnabled}
            agentConfig={agentConfig}
          />
        </div>
        
        {/* Agent Chat Panel */}
        {showAgentChat && (
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
            {/* Agent Toggle */}
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
              
              {/* Agent Status Info */}
              {activeAgent === 'support' && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-green-800 mb-2">
                        <div className="flex items-center space-x-2">
                          <span>🤖</span>
                          <div>
                            <div className="font-semibold">{agentConfig.name || 'Assistente IA'}</div>
                            <div className="text-xs text-green-600 mt-1">
                              {agentConfig.personality || 'Assistente inteligente para atendimento'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-xs text-gray-600 mb-1">Status</div>
                        <span className={`text-xs font-medium ${agentEnabled ? 'text-green-600' : 'text-red-600'}`}>
                          {agentEnabled ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setAgentEnabled(!agentEnabled);
                          socket.emit('toggle-agent', !agentEnabled);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                          agentEnabled ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            agentEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex bg-gray-100 rounded-lg p-1 mb-3">
                <button
                  onClick={() => setActiveAgent('user')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeAgent === 'user'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  👤 Assistente Pessoal
                </button>
                <button
                  onClick={() => setActiveAgent('support')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeAgent === 'support'
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  🎧 Agente WhatsApp
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <p>{activeAgent === 'user' 
                    ? '💡 Assistente IA Pessoal - Para análise, insights e conversas gerais'
                    : '🤖 Simulador do Agente WhatsApp - Testa as configurações do atendimento automático'
                  }</p>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      if (activeAgent === 'user') {
                        setUserAssistantMessages([]);
                      } else {
                        setSupportAgentMessages([]);
                      }
                    }}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded"
                    title="Limpar conversa"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  {activeAgent === 'support' && (
                    <button
                      onClick={() => setShowAgentSettings(true)}
                      className="text-gray-500 hover:text-gray-700 p-1 rounded"
                      title="Configurações do Agente"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Context Info */}
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
            <div className="flex-1 overflow-y-auto p-4">
              {(activeAgent === 'user' ? userAssistantMessages : supportAgentMessages).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  {activeAgent === 'user' ? (
                    <>
                      <User className="h-16 w-16 text-blue-500 mb-4" />
                      <h3 className="text-xl font-semibold mb-3 text-gray-900">
                        Assistente IA Pessoal
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md">
                        Seu assistente pessoal para análises, insights e conversas gerais. 
                        Funciona independentemente do WhatsApp.
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg">
                        <h4 className="font-medium text-blue-800 mb-2">🎯 O que posso fazer:</h4>
                        <div className="text-sm text-blue-700 space-y-1 text-left">
                          <div>📊 Analisar suas conversas e dados</div>
                          <div>💡 Fornecer insights e sugestões</div>
                          <div>❓ Responder perguntas gerais</div>
                          <div>🔍 Ajudar com pesquisas e análises</div>
                          <div>💬 Conversar sobre qualquer assunto</div>
                        </div>
                      </div>
                      <div className="mt-4 text-xs text-gray-500">
                        💡 Dica: Use os comandos rápidos abaixo para começar
                      </div>
                    </>
                  ) : (
                    <>
                      <Bot className="h-16 w-16 text-green-500 mb-4" />
                      <h3 className="text-xl font-semibold mb-3 text-gray-900">
                        Simulador do Agente WhatsApp
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md">
                        Teste como seu agente responderá no WhatsApp usando as configurações salvas.
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-lg">
                        <h4 className="font-medium text-green-800 mb-2">📋 Configuração Atual:</h4>
                        <div className="text-sm text-green-700 space-y-1">
                          <div>🤖 <strong>Nome:</strong> {agentConfig.name || 'Assistente IA'}</div>
                          <div>🎭 <strong>Personalidade:</strong> {agentConfig.personality || 'profissional'}</div>
                          <div>⚡ <strong>Status:</strong> {agentEnabled ? '✅ Ativo' : '❌ Inativo'}</div>
                          {agentConfig.prompt && <div>📝 <strong>Prompt personalizado configurado</strong></div>}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAgentSettings(true)}
                        className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Configurar Agente
                      </button>
                      <div className="mt-3 text-xs text-gray-500">
                        💡 Dica: Use os comandos rápidos para testar diferentes cenários
                      </div>
                    </>
                  )}
                </div>
              ) : (
                (activeAgent === 'user' ? userAssistantMessages : supportAgentMessages).map((message, index) => (
                  <div key={index} className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === 'user'
                        ? activeAgent === 'user' 
                          ? 'bg-blue-500 text-white'
                          : 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}>
                      <div className="flex items-start space-x-2">
                        {message.sender !== 'user' && (
                          <svg className="w-5 h-5 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                          </svg>
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-75 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
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
                      onClick={() => setSupportInput('Oi, gostaria de agendar uma consulta')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      📅 Agendar
                    </button>
                    <button 
                      onClick={() => setSupportInput('Olá, preciso de ajuda com meu pedido')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      🛒 Pedido
                    </button>
                    <button 
                      onClick={() => setSupportInput('Bom dia, quero fazer uma reclamação')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      😠 Reclamação
                    </button>
                    <button 
                      onClick={() => setSupportInput('Oi, quero cancelar minha compra')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      ❌ Cancelar
                    </button>
                    <button 
                      onClick={() => setSupportInput('Olá, vocês têm esse produto disponível?')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      🔍 Consultar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <QRCodeModal
        isOpen={showQRModal}
        qrCode={qrCode}
        onClose={() => setShowQRModal(false)}
      />

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onSubmit={handleApiKeySubmit}
        onClose={() => setShowApiKeyModal(false)}
      />

      <AgentSettings
        isOpen={showAgentSettings}
        onClose={() => setShowAgentSettings(false)}
        socket={socket}
        agentConfig={agentConfig}
        setAgentConfig={setAgentConfig}
      />
    </div>
  );
}

export default App;