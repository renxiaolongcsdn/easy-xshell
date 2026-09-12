import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useStore } from '../store/useStore';
import { invoke } from '@tauri-apps/api/core';

const TERM_THEME = {
  background: '#1a1b26',
  foreground: '#c0caf5',
  cursor: '#c0caf5',
  cursorAccent: '#1a1b26',
  selectionBackground: '#33467c',
  black: '#15161e',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  magenta: '#bb9af7',
  cyan: '#7dcfff',
  white: '#a9b1d6',
  brightBlack: '#414868',
  brightRed: '#f7768e',
  brightGreen: '#9ece6a',
  brightYellow: '#e0af68',
  brightBlue: '#7aa2f7',
  brightMagenta: '#bb9af7',
  brightCyan: '#7dcfff',
  brightWhite: '#c0caf5',
};

const TerminalView: React.FC = () => {
  const { tabs, activeTabId, dataChannels } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // 初始化 Terminal（只创建一次）
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: TERM_THEME,
      fontFamily: '"SF Mono", "Monaco", "Menlo", "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.25,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      tabStopWidth: 4,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    const onResize = () => fitAddon.fit();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // 绑定用户输入 → 发送到 SSH
  useEffect(() => {
    const term = termRef.current;
    if (!term || !activeTabId) return;

    const disposable = term.onData((data) => {
      invoke('send_ssh_data', { sessionId: activeTabId, data }).catch(() => {});
    });

    return () => disposable.dispose();
  }, [activeTabId]);

  // 绑定 SSH 数据 → 写入终端
  useEffect(() => {
    const term = termRef.current;
    if (!term || !activeTabId) return;

    const channel = dataChannels.get(activeTabId);
    if (!channel) return;

    channel.onmessage = (data: string) => {
      term.write(data);
    };

    return () => {
      channel.onmessage = null as unknown as (response: string) => void;
    };
  }, [activeTabId, dataChannels]);

  // 切换标签时重新 fit
  useEffect(() => {
    if (fitRef.current) {
      setTimeout(() => fitRef.current?.fit(), 50);
    }
    // 清空终端内容并重新显示欢迎
    const term = termRef.current;
    if (term && activeTab) {
      term.clear();
    }
  }, [activeTabId]);

  return (
    <div className="terminal-view">
      <div ref={containerRef} className="terminal-container" />
      {!activeTab && (
        <div className="terminal-placeholder">
          <div className="placeholder-content">
            <div className="placeholder-logo">⚡</div>
            <h3>EasyXShell</h3>
            <p>从左侧选择会话连接，或点击 + 新建</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerminalView;
