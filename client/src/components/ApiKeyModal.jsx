import React, { useState } from 'react';
import { X, Key, ExternalLink, Eye, EyeOff, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ApiKeyModal = ({ isOpen, onSubmit, onClose, currentKey = '' }) => {
  const [apiKey, setApiKey] = useState(currentKey);
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Por favor, insira uma API Key válida');
      return;
    }

    setIsValidating(true);
    setError('');
    
    try {
      await onSubmit(apiKey.trim());
    } catch (err) {
      setError('Erro ao validar a API Key');
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e) => {
    setApiKey(e.target.value);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-whatsapp-light rounded-full flex items-center justify-center">
              <Key className="w-5 h-5 text-whatsapp-primary" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Configurar API Key</h2>
          </div>
          {currentKey && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <h3 className="font-medium text-blue-900 mb-1">Sobre a API Key do AI Central</h3>
                <p className="text-blue-700 mb-2">
                  A API Key é necessária para conectar com os serviços de IA do AI Central e processar as mensagens automaticamente.
                </p>
                <div className="flex items-center space-x-1">
                  <span className="text-blue-700">Obtenha sua chave gratuita em:</span>
                  <a 
                    href="https://aicentral.store" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center space-x-1"
                  >
                    <span>aicentral.store</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                API Key do AI Central
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={handleInputChange}
                  placeholder="Insira sua API Key aqui..."
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    error 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-whatsapp-primary focus:border-whatsapp-primary'
                  }`}
                  disabled={isValidating}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                  disabled={isValidating}
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              
              {error && (
                <div className="flex items-center space-x-2 mt-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>

            {/* Features List */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Recursos disponíveis:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Processamento automático de mensagens</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Respostas inteligentes com IA</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Histórico de conversas por sessão</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Integração completa com WhatsApp Web</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={!apiKey.trim() || isValidating}
                className="flex-1 bg-whatsapp-primary text-white px-6 py-3 rounded-lg hover:bg-whatsapp-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isValidating ? (
                  <>
                    <div className="loading-spinner border-white"></div>
                    <span>Validando...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>{currentKey ? 'Atualizar' : 'Configurar'} API Key</span>
                  </>
                )}
              </button>
              
              {currentKey && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isValidating}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Help Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Precisa de ajuda?</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• A API Key é gratuita e pode ser obtida em segundos</p>
              <p>• Suas conversas são processadas de forma segura</p>
              <p>• Você pode alterar a API Key a qualquer momento</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;