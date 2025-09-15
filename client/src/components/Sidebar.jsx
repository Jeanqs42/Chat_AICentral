import React, { useState } from 'react';
import { Search, RefreshCw, MessageCircle, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Sidebar = ({ chats, selectedChat, onSelectChat, whatsappReady, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp * 1000);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return format(date, 'HH:mm');
      } else if (diffInHours < 168) { // 7 days
        return format(date, 'EEE', { locale: ptBR });
      } else {
        return format(date, 'dd/MM/yy');
      }
    } catch (error) {
      return '';
    }
  };

  const truncateMessage = (message, maxLength = 50) => {
    if (!message) return 'Sem mensagens';
    return message.length > maxLength ? `${message.substring(0, maxLength)}...` : message;
  };

  if (!whatsappReady) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Contatos</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">WhatsApp não conectado</p>
            <p className="text-sm">Conecte seu WhatsApp para ver os chats</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Contatos</h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            title="Atualizar chats"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-whatsapp-primary"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            {chats.length === 0 ? (
              <>
                <MessageCircle className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm font-medium mb-1">Nenhum chat encontrado</p>
                <p className="text-xs text-center px-4">Inicie uma conversa no seu WhatsApp para ver os chats aqui</p>
              </>
            ) : (
              <>
                <Search className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm font-medium mb-1">Nenhum resultado</p>
                <p className="text-xs text-center px-4">Tente pesquisar com outros termos</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`sidebar-item ${
                  selectedChat?.id === chat.id ? 'active bg-whatsapp-light' : 'hover:bg-gray-50'
                } cursor-pointer transition-colors duration-150`}
              >
                <div className="flex items-center space-x-3 w-full">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      {chat.isGroup ? (
                        <Users className="w-6 h-6 text-gray-600" />
                      ) : (
                        <MessageCircle className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                  </div>
                  
                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {chat.name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        {chat.lastMessage && (
                          <span className="text-xs text-gray-500">
                            {formatTime(chat.lastMessage.timestamp)}
                          </span>
                        )}
                        {chat.unreadCount > 0 && (
                          <span className="bg-whatsapp-primary text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center mt-1">
                      <p className="text-sm text-gray-600 truncate flex-1">
                        {chat.lastMessage ? truncateMessage(chat.lastMessage.body) : 'Sem mensagens'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Última atualização: {format(new Date(), 'HH:mm')}</span>
          </div>
          <span>{chats.length} chat{chats.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;