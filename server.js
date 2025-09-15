const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');
// const compression = require('compression'); // Temporariamente desabilitado
require('dotenv').config();

// Carregar configurações de produção
let config = {};
try {
  const configPath = path.join(__dirname, 'config', 'production.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('✅ Configurações de produção carregadas');
  } else {
    console.log('⚠️  Arquivo de configuração não encontrado, usando configurações padrão');
  }
} catch (error) {
  console.error('❌ Erro ao carregar configurações:', error.message);
}

// Configurações padrão se não houver arquivo de config
const defaultConfig = {
  server: { port: 3001, host: '0.0.0.0' },
  logging: { level: 'info', file: { enabled: true } },
  security: { cors: { origin: '*' } }
};
config = { ...defaultConfig, ...config };

// Sistema de logging melhorado
const createLogger = () => {
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  return {
    info: (message) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] INFO: ${message}`;
      console.log(logMessage);
      if (config.logging?.file?.enabled) {
        fs.appendFileSync(path.join(logDir, 'app.log'), logMessage + '\n');
      }
    },
    error: (message) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ERROR: ${message}`;
      console.error(logMessage);
      if (config.logging?.file?.enabled) {
        fs.appendFileSync(path.join(logDir, 'error.log'), logMessage + '\n');
      }
    },
    warn: (message) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] WARN: ${message}`;
      console.warn(logMessage);
      if (config.logging?.file?.enabled) {
        fs.appendFileSync(path.join(logDir, 'app.log'), logMessage + '\n');
      }
    }
  };
};

const logger = createLogger();

// Importar configuração do Supabase
const { saveMessage, saveContact, getMessageHistory, getContacts } = require('./config/supabase');

const app = express();
const server = http.createServer(app);

// Configurar timeouts do servidor
server.timeout = config.server?.timeout || 30000;
server.keepAliveTimeout = config.server?.keepAliveTimeout || 65000;
server.headersTimeout = config.server?.headersTimeout || 66000;

const io = socketIo(server, {
  cors: {
    origin: config.security?.cors?.origin || "*",
    methods: ["GET", "POST"],
    credentials: config.security?.cors?.credentials || false
  },
  maxHttpBufferSize: 1e6, // 1MB
  pingTimeout: 60000,
  pingInterval: 25000
});

// Configuração da API AI Central
const AI_CENTRAL_API = 'https://aicentral.store/api';

// Middleware de produção
if (process.env.NODE_ENV === 'production') {
  // app.use(compression()); // Compressão gzip - temporariamente desabilitado
  app.set('trust proxy', 1); // Confiar em proxy reverso
  logger.info('Middleware de produção ativado');
}

// Rate limiting básico
const rateLimitMap = new Map();
const rateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = config.security?.rateLimit?.windowMs || 900000; // 15 min
  const max = config.security?.rateLimit?.max || 100;
  
  const clientData = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
  
  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + windowMs;
  }
  
  if (clientData.count >= max) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  clientData.count++;
  rateLimitMap.set(ip, clientData);
  next();
};

app.use(rateLimit);
app.use(cors(config.security?.cors || {}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'client/dist'), {
  maxAge: config.performance?.caching?.maxAge || 3600000 // 1 hora
}));

// Sistema de sessões isoladas por chave API
const userSessions = new Map(); // Map<apiKey, UserSession>
const socketSessions = new Map(); // Map<socketId, {apiKey, sessionId}>
const agentConfigs = new Map(); // Map<apiKey, AgentConfig>

// Estrutura de configuração de agente
class AgentConfig {
  constructor() {
    this.name = 'Assistente de Atendimento';
    this.personality = 'profissional';
    this.prompt = '';
    this.enabled = true;
    this.autoReply = true;
    this.stopAfterHuman = true;
    this.selectedAgent = 'custom';
    this.responseDelay = 2000;
    this.pauseAfterHuman = true;
    this.pauseDurationHours = 12;
    
    // Nova configuração para grupos
    this.respondToGroups = false; // Por padrão não responde em grupos
    this.groupWhitelist = []; // Lista de grupos permitidos (IDs)
    this.groupBlacklist = []; // Lista de grupos bloqueados (IDs)
    
    // Configurações de performance
    this.maxResponseLength = 500; // Limite de caracteres na resposta
    this.rateLimitPerContact = 5; // Máximo de respostas por contato por hora
    this.rateLimitWindow = 3600000; // Janela de tempo em ms (1 hora)
    this.ignoreForwardedMessages = true; // Ignorar mensagens encaminhadas
    this.ignoreMediaMessages = false; // Responder a mensagens de mídia
    
    this.workingHours = {
      enabled: false,
      start: '09:00',
      end: '18:00',
      timezone: 'America/Sao_Paulo'
    };
    this.keywords = [];
    this.welcomeMessage = 'Olá! Como posso ajudá-lo hoje?';
    this.awayMessage = 'Obrigado pela mensagem! Retornaremos em breve.';
    
    // Controle de rate limiting por contato
    this.contactRateLimit = new Map();
  }
  
  // Método para verificar rate limit
  checkRateLimit(contactId) {
    const now = Date.now();
    const contactData = this.contactRateLimit.get(contactId) || { count: 0, windowStart: now };
    
    // Reset da janela se passou o tempo limite
    if (now - contactData.windowStart > this.rateLimitWindow) {
      contactData.count = 0;
      contactData.windowStart = now;
    }
    
    // Verificar se excedeu o limite
    if (contactData.count >= this.rateLimitPerContact) {
      return false; // Rate limit excedido
    }
    
    // Incrementar contador
    contactData.count++;
    this.contactRateLimit.set(contactId, contactData);
    return true; // Dentro do limite
  }
}

// Estrutura de uma sessão de usuário
class UserSession {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.whatsappClient = null;
    this.isClientReady = false;
    this.qrCodeData = null;
    this.agentEnabled = true;
    this.conversationStates = new Map();
    this.aiSessions = {
      userAssistant: `user-assistant-${apiKey}`,
      supportAgent: `support-agent-${apiKey}`
    };
    this.sockets = new Set(); // Sockets conectados para este usuário
    this.agentConfig = new AgentConfig(); // Configuração do agente
    this.pausedContacts = new Map(); // Map<contactId, pauseEndTime>
  }

  addSocket(socket) {
    this.sockets.add(socket);
  }

  removeSocket(socket) {
    this.sockets.delete(socket);
  }

  broadcast(event, data) {
    this.sockets.forEach(socket => {
      socket.emit(event, data);
    });
  }

  // Pausar atendimento automático para um contato
  pauseContactForHours(contactId, hours = 12) {
    const pauseEndTime = new Date();
    pauseEndTime.setHours(pauseEndTime.getHours() + hours);
    this.pausedContacts.set(contactId, pauseEndTime);
    console.log(`Contato ${contactId} pausado até ${pauseEndTime.toLocaleString()}`);
  }

  // Verificar se um contato está pausado
  isContactPaused(contactId) {
    const pauseEndTime = this.pausedContacts.get(contactId);
    if (!pauseEndTime) return false;
    
    const now = new Date();
    if (now >= pauseEndTime) {
      this.pausedContacts.delete(contactId);
      return false;
    }
    return true;
  }

  // Remover pausa de um contato
  unpauseContact(contactId) {
    this.pausedContacts.delete(contactId);
    console.log(`Pausa removida para contato ${contactId}`);
  }
}

// Função para obter ou criar sessão do usuário
function getUserSession(apiKey) {
  if (!userSessions.has(apiKey)) {
    userSessions.set(apiKey, new UserSession(apiKey));
  }
  return userSessions.get(apiKey);
}

// Função para limpeza completa de sessão WhatsApp
async function cleanupWhatsAppSession(userSession) {
  try {
    // Limpar dados da sessão
    userSession.whatsappClient = null;
    userSession.isClientReady = false;
    userSession.isInitializing = false; // Limpar flag de inicialização
    userSession.qrCodeData = null;
    userSession.conversationStates.clear();
    userSession.pausedContacts.clear();
    
    // Notificar todos os sockets da sessão sobre a desconexão
    userSession.broadcast('whatsapp_disconnected');
    
    console.log(`Sessão WhatsApp limpa para usuário ${userSession.apiKey.slice(-8)}`);
  } catch (error) {
    console.error(`Erro ao limpar sessão WhatsApp:`, error);
  }
}

// Função para verificar se um usuário tem acesso a um recurso
function verifyUserAccess(requestApiKey, resourceApiKey) {
  return requestApiKey === resourceApiKey;
}

// Configuração do cliente WhatsApp por sessão
function initializeWhatsAppClient(userSession) {
  // Verificar se já está inicializando para evitar múltiplas inicializações
  if (userSession.isInitializing) {
    console.log(`Inicialização já em andamento para usuário ${userSession.apiKey.slice(-8)}, ignorando nova tentativa`);
    return;
  }
  
  // Marcar como inicializando
  userSession.isInitializing = true;
  
  // Garantir que cada usuário tenha um clientId único e isolado
  const uniqueClientId = `aicentral-whatsapp-${userSession.apiKey.slice(-8)}`;
  
  // Verificar se já existe um cliente ativo para evitar conflitos
  if (userSession.whatsappClient) {
    console.log(`Cliente WhatsApp já existe para usuário ${userSession.apiKey.slice(-8)}, destruindo anterior`);
    try {
      userSession.whatsappClient.destroy();
    } catch (error) {
      console.error('Erro ao destruir cliente anterior:', error);
    }
  }
  
  userSession.whatsappClient = new Client({
    authStrategy: new LocalAuth({
      clientId: uniqueClientId
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  });

  userSession.whatsappClient.on('qr', async (qr) => {
    console.log(`QR Code gerado para usuário: ${userSession.apiKey.slice(-8)}`);
    try {
      userSession.qrCodeData = await qrcode.toDataURL(qr);
      userSession.broadcast('qr_code', userSession.qrCodeData);
    } catch (err) {
      console.error('Erro ao gerar QR code:', err);
    }
  });

  userSession.whatsappClient.on('ready', () => {
    console.log(`WhatsApp Client está pronto para usuário: ${userSession.apiKey.slice(-8)}`);
    userSession.isClientReady = true;
    userSession.qrCodeData = null;
    userSession.isInitializing = false; // Desmarcar flag de inicialização
    userSession.broadcast('whatsapp_ready');
  });

  userSession.whatsappClient.on('authenticated', () => {
    console.log(`WhatsApp autenticado para usuário: ${userSession.apiKey.slice(-8)}`);
    userSession.broadcast('whatsapp_authenticated');
  });

  userSession.whatsappClient.on('auth_failure', (msg) => {
    console.error(`Falha na autenticação para usuário ${userSession.apiKey.slice(-8)}:`, msg);
    userSession.isInitializing = false; // Desmarcar flag de inicialização
    userSession.broadcast('auth_failure', msg);
  });

  userSession.whatsappClient.on('disconnected', async (reason) => {
    console.log(`WhatsApp desconectado para usuário ${userSession.apiKey.slice(-8)}:`, reason);
    
    userSession.isInitializing = false; // Desmarcar flag de inicialização
    
    // Limpeza automática quando WhatsApp desconecta
    await cleanupWhatsAppSession(userSession);
    
    // Se a desconexão foi inesperada, notificar com o motivo
    if (reason) {
      userSession.broadcast('whatsapp_disconnected', reason);
    }
  });

  userSession.whatsappClient.on('message', async (message) => {
    console.log(`Nova mensagem recebida para usuário ${userSession.apiKey.slice(-8)}:`, message.body);
    
    try {
      const contact = await message.getContact();
      
      // Emitir mensagem para o frontend com estrutura correta
      const messageData = {
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        body: message.body,
        timestamp: message.timestamp * 1000, // Converter para milliseconds
        fromMe: message.fromMe,
        type: message.type,
        contact: {
          name: contact.name || contact.pushname || contact.number,
          number: contact.number,
          profilePicUrl: contact.profilePicUrl
        }
      };
      
      userSession.broadcast('new_message', messageData);
      console.log(`Mensagem emitida para usuário ${userSession.apiKey.slice(-8)}:`, messageData);

      // Salvar mensagem no Supabase
      await saveMessage(messageData);
      
      // Salvar contato no Supabase
      await saveContact({
        id: messageData.from,
        number: contact.number,
        name: contact.name,
        pushname: contact.pushname,
        profilePicUrl: contact.profilePicUrl,
        isGroup: contact.isGroup
      });

      // Processar com AI Central se não for mensagem própria
      if (!message.fromMe && message.body) {
        await processMessageWithAI(message, userSession);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  userSession.whatsappClient.initialize();
}

// Função para processar mensagem com AI Central
async function processMessageWithAI(message, userSession) {
  try {
    // Verificar se o agente está ativo e se a conversa não está em modo humano
    const conversationKey = message.from;
    const conversationState = userSession.conversationStates.get(conversationKey) || { humanMode: false };
    
    // Verificar se o contato está pausado
    if (userSession.isContactPaused(conversationKey)) {
      console.log(`Contato ${conversationKey} está pausado - não processando mensagem automática`);
      return;
    }
    
    if (!userSession.agentEnabled || !userSession.agentConfig.autoReply || conversationState.humanMode) {
      return; // Não processar se agente desativado, auto-reply desabilitado ou em modo humano
    }
    
    // Obter informações do chat para verificar se é grupo
    const chat = await message.getChat();
    const isGroup = chat.isGroup;
    
    // Verificar se deve responder em grupos
    if (isGroup && !userSession.agentConfig.respondToGroups) {
      // Verificar se o grupo está na whitelist
      if (userSession.agentConfig.groupWhitelist.length > 0) {
        if (!userSession.agentConfig.groupWhitelist.includes(chat.id._serialized)) {
          console.log(`Grupo ${chat.name || chat.id._serialized} não está na whitelist - ignorando mensagem`);
          return;
        }
      } else {
        console.log(`Agente configurado para não responder em grupos - ignorando mensagem do grupo ${chat.name || chat.id._serialized}`);
        return;
      }
    }
    
    // Verificar se o grupo está na blacklist
    if (isGroup && userSession.agentConfig.groupBlacklist.includes(chat.id._serialized)) {
      console.log(`Grupo ${chat.name || chat.id._serialized} está na blacklist - ignorando mensagem`);
      return;
    }
    
    // Verificar rate limit por contato
    if (!userSession.agentConfig.checkRateLimit(conversationKey)) {
      console.log(`Rate limit excedido para contato ${conversationKey} - ignorando mensagem`);
      return;
    }
    
    // Verificar se deve ignorar mensagens encaminhadas
    if (userSession.agentConfig.ignoreForwardedMessages && message.isForwarded) {
      console.log(`Mensagem encaminhada ignorada de ${conversationKey}`);
      return;
    }
    
    // Verificar se deve ignorar mensagens de mídia
    if (userSession.agentConfig.ignoreMediaMessages && message.hasMedia) {
      console.log(`Mensagem de mídia ignorada de ${conversationKey}`);
      return;
    }

    // Verificar horário de funcionamento
    if (userSession.agentConfig.workingHours.enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;
      
      const [startHour, startMinute] = userSession.agentConfig.workingHours.start.split(':').map(Number);
      const [endHour, endMinute] = userSession.agentConfig.workingHours.end.split(':').map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;
      
      if (currentTime < startTime || currentTime > endTime) {
        // Fora do horário de funcionamento - enviar mensagem de ausência
        if (userSession.agentConfig.awayMessage) {
          setTimeout(async () => {
            try {
              await userSession.whatsappClient.sendMessage(message.from, userSession.agentConfig.awayMessage);
              console.log(`Mensagem de ausência enviada para ${message.from} (usuário ${userSession.apiKey.slice(-8)})`);
            } catch (error) {
              console.error(`Erro ao enviar mensagem de ausência:`, error);
            }
          }, userSession.agentConfig.responseDelay);
        }
        return;
      }
    }

    // Verificar palavras-chave se configuradas
    if (userSession.agentConfig.keywords.length > 0) {
      const messageText = message.body.toLowerCase();
      const hasKeyword = userSession.agentConfig.keywords.some(keyword => 
        messageText.includes(keyword.toLowerCase())
      );
      
      if (!hasKeyword) {
        console.log(`Mensagem não contém palavras-chave configuradas - ignorando`);
        return;
      }
    }

    const contact = await message.getContact();
    const sessionId = `whatsapp_${contact.number}_${userSession.apiKey.slice(-8)}`;
    
    console.log(`Processando mensagem com AI Central para usuário ${userSession.apiKey.slice(-8)}:`, message.body);
    
    // Construir prompt personalizado
    let systemPrompt = `Você é um assistente de atendimento ao cliente via WhatsApp chamado ${userSession.agentConfig.name}.`;
    
    // Adicionar personalidade
    switch (userSession.agentConfig.personality) {
      case 'amigavel':
        systemPrompt += ' Seja amigável, caloroso e use emojis apropriados.';
        break;
      case 'formal':
        systemPrompt += ' Mantenha um tom formal e profissional.';
        break;
      case 'casual':
        systemPrompt += ' Use um tom casual e descontraído.';
        break;
      case 'tecnico':
        systemPrompt += ' Seja técnico e preciso nas respostas.';
        break;
      default:
        systemPrompt += ' Mantenha um tom profissional e prestativo.';
    }
    
    // Adicionar prompt personalizado se configurado
    if (userSession.agentConfig.prompt) {
      systemPrompt += `\n\nInstruções específicas: ${userSession.agentConfig.prompt}`;
    }
    
    const fullPrompt = `${systemPrompt}\n\nMensagem do cliente: ${message.body}\n\nResponda de forma adequada:`;
    
    // Fazer requisição para AI Central usando a chave da sessão
    const response = await callAICentral(
      fullPrompt,
      sessionId,
      userSession.apiKey
    );

    if (response && response.answer) {
      console.log(`Resposta da AI recebida para usuário ${userSession.apiKey.slice(-8)}:`, response.answer);
      
      // Aplicar limite de caracteres na resposta
      let finalResponse = response.answer;
      if (userSession.agentConfig.maxResponseLength > 0 && finalResponse.length > userSession.agentConfig.maxResponseLength) {
        finalResponse = finalResponse.substring(0, userSession.agentConfig.maxResponseLength - 3) + '...';
        console.log(`Resposta truncada para ${userSession.agentConfig.maxResponseLength} caracteres`);
      }
      
      // Usar delay configurado
      setTimeout(async () => {
        try {
          // Enviar resposta da AI para o WhatsApp
          const sentMessage = await userSession.whatsappClient.sendMessage(message.from, finalResponse);
          console.log(`Mensagem enviada para WhatsApp (usuário ${userSession.apiKey.slice(-8)}):`, sentMessage.id._serialized);
          
          // Emitir para o frontend que a resposta foi enviada
          userSession.broadcast('ai_response_sent', {
            to: message.from,
            message: finalResponse,
            sessionId: response.session_id,
            messageId: sentMessage.id._serialized
          });
          
          // Emitir a mensagem como uma nova mensagem para atualizar o chat
          const aiMessageData = {
            id: sentMessage.id._serialized,
            from: 'me',
            to: message.from,
            body: response.answer,
            timestamp: Date.now(),
            fromMe: true,
            type: 'chat',
            contact: {
              name: contact.name || contact.pushname || contact.number,
              number: contact.number,
              profilePicUrl: contact.profilePicUrl
            }
          };
          
          userSession.broadcast('new_message', aiMessageData);
          
          // Salvar resposta da AI no Supabase
          await saveMessage(aiMessageData);
        } catch (sendError) {
          console.error(`Erro ao enviar resposta automática:`, sendError);
        }
      }, userSession.agentConfig.responseDelay);
    } else {
      console.log('Resposta da AI vazia ou inválida');
    }
  } catch (error) {
    console.error('Erro ao processar mensagem com AI Central:', error.message);
    
    // Tentar resposta de fallback se houver erro na API
    if (userSession.agentEnabled) {
      try {
        // Definir sessionId para o fallback
        const contact = await message.getContact();
        const sessionId = `whatsapp_${contact.number}_${userSession.apiKey.slice(-8)}`;
        const fallbackResponse = generateFallbackResponse(message.body, sessionId);
        if (fallbackResponse && fallbackResponse.answer) {
          console.log(`Usando resposta de fallback para usuário ${userSession.apiKey.slice(-8)}:`, fallbackResponse.answer);
          
          setTimeout(async () => {
            try {
              const sentMessage = await userSession.whatsappClient.sendMessage(message.from, fallbackResponse.answer);
              console.log(`Mensagem de fallback enviada para WhatsApp (usuário ${userSession.apiKey.slice(-8)}):`, sentMessage.id._serialized);
              
              // Emitir para o frontend que a resposta foi enviada
              userSession.broadcast('ai_response_sent', {
                to: message.from,
                message: fallbackResponse.answer,
                sessionId: fallbackResponse.session_id,
                messageId: sentMessage.id._serialized,
                provider: 'fallback'
              });
              
              // Emitir a mensagem como uma nova mensagem para atualizar o chat
              const contact = await message.getContact();
              const aiMessageData = {
                id: sentMessage.id._serialized,
                from: 'me',
                to: message.from,
                body: fallbackResponse.answer,
                timestamp: Date.now(),
                fromMe: true,
                type: 'chat',
                contact: {
                  name: contact.name || contact.pushname || contact.number,
                  number: contact.number,
                  profilePicUrl: contact.profilePicUrl
                }
              };
              
              userSession.broadcast('new_message', aiMessageData);
              
              // Salvar resposta no Supabase
              await saveMessage(aiMessageData);
            } catch (sendError) {
              console.error(`Erro ao enviar resposta de fallback:`, sendError);
              // Enviar mensagem de erro como último recurso
              const errorMessage = 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente mais tarde.';
              await userSession.whatsappClient.sendMessage(message.from, errorMessage);
            }
          }, userSession.agentConfig.responseDelay);
        }
      } catch (fallbackError) {
        console.error('Erro no sistema de fallback:', fallbackError);
        // Enviar mensagem de erro padrão como último recurso
        const errorMessage = 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente mais tarde.';
        await userSession.whatsappClient.sendMessage(message.from, errorMessage);
      }
    }
  }
}

// Função para processar mensagens do agente IA
async function processAgentMessage(query, context) {
  const { selectedChat, recentMessages, analysis, allChats } = context;
  
  // Análise básica da consulta
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('resumo') || lowerQuery.includes('resumir')) {
    if (recentMessages && recentMessages.length > 0) {
      const messageCount = recentMessages.length;
      const lastMessage = recentMessages[recentMessages.length - 1];
      const clientMessages = recentMessages.filter(m => !m.fromMe);
      const myMessages = recentMessages.filter(m => m.fromMe);
      
      return `📊 Resumo da conversa com ${selectedChat?.name || 'contato'}:\n\n` +
             `💬 ${messageCount} mensagens recentes\n` +
             `📥 ${clientMessages.length} mensagens recebidas\n` +
             `📤 ${myMessages.length} mensagens enviadas\n` +
             `🕒 Última mensagem: "${lastMessage.body.substring(0, 50)}${lastMessage.body.length > 50 ? '...' : ''}"\n` +
             `📈 Status: ${analysis?.conversationStatus || 'Ativa'}\n` +
             `⚡ Engajamento: ${clientMessages.length > myMessages.length ? 'Alto - Cliente muito ativo' : 'Moderado - Equilibrado'}`;
    }
    return '❌ Não há mensagens suficientes para gerar um resumo.';
  }
  
  if (lowerQuery.includes('sugestão') || lowerQuery.includes('resposta') || lowerQuery.includes('sugira')) {
    if (recentMessages && recentMessages.length > 0) {
      const lastMessage = recentMessages[recentMessages.length - 1];
      if (!lastMessage.fromMe) {
        const messageContent = lastMessage.body.toLowerCase();
        let suggestions = [];
        
        // Sugestões contextuais baseadas no conteúdo
        if (messageContent.includes('preço') || messageContent.includes('valor') || messageContent.includes('quanto')) {
          suggestions = [
            '"Vou verificar os preços atualizados e te envio em instantes!"',
            '"Temos algumas opções de preço. Posso te mostrar as principais?"',
            '"Deixe-me consultar nossa tabela de preços para você."'
          ];
        } else if (messageContent.includes('produto') || messageContent.includes('serviço')) {
          suggestions = [
            '"Que ótimo interesse! Posso te explicar mais detalhes sobre isso."',
            '"Temos esse produto/serviço disponível. Quer que eu te conte mais?"',
            '"Perfeito! Vou te passar todas as informações que precisa."'
          ];
        } else if (messageContent.includes('obrigad') || messageContent.includes('valeu')) {
          suggestions = [
            '"Por nada! Estou aqui sempre que precisar 😊"',
            '"Foi um prazer ajudar! Qualquer dúvida, é só chamar."',
            '"Fico feliz em ter ajudado! Até mais!"'
          ];
        } else {
          suggestions = [
            '"Obrigado pela mensagem! Vou analisar e retorno em breve."',
            '"Entendi sua solicitação. Posso ajudar com isso sim!"',
            '"Ótima pergunta! Deixe-me verificar os detalhes para você."'
          ];
        }
        
        return `💡 Sugestões de resposta para: "${lastMessage.body.substring(0, 40)}..."\n\n` +
               suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n\n') +
               '\n\n✨ Dica: Personalize a resposta com o nome do cliente para maior proximidade!';
      } else {
        return '📤 A última mensagem foi sua. Aguarde a resposta do cliente para sugerir uma nova resposta.';
      }
    }
    return '❌ Não há mensagens do cliente para sugerir respostas.';
  }
  
  if (lowerQuery.includes('análise') || lowerQuery.includes('analisar') || lowerQuery.includes('como está')) {
    if (recentMessages && recentMessages.length > 0 && analysis) {
      const engagementLevel = analysis.userMessages > analysis.myMessages ? 'Alto' : 
                            analysis.userMessages === analysis.myMessages ? 'Equilibrado' : 'Baixo';
      
      const responseTime = analysis.lastActivity ? 
        `${Math.round((Date.now() - new Date(analysis.lastActivity)) / (1000 * 60))} min atrás` : 'N/A';
      
      return `📈 Análise detalhada da conversa:\n\n` +
             `👤 Cliente: ${selectedChat?.name || 'Contato'}\n` +
             `💬 Total: ${analysis.totalMessages} mensagens\n` +
             `📥 Recebidas: ${analysis.userMessages}\n` +
             `📤 Enviadas: ${analysis.myMessages}\n` +
             `📊 Status: ${analysis.conversationStatus}\n` +
             `⚡ Engajamento: ${engagementLevel}\n` +
             `🕒 Última atividade: ${responseTime}\n\n` +
             `🎯 Recomendações:\n` +
             `${engagementLevel === 'Alto' ? '• Cliente muito interessado, mantenha o ritmo!' : 
               engagementLevel === 'Equilibrado' ? '• Conversa balanceada, continue assim!' : 
               '• Considere fazer perguntas para engajar mais'}\n` +
             `${analysis.totalMessages > 10 ? '• Conversa madura, considere finalizar ou agendar' : 
               '• Ainda há espaço para desenvolver mais a conversa'}`;
    }
    return '❌ Não há dados suficientes para análise completa.';
  }
  
  if (lowerQuery.includes('contatos') || lowerQuery.includes('chats') || lowerQuery.includes('visão geral')) {
    if (allChats && allChats.length > 0) {
      const activeChats = allChats.filter(chat => chat.unreadCount > 0);
      const totalUnread = allChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      
      return `📱 Visão geral dos contatos:\n\n` +
             `💬 Total de chats: ${allChats.length}\n` +
             `🔴 Chats com mensagens não lidas: ${activeChats.length}\n` +
             `📩 Total de mensagens não lidas: ${totalUnread}\n\n` +
             `🎯 Chats que precisam de atenção:\n` +
             activeChats.slice(0, 5).map(chat => 
               `• ${chat.name || 'Contato'}: ${chat.unreadCount} mensagem(ns)`
             ).join('\n') +
             (activeChats.length > 5 ? `\n... e mais ${activeChats.length - 5} chats` : '');
    }
    return '❌ Nenhum chat disponível no momento.';
  }
  
  // Resposta padrão com comandos disponíveis
  return `🤖 Olá! Sou seu assistente IA para WhatsApp.\n\n` +
         `📋 Comandos disponíveis:\n\n` +
         `📊 "análise" ou "como está" - Análise da conversa atual\n` +
         `💡 "sugestão" ou "sugira" - Sugestões de resposta\n` +
         `📝 "resumo" - Resumo da conversa\n` +
         `📱 "visão geral" - Status de todos os chats\n\n` +
         `💬 Sua pergunta: "${query}"\n\n` +
         `✨ Dica: Estou sempre monitorando as conversas para fornecer insights automáticos!`;
}

// Função de fallback para quando a API não está disponível
function generateFallbackResponse(question, sessionId) {
  const lowerQuestion = question.toLowerCase();
  
  // Respostas baseadas em palavras-chave
  if (lowerQuestion.includes('olá') || lowerQuestion.includes('oi') || lowerQuestion.includes('bom dia') || lowerQuestion.includes('boa tarde') || lowerQuestion.includes('boa noite')) {
    return {
      answer: 'Olá! Como posso ajudá-lo hoje? 😊',
      session_id: sessionId,
      provider: 'fallback'
    };
  }
  
  if (lowerQuestion.includes('obrigado') || lowerQuestion.includes('obrigada') || lowerQuestion.includes('valeu')) {
    return {
      answer: 'De nada! Fico feliz em ajudar. Se precisar de mais alguma coisa, estarei aqui! 😊',
      session_id: sessionId,
      provider: 'fallback'
    };
  }
  
  if (lowerQuestion.includes('ajuda') || lowerQuestion.includes('help')) {
    return {
      answer: 'Estou aqui para ajudar! Pode me fazer qualquer pergunta e farei o meu melhor para responder. 💪',
      session_id: sessionId,
      provider: 'fallback'
    };
  }
  
  if (lowerQuestion.includes('preço') || lowerQuestion.includes('valor') || lowerQuestion.includes('custo')) {
    return {
      answer: 'Para informações sobre preços e valores, por favor entre em contato com nossa equipe comercial. Eles poderão fornecer todas as informações detalhadas! 💰',
      session_id: sessionId,
      provider: 'fallback'
    };
  }
  
  if (lowerQuestion.includes('horário') || lowerQuestion.includes('funcionamento') || lowerQuestion.includes('atendimento')) {
    return {
      answer: 'Nosso atendimento funciona de segunda a sexta, das 8h às 18h. Fora desse horário, deixe sua mensagem que retornaremos assim que possível! 🕐',
      session_id: sessionId,
      provider: 'fallback'
    };
  }
  
  // Resposta padrão
  return {
    answer: 'Obrigado pela sua mensagem! No momento estou com limitações técnicas, mas nossa equipe entrará em contato em breve para ajudá-lo da melhor forma possível. 🤖',
    session_id: sessionId,
    provider: 'fallback'
  };
}

// Funções para integração com AI Central
async function callAICentral(question, sessionId, apiKey) {
  try {
    // Verificar se a chave da API está configurada
    if (!apiKey || apiKey === 'sua-chave-api-aqui' || apiKey.trim() === '') {
      console.warn('Chave da API AI Central não configurada. Usando resposta de fallback.');
      return generateFallbackResponse(question, sessionId);
    }

    // Preparar dados no formato esperado pela API /ask
    const requestData = {
      question: question
    };
    
    // Adicionar session_id apenas se fornecido
    if (sessionId && sessionId.trim() !== '') {
      requestData.session_id = sessionId;
    }

    console.log('Enviando requisição para AI Central:', {
      url: `${AI_CENTRAL_API}/v1/ask`,
      data: requestData,
      apiKey: apiKey.slice(-8)
    });

    const response = await fetch(`${AI_CENTRAL_API}/v1/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey // Suporte para ambos os métodos de autenticação
      },
      body: JSON.stringify(requestData),
      timeout: 30000 // 30 segundos de timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error ${response.status}:`, errorText);
      
      // Se erro 401, a chave é inválida
      if (response.status === 401) {
        console.error('Chave API inválida ou expirada');
        throw new Error('Chave API inválida ou expirada');
      }
      
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('AI Central Response recebida:', {
      id: result.id,
      session_id: result.session_id,
      provider: result.provider,
      answer_length: result.answer ? result.answer.length : 0
    });
    
    // Validar estrutura da resposta
    if (!result.answer) {
      console.warn('Resposta da API não contém campo "answer"');
      throw new Error('Resposta inválida da API');
    }
    
    return {
      id: result.id,
      answer: result.answer,
      session_id: result.session_id,
      provider: result.provider || 'aicentral_orchestrated',
      created: result.created
    };
  } catch (error) {
    console.error('Erro na API AI Central:', error.message);
    throw error;
  }
}

