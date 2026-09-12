use serde::Serialize;
use ssh2::Session as Ssh2Session;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::time::Duration;

#[derive(Debug, Clone, Serialize)]
pub struct SftpEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub permissions: Option<String>,
    pub modified: Option<String>,
}

pub struct SftpManager {
    sessions: Mutex<std::collections::HashMap<String, Arc<Mutex<Ssh2Session>>>>,
}

impl SftpManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(std::collections::HashMap::new()),
        }
    }

    pub fn connect(
        &self,
        session_id: String,
        host: &str,
        port: u16,
        username: &str,
        password: Option<&str>,
        private_key_path: Option<&str>,
        passphrase: Option<&str>,
    ) -> Result<(), String> {
        let tcp = TcpStream::connect(format!("{}:{}", host, port))
            .map_err(|e| format!("SFTP TCP 连接失败: {}", e))?;
        tcp.set_read_timeout(Some(Duration::from_secs(30))).ok();

        let mut session =
            Ssh2Session::new().map_err(|e| format!("创建 SFTP 会话失败: {}", e))?;
        session.set_tcp_stream(tcp);
        session
            .handshake()
            .map_err(|e| format!("SFTP 握手失败: {}", e))?;

        if let Some(key_path) = private_key_path {
            let pp = passphrase.unwrap_or("");
            session
                .userauth_pubkey_file(
                    username,
                    None,
                    std::path::Path::new(key_path),
                    Some(pp),
                )
                .map_err(|e| format!("SFTP 密钥认证失败: {}", e))?;
        } else if let Some(pwd) = password {
            session
                .userauth_password(username, pwd)
                .map_err(|e| format!("SFTP 密码认证失败: {}", e))?;
        } else {
            return Err("未提供认证方式".to_string());
        }

        if !session.authenticated() {
            return Err("SFTP 认证失败".to_string());
        }

        self.sessions
            .lock()
            .unwrap()
            .insert(session_id, Arc::new(Mutex::new(session)));
        Ok(())
    }

    pub fn list_dir(&self, session_id: &str, path: &str) -> Result<Vec<SftpEntry>, String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(session_id).ok_or("SFTP 会话不存在")?;
        let session = session.lock().unwrap();

        let sftp = session
            .sftp()
            .map_err(|e| format!("打开 SFTP 子系统失败: {}", e))?;

        let entries = sftp
            .readdir(std::path::Path::new(path))
            .map_err(|e| format!("读取目录失败: {}", e))?;

        let mut result: Vec<SftpEntry> = entries
            .into_iter()
            .filter_map(|(path_buf, stat)| {
                let name = path_buf.file_name()?.to_string_lossy().to_string();
                let is_dir = stat.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
                let size = stat.size.unwrap_or(0);
                let permissions = stat.perm.map(|p| format!("{:o}", p));
                let modified = stat.mtime.map(|t| {
                    chrono::DateTime::from_timestamp(t as i64, 0)
                        .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                        .unwrap_or_default()
                });

                Some(SftpEntry {
                    name,
                    path: path_buf.to_string_lossy().to_string(),
                    is_dir,
                    size,
                    permissions,
                    modified,
                })
            })
            .collect();

        // 目录在前，文件在后；各自按名称排序
        result.sort_by(|a, b| {
            if a.is_dir == b.is_dir {
                a.name
                    .to_lowercase()
                    .cmp(&b.name.to_lowercase())
            } else if a.is_dir {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            }
        });

        Ok(result)
    }

    pub fn download_file(
        &self,
        session_id: &str,
        remote_path: &str,
        local_path: &str,
    ) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(session_id).ok_or("SFTP 会话不存在")?;
        let session = session.lock().unwrap();

        let sftp = session
            .sftp()
            .map_err(|e| format!("打开 SFTP 子系统失败: {}", e))?;

        let mut remote_file = sftp
            .open(std::path::Path::new(remote_path), ssh2::READ, 0)
            .map_err(|e| format!("打开远程文件失败: {}", e))?;

        let mut contents = Vec::new();
        remote_file
            .read_to_end(&mut contents)
            .map_err(|e| format!("读取远程文件失败: {}", e))?;

        std::fs::write(local_path, contents)
            .map_err(|e| format!("写入本地文件失败: {}", e))?;

        Ok(())
    }

    pub fn upload_file(
        &self,
        session_id: &str,
        local_path: &str,
        remote_path: &str,
    ) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(session_id).ok_or("SFTP 会话不存在")?;
        let session = session.lock().unwrap();

        let sftp = session
            .sftp()
            .map_err(|e| format!("打开 SFTP 子系统失败: {}", e))?;

        let mut remote_file = sftp
            .create(std::path::Path::new(remote_path))
            .map_err(|e| format!("创建远程文件失败: {}", e))?;

        let contents =
            std::fs::read(local_path).map_err(|e| format!("读取本地文件失败: {}", e))?;

        remote_file
            .write_all(&contents)
            .map_err(|e| format!("上传文件失败: {}", e))?;

        Ok(())
    }

    pub fn delete_file(&self, session_id: &str, path: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(session_id).ok_or("SFTP 会话不存在")?;
        let session = session.lock().unwrap();

        let sftp = session
            .sftp()
            .map_err(|e| format!("打开 SFTP 子系统失败: {}", e))?;

        sftp.unlink(std::path::Path::new(path))
            .map_err(|e| format!("删除文件失败: {}", e))
    }

    pub fn mkdir(&self, session_id: &str, path: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(session_id).ok_or("SFTP 会话不存在")?;
        let session = session.lock().unwrap();

        let sftp = session
            .sftp()
            .map_err(|e| format!("打开 SFTP 子系统失败: {}", e))?;

        sftp.mkdir(std::path::Path::new(path), 0o755)
            .map_err(|e| format!("创建目录失败: {}", e))
    }

    pub fn rename(&self, session_id: &str, src: &str, dst: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions.get(session_id).ok_or("SFTP 会话不存在")?;
        let session = session.lock().unwrap();

        let sftp = session
            .sftp()
            .map_err(|e| format!("打开 SFTP 子系统失败: {}", e))?;

        sftp.rename(
            std::path::Path::new(src),
            std::path::Path::new(dst),
            None,
        )
        .map_err(|e| format!("重命名失败: {}", e))
    }

    pub fn disconnect(&self, session_id: &str) {
        self.sessions.lock().unwrap().remove(session_id);
    }
}
