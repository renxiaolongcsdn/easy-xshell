import React, { useState, useEffect } from 'react';
import type { Session } from '../types';
import { useStore } from '../store/useStore';

const emptyForm = {
  name: '',
  host: '',
  port: 22,
  username: 'root',
  auth_type: 'password' as 'password' | 'key',
  password: '',
  private_key_path: '',
  passphrase: '',
  group: '',
};

const SessionDialog: React.FC = () => {
  const { showSessionDialog, editingSession, closeSessionDialog, saveSession } =
    useStore();

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!showSessionDialog) return;
    if (editingSession) {
      setForm({
        name: editingSession.name,
        host: editingSession.host,
        port: editingSession.port,
        username: editingSession.username,
        auth_type: editingSession.auth_type,
        password: editingSession.password || '',
        private_key_path: editingSession.private_key_path || '',
        passphrase: editingSession.passphrase || '',
        group: editingSession.group || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [showSessionDialog, editingSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.host || !form.username) {
      alert('请填写主机地址和用户名');
      return;
    }

    const session: Session = {
      id: editingSession?.id || crypto.randomUUID(),
      name: form.name || `${form.username}@${form.host}`,
      host: form.host,
      port: form.port || 22,
      username: form.username,
      auth_type: form.auth_type,
      password: form.auth_type === 'password' ? form.password : undefined,
      private_key_path:
        form.auth_type === 'key' ? form.private_key_path : undefined,
      passphrase: form.auth_type === 'key' ? form.passphrase : undefined,
      group: form.group || undefined,
      last_connected: editingSession?.last_connected,
    };

    try {
      await saveSession(session);
      closeSessionDialog();
    } catch (err) {
      alert(`保存失败: ${err}`);
    }
  };

  if (!showSessionDialog) return null;

  return (
    <div className="dialog-overlay" onClick={closeSessionDialog}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>{editingSession ? '编辑会话' : '新建会话'}</h3>
          <button className="btn-icon" onClick={closeSessionDialog}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body">
          <div className="form-row">
            <label>会话名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="自动生成: user@host"
            />
          </div>

          <div className="form-row-group">
            <div className="form-row flex-3">
              <label>主机地址 *</label>
              <input
                type="text"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="192.168.1.100"
                required
              />
            </div>
            <div className="form-row flex-1">
              <label>端口</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) =>
                  setForm({ ...form, port: parseInt(e.target.value) || 22 })
                }
                min={1}
                max={65535}
              />
            </div>
          </div>

          <div className="form-row">
            <label>用户名 *</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="root"
              required
            />
          </div>

          <div className="form-row">
            <label>认证方式</label>
            <div className="auth-toggle">
              <button
                type="button"
                className={`toggle-btn ${form.auth_type === 'password' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, auth_type: 'password' })}
              >
                🔑 密码
              </button>
              <button
                type="button"
                className={`toggle-btn ${form.auth_type === 'key' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, auth_type: 'key' })}
              >
                🗝 密钥
              </button>
            </div>
          </div>

          {form.auth_type === 'password' ? (
            <div className="form-row">
              <label>密码</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="输入密码"
              />
            </div>
          ) : (
            <>
              <div className="form-row">
                <label>私钥路径</label>
                <input
                  type="text"
                  value={form.private_key_path}
                  onChange={(e) =>
                    setForm({ ...form, private_key_path: e.target.value })
                  }
                  placeholder="~/.ssh/id_ed25519"
                />
              </div>
              <div className="form-row">
                <label>密钥密码（可选）</label>
                <input
                  type="password"
                  value={form.passphrase}
                  onChange={(e) =>
                    setForm({ ...form, passphrase: e.target.value })
                  }
                  placeholder="如果私钥有密码保护"
                />
              </div>
            </>
          )}

          <div className="form-row">
            <label>分组（可选）</label>
            <input
              type="text"
              value={form.group}
              onChange={(e) => setForm({ ...form, group: e.target.value })}
              placeholder="Production / Development / ..."
            />
          </div>

          <div className="dialog-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeSessionDialog}
            >
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {editingSession ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionDialog;
