import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Send, Loader2, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (<div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center mr-2 flex-shrink-0 mt-0.5"><Bot className="w-3 h-3 text-muted-foreground" /></div>)}
      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
        {isUser ? <p>{message.content}</p> : <ReactMarkdown className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">{message.content || '...'}</ReactMarkdown>}
      </div>
    </div>
  );
}

export default function AgentChatPanel({ open, onClose, card }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!open || !card) return;
    const init = async () => {
      const existing = await base44.agents.listConversations({ agent_name: 'CallRoomAgent' });
      const match = existing.find(c => c.metadata?.card_id === card.id);
      let conv;
      if (match) { conv = await base44.agents.getConversation(match.id); }
      else {
        conv = await base44.agents.createConversation({ agent_name: 'CallRoomAgent', metadata: { name: `Brief: ${card.attendee_name||card.title}`, card_id: card.id } });
        await base44.agents.addMessage(conv, { role: 'user', content: `Context: I'm looking at the call brief for ${card.attendee_name||'a prospect'} from ${card.company_name||'their company'} scheduled at ${card.start_time}. Card ID: ${card.id}` });
        conv = await base44.agents.getConversation(conv.id);
      }
      setConversation(conv); setMessages(conv.messages || []);
      unsubRef.current = base44.agents.subscribeToConversation(conv.id, (data) => { setMessages(data.messages || []); });
    };
    init();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [open, card?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !conversation || sending) return;
    const text = input.trim(); setInput(''); setSending(true);
    await base44.agents.addMessage(conversation, { role: 'user', content: text });
    setSending(false);
  };
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const visibleMessages = messages.filter((m, i) => !(i === 0 && m.role === 'user' && m.content?.startsWith('Context:')));
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-sm bg-card border-l border-border flex flex-col h-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium text-foreground">Call Room Agent</span></div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {visibleMessages.length === 0 && (<div className="text-center text-sm text-muted-foreground/50 mt-8"><Bot className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Ask me anything about this call</p></div>)}
          {visibleMessages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
          <div ref={bottomRef} />
        </div>
        <div className="px-4 py-3 border-t border-border/40">
          <div className="flex items-end gap-2">
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about this call..." className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none outline-none min-h-[40px] max-h-32 leading-relaxed" rows={1} />
            <button onClick={handleSend} disabled={!input.trim()||sending} className="bg-primary text-primary-foreground rounded-lg p-2 disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
          </div>
        </div>
      </div>
    </div>
  );
}