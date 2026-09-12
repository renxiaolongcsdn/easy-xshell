import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import TerminalView from './components/TerminalView';
import SftpPanel from './components/SftpPanel';
import StatusBar from './components/StatusBar';
import SessionDialog from './components/SessionDialog';
import { useStore } from './store/useStore';
import './App.css';

function App() {
  const { loadSessions } = useStore();

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <div className="app">
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <TabBar />
          <div className="content-area">
            <TerminalView />
            <SftpPanel />
          </div>
        </div>
      </div>
      <StatusBar />
      <SessionDialog />
    </div>
  );
}

export default App;
