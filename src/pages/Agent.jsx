import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (<div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs mr-2.5 flex-shrink-0 mt-0.5">📞</div>)}
      <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${isUser ? 'bg-secondary text-foreground' : 'bg-card border border-border/50 text-foreground/90'}`}>
        {isUser ? <p className="leading-relaxed">{message.content}</p> : <ReactMarkdown className="prose prose-sm prose-invert max-w-none leading-relaxed">{message.content || '...'}</ReactMarkdown>}
        {message.tool_calls?.map((tc, i) => {
          const dp = tc.display_projection; const isRunning = ['pending','running','in_progress'].includes(tc.status); const isFailed = ['failed','error'].includes(tc.status);
          const label = isRunning ? (dp?.active_label||'Working...') : isFailed ? (dp?.error_label||'Failed') : (dp?.label||tc.name);
          return (<div key={i} className={`mt-2 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${isFailed?'bg-red-500/10 text-red-400':'bg-muted/50 text-muted-foreground'}`}>{isRunning && <Loader2 className="w-3 h-3 animate-spin" />}<span>{label}</span></div>);
        })}
      </div>
    </div>
  );
}

export default function Agent() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const convos = await base44.agents.listConversations({ agent_name: 'CallRoomAgent' });
      let convo = convos?.[0];
      if (!convo) { convo = await base44.agents.createConversation({ agent_name: 'CallRoomAgent', metadata: { name: 'Call Room Assistant' } }); }
      setConversation(convo); setMessages(convo.messages || []);
    };
    init();
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => { setMessages(data.messages || []); setSending(false); });
    return unsub;
  }, [conversation?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    const text = input.trim(); if (!text || !conversation || sending) return;
    setInput(''); setSending(true);
    await base44.agents.addMessage(conversation, { role: 'user', content: text });
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const suggestions = ["What calls do I have today?","What's the signal on my next call?","Mark my last call as completed","Show me this week's pipeline"];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/40 px-6 py-4 flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex items-center gap-2"><span className="text-lg">📞</span><span className="font-semibold text-foreground">Call Room Assistant</span></div>
        <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">AI</span>
      </header>
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-2xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🤖</p>
            <p className="text-foreground font-semibold mb-1">Your Call Room Assistant</p>
            <p className="text-sm text-muted-foreground mb-8">Ask me anything about your calls, leads, or pipeline.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{suggestions.map(s => (<button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }} className="text-left text-sm border border-border/50 hover:border-border text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-lg transition-colors">{s}</button>))}</div>
          </div>
        )}
        {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
        {sending && messages[messages.length-1]?.role === 'user' && (<div className="flex justify-start mb-4"><div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs mr-2.5">📞</div><div className="bg-card border border-border/50 rounded-xl px-4 py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div></div>)}
        <div ref={bottomRef} />
      </main>
      <div className="border-t border-border/40 px-4 sm:px-6 py-4 bg-background sticky bottom-0">
        <div className="max-w-2xl mx-auto flex items-end gap-3">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about your calls, update a status, get a briefing..." rows={1} className="flex-1 bg-secondary border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none outline-none focus:border-border transition-colors" style={{ minHeight:'48px', maxHeight:'120px' }} />
          <button onClick={handleSend} disabled={!input.trim()||!conversation||sending} className="bg-foreground text-background w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity disabled:opacity-30"><Send className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground/40 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}