async function validateAPIKey(apiKey) {
  try {
    console.log('Validando API Key:', apiKey.slice(-8));
    
    const response = await fetch(`${AI_CENTRAL_API}/v1/validate-key`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-API-Key': apiKey // Suporte para ambos os métodos de autenticação
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.error(`API validation failed: ${response.status} - ${response.statusText}`);
      return false;
    }
    
    // Tentar fazer parse do JSON da resposta
    try {
      const data = await response.json();
      console.log('Validation response data:', data);
      
      // Verificar se a resposta tem a estrutura esperada conforme a rota v1
      if (data && typeof data.ok === 'boolean') {
        return data.ok === true;
      }
      
      // Fallback: se não tem campo 'ok', considerar válido se status for 200
      console.warn('Resposta não tem campo ok, usando status HTTP');
      return response.status === 200;
    } catch (jsonError) {
      // Se não conseguir fazer parse do JSON, considerar válido se status for 200
      console.warn('Resposta da API não é JSON válido, usando status HTTP:', response.status);
      return response.status === 200;
    }
  } catch (error) {
    console.error('Erro ao validar chave API:', error);
    return false;
  }
}

async function resetAISession(sessionId, apiKey) {
  try {
    const response = await fetch(`${AI_CENTRAL_API}/v1/chat/sessions/${sessionId}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro ao resetar sessão ${sessionId}: ${response.status} - ${errorText}`);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`Sessão ${sessionId} resetada com sucesso:`, result);
    return result;
  } catch (error) {
    console.error(`Erro ao resetar sessão ${sessionId}:`, error);
    throw error;
  }
}

