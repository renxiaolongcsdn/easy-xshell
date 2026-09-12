import React, { useEffect, useState } from 'react';
import type { Session } from '../types';
import { useStore } from '../store/useStore';
import { invoke, Channel } from '@tauri-apps/api/core';

const Sidebar: React.FC = () => {
  const {
    sessions,
    loadSessions,
    deleteSession,
    openSessionDialog,
    addTab,
    registerChannel,
    searchQuery,
    setSearchQuery,
  } = useStore();

  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const handleConnect = async (session: Session) => {
    setConnecting(session.id);
    try {
      const channel = new Channel<string>();
      const sessionId = await invoke<string>('connect_ssh', {
        session,
        onData: channel,
      });
      registerChannel(sessionId, channel);
      addTab(session);
    } catch (e: any) {
      alert(`连接失败: ${e}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDelete = async (session: Session) => {
    if (confirm(`确定删除会话「${session.name}」？`)) {
      await deleteSession(session.id);
    }
  };

  // 搜索过滤
  const filtered = sessions.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.group || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 按分组归类
  const grouped = filtered.reduce(
    (acc, s) => {
      const g = s.group || '未分组';
      if (!acc[g]) acc[g] = [];
      acc[g].push(s);
      return acc;
    },
    {} as Record<string, Session[]>
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>EasyXShell</h2>
        <button
          className="btn-icon btn-add"
          onClick={() => openSessionDialog()}
          title="新建会话"
        >
          +
        </button>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="搜索会话..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="sessions-list">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="session-group">
            <div className="group-header">{group}</div>
            {items.map((session) => (
              <div key={session.id} className="session-item">
                <div
                  className="session-info"
                  onDoubleClick={() => handleConnect(session)}
                >
                  <div className="session-name">{session.name}</div>
                  <div className="session-host">
                    {session.username}@{session.host}:{session.port}
                  </div>
                  {session.last_connected && (
                    <div className="session-last">
                      上次: {session.last_connected}
                    </div>
                  )}
                </div>
                <div className="session-actions">
                  <button
                    className="btn-icon btn-connect"
                    onClick={() => handleConnect(session)}
                    disabled={connecting === session.id}
                    title="连接"
                  >
                    {connecting === session.id ? '⏳' : '▶'}
                  </button>
                  <button
                    className="btn-icon btn-edit"
                    onClick={() => openSessionDialog(session)}
                    title="编辑"
                  >
                    ✎
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleDelete(session)}
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="empty-state">
            <p>暂无会话</p>
            <p className="hint">点击右上角 + 新建</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
