import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Send,
  User,
  ExternalLink,
  RotateCcw,
  Bookmark as BookmarkIcon,
  MessageSquare,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';
import {
  demoSuggestedPrompts,
  getDemoAnswerForQuery,
} from '../lib/demo-data/conversations';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sourceBookmarkIds?: string[];
  timestamp: string;
}

export const AskAIView: React.FC = () => {
  const { navigate } = useRouter();
  const { bookmarks, profile } = useDemoStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isThinking) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    // Deterministic response after subtle pause (pure demo fixture, no LLM call)
    setTimeout(() => {
      const demoResult = getDemoAnswerForQuery(query);
      const aiMsg: Message = {
        id: `msg_ai_${Date.now()}`,
        sender: 'assistant',
        text: demoResult.answer,
        sourceBookmarkIds: demoResult.sourceBookmarkIds,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
    }, 450);
  };

  const handleResetChat = () => {
    setMessages([]);
  };

  return (
    <div id="ask-ai-view" className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto pb-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E5] shrink-0 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#EEF4FF] text-[#2563EB]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#171717]">Ask your bookmarks</h1>
            <p className="text-[11px] text-[#8A8A85]">
              Semantic retrieval across 2,847 saved items
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleResetChat}
            className="flex items-center gap-1 text-xs text-[#70706B] hover:text-[#171717] px-2.5 py-1 rounded-lg border border-[#E8E8E5] bg-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New conversation</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-thin">
        {messages.length === 0 ? (
          /* Empty State */
          <div className="py-12 px-4 text-center max-w-lg mx-auto space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-[#171717]">
                Ask your bookmarks
              </h2>
              <p className="text-sm text-[#70706B]">
                Find ideas, connections and things you've forgotten.
              </p>
            </div>

            {/* Suggested Prompts */}
            <div className="space-y-2 text-left pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A85] block px-1">
                Suggested questions
              </span>
              <div className="grid grid-cols-1 gap-2">
                {demoSuggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="p-3 rounded-xl bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D0D0CB] hover:bg-[#FAFAF8] text-xs font-medium text-[#171717] transition-all text-left flex items-center justify-between group shadow-2xs cursor-pointer"
                  >
                    <span>{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8A8A85] group-hover:text-[#2563EB] transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Message List */
          <div className="space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div className={`space-y-3 max-w-2xl ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Bubble */}
                  <div
                    className={`rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#171717] text-[#FAFAF8] rounded-tr-xs'
                        : 'bg-[#FFFFFF] border border-[#E8E8E5] text-[#242422] rounded-tl-xs shadow-2xs whitespace-pre-line'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Sources Section for Assistant */}
                  {msg.sourceBookmarkIds && msg.sourceBookmarkIds.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A85] block">
                        Referenced Sources ({msg.sourceBookmarkIds.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.sourceBookmarkIds.map((bId) => {
                          const bm = bookmarks.find((b) => b.id === bId);
                          if (!bm) return null;
                          return (
                            <div
                              key={bm.id}
                              onClick={() => navigate(`/bookmarks/${bm.id}`)}
                              className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D0D0CB] hover:bg-[#FAFAF8] transition-all cursor-pointer flex flex-col justify-between text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={bm.author_avatar}
                                    alt={bm.author_name}
                                    className="w-5 h-5 rounded-full object-cover border border-[#E8E8E5]"
                                  />
                                  <span className="font-semibold text-[11px] text-[#171717] truncate">
                                    {bm.author_name}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#5C5C58] line-clamp-2">
                                  {bm.content}
                                </p>
                              </div>
                              <div className="pt-2 mt-2 border-t border-[#F2F2EE] flex items-center justify-between text-[10px] text-[#8A8A85]">
                                <span>{bm.topics?.[0] || 'Saved'}</span>
                                <span className="text-[#2563EB] font-medium flex items-center gap-0.5">
                                  <span>Open</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 border border-[#E0E0DC]"
                  />
                )}
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-7 h-7 rounded-lg bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl rounded-tl-xs text-xs text-[#8A8A85] flex items-center gap-1.5 shadow-2xs">
                  <span>Searching and synthesizing your saved library...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        )}
      </div>

      {/* Fixed Composer at bottom */}
      <div className="pt-3 border-t border-[#E8E8E5] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask anything about your bookmarks..."
            className="w-full pl-4 pr-12 py-3 bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D0D0CB] focus:border-[#2563EB] rounded-2xl text-xs text-[#171717] placeholder:text-[#8A8A85] outline-none shadow-2xs transition-all"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isThinking}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-[#171717] text-[#FAFAF8] hover:bg-[#2B2B2B] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <p className="text-[10px] text-center text-[#8A8A85] mt-1.5">
          Answers are synthesized from your saved library fixtures.
        </p>
      </div>
    </div>
  );
};
