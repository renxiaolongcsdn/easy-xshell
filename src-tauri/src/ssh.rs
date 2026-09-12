use ssh2::{Channel, Session as Ssh2Session};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::ipc::Channel as TauriChannel;

/// 每个活跃连接的控制通道
struct ConnectionHandle {
    write_tx: mpsc::Sender<Vec<u8>>,
    // 当 handle 被 drop 时，sender 关闭 → 写线程退出
    // 读线程通过 channel EOF 或错误退出
}

pub struct ConnectionManager {
    connections: Mutex<HashMap<String, ConnectionHandle>>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
        }
    }

    /// 建立 SSH 连接并启动读写线程
    pub fn connect(
        &self,
        session_id: String,
        host: &str,
        port: u16,
        username: &str,
        password: Option<&str>,
        private_key_path: Option<&str>,
        passphrase: Option<&str>,
        on_data: TauriChannel<String>,
    ) -> Result<(), String> {
        // 1. TCP 连接
        let tcp = TcpStream::connect(format!("{}:{}", host, port))
            .map_err(|e| format!("TCP 连接失败: {}", e))?;
        tcp.set_read_timeout(Some(Duration::from_secs(30)))
            .map_err(|e| format!("设置超时失败: {}", e))?;

        // 2. SSH 握手
        let mut session = Ssh2Session::new().map_err(|e| format!("创建会话失败: {}", e))?;
        session.set_tcp_stream(tcp);
        session
            .handshake()
            .map_err(|e| format!("SSH 握手失败: {}", e))?;

        // 3. 认证
        if let Some(key_path) = private_key_path {
            let pp = passphrase.unwrap_or("");
            session
                .userauth_pubkey_file(
                    username,
                    None,
                    std::path::Path::new(key_path),
                    Some(pp),
                )
                .map_err(|e| format!("密钥认证失败: {}", e))?;
        } else if let Some(pwd) = password {
            session
                .userauth_password(username, pwd)
                .map_err(|e| format!("密码认证失败: {}", e))?;
        } else {
            return Err("未提供认证方式".to_string());
        }

        if !session.authenticated() {
            return Err("认证失败，请检查用户名和密码/密钥".to_string());
        }

        // 4. 打开 Channel 并请求交互式 Shell
        let mut channel = session
            .channel_session()
            .map_err(|e| format!("打开通道失败: {}", e))?;
        channel
            .request_pty("xterm-256color", None, Some((120, 40, 0, 0)))
            .map_err(|e| format!("请求 PTY 失败: {}", e))?;
        channel
            .shell()
            .map_err(|e| format!("启动 Shell 失败: {}", e))?;

        // 把 channel 包在 Arc<Mutex> 里，读写线程共享
        let channel = Arc::new(Mutex::new(channel));
        let (write_tx, write_rx) = mpsc::channel::<Vec<u8>>();

        // 5. 读取线程：从 SSH 读数据 → 推给前端
        let read_ch = Arc::clone(&channel);
        std::thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                let result = {
                    let mut ch = read_ch.lock().unwrap();
                    ch.read(&mut buf)
                };
                match result {
                    Ok(0) => {
                        let _ = on_data.send("\r\n\x1b[33m[连接已关闭]\x1b[0m".to_string());
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        if on_data.send(data).is_err() {
                            break; // 前端断开
                        }
                    }
                    Err(ref e)
                        if e.kind() == std::io::ErrorKind::WouldBlock
                            || e.kind() == std::io::ErrorKind::TimedOut =>
                    {
                        std::thread::sleep(Duration::from_millis(10));
                    }
                    Err(_) => {
                        let _ = on_data.send("\r\n\x1b[31m[读取错误]\x1b[0m".to_string());
                        break;
                    }
                }
            }
        });

        // 6. 写入线程：从前端收数据 → 写到 SSH
        let write_ch = Arc::clone(&channel);
        std::thread::spawn(move || {
            while let Ok(data) = write_rx.recv() {
                let result = {
                    let mut ch = write_ch.lock().unwrap();
                    ch.write_all(&data)
                };
                if result.is_err() {
                    break;
                }
                // flush
                let _ = {
                    let mut ch = write_ch.lock().unwrap();
                    ch.flush()
                };
            }
            // 写线程退出（前端断开或 SSH 断开）
        });

        // 注册连接
        let handle = ConnectionHandle { write_tx };
        self.connections.lock().unwrap().insert(session_id, handle);
        Ok(())
    }

    /// 发送用户输入到 SSH
    pub fn send_data(&self, session_id: &str, data: &[u8]) -> Result<(), String> {
        let connections = self.connections.lock().unwrap();
        if let Some(conn) = connections.get(session_id) {
            conn.write_tx
                .send(data.to_vec())
                .map_err(|_| "发送失败，连接可能已断开".to_string())
        } else {
            Err("会话不存在或已断开".to_string())
        }
    }

    /// 断开连接
    pub fn disconnect(&self, session_id: &str) {
        self.connections.lock().unwrap().remove(session_id);
    }

    /// 检查连接是否存活
    pub fn is_connected(&self, session_id: &str) -> bool {
        self.connections.lock().unwrap().contains_key(session_id)
    }
}
