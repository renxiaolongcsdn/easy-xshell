import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { invoke } from '@tauri-apps/api/core';

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
};

const SftpPanel: React.FC = () => {
  const {
    sftpPanelOpen,
    sftpPath,
    sftpFiles,
    sftpSessionId,
    setSftpPath,
    loadSftpFiles,
    disconnectSftp,
  } = useStore();

  useEffect(() => {
    if (sftpPanelOpen && sftpSessionId) {
      loadSftpFiles();
    }
  }, [sftpPanelOpen, sftpPath, sftpSessionId]);

  const handleNavigate = (path: string) => setSftpPath(path);

  const handleGoUp = () => {
    const parts = sftpPath.split('/').filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      setSftpPath('/' + parts.join('/'));
    } else {
      setSftpPath('/');
    }
  };

  const handleDownload = async (remotePath: string, name: string) => {
    if (!sftpSessionId) return;
    try {
      const home = await invoke<string>('get_home_dir');
      const localPath = `${home}/Downloads/${name}`;
      await invoke('sftp_download', {
        sessionId: sftpSessionId,
        remotePath,
        localPath,
      });
      alert(`已下载到: ${localPath}`);
    } catch (e: any) {
      alert(`下载失败: ${e}`);
    }
  };

  const handleDelete = async (path: string, name: string) => {
    if (!sftpSessionId) return;
    if (!confirm(`确定删除「${name}」？`)) return;
    try {
      await invoke('sftp_delete', { sessionId: sftpSessionId, path });
      await loadSftpFiles();
    } catch (e: any) {
      alert(`删除失败: ${e}`);
    }
  };

  const handleMkdir = async () => {
    if (!sftpSessionId) return;
    const name = prompt('新建文件夹名称:');
    if (!name) return;
    try {
      const newPath =
        sftpPath === '/' ? `/${name}` : `${sftpPath}/${name}`;
      await invoke('sftp_mkdir', { sessionId: sftpSessionId, path: newPath });
      await loadSftpFiles();
    } catch (e: any) {
      alert(`创建失败: ${e}`);
    }
  };

  if (!sftpPanelOpen) return null;

  return (
    <div className="sftp-panel">
      <div className="sftp-header">
        <span className="sftp-title">📁 SFTP</span>
        <div className="sftp-actions">
          <button
            className="btn-icon btn-sm"
            onClick={handleMkdir}
            title="新建文件夹"
          >
            +
          </button>
          <button
            className="btn-icon btn-sm"
            onClick={() => loadSftpFiles()}
            title="刷新"
          >
            ↻
          </button>
          <button
            className="btn-icon btn-sm"
            onClick={disconnectSftp}
            title="关闭"
          >
            ×
          </button>
        </div>
      </div>

      <div className="sftp-path-bar">
        <button className="btn-icon btn-sm" onClick={handleGoUp} title="上级">
          ↑
        </button>
        <input
          type="text"
          className="sftp-path-input"
          value={sftpPath}
          onChange={(e) => setSftpPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') loadSftpFiles();
          }}
        />
        <button
          className="btn-icon btn-sm"
          onClick={() => loadSftpFiles()}
          title="前往"
        >
          →
        </button>
      </div>

      <div className="sftp-file-list">
        <div className="sftp-file-header">
          <span className="col-name">名称</span>
          <span className="col-size">大小</span>
          <span className="col-modified">修改时间</span>
          <span className="col-perms">权限</span>
          <span className="col-actions">操作</span>
        </div>

        {sftpPath !== '/' && (
          <div className="sftp-file-row sftp-dir" onClick={handleGoUp}>
            <span className="col-name">📁 ..</span>
            <span className="col-size">-</span>
            <span className="col-modified">-</span>
            <span className="col-perms">-</span>
            <span className="col-actions">-</span>
          </div>
        )}

        {sftpFiles.map((entry, i) => (
          <div
            key={`${entry.path}-${i}`}
            className={`sftp-file-row ${entry.is_dir ? 'sftp-dir' : 'sftp-file'}`}
            onDoubleClick={() => entry.is_dir && handleNavigate(entry.path)}
          >
            <span className="col-name" title={entry.name}>
              {entry.is_dir ? '📁' : '📄'} {entry.name}
            </span>
            <span className="col-size">
              {entry.is_dir ? '-' : formatSize(entry.size)}
            </span>
            <span className="col-modified">{entry.modified || '-'}</span>
            <span className="col-perms">{entry.permissions || '-'}</span>
            <span className="col-actions">
              {!entry.is_dir && (
                <button
                  className="btn-icon btn-sm"
                  onClick={() => handleDownload(entry.path, entry.name)}
                  title="下载"
                >
                  ⬇
                </button>
              )}
              <button
                className="btn-icon btn-sm btn-danger"
                onClick={() => handleDelete(entry.path, entry.name)}
                title="删除"
              >
                ✕
              </button>
            </span>
          </div>
        ))}

        {sftpFiles.length === 0 && (
          <div className="sftp-empty">空目录</div>
        )}
      </div>
    </div>
  );
};

export default SftpPanel;
