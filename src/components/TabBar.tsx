import React from 'react';
import { useStore } from '../store/useStore';

const TabBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab } = useStore();

  if (tabs.length === 0) return null;

  return (
    <div className="tab-bar">
      <div className="tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">⚡</span>
            <span className="tab-name">{tab.session.name}</span>
            <span className="tab-host">{tab.session.host}</span>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
              title="关闭"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabBar;
