'use client';

import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import Image from 'next/image';
import { useAppStore } from '@/store';
import { runSimulation, callRealBroker } from '@/lib/simulation';
import { Message, MessageAttribution, AgentType } from '@/lib/types';

export function ConversationPanel() {
  const messages = useAppStore((s) => s.messages);
  const isProcessing = useAppStore((s) => s.isProcessing);
  const currentStep = useAppStore((s) => s.currentStep);
  const addMessage = useAppStore((s) => s.addMessage);
  const brokerUrl = useAppStore((s) => s.brokerUrl);
  const skills = useAppStore((s) => s.skills);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Auto-expand textarea height to fit content
  function adjustHeight(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    adjustHeight(e.target);
  }

  // Reset height when input is cleared
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  async function handleSend(text?: string, skillId?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isProcessing) return;
    setInput('');
    addMessage({ role: 'user', content: msg });
    const preferredAgentId = skillId ? `skill-${skillId}` : undefined;
    if (brokerUrl.trim()) {
      await callRealBroker(msg, brokerUrl.trim(), preferredAgentId);
    } else {
      await runSimulation(msg, preferredAgentId);
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function skillPrompt(skill: { name: string; description?: string; examples?: string[] }): string {
    if (skill.examples && skill.examples.length > 0) return skill.examples[0];
    return skill.description ?? skill.name;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="pt-3 space-y-4">
            {skills.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Agent Skills ({skills.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {skills.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => handleSend(skillPrompt(skill), skill.id)}
                      disabled={isProcessing}
                      title={skill.description}
                      className="text-left text-sm text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-gray-200 rounded-xl px-3.5 py-2.5 transition-colors disabled:opacity-50 leading-snug"
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center pt-6">
                <p className="text-sm text-gray-400">No skills available from this broker.</p>
                <p className="text-xs text-gray-300 mt-1.5">Type a prompt below to interact directly.</p>
              </div>
            )}
            <p className="text-xs text-gray-400 text-center pt-1">
              or type a custom prompt below
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isProcessing && currentStep && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            <span className="text-sm text-gray-400">{currentStep}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Skills quick-fill chips — shown when conversation is active and skills exist */}
      {messages.length > 0 && skills.length > 0 && (
        <div className="px-3 pt-2 pb-1">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {skills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => setInput(skillPrompt(skill))}
                disabled={isProcessing}
                className="shrink-0 text-xs text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-full px-3 py-1 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {skill.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 px-3 py-3">
        <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3.5 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKey}
            placeholder="Ask the broker..."
            disabled={isProcessing}
            style={{ height: 'auto', minHeight: '40px', maxHeight: '200px' }}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none leading-relaxed overflow-y-auto disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isProcessing}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors mb-0.5"
          >
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
              <path d="M2 10L10 6L2 2V5.5L7.5 6L2 6.5V10Z" fill="white" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">Shift+Enter for new line</p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-sm px-4 py-3 text-[17px] leading-relaxed whitespace-pre-wrap bg-blue-600 text-white">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.isError) {
    return (
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-red-50 border border-red-200 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M8 6v3.5M8 11v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="max-w-[84%] rounded-2xl rounded-tl-sm px-4 py-3 bg-red-50 text-red-800 border border-red-200">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      {/* Avatar */}
      <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden border border-blue-100 shadow-sm mt-0.5">
        <Image
          src="/broker-avatar.png"
          alt="Agent"
          width={36}
          height={36}
          className="object-cover w-full h-full"
        />
      </div>

      {/* Bubble */}
      <div className="max-w-[84%] rounded-2xl rounded-tl-sm px-4 py-3 bg-gray-50 text-gray-900 border border-gray-200">
        <p className="text-[17px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
        {message.attribution && message.attribution.length > 0 && (
          <SkillBadge attribution={message.attribution} />
        )}
      </div>
    </div>
  );
}

const TYPE_PILL: Record<AgentType, string> = {
  agent:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  mcp:    'bg-amber-50   text-amber-700   border-amber-200',
  broker: 'bg-blue-50    text-blue-700    border-blue-200',
  llm:    'bg-violet-50  text-violet-700  border-violet-200',
  user:   'bg-sky-50     text-sky-700     border-sky-200',
};

function SkillBadge({ attribution }: { attribution: MessageAttribution[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2.5 border-t border-gray-200">
      <span className="text-xs text-gray-400 font-medium shrink-0">Skill used</span>
      {attribution.map((a, i) => (
        <span key={i} className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${TYPE_PILL[a.type] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          {a.name}
        </span>
      ))}
    </div>
  );
}
