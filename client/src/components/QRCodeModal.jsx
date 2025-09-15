import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Smartphone, Wifi, CheckCircle, AlertCircle } from 'lucide-react';

const QRCodeModal = ({ isOpen, qrCode, onClose, onRetry }) => {
  const [step, setStep] = useState(1);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (qrCode) {
      setStep(2);
    } else {
      setStep(1);
    }
  }, [qrCode]);

  const handleRetry = async () => {
    setIsRetrying(true);
    onRetry();
    setTimeout(() => setIsRetrying(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Conectar WhatsApp</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 1 ? 'bg-whatsapp-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > 1 ? <CheckCircle className="w-4 h-4" /> : '1'}
              </div>
              <div className={`w-12 h-0.5 ${
                step >= 2 ? 'bg-whatsapp-primary' : 'bg-gray-200'
              }`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 2 ? 'bg-whatsapp-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > 2 ? <CheckCircle className="w-4 h-4" /> : '2'}
              </div>
              <div className={`w-12 h-0.5 ${
                step >= 3 ? 'bg-whatsapp-primary' : 'bg-gray-200'
              }`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 3 ? 'bg-whatsapp-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step >= 3 ? <CheckCircle className="w-4 h-4" /> : '3'}
              </div>
            </div>
          </div>

          {/* Step 1: Initializing */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-whatsapp-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Wifi className="w-10 h-10 text-whatsapp-primary animate-pulse" />
              </div>
              <h3 className="text-lg font-medium mb-2">Inicializando WhatsApp</h3>
              <p className="text-gray-600 mb-4">
                Preparando a conexão com o WhatsApp Web...
              </p>
              <div className="flex justify-center">
                <div className="loading-spinner"></div>
              </div>
            </div>
          )}

          {/* Step 2: QR Code */}
          {step === 2 && qrCode && (
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4 inline-block">
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              
              <h3 className="text-lg font-medium mb-2">Escaneie o QR Code</h3>
              
              <div className="text-sm text-gray-600 space-y-2 mb-6">
                <div className="flex items-start space-x-2">
                  <span className="bg-whatsapp-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">1</span>
                  <p className="text-left">Abra o WhatsApp no seu celular</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="bg-whatsapp-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">2</span>
                  <p className="text-left">Toque em <strong>Menu</strong> ou <strong>Configurações</strong> e selecione <strong>WhatsApp Web</strong></p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="bg-whatsapp-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">3</span>
                  <p className="text-left">Aponte seu celular para esta tela para capturar o código</p>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 mb-4">
                <Smartphone className="w-4 h-4" />
                <span>Mantenha seu celular conectado à internet</span>
              </div>

              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex items-center space-x-2 mx-auto px-4 py-2 text-sm text-whatsapp-primary hover:bg-whatsapp-light rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>Gerar novo QR Code</span>
              </button>
            </div>
          )}

          {/* Step 3: Connected */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-green-600">Conectado com sucesso!</h3>
              <p className="text-gray-600 mb-6">
                Seu WhatsApp está conectado e pronto para uso.
              </p>
              <button
                onClick={onClose}
                className="bg-whatsapp-primary text-white px-6 py-2 rounded-lg hover:bg-whatsapp-secondary transition-colors"
              >
                Começar a usar
              </button>
            </div>
          )}

          {/* Error State */}
          {step === 'error' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-red-600">Erro na conexão</h3>
              <p className="text-gray-600 mb-6">
                Não foi possível conectar ao WhatsApp. Verifique sua conexão e tente novamente.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="w-full bg-whatsapp-primary text-white px-6 py-2 rounded-lg hover:bg-whatsapp-secondary transition-colors disabled:opacity-50"
                >
                  {isRetrying ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="loading-spinner border-white"></div>
                      <span>Tentando novamente...</span>
                    </div>
                  ) : (
                    'Tentar novamente'
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="w-full border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <Wifi className="w-3 h-3" />
            <span>Conexão segura e criptografada</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;