"use client";

import { useState, useMemo } from "react";

export interface ConversationItem {
  id: string;
  title: string;
  created_at: string;
  message_count?: number;
  last_message?: string | null;
}

interface ConversationDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  conversations: ConversationItem[];
  onRenameConversation: (id: string, newTitle: string) => Promise<void> | void;
  onDeleteConversation: (id: string) => Promise<void> | void;
  isLoading?: boolean;
}

export default function ConversationDrawer({
  isOpen,
  onToggle,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  conversations,
  onRenameConversation,
  onDeleteConversation,
  isLoading = false,
}: ConversationDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Group conversations into Today, Yesterday, Previous 7 Days, and Older
  const groupedConversations = useMemo(() => {
    const filtered = conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const pastWeekStart = todayStart - 7 * 86400000;

    const groups: { [key: string]: ConversationItem[] } = {
      Today: [],
      Yesterday: [],
      "Previous 7 Days": [],
      Older: [],
    };

    filtered.forEach((conv) => {
      const convTime = new Date(conv.created_at).getTime();
      if (convTime >= todayStart) {
        groups["Today"].push(conv);
      } else if (convTime >= yesterdayStart) {
        groups["Yesterday"].push(conv);
      } else if (convTime >= pastWeekStart) {
        groups["Previous 7 Days"].push(conv);
      } else {
        groups["Older"].push(conv);
      }
    });

    return groups;
  }, [conversations, searchQuery]);

  const handleStartRename = (conv: ConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = async (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      await onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onDeleteConversation(id);
    setDeleteConfirmId(null);
  };

  return (
    <>
      {/* Mobile Backdrop Scrim */}
      {isOpen && (
        <div
          className="fixed top-16 inset-x-0 bottom-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Drawer Container */}
      <aside
        className={`fixed md:relative top-16 md:top-0 bottom-0 left-0 z-40 flex flex-col w-72 h-full bg-surface-container-lowest border-r border-surface-container shadow-xl md:shadow-none transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:-ml-72"
        }`}
      >
        {/* Top Header: New Chat & Close button on mobile */}
        <div className="px-3.5 pt-3.5 pb-3 border-b border-surface-container/70 flex flex-col gap-2.5 shrink-0 bg-surface-container-low/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-primary">history</span>
              <span>Chat History</span>
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant md:hidden transition-colors"
              title="Close drawer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* + New Chat CTA */}
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onToggle();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-primary text-on-primary hover:brightness-110 active:scale-[0.98] transition-all shadow-sm font-label-md text-label-md font-semibold group"
            id="new-chat-btn"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] group-hover:rotate-90 transition-transform duration-200">
                add
              </span>
              <span>New Marine Chat</span>
            </div>
            <span className="text-[10px] font-mono opacity-75 bg-white/20 px-1.5 py-0.5 rounded">
              Ctrl+N
            </span>
          </button>

          {/* Filter / Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-surface-container-highest/60 border border-surface-container/80 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/50 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="material-symbols-outlined absolute right-2 top-2 text-[14px] text-on-surface-variant hover:text-on-surface"
              >
                cancel
              </button>
            )}
          </div>
        </div>

        {/* Conversation List Scroll Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 font-sans text-xs scrollbar-thin">
          {isLoading && (
            <div className="flex items-center justify-center py-6 text-on-surface-variant gap-2 font-mono text-[11px]">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span>Loading sessions...</span>
            </div>
          )}

          {!isLoading && conversations.length === 0 && (
            <div className="text-center py-8 px-4 text-on-surface-variant flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl opacity-40">chat_bubble_outline</span>
              <p className="font-semibold text-xs text-on-surface">No conversations yet</p>
              <p className="text-[11px] opacity-75">
                Start a session to get live oceanic weather & fishing advisories.
              </p>
            </div>
          )}

          {Object.entries(groupedConversations).map(([category, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={category} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant/70">
                  {category}
                </div>
                {items.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  const isEditing = editingId === conv.id;
                  const isDeleting = deleteConfirmId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        if (!isEditing) {
                          onSelectConversation(conv.id);
                          if (window.innerWidth < 768) onToggle();
                        }
                      }}
                      className={`group relative flex items-center justify-between p-2 rounded-xl text-left cursor-pointer transition-all ${
                        isActive
                          ? "bg-primary-container/30 border border-primary/40 text-primary font-semibold shadow-xs"
                          : "hover:bg-surface-container-high/60 border border-transparent text-on-surface"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                        <span
                          className={`material-symbols-outlined text-[16px] shrink-0 ${
                            isActive ? "text-primary" : "text-on-surface-variant group-hover:text-primary"
                          }`}
                        >
                          {isActive ? "chat" : "chat_bubble_outline"}
                        </span>

                        {isEditing ? (
                          <form
                            onSubmit={(e) => handleSaveRename(conv.id, e)}
                            className="flex items-center gap-1 flex-1 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full text-xs px-1.5 py-0.5 rounded bg-surface border border-primary text-on-surface focus:outline-none"
                              autoFocus
                              onBlur={() => handleSaveRename(conv.id)}
                            />
                            <button
                              type="submit"
                              className="material-symbols-outlined text-[15px] text-primary hover:text-primary-dark shrink-0"
                              title="Save title"
                            >
                              check
                            </button>
                          </form>
                        ) : (
                          <span className="truncate text-xs leading-snug">
                            {conv.title || "Marine Advisory Session"}
                          </span>
                        )}
                      </div>

                      {/* Action Menu (Rename / Delete) */}
                      {!isEditing && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {isDeleting ? (
                            <div
                              className="flex items-center gap-1 bg-error-container text-on-error-container px-1.5 py-0.5 rounded text-[10px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>Delete?</span>
                              <button
                                onClick={(e) => handleDelete(conv.id, e)}
                                className="font-bold text-error hover:underline px-0.5"
                                title="Confirm delete"
                              >
                                Yes
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(null);
                                }}
                                className="opacity-70 hover:opacity-100 px-0.5"
                                title="Cancel"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={(e) => handleStartRename(conv, e)}
                                className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
                                title="Rename conversation"
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(conv.id);
                                }}
                                className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-error transition-colors"
                                title="Delete conversation"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer: Persistence status & storage indicator */}
        <div className="p-2.5 border-t border-surface-container/70 bg-surface-container-low/50 flex items-center justify-between text-[11px] font-mono text-on-surface-variant shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Local & Cloud Synced</span>
          </div>
          <span className="opacity-70">
            {conversations.length} {conversations.length === 1 ? "thread" : "threads"}
          </span>
        </div>
      </aside>
    </>
  );
}
