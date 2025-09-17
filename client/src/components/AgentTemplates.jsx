import React, { useState } from 'react';
import { X, Bot, Heart, Briefcase, GraduationCap, ShoppingCart, Headphones, Edit3, Check } from 'lucide-react';

const AgentTemplates = ({ onSelectTemplate, onClose, currentConfig }) => {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editedTemplate, setEditedTemplate] = useState({});

  const agentTemplates = [
    {
      id: 1,
      name: "Assistente Comercial",
      personality: "Vendedor experiente, persuasivo e focado em resultados",
      prompt: "Você é um assistente comercial especializado em vendas. Seja persuasivo, identifique necessidades do cliente e apresente soluções. Sempre busque fechar negócios de forma ética e profissional.",
      icon: <Briefcase className="w-5 h-5" />,
      color: "blue"
    },
    {
      id: 2,
      name: "Suporte Técnico",
      personality: "Técnico paciente, didático e solucionador de problemas",
      prompt: "Você é um especialista em suporte técnico. Seja paciente, explique de forma clara e didática, e ajude a resolver problemas técnicos passo a passo. Sempre confirme se o problema foi resolvido.",
      icon: <Headphones className="w-5 h-5" />,
      color: "green"
    },
    {
      id: 3,
      name: "Atendente Amigável",
      personality: "Receptivo, caloroso e sempre disposto a ajudar",
      prompt: "Você é um atendente amigável e acolhedor. Seja sempre educado, empático e prestativo. Faça o cliente se sentir bem-vindo e valorizado em cada interação.",
      icon: <Heart className="w-5 h-5" />,
      color: "pink"
    },
    {
      id: 4,
      name: "Consultor Educacional",
      personality: "Educador experiente, motivador e orientador",
      prompt: "Você é um consultor educacional especializado. Oriente sobre cursos, carreiras e desenvolvimento profissional. Seja motivador e ajude as pessoas a alcançarem seus objetivos educacionais.",
      icon: <GraduationCap className="w-5 h-5" />,
      color: "purple"
    },
    {
      id: 5,
      name: "Assistente de Vendas Online",
      personality: "Especialista em e-commerce, dinâmico e conhecedor de produtos",
      prompt: "Você é um assistente de vendas online especializado. Conheça bem os produtos, tire dúvidas sobre especificações, ajude na escolha e facilite o processo de compra online.",
      icon: <ShoppingCart className="w-5 h-5" />,
      color: "orange"
    },
    {
      id: 6,
      name: "Assistente Geral",
      personality: "Versátil, inteligente e adaptável a qualquer situação",
      prompt: "Você é um assistente geral inteligente e versátil. Adapte-se ao contexto da conversa, seja útil em diversas situações e mantenha sempre um tom profissional e prestativo.",
      icon: <Bot className="w-5 h-5" />,
      color: "gray"
    }
  ];

  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    green: "bg-green-50 border-green-200 text-green-800",
    pink: "bg-pink-50 border-pink-200 text-pink-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
    gray: "bg-gray-50 border-gray-200 text-gray-800"
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template.id);
    setEditedTemplate({
      name: template.name,
      personality: template.personality,
      prompt: template.prompt
    });
  };

  const handleSaveEdit = (template) => {
    const updatedTemplate = {
      ...template,
      ...editedTemplate
    };
    onSelectTemplate(updatedTemplate);
    setEditingTemplate(null);
    setEditedTemplate({});
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    setEditedTemplate({});
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Modelos de Agentes</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agentTemplates.map((template) => (
              <div
                key={template.id}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${colorClasses[template.color]}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {template.icon}
                    {editingTemplate === template.id ? (
                      <input
                        type="text"
                        value={editedTemplate.name}
                        onChange={(e) => setEditedTemplate({...editedTemplate, name: e.target.value})}
                        className="font-semibold bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      <h3 className="font-semibold">{template.name}</h3>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    {editingTemplate === template.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(template)}
                          className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">Personalidade:</p>
                  {editingTemplate === template.id ? (
                    <textarea
                      value={editedTemplate.personality}
                      onChange={(e) => setEditedTemplate({...editedTemplate, personality: e.target.value})}
                      className="w-full text-sm bg-white border border-gray-300 rounded px-2 py-1 resize-none"
                      rows="2"
                    />
                  ) : (
                    <p className="text-sm opacity-90">{template.personality}</p>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium mb-1">Prompt:</p>
                  {editingTemplate === template.id ? (
                    <textarea
                      value={editedTemplate.prompt}
                      onChange={(e) => setEditedTemplate({...editedTemplate, prompt: e.target.value})}
                      className="w-full text-sm bg-white border border-gray-300 rounded px-2 py-1 resize-none"
                      rows="3"
                    />
                  ) : (
                    <p className="text-sm opacity-90">{template.prompt}</p>
                  )}
                </div>

                {editingTemplate !== template.id && (
                  <button
                    onClick={() => onSelectTemplate(template)}
                    className="w-full bg-white bg-opacity-50 hover:bg-opacity-75 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Usar este modelo
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentTemplates;