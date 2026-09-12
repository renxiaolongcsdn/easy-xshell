import { create } from 'zustand';
import type { Session, Tab, SftpEntry } from '../types';
import { invoke, Channel } from '@tauri-apps/api/core';

interface AppState {
  // ===== 会话 =====
  sessions: Session[];
  loadSessions: () => Promise<void>;
  saveSession: (session: Session) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;

  // ===== 标签页 =====
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (session: Session) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // ===== 数据通道（前端 ← SSH） =====
  dataChannels: Map<string, Channel<string>>;
  registerChannel: (sessionId: string, channel: Channel<string>) => void;
  removeChannel: (sessionId: string) => void;

  // ===== SFTP =====
  sftpPanelOpen: boolean;
  sftpSessionId: string | null;
  sftpPath: string;
  sftpFiles: SftpEntry[];
  toggleSftpPanel: () => void;
  setSftpPath: (path: string) => void;
  loadSftpFiles: () => Promise<void>;
  connectSftp: (session: Session) => Promise<void>;
  disconnectSftp: () => void;

  // ===== UI =====
  showSessionDialog: boolean;
  editingSession: Session | null;
  openSessionDialog: (session?: Session) => void;
  closeSessionDialog: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // ===== 会话 =====
  sessions: [],

  loadSessions: async () => {
    try {
      const sessions = await invoke<Session[]>('load_sessions');
      set({ sessions });
    } catch (e) {
      console.error('加载会话失败:', e);
    }
  },

  saveSession: async (session: Session) => {
    try {
      const saved = await invoke<Session>('save_session', { session });
      const { sessions } = get();
      const idx = sessions.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const next = [...sessions];
        next[idx] = saved;
        set({ sessions: next });
      } else {
        set({ sessions: [...sessions, saved] });
      }
    } catch (e) {
      console.error('保存会话失败:', e);
      throw e;
    }
  },

  deleteSession: async (id: string) => {
    try {
      await invoke('delete_session', { sessionId: id });
      set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
    } catch (e) {
      console.error('删除会话失败:', e);
    }
  },

  // ===== 标签页 =====
  tabs: [],
  activeTabId: null,

  addTab: (session: Session) => {
    const { tabs } = get();
    // 如果已经打开，直接激活
    const existing = tabs.find((t) => t.session.id === session.id);
    if (existing) {
      set({
        tabs: tabs.map((t) => ({ ...t, isActive: t.id === existing.id })),
        activeTabId: existing.id,
      });
      return;
    }
    const newTab: Tab = { id: session.id, session, isActive: true };
    const next = tabs.map((t) => ({ ...t, isActive: false }));
    next.push(newTab);
    set({ tabs: next, activeTabId: session.id });
  },

  removeTab: (id: string) => {
    const { tabs, activeTabId } = get();
    // 断开 SSH
    invoke('disconnect_ssh', { sessionId: id }).catch(() => {});
    get().removeChannel(id);

    const next = tabs.filter((t) => t.id !== id);
    if (next.length === 0) {
      set({ tabs: [], activeTabId: null });
      return;
    }
    if (activeTabId === id) {
      const fallback = next[next.length - 1];
      next[next.length - 1] = { ...fallback, isActive: true };
      set({ tabs: next, activeTabId: fallback.id });
    } else {
      set({ tabs: next });
    }
  },

  setActiveTab: (id: string) => {
    set((s) => ({
      tabs: s.tabs.map((t) => ({ ...t, isActive: t.id === id })),
      activeTabId: id,
    }));
  },

  // ===== 数据通道 =====
  dataChannels: new Map(),

  registerChannel: (sessionId: string, channel: Channel<string>) => {
    const next = new Map(get().dataChannels);
    next.set(sessionId, channel);
    set({ dataChannels: next });
  },

  removeChannel: (sessionId: string) => {
    const next = new Map(get().dataChannels);
    next.delete(sessionId);
    set({ dataChannels: next });
  },

  // ===== SFTP =====
  sftpPanelOpen: false,
  sftpSessionId: null,
  sftpPath: '~',
  sftpFiles: [],

  toggleSftpPanel: () => set((s) => ({ sftpPanelOpen: !s.sftpPanelOpen })),

  setSftpPath: (path: string) => set({ sftpPath: path }),

  loadSftpFiles: async () => {
    const { sftpSessionId, sftpPath } = get();
    if (!sftpSessionId) return;
    try {
      const files = await invoke<SftpEntry[]>('sftp_list_dir', {
        sessionId: sftpSessionId,
        path: sftpPath,
      });
      set({ sftpFiles: files });
    } catch (e) {
      console.error('加载目录失败:', e);
    }
  },

  connectSftp: async (session: Session) => {
    try {
      await invoke('sftp_connect', { session });
      set({ sftpSessionId: session.id, sftpPanelOpen: true, sftpPath: '~' });
      await get().loadSftpFiles();
    } catch (e) {
      console.error('SFTP 连接失败:', e);
    }
  },

  disconnectSftp: () => {
    const { sftpSessionId } = get();
    if (sftpSessionId) {
      invoke('sftp_disconnect', { sessionId: sftpSessionId }).catch(() => {});
    }
    set({ sftpPanelOpen: false, sftpSessionId: null, sftpFiles: [] });
  },

  // ===== UI =====
  showSessionDialog: false,
  editingSession: null,

  openSessionDialog: (session?: Session) => {
    set({ showSessionDialog: true, editingSession: session || null });
  },

  closeSessionDialog: () => {
    set({ showSessionDialog: false, editingSession: null });
  },

  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),
}));
