import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface Message {
  message: string;
  senderId: string;
  senderName: string;
  timestamp: string;
}

interface ChatWindowProps {
  socket: Socket | null;
  rideId: string;
  currentUser: any;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ socket, rideId, currentUser, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('joinRide', rideId);

    const handleMessage = (data: Message) => {
      setMessages((prev) => [...prev, data]);
    };

    socket.on('receiveMessage', handleMessage);

    return () => {
      socket.off('receiveMessage', handleMessage);
    };
  }, [socket, rideId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || !currentUser) return;

    const messageData = {
      rideId,
      message: inputText,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
    };

    socket.emit('sendMessage', messageData);
    setInputText('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] w-80 sm:w-96 bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
             <MessageCircle size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">Chat de Viaje</h3>
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">En línea con el conductor</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <X size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 h-[400px] overflow-y-auto p-4 space-y-4 bg-slate-900/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
             <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mb-4 border border-white/5 opacity-50">
                <MessageCircle size={32} className="text-slate-600" />
             </div>
             <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Inicia la conversación</p>
             <p className="text-[10px] text-slate-600 mt-1 italic">Dile al conductor dónde te encuentras</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.senderId === currentUser?.id ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm font-medium shadow-lg ${
                msg.senderId === currentUser?.id 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-white/5'
              }`}>
                {msg.message}
              </div>
              <p className="text-[9px] text-slate-500 mt-1 font-bold uppercase tracking-tighter">
                {msg.senderId === currentUser?.id ? 'Tú' : msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-white/10">
        <div className="relative">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe un mensaje..." 
            className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
          />
          <button 
            type="submit"
            className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-all shadow-lg"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
