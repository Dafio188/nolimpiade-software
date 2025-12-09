import React, { useState, useRef, useEffect } from 'react';
import { Player, Match, Team } from '../types';
import { askTournamentAssistant } from '../services/geminiService';
import { Send, Bot, Sparkles, X } from 'lucide-react';

interface AIAssistantProps {
    players: Player[];
    matches: Match[];
    teams: Team[];
    onClose?: () => void;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ players, matches, teams, onClose }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'init',
            role: 'assistant',
            content: "Ciao! Sono l'IA delle Nolimpiadi. Chiedimi classifiche, risultati o curiosità sul torneo!",
            timestamp: new Date()
        }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg: ChatMessage = {
            id: Math.random().toString(36),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const responseText = await askTournamentAssistant(userMsg.content, players, matches, teams);

        const aiMsg: ChatMessage = {
            id: Math.random().toString(36),
            role: 'assistant',
            content: responseText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMsg]);
        setLoading(false);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden border-l border-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 text-white flex items-center justify-between shadow-md z-10">
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1.5 rounded-full">
                        <Bot size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight">Nolimpiadi AI</h3>
                        <p className="text-[10px] text-purple-100 opacity-80">Online</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[85%] rounded-2xl p-2 px-3 shadow-sm text-sm ${
                            msg.role === 'user' 
                                ? 'bg-purple-600 text-white rounded-br-none' 
                                : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                        }`}>
                            <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
                            <span className={`text-[9px] block text-right mt-1 ${msg.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
                                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white p-2 px-3 rounded-2xl rounded-bl-none border border-gray-100 flex gap-2 items-center shadow-sm">
                            <Sparkles size={14} className="text-purple-500 animate-pulse" />
                            <span className="text-xs text-gray-500 italic">Sto pensando...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-2 bg-white border-t border-gray-200">
                <form onSubmit={handleSend} className="flex gap-2 relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Chiedi statistiche..."
                        className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all placeholder-gray-400"
                    />
                    <button 
                        type="submit" 
                        disabled={loading || !input.trim()}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white p-2 rounded-full transition-all shadow-md active:scale-95 flex items-center justify-center aspect-square"
                    >
                        <Send size={16} className={loading ? 'opacity-0' : 'opacity-100'} />
                        {loading && <div className="absolute w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    </button>
                </form>
            </div>
        </div>
    );
};
