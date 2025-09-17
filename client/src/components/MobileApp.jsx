import React, { useState } from 'react';
import { MessageCircle, Settings, Phone, Bot, PhoneOff, Sparkles, Cog, RotateCcw } from 'lucide-react';
import QRCodeModal from './QRCodeModal';
import AgentSettings from './AgentSettings';

const MobileApp = ({ 
  isConnected, 
  whatsappReady, 
  qrCode, 
  showQRModal, 
  setShowQRModal,
  connectWhatsApp, 
  disconnectWhatsApp,
  agentConfig,
  socket
}) => {
  const [showAgentSettings, setShowAgentSettings] = useState(false);

  const handleRetryQR = () => {
    if (socket) {
      socket.emit('generate-qr');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header Mobile */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Chat AICentral
                </span>
                <span className="text-xs text-gray-500">Mobile</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                whatsappReady ? 'bg-green-400' : isConnected ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
              <span className="text-xs text-gray-600">
                {whatsappReady ? 'Conectado' : isConnected ? 'Servidor OK' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              whatsappReady ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <MessageCircle className={`w-8 h-8 ${
                whatsappReady ? 'text-green-600' : 'text-gray-400'
              }`} />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {whatsappReady ? 'WhatsApp Conectado!' : 'WhatsApp Desconectado'}
            </h2>
            
            <p className="text-gray-600 text-sm mb-4">
              {whatsappReady 
                ? 'Seu agente IA está ativo e respondendo mensagens automaticamente no WhatsApp.'
                : 'Conecte seu WhatsApp para começar a usar o agente IA.'
              }
            </p>

            {whatsappReady ? (
              <button
                onClick={disconnectWhatsApp}
                className="flex items-center space-x-2 bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition-colors mx-auto"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Desconectar</span>
              </button>
            ) : (
              <button
                onClick={connectWhatsApp}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all mx-auto"
              >
                <Phone className="w-4 h-4" />
                <span>Conectar WhatsApp</span>
              </button>
            )}
          </div>
        </div>

        {/* Agent Configuration Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Agente IA</h3>
              <p className="text-sm text-gray-600">Configure seu assistente virtual</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status do Agente</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  agentConfig?.enabled 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {agentConfig?.enabled ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-700">
                <strong>Nome:</strong> {agentConfig?.name || 'Assistente IA'}
              </div>
            </div>

            <button
              onClick={() => setShowAgentSettings(true)}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl hover:shadow-lg transition-all"
            >
              <Settings className="w-4 h-4" />
              <span>Configurar Agente</span>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowAgentSettings(true)}
              className="flex flex-col items-center space-y-2 bg-blue-50 hover:bg-blue-100 p-4 rounded-xl transition-colors"
            >
              <Cog className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Configurações</span>
            </button>

            <button
              onClick={connectWhatsApp}
              className="flex flex-col items-center space-y-2 bg-green-50 hover:bg-green-100 p-4 rounded-xl transition-colors"
            >
              <RotateCcw className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium text-green-700">Reconectar</span>
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Versão Mobile Otimizada</h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                Esta versão foi otimizada para dispositivos móveis. Você pode acompanhar as conversas 
                diretamente no seu WhatsApp enquanto o agente IA responde automaticamente.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <QRCodeModal
        isOpen={showQRModal}
        qrCode={qrCode}
        onClose={() => setShowQRModal(false)}
        onRetry={handleRetryQR}
      />

      <AgentSettings
        isOpen={showAgentSettings}
        onClose={() => setShowAgentSettings(false)}
        socket={socket}
        agentConfig={agentConfig}
      />
    </div>
  );
};

export default MobileApp;