import React from 'react';
import { useStore } from '../store/useStore';

const StatusBar: React.FC = () => {
  const { tabs, activeTabId, sftpPanelOpen, toggleSftpPanel, connectSftp } =
    useStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleToggleSftp = async () => {
    if (sftpPanelOpen) {
      useStore.getState().disconnectSftp();
    } else if (activeTab) {
      await connectSftp(activeTab.session);
    }
  };

  return (
    <div className="status-bar">
      <div className="status-left">
        {activeTab ? (
          <>
            <span className="status-item status-connected">
              <span className="status-dot green" />
              已连接
            </span>
            <span className="status-divider">│</span>
            <span className="status-item">
              {activeTab.session.username}@{activeTab.session.host}
            </span>
            <span className="status-divider">│</span>
            <span className="status-item">:{activeTab.session.port}</span>
          </>
        ) : (
          <span className="status-item status-disconnected">
            <span className="status-dot gray" />
            未连接
          </span>
        )}
      </div>

      <div className="status-right">
        {activeTab && (
          <button
            className={`status-btn ${sftpPanelOpen ? 'active' : ''}`}
            onClick={handleToggleSftp}
          >
            📁 SFTP
          </button>
        )}
        <span className="status-item">UTF-8</span>
      </div>
    </div>
  );
};

export default StatusBar;