// Socket.io eventos
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  let userSession = null;
  let sessionId = null;

  // Middleware de autenticação
  socket.on('authenticate', async (data) => {
    const { apiKey } = data;
    
    if (!apiKey) {
      socket.emit('auth_error', { message: 'Chave API é obrigatória' });
      return;
    }

    // Validar chave API
    const isValid = await validateAPIKey(apiKey);
    if (!isValid) {
      socket.emit('auth_error', { message: 'Chave API inválida' });
      return;
    }

    // Criar sessionId único para este socket
    sessionId = `${socket.id}_${Date.now()}`;
    
    // Armazenar sessão do socket
    socketSessions.set(socket.id, {
      apiKey: apiKey,
      sessionId: sessionId,
      timestamp: Date.now()
    });
    
    // Obter ou criar sessão do usuário
    userSession = getUserSession(apiKey);
    userSession.addSocket(socket);
    
    console.log(`Usuário autenticado: ${apiKey.slice(-8)} - Session: ${sessionId}`);
    
    // Enviar status da sessão do usuário
    socket.emit('authenticated', {
      isReady: userSession.isClientReady,
      qrCode: userSession.qrCodeData,
      agentEnabled: userSession.agentEnabled,
      sessionId: sessionId
    });
  });

  socket.on('initialize_whatsapp', () => {
    if (!userSession) {
      socket.emit('error', { message: 'Usuário não autenticado' });
      return;
    }
    
    // Verificação adicional de segurança
    const socketSession = socketSessions.get(socket.id);
    if (!socketSession || !verifyUserAccess(socketSession.apiKey, userSession.apiKey)) {
      socket.emit('error', { message: 'Acesso negado' });
      return;
    }
    
    // Sempre inicializar um novo cliente para garantir isolamento completo
    console.log(`Inicializando WhatsApp para usuário ${userSession.apiKey.slice(-8)}`);
    initializeWhatsAppClient(userSession);
  });

  socket.on('check_whatsapp_status', () => {
    if (!userSession) {
      socket.emit('error', { message: 'Usuário não autenticado' });
      return;
    }
    
    console.log(`Verificando status do WhatsApp para usuário ${userSession.apiKey.slice(-8)}`);
    
    if (userSession.isClientReady && userSession.whatsappClient) {
      console.log(`WhatsApp já está conectado para usuário ${userSession.apiKey.slice(-8)}`);
      socket.emit('whatsapp_ready');
    } else {
      console.log(`WhatsApp não está conectado para usuário ${userSession.apiKey.slice(-8)}, inicializando...`);
      initializeWhatsAppClient(userSession);
    }
  });

  socket.on('disconnect_whatsapp', async () => {
    if (!userSession) {
      socket.emit('error', { message: 'Usuário não autenticado' });
      return;
    }
    
    try {
      if (userSession.whatsappClient) {
        console.log(`Desconectando WhatsApp para usuário ${userSession.apiKey.slice(-8)}`);
        await userSession.whatsappClient.destroy();
        
        // Limpeza completa da sessão WhatsApp
        await cleanupWhatsAppSession(userSession);
        
        console.log(`WhatsApp desconectado com sucesso para usuário ${userSession.apiKey.slice(-8)}`);
      }
    } catch (error) {
      console.error(`Erro ao desconectar WhatsApp (usuário ${userSession.apiKey.slice(-8)}):`, error);
      socket.emit('error', { message: 'Erro ao desconectar WhatsApp' });
    }
  });

  socket.on('send_message', async (data) => {
    if (!userSession) {
      socket.emit('message_sent', { success: false, error: 'Usuário não autenticado' });
      return;
    }
    
    // Verificação adicional de segurança
    const socketSession = socketSessions.get(socket.id);
    if (!socketSession || !verifyUserAccess(socketSession.apiKey, userSession.apiKey)) {
      socket.emit('message_sent', { success: false, error: 'Acesso negado' });
      return;
    }
    
    try {
      if (userSession.isClientReady && userSession.whatsappClient) {
        await userSession.whatsappClient.sendMessage(data.to, data.message);
        
        // Implementar pausa automática quando humano responde
        if (userSession.agentConfig.pauseAfterHuman) {
          const contactId = data.to;
          userSession.pauseContactForHours(contactId, userSession.agentConfig.pauseDurationHours);
          
          // Emitir evento para o frontend informar sobre a pausa
          userSession.broadcast('contact_paused', {
            contactId: contactId,
            pauseDurationHours: userSession.agentConfig.pauseDurationHours,
            pauseEndTime: new Date(Date.now() + (userSession.agentConfig.pauseDurationHours * 60 * 60 * 1000))
          });
        }
        
        socket.emit('message_sent', { success: true });
      } else {
        socket.emit('message_sent', { success: false, error: 'WhatsApp não está conectado' });
      }
    } catch (error) {
      console.error(`Erro ao enviar mensagem (usuário ${userSession.apiKey.slice(-8)}):`, error);
      socket.emit('message_sent', { success: false, error: error.message });
    }
  });

  socket.on('get_chats', async () => {
    if (!userSession) {
      socket.emit('chats_error', 'Usuário não autenticado');
      return;
    }
    
    // Verificação adicional de segurança
    const socketSession = socketSessions.get(socket.id);
    if (!socketSession || !verifyUserAccess(socketSession.apiKey, userSession.apiKey)) {
      socket.emit('chats_error', 'Acesso negado');
      return;
    }
    
    // Throttling para evitar sobrecarga - máximo 1 requisição por 2 segundos por usuário
    const now = Date.now();
    if (!userSession.lastChatRequest || (now - userSession.lastChatRequest) < 2000) {
      if (userSession.lastChatRequest) {
        console.log(`Throttling requisição de chats para usuário ${userSession.apiKey.slice(-8)}`);
        return;
      }
    }
    userSession.lastChatRequest = now;
    
    try {
      if (userSession.isClientReady && userSession.whatsappClient) {
        console.log(`Carregando chats para usuário ${userSession.apiKey.slice(-8)}`);
        const chats = await userSession.whatsappClient.getChats();
        console.log(`Encontrados ${chats.length} chats`);
        
        const chatList = await Promise.all(chats.map(async (chat) => {
          try {
            const contact = await chat.getContact();
            return {
              id: chat.id._serialized,
              name: contact.name || contact.pushname || contact.number,
              lastMessage: chat.lastMessage ? {
                body: chat.lastMessage.body,
                timestamp: chat.lastMessage.timestamp
              } : null,
              unreadCount: chat.unreadCount,
              isGroup: chat.isGroup
            };
          } catch (chatError) {
            console.error(`Erro ao processar chat ${chat.id._serialized}:`, chatError);
            return null;
          }
        }));
        
        const validChats = chatList.filter(chat => chat !== null);
        console.log(`Enviando ${validChats.length} chats válidos para o frontend`);
        socket.emit('chats_loaded', validChats);
      } else {
        console.log(`WhatsApp não está pronto para usuário ${userSession.apiKey.slice(-8)}`);
        socket.emit('chats_loaded', []);
      }
    } catch (error) {
      console.error(`Erro ao carregar chats (usuário ${userSession.apiKey.slice(-8)}):`, error);
      socket.emit('chats_error', error.message);
    }
  });

  socket.on('get_messages', async (chatId) => {
    if (!userSession) {
      socket.emit('messages_error', 'Usuário não autenticado');
      return;
    }
    
    // Verificação adicional de segurança
    const socketSession = socketSessions.get(socket.id);
    if (!socketSession || !verifyUserAccess(socketSession.apiKey, userSession.apiKey)) {
      socket.emit('messages_error', 'Acesso negado');
      return;
    }
    
    // Throttling para evitar sobrecarga - máximo 1 requisição por segundo por usuário
    const now = Date.now();
    if (!userSession.lastMessageRequest || (now - userSession.lastMessageRequest) < 1000) {
      if (userSession.lastMessageRequest) {
        console.log(`Throttling requisição de mensagens para usuário ${userSession.apiKey.slice(-8)}`);
        return;
      }
    }
    userSession.lastMessageRequest = now;
    
    try {
      if (userSession.isClientReady && userSession.whatsappClient) {
        console.log(`Carregando mensagens para chat (usuário ${userSession.apiKey.slice(-8)}):`, chatId);
        const chat = await userSession.whatsappClient.getChatById(chatId);
        const messages = await chat.fetchMessages({ limit: 50 });
        
        const messageList = await Promise.all(messages.map(async (msg) => {
          try {
            const contact = await msg.getContact();
            return {
              id: msg.id._serialized,
              from: msg.from,
              to: msg.to,
              body: msg.body || '',
              timestamp: msg.timestamp * 1000, // Converter para milliseconds
              fromMe: msg.fromMe,
              type: msg.type,
              contact: {
                name: contact.name || contact.pushname || contact.number,
                number: contact.number,
                profilePicUrl: contact.profilePicUrl
              }
            };
          } catch (msgError) {
            console.error('Erro ao processar mensagem individual:', msgError);
            return null;
          }
        }));
        
        // Filtrar mensagens nulas e ordenar por timestamp
        const validMessages = messageList.filter(msg => msg !== null)
          .sort((a, b) => a.timestamp - b.timestamp);
        
        console.log(`Enviando ${validMessages.length} mensagens para o frontend (usuário ${userSession.apiKey.slice(-8)})`);
        socket.emit('messages_loaded', validMessages);
      } else {
        socket.emit('messages_error', 'WhatsApp não está conectado');
      }
    } catch (error) {
      console.error(`Erro ao carregar mensagens (usuário ${userSession.apiKey.slice(-8)}):`, error);
      socket.emit('messages_error', error.message);
    }
  });

  // Controle do agente
  socket.on('toggle-agent', (data) => {
    if (!userSession) {
      socket.emit('error', { message: 'Usuário não autenticado' });
      return;
    }
    
    userSession.agentEnabled = data.enabled;
    console.log(`Agente ${userSession.agentEnabled ? 'ativado' : 'desativado'} para usuário ${userSession.apiKey.slice(-8)}`);
    
    // Notificar apenas os sockets da sessão do usuário
    userSession.broadcast('agent-status-changed', { enabled: userSession.agentEnabled });
  });

  // Chat do agente
  socket.on('agent-message', async (data) => {
    try {
      const response = await processAgentMessage(data.message, data.whatsappContext);
      socket.emit('agent-response', { message: response });
    } catch (error) {
      console.error('Erro no chat do agente:', error);
      socket.emit('agent-response', { 
        message: 'Erro ao processar sua mensagem. Tente novamente.' 
      });
    }
  });

  // Manipular consultas do agente IA
  socket.on('agent-query', async (data) => {
    try {
      console.log('Consulta do agente recebida:', data);
      
      // Processar resposta do agente com contexto completo
      const response = await processAgentMessage(data.message, data.context);
      
      socket.emit('agent-response', {
        text: response,
        timestamp: new Date(),
        sender: 'agent'
      });
    } catch (error) {
      console.error('Erro ao processar consulta do agente:', error);
      socket.emit('agent-response', {
        text: 'Desculpe, ocorreu um erro ao processar sua consulta. Tente novamente.',
        timestamp: new Date(),
        sender: 'agent'
      });
    }
  });

  // Controle de modo humano por conversa
  socket.on('toggle-human-mode', (data) => {
    if (!userSession) {
      socket.emit('error', { message: 'Usuário não autenticado' });
      return;
    }
    
    const { chatId, humanMode } = data;
    userSession.conversationStates.set(chatId, { humanMode });
    
    console.log(`Conversa ${chatId} ${humanMode ? 'em modo humano' : 'em modo automático'} (usuário ${userSession.apiKey.slice(-8)})`);
    
    socket.emit('human-mode-changed', { chatId, humanMode });
  });

  // Handler para Assistente Pessoal (User Assistant)
  socket.on('user-assistant-query', async (data) => {
    if (!userSession) {
      socket.emit('user-assistant-response', { 
        error: 'Usuário não autenticado' 
      });
      return;
    }
    
    try {
      const { message, sessionId, context } = data;
      
      // Preparar contexto para o assistente pessoal
      const contextPrompt = `Você é um assistente pessoal inteligente e versátil.

**CONTEXTO DO WHATSAPP:**
- Chat selecionado: ${context.selectedChat?.name || 'Nenhum'}
- Mensagens recentes: ${context.messages?.length || 0}
- Total de chats: ${context.chats?.length || 0}

**INSTRUÇÕES:**
- Responda de forma útil e informativa
- Forneça análises e insights quando solicitado
- Seja conversacional e amigável
- Adapte-se ao contexto da conversa
- Funciona independente do WhatsApp

Você pode ajudar com análises, perguntas gerais, insights sobre conversas e qualquer assunto.`;
      
      // Usar sessionId único do socket para isolamento
      const socketSession = socketSessions.get(socket.id);
      const uniqueSessionId = socketSession ? `userAssistant_${socketSession.sessionId}` : `userAssistant_${userSession.apiKey.slice(-8)}`;
      
      const response = await callAICentral(
        `${contextPrompt}\n\nPergunta: ${message}`,
        uniqueSessionId,
        userSession.apiKey
      );
      
      socket.emit('user-assistant-response', {
        content: response.answer,
        timestamp: new Date(),
        type: 'assistant'
      });
      
    } catch (error) {
      console.error('Erro no assistente pessoal:', error);
      socket.emit('user-assistant-response', {
        content: 'Desculpe, ocorreu um erro no assistente pessoal. Tente novamente.',
        timestamp: new Date(),
        type: 'assistant',
        error: true
      });
    }
  });

  // Handler para Agente de Atendimento
  socket.on('support-agent-query', async (data) => {
    if (!userSession) {
      socket.emit('support-agent-response', { 
        error: 'Usuário não autenticado' 
      });
      return;
    }
    
    try {
      const { message, sessionId, context, agentConfig } = data;
      
      // Usar configuração do agente fornecida ou padrão
      const currentAgentConfig = agentConfig || userSession.agentConfig;
      
      // Preparar contexto baseado na configuração do agente
      let contextPrompt = '';
      
      if (currentAgentConfig && currentAgentConfig.prompt) {
        // Usar prompt personalizado do agente
        contextPrompt = `${currentAgentConfig.prompt}

**INFORMAÇÕES DO CLIENTE:**
- Nome: ${context.customerInfo?.name || 'Não informado'}
- Número: ${context.customerInfo?.contact?.number || 'Não informado'}
- Mensagens recentes: ${context.messages?.length || 0}

**INSTRUÇÕES ADICIONAIS:**
- Responda de forma CURTA e DIRETA (máximo 2-3 frases)
- Uma pergunta por vez, aguarde resposta antes de continuar
- Adapte-se ao contexto da conversa
- Mantenha o tom definido na sua configuração: ${currentAgentConfig.personality || 'profissional'}`;
      } else {
        // Usar prompt padrão
        contextPrompt = `Você é um assistente de atendimento virtual configurável para testes.

**INFORMAÇÕES DO CLIENTE:**
- Nome: ${context.customerInfo?.name || 'Não informado'}
- Número: ${context.customerInfo?.contact?.number || 'Não informado'}
- Mensagens recentes: ${context.messages?.length || 0}

**INSTRUÇÕES:**
- Responda de forma CURTA e DIRETA (máximo 2-3 frases)
- Uma pergunta por vez, aguarde resposta antes de continuar
- Seja cordial, profissional e eficiente
- Simule um atendimento como se fosse um contato novo
- Adapte-se ao contexto da conversa

Sua mensagem inicial deve ser: "Olá! Como posso ajudá-lo hoje?"

Mantenha um tom natural e amigável, como se fosse uma pessoa real respondendo.`;
      }
      
      let finalMessage = message;
      
      // Processar comandos especiais
      if (message.startsWith('/')) {
        switch (message.toLowerCase()) {
          case '/help':
            finalMessage = 'Mostre os comandos disponíveis e como usar o sistema de atendimento.';
            break;
          case '/status':
            finalMessage = `Forneça o status atual do atendimento para o cliente ${context.customerInfo?.name || 'atual'}.`;
            break;
          case '/config':
            finalMessage = 'Explique as configurações disponíveis para o agente de atendimento.';
            break;
          default:
            finalMessage = `Comando não reconhecido: ${message}. Mostre os comandos disponíveis.`;
        }
      }
      
      // Usar sessionId único do socket para isolamento
      const socketSession = socketSessions.get(socket.id);
      const uniqueSessionId = socketSession ? `supportAgent_${socketSession.sessionId}` : `supportAgent_${userSession.apiKey.slice(-8)}`;
      
      const response = await callAICentral(
        `${contextPrompt}\n\nSolicitação: ${finalMessage}`,
        uniqueSessionId,
        userSession.apiKey
      );
      
      socket.emit('support-agent-response', {
        content: response.answer,
        timestamp: new Date(),
        type: 'assistant'
      });
      
    } catch (error) {
      console.error('Erro no agente de atendimento:', error);
      socket.emit('support-agent-response', {
        content: 'Desculpe, ocorreu um erro no sistema de atendimento. Tente novamente.',
        timestamp: new Date(),
        type: 'assistant',
        error: true
      });
    }
  });

  // Configuração de agentes
  socket.on('save-agent-config', (config) => {
    if (!userSession) {
      socket.emit('error', { message: 'Usuário não autenticado' });
      return;
    }
    
    try {
      // Atualizar configuração do agente
      Object.assign(userSession.agentConfig, config);
      
      // Salvar no mapa global para persistência
      agentConfigs.set(userSession.apiKey, { ...userSession.agentConfig });
      
      // Atualizar status do agente se necessário
      if (config.enabled !== undefined) {
        userSession.agentEnabled = config.enabled;
      }
      
      console.log(`Configuração do agente salva para usuário ${userSession.apiKey.slice(-8)}:`, config);
      
      // Notificar todos os sockets da sessão
      userSession.broadcast('agent-config-updated', { config: userSession.agentConfig });
      userSession.broadcast('agent-status-changed', { enabled: userSession.agentEnabled });
      
    } catch (error) {
      console.error('Erro ao salvar configuração do agente:', error);
      socket.emit('error', { message: 'Erro ao salvar configuração' });
    }
  });
  
  socket.on('get-agent-config', () => {
    if (!userSession) {
      socket.emit('error', { message: 'Usuário não autenticado' });
      return;
    }
    
    socket.emit('agent-config-updated', { config: userSession.agentConfig });
  });
  
  // Handler para updateAgentConfig (usado pelo AgentConfigModal)
  socket.on('updateAgentConfig', (config) => {
    if (!userSession) {
      socket.emit('error', { message: 'Usuário não autenticado' });
      return;
    }
    
    try {
      // Atualizar configuração do agente
      Object.assign(userSession.agentConfig, config);
      
      // Salvar no mapa global para persistência
      agentConfigs.set(userSession.apiKey, { ...userSession.agentConfig });
      
      // Atualizar status do agente se necessário
      if (config.enabled !== undefined) {
        userSession.agentEnabled = config.enabled;
      }
      
      console.log(`Configuração do agente atualizada para usuário ${userSession.apiKey.slice(-8)}:`, config);
      
      // Notificar todos os sockets da sessão
      userSession.broadcast('agent-config-saved', { config: userSession.agentConfig });
      userSession.broadcast('agent-status-changed', { enabled: userSession.agentEnabled });
      
    } catch (error) {
      console.error('Erro ao atualizar configuração do agente:', error);
      socket.emit('error', { message: 'Erro ao atualizar configuração' });
    }
  });
  
  socket.on('reset-agent-session', () => {
    if (!userSession) {
      socket.emit('error', { message: 'Usuário não autenticado' });
      return;
    }
    
    // Reset apenas da sessão de conversa, não da configuração
    console.log(`Sessão do agente resetada para usuário ${userSession.apiKey.slice(-8)}`);
    socket.emit('agent-session-reset', { success: true });
  });

  // Reset de sessões - REMOVIDO reset-user-session
  // Mantendo apenas reset para agente de atendimento

  socket.on('reset-support-session', async () => {
    if (!userSession) {
      socket.emit('error', { message: 'Usuário não autenticado' });
      return;
    }
    
    const socketSession = socketSessions.get(socket.id);
    const uniqueSessionId = socketSession ? `supportAgent_${socketSession.sessionId}` : `supportAgent_${userSession.apiKey.slice(-8)}`;
    
    await resetAISession(uniqueSessionId);
    socket.emit('session-reset', { agent: 'support' });
  });

  // Desconectar WhatsApp
  socket.on('disconnect-whatsapp', async () => {
    if (!userSession) {
      socket.emit('error', { message: 'Usuário não autenticado' });
      return;
    }
    
    // Verificação adicional de segurança
    const socketSession = socketSessions.get(socket.id);
    if (!socketSession || !verifyUserAccess(socketSession.apiKey, userSession.apiKey)) {
      socket.emit('error', { message: 'Acesso negado' });
      return;
    }
    
    try {
      if (userSession.whatsappClient) {
        await userSession.whatsappClient.destroy();
        await cleanupWhatsAppSession(userSession);
        console.log(`WhatsApp desconectado pelo usuário ${userSession.apiKey.slice(-8)}`);
      }
    } catch (error) {
      console.error(`Erro ao desconectar WhatsApp (usuário ${userSession.apiKey.slice(-8)}):`, error);
    }
  });

  socket.on('disconnect', async () => {
    console.log('Cliente desconectado:', socket.id);
    
    // Limpar sessão do socket
    const socketSession = socketSessions.get(socket.id);
    if (socketSession) {
      console.log(`Limpando sessão: ${socketSession.sessionId}`);
      socketSessions.delete(socket.id);
    }
    
    // Remover socket da sessão do usuário
    if (userSession) {
      userSession.removeSocket(socket);
      
      // MANTER WhatsApp conectado mesmo sem sockets ativos
      // Isso permite que o agente continue atendendo após logout
      if (userSession.sockets.size === 0 && userSession.whatsappClient) {
        console.log(`Último socket desconectado para usuário ${userSession.apiKey.slice(-8)}, mas mantendo WhatsApp ativo para atendimento automático`);
        // NÃO limpar sessão WhatsApp - manter agente funcionando
      }
    }
  });
});

