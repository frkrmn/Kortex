import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  ArrowRight,
  Send,
  User,
  ExternalLink,
  RotateCcw,
  Bookmark as BookmarkIcon,
  MessageSquare,
  FolderKanban,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2,
  Share2,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';
import { api } from '../lib/api';
import { Bookmark, ChatMessage, ChatSourceCitation, ChatThread } from '../types';

export const AskAIView: React.FC = () => {
  const { navigate, searchParams } = useRouter();
  const { bookmarks, collections, topics, profile, showToast } = useDemoStore();

  // Active threads & conversation state
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState<string>('Searching your saved library...');
  const [showThreadSidebar, setShowThreadSidebar] = useState(false);

  // Scoping state
  const [scopeType, setScopeType] = useState<'all' | 'collection' | 'topic' | 'bookmark'>('all');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string>('');
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);

  // Active highlighted source (when clicking citation badge)
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Initial Load: Parse URL params for scoping or query
  useEffect(() => {
    const urlCollection = searchParams.get('collection');
    const urlBookmarkId = searchParams.get('bookmarkId');
    const urlTopic = searchParams.get('topic');
    const urlQuery = searchParams.get('q');
    const urlThreadId = searchParams.get('threadId');

    if (urlCollection) {
      setScopeType('collection');
      setSelectedCollectionId(urlCollection);
    } else if (urlBookmarkId) {
      setScopeType('bookmark');
      setSelectedBookmarkId(urlBookmarkId);
    } else if (urlTopic) {
      setScopeType('topic');
      setSelectedTopic(urlTopic);
    }

    if (urlThreadId) {
      setActiveThreadId(urlThreadId);
    }

    if (urlQuery) {
      setInputValue(urlQuery);
    }
  }, [searchParams]);

  // 2. Fetch Chat Threads from API
  const loadThreads = async () => {
    try {
      const threadList = await api.getChatThreads();
      setThreads(threadList);

      // If no active thread, pick the first or leave null for empty state
      if (!activeThreadId && threadList.length > 0) {
        setActiveThreadId(threadList[0].id);
        setMessages(threadList[0].messages || []);
      }
    } catch (err) {
      console.warn('Failed to load chat threads:', err);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  // When activeThreadId changes, sync messages
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    const current = threads.find((t) => t.id === activeThreadId);
    if (current) {
      setMessages(current.messages || []);
    }
  }, [activeThreadId, threads]);

  // Smooth auto-scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Derive active scope description label
  const activeScopeDescription = useMemo(() => {
    if (scopeType === 'collection') {
      const col = collections.find((c) => c.id === selectedCollectionId || c.slug === selectedCollectionId);
      return col ? `Collection: ${col.name}` : 'Filtered Collection';
    }
    if (scopeType === 'topic') {
      return selectedTopic ? `Topic: #${selectedTopic}` : 'Filtered Topic';
    }
    if (scopeType === 'bookmark') {
      const b = bookmarks.find((item) => item.id === selectedBookmarkId);
      return b ? `Bookmark: @${b.author_username}'s post` : 'Single Bookmark';
    }
    return 'All Library Bookmarks';
  }, [scopeType, selectedCollectionId, selectedTopic, selectedBookmarkId, collections, bookmarks]);

  // Clear scope helper
  const handleClearScope = () => {
    setScopeType('all');
    setSelectedCollectionId('');
    setSelectedTopic('');
    setSelectedBookmarkId('');
    setShowScopeDropdown(false);
  };

  // Start new conversation
  const handleNewConversation = async () => {
    setActiveThreadId(null);
    setMessages([]);
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Delete thread
  const handleDeleteThread = async (tId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation history?')) return;
    try {
      await api.deleteChatThread(tId);
      setThreads((prev) => prev.filter((t) => t.id !== tId));
      if (activeThreadId === tId) {
        setActiveThreadId(null);
        setMessages([]);
      }
      showToast('Conversation deleted');
    } catch {
      showToast('Failed to delete conversation');
    }
  };

  // Handle Send question via Production RAG
  const handleSend = async (textToSend?: string) => {
    const question = (textToSend || inputValue).trim();
    if (!question || isThinking) return;

    // Temporary optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      thread_id: activeThreadId || '',
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputValue('');
    setIsThinking(true);
    setThinkingStep('Retrieving semantic and keyword matches...');

    // Progress animation step updates
    const t1 = setTimeout(() => {
      setThinkingStep('Evaluating evidence sufficiency and ranking sources...');
    }, 450);

    const t2 = setTimeout(() => {
      setThinkingStep('Synthesizing grounded answer with citations...');
    }, 900);

    try {
      // Build scope params
      const scopePayload = {
        collectionId: scopeType === 'collection' ? selectedCollectionId : undefined,
        bookmarkIds: scopeType === 'bookmark' && selectedBookmarkId ? [selectedBookmarkId] : undefined,
        topic: scopeType === 'topic' ? selectedTopic : undefined,
        scopeDescription: activeScopeDescription,
      };

      const result = await api.askRecallly({
        question,
        threadId: activeThreadId || undefined,
        scope: scopePayload,
      });

      clearTimeout(t1);
      clearTimeout(t2);

      // Create assistant message from real RAG result
      const assistantMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        thread_id: result.threadId,
        role: 'assistant',
        content: result.answer,
        sources: (result.citedSources || []).map((s) => ({
          source_id: s.sourceId,
          bookmark_id: s.bookmarkId,
          author_name: s.authorName,
          author_username: s.authorUsername,
          author_avatar: s.authorAvatar,
          excerpt: s.excerpt,
          url: s.url,
          topics: s.topics,
          relevance_score: s.relevanceScore,
        })),
        metrics: result.metrics,
        is_refusal: result.sufficiency === 'insufficient',
        created_at: new Date().toISOString(),
      };

      // If this was a new thread, set activeThreadId and reload threads list
      if (!activeThreadId || activeThreadId !== result.threadId) {
        setActiveThreadId(result.threadId);
        await loadThreads();
      }

      setMessages((prev) => [...prev.slice(0, -1), tempUserMsg, assistantMsg]);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      console.error('RAG query error:', err);

      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        thread_id: activeThreadId || '',
        role: 'assistant',
        content: `I encountered an unexpected error while retrieving your bookmarks: ${err.message || 'Service unavailable'}. Please try again.`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  // Helper: Renders text with interactive citation badges [S1], [S2]
  const renderMessageContentWithCitations = (content: string, sources?: ChatSourceCitation[]) => {
    if (!sources || sources.length === 0) {
      return <span>{content}</span>;
    }

    const citationRegex = /\[S(\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      const sourceNum = match[1];
      const sourceId = `S${sourceNum}`;

      // Push text before citation
      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }

      // Find cited source
      const citedItem = sources.find((s) => s.source_id === sourceId);

      parts.push(
        <button
          key={`cite_${matchIndex}_${sourceId}`}
          onClick={() => {
            setHighlightedSourceId(sourceId);
            setTimeout(() => setHighlightedSourceId(null), 3000);
          }}
          className={`inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
            highlightedSourceId === sourceId
              ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs scale-105'
              : 'bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE] hover:bg-[#DBEAFE]'
          }`}
          title={
            citedItem
              ? `Source ${sourceId}: @${citedItem.author_username} — "${citedItem.excerpt.slice(0, 80)}..."`
              : `Source ${sourceId}`
          }
        >
          <span>[{sourceId}]</span>
          {citedItem && (
            <span className="hidden sm:inline font-normal text-[10px] opacity-80 truncate max-w-[80px]">
              @{citedItem.author_username}
            </span>
          )}
        </button>
      );

      lastIndex = citationRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return <span>{parts}</span>;
  };

  // Suggested Prompts
  const suggestedPrompts = [
    'What are the key agent design patterns in my bookmarks?',
    'What have I saved about minimal stacks and SQLite?',
    'Synthesize recurring lessons on product launch velocity.',
    'Compare perspectives on automated evaluation vs prompt engineering.',
  ];

  return (
    <div id="ask-ai-view" className="flex flex-col h-[calc(100vh-7.5rem)] max-w-5xl mx-auto pb-2">
      {/* Top Header & Context Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8E8E5] shrink-0 mb-3">
        {/* Brand / Scope Pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowThreadSidebar(!showThreadSidebar)}
            className="p-1.5 rounded-lg border border-[#E8E8E5] bg-white hover:bg-[#F5F5F2] text-[#70706B] hover:text-[#171717] transition-colors cursor-pointer"
            title="Toggle conversation history"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowScopeDropdown(!showScopeDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E8E8E5] bg-white hover:border-[#D0D0CB] transition-all text-xs font-medium text-[#171717] shadow-2xs cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-[#171717]">{activeScopeDescription}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8A8A85]" />
            </button>

            {/* Scope Dropdown Menu */}
            {showScopeDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-[#E8E8E5] rounded-2xl shadow-lg p-2 z-50 text-xs space-y-2 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A8A85]">
                  Select Knowledge Scope
                </div>

                {/* Option 1: All Bookmarks */}
                <button
                  onClick={handleClearScope}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                    scopeType === 'all' ? 'bg-[#EEF4FF] text-[#2563EB] font-semibold' : 'hover:bg-[#FAFAF8] text-[#171717]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span>All Library Bookmarks</span>
                  </div>
                  <span className="text-[10px] text-[#8A8A85]">{bookmarks.length}</span>
                </button>

                {/* Option 2: Collections Submenu */}
                {collections.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-[#F2F2EE]">
                    <span className="px-2 text-[10px] font-medium text-[#8A8A85]">Filter by Collection</span>
                    <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
                      {collections.map((col) => (
                        <button
                          key={col.id}
                          onClick={() => {
                            setScopeType('collection');
                            setSelectedCollectionId(col.id);
                            setShowScopeDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                            scopeType === 'collection' && selectedCollectionId === col.id
                              ? 'bg-[#EEF4FF] text-[#2563EB] font-semibold'
                              : 'hover:bg-[#FAFAF8] text-[#5C5C58]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{col.name}</span>
                          </div>
                          <span className="text-[10px] text-[#8A8A85] shrink-0">{col.bookmark_ids?.length || 0}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Option 3: Topics */}
                {topics.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-[#F2F2EE]">
                    <span className="px-2 text-[10px] font-medium text-[#8A8A85]">Filter by Topic</span>
                    <div className="max-h-32 overflow-y-auto space-y-0.5 pr-1">
                      {topics.slice(0, 8).map((top) => (
                        <button
                          key={top.id}
                          onClick={() => {
                            setScopeType('topic');
                            setSelectedTopic(top.name);
                            setShowScopeDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                            scopeType === 'topic' && selectedTopic === top.name
                              ? 'bg-[#EEF4FF] text-[#2563EB] font-semibold'
                              : 'hover:bg-[#FAFAF8] text-[#5C5C58]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Tag className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">#{top.name}</span>
                          </div>
                          <span className="text-[10px] text-[#8A8A85] shrink-0">{top.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {scopeType !== 'all' && (
            <button
              onClick={handleClearScope}
              className="flex items-center gap-1 text-[11px] text-[#8A8A85] hover:text-[#171717] px-2 py-1 rounded-lg hover:bg-white border border-transparent hover:border-[#E8E8E5] transition-colors cursor-pointer"
              title="Reset scope to all bookmarks"
            >
              <X className="w-3 h-3" />
              <span>Clear Scope</span>
            </button>
          )}

          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1 text-xs font-medium text-[#171717] hover:bg-[#F5F5F2] px-3 py-1.5 rounded-xl border border-[#E8E8E5] bg-white transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Optional Thread History Sidebar + Chat Area */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Thread Sidebar (Drawer) */}
        {showThreadSidebar && (
          <div className="w-64 shrink-0 flex flex-col border border-[#E8E8E5] bg-white rounded-2xl p-3 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F0EC]">
              <span className="text-xs font-bold text-[#171717]">Saved Conversations</span>
              <button
                onClick={() => setShowThreadSidebar(false)}
                className="p-1 rounded-lg text-[#8A8A85] hover:text-[#171717] hover:bg-[#F5F5F2]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {threads.length === 0 ? (
                <p className="text-[11px] text-[#8A8A85] p-2 text-center">No previous conversations.</p>
              ) : (
                threads.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setActiveThreadId(t.id);
                      setMessages(t.messages || []);
                    }}
                    className={`group flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                      activeThreadId === t.id
                        ? 'bg-[#EEF4FF] text-[#2563EB] font-medium'
                        : 'text-[#5C5C58] hover:bg-[#FAFAF8] hover:text-[#171717]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="truncate text-xs font-medium">{t.title || 'Untitled Thread'}</p>
                      <p className="text-[10px] text-[#8A8A85]">
                        {new Date(t.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {t.messages?.length || 0} msgs
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteThread(t.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#8A8A85] hover:text-rose-600 transition-opacity"
                      title="Delete thread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Central Chat View */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl p-4 shadow-2xs">
          {/* Scrollable Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin">
            {messages.length === 0 ? (
              /* Empty State */
              <div className="py-10 px-4 text-center max-w-lg mx-auto space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center mx-auto shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-[#171717]">Ask your bookmarks</h2>
                  <p className="text-xs text-[#70706B] leading-relaxed">
                    Recallly retrieves verified excerpts from your saved posts, evaluates evidence, and synthesizes answers strictly backed by citations.
                  </p>
                </div>

                {/* Scope Reminder Badge in Empty State */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F5F2] border border-[#E8E8E5] text-[11px] text-[#5C5C58]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Grounding: {activeScopeDescription}</span>
                </div>

                {/* Suggested Questions Grid */}
                <div className="space-y-2 text-left pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A85] block px-1">
                    Suggested Explorations
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {suggestedPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSend(prompt)}
                        className="p-3 rounded-xl bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#2563EB] hover:bg-[#FAFAF8] text-xs font-medium text-[#171717] transition-all text-left flex items-center justify-between group shadow-2xs cursor-pointer"
                      >
                        <span>{prompt}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#8A8A85] group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
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
                    className={`flex gap-3 ${msg.sender === 'user' || msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Assistant Avatar */}
                    {(msg.sender === 'assistant' || msg.role === 'assistant') && (
                      <div className="w-7 h-7 rounded-lg bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}

                    {/* Content Column */}
                    <div
                      className={`space-y-3 max-w-2xl ${
                        msg.sender === 'user' || msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl p-4 text-xs leading-relaxed ${
                          msg.sender === 'user' || msg.role === 'user'
                            ? 'bg-[#171717] text-[#FAFAF8] rounded-tr-xs'
                            : msg.is_refusal
                            ? 'bg-amber-50/50 border border-amber-200 text-[#171717] rounded-tl-xs shadow-2xs whitespace-pre-line'
                            : 'bg-[#FAFAF8] border border-[#E8E8E5] text-[#242422] rounded-tl-xs shadow-2xs whitespace-pre-line'
                        }`}
                      >
                        {msg.sender === 'user' || msg.role === 'user' ? (
                          msg.content
                        ) : (
                          renderMessageContentWithCitations(msg.content, msg.sources)
                        )}
                      </div>

                      {/* Grounding & Latency Meta Badge (For Assistant) */}
                      {(msg.sender === 'assistant' || msg.role === 'assistant') && (
                        <div className="flex flex-wrap items-center gap-2 px-1 text-[10px] text-[#8A8A85]">
                          {msg.is_refusal ? (
                            <span className="flex items-center gap-1 text-amber-700 font-medium bg-amber-100/70 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3" />
                              <span>Insufficient grounding in saved library</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Grounded strictly on {msg.sources?.length || 0} bookmarks</span>
                            </span>
                          )}

                          {msg.metrics?.retrievalLatencyMs !== undefined && (
                            <span>• {msg.metrics.retrievalMode || 'hybrid'} retrieval in {msg.metrics.retrievalLatencyMs}ms</span>
                          )}
                        </div>
                      )}

                      {/* Referenced Sources Panel */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A85] flex items-center gap-1">
                              <BookmarkIcon className="w-3 h-3" />
                              <span>Referenced Sources ({msg.sources.length})</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {msg.sources.map((s, sIdx) => {
                              const sId = s.source_id || `S${sIdx + 1}`;
                              const isHighlighted = highlightedSourceId === sId;

                              return (
                                <div
                                  key={`${msg.id}_src_${s.bookmark_id}_${sIdx}`}
                                  className={`p-3 rounded-xl bg-white border transition-all flex flex-col justify-between text-xs space-y-2.5 ${
                                    isHighlighted
                                      ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#F8FAFF]'
                                      : 'border-[#E8E8E5] hover:border-[#D0D0CB] hover:bg-[#FAFAF8]'
                                  }`}
                                >
                                  {/* Top Author & Source ID */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 truncate">
                                      {s.author_avatar ? (
                                        <img
                                          src={s.author_avatar}
                                          alt={s.author_name}
                                          className="w-5 h-5 rounded-full object-cover border border-[#E8E8E5]"
                                        />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-[#E5E5E0] text-[10px] font-bold flex items-center justify-center">
                                          {s.author_username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                      )}
                                      <div className="truncate">
                                        <span className="font-semibold text-[11px] text-[#171717] block truncate">
                                          {s.author_name}
                                        </span>
                                        <span className="text-[10px] text-[#8A8A85] block truncate">
                                          @{s.author_username}
                                        </span>
                                      </div>
                                    </div>

                                    <span className="px-1.5 py-0.5 rounded-md bg-[#EEF4FF] text-[#2563EB] font-bold text-[10px] shrink-0 border border-[#DBEAFE]">
                                      [{sId}]
                                    </span>
                                  </div>

                                  {/* Excerpt */}
                                  <p className="text-[11px] text-[#5C5C58] line-clamp-3 leading-relaxed italic">
                                    "{s.excerpt}"
                                  </p>

                                  {/* Card Footer */}
                                  <div className="pt-2 border-t border-[#F2F2EE] flex items-center justify-between text-[10px]">
                                    <span className="text-[#8A8A85] truncate max-w-[120px]">
                                      {s.topics?.[0] ? `#${s.topics[0]}` : 'Bookmark'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => navigate(`/bookmarks/${s.bookmark_id}`)}
                                        className="text-[#2563EB] hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
                                      >
                                        <span>View</span>
                                      </button>
                                      {s.url && (
                                        <a
                                          href={s.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[#8A8A85] hover:text-[#171717]"
                                          title="Open on X"
                                        >
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* User Avatar */}
                    {(msg.sender === 'user' || msg.role === 'user') && (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name}
                        className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 border border-[#E0E0DC]"
                      />
                    )}
                  </div>
                ))}

                {/* Thinking / Progress state */}
                {isThinking && (
                  <div className="flex gap-3 justify-start items-center animate-in fade-in">
                    <div className="w-7 h-7 rounded-lg bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0 shadow-2xs">
                      <Sparkles className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="p-3 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl rounded-tl-xs text-xs text-[#70706B] flex items-center gap-2 shadow-2xs">
                      <div className="w-2 h-2 rounded-full bg-[#2563EB] animate-ping" />
                      <span>{thinkingStep}</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}
          </div>

          {/* Composer Box at bottom */}
          <div className="pt-3 border-t border-[#E8E8E5] shrink-0">
            {/* Active Scope Tag Pill */}
            {scopeType !== 'all' && (
              <div className="flex items-center justify-between pb-2 px-1 text-[11px] text-[#2563EB]">
                <div className="flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  <span>Constrained to: <strong>{activeScopeDescription}</strong></span>
                </div>
                <button
                  onClick={handleClearScope}
                  className="text-[10px] text-[#8A8A85] hover:text-[#171717] underline cursor-pointer"
                >
                  Switch to all
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Ask anything about ${activeScopeDescription.toLowerCase()}...`}
                disabled={isThinking}
                className="w-full pl-4 pr-12 py-3 bg-[#FAFAF8] border border-[#E8E8E5] hover:border-[#D0D0CB] focus:border-[#2563EB] focus:bg-white rounded-2xl text-xs text-[#171717] placeholder:text-[#8A8A85] outline-none shadow-2xs transition-all"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isThinking}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-[#171717] text-[#FAFAF8] hover:bg-[#2B2B2B] disabled:opacity-40 transition-colors cursor-pointer"
                title="Send query"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-[#8A8A85]">
              <span>Answers are synthesized strictly from retrieved library evidence with verified citations.</span>
              <span className="hidden sm:inline">Press Enter to send</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