// Rotas da API
app.get('/api/status', (req, res) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Chave API é obrigatória'
    });
  }
  
  const userSession = userSessions.get(apiKey);
  
  if (!userSession) {
    return res.json({
      whatsappReady: false,
      hasQrCode: false
    });
  }
  
  res.json({
    whatsappReady: userSession.isClientReady,
    hasQrCode: !!userSession.qrCodeData
  });
});

app.post('/api/validate-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Chave API é obrigatória' 
      });
    }
    
    const isValid = await validateAPIKey(apiKey);
    
    if (isValid) {
      res.json({ ok: true, message: 'Chave API válida' });
    } else {
      res.status(400).json({ 
        ok: false, 
        error: 'Chave API inválida' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      ok: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

// Endpoints da API
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await getMessageHistory(chatId);
    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await getContacts();
    res.json(contacts);
  } catch (error) {
    console.error('Erro ao buscar contatos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint de saúde para monitoramento
app.get('/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    sessions: userSessions.size,
    sockets: io.engine.clientsCount
  };
  res.status(200).json(healthCheck);
});

// Endpoint de métricas básicas
app.get('/metrics', (req, res) => {
  const metrics = {
    sessions_total: userSessions.size,
    sockets_connected: io.engine.clientsCount,
    agent_configs: agentConfigs.size,
    uptime_seconds: process.uptime(),
    memory_usage: process.memoryUsage(),
    node_version: process.version,
    platform: process.platform
  };
  res.status(200).json(metrics);
});

// Servir o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Configuração da porta
const PORT = config.server?.port || process.env.PORT || 3001;
const HOST = config.server?.host || '0.0.0.0';

// Inicializar servidor com configurações de produção
server.listen(PORT, HOST, () => {
  logger.info(`🚀 Servidor WhatsApp Multi-Usuário iniciado`);
  logger.info(`📡 Porta: ${PORT}`);
  logger.info(`🌐 Host: ${HOST}`);
  logger.info(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`💾 Configurações carregadas: ${Object.keys(config).length} seções`);
  
  if (process.env.NODE_ENV === 'production') {
    logger.info('✅ Modo produção ativado');
    logger.info(`📊 Monitoramento: http://${HOST}:${PORT}/health`);
    logger.info(`📈 Métricas: http://${HOST}:${PORT}/metrics`);
  }
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  logger.error(`Erro não capturado: ${error.message}`);
  logger.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Promise rejeitada não tratada: ${reason}`);
  logger.error(`Promise: ${promise}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Recebido SIGTERM, iniciando shutdown graceful...');
  server.close(() => {
    logger.info('Servidor HTTP fechado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('Recebido SIGINT, iniciando shutdown graceful...');
  server.close(() => {
    logger.info('Servidor HTTP fechado');
    process.exit(0);
  });
});

// Inicializar WhatsApp automaticamente
// initializeWhatsAppClient();