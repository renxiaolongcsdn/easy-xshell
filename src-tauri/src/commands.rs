use crate::session::{Session, SessionsFile};
use crate::sftp::{SftpEntry, SftpManager};
use crate::ssh::ConnectionManager;
use std::sync::Arc;
use tauri::ipc::Channel;

pub struct AppState {
    pub connection_manager: Arc<ConnectionManager>,
    pub sftp_manager: Arc<SftpManager>,
}

// ==================== 会话管理 ====================

#[tauri::command]
pub fn load_sessions() -> Result<Vec<Session>, String> {
    let file = SessionsFile::load();
    Ok(file.sessions)
}

#[tauri::command]
pub fn save_session(session: Session) -> Result<Session, String> {
    let mut file = SessionsFile::load();
    if let Some(existing) = file.sessions.iter_mut().find(|s| s.id == session.id) {
        *existing = session.clone();
    } else {
        file.sessions.push(session.clone());
    }
    file.save()?;
    Ok(session)
}

#[tauri::command]
pub fn delete_session(session_id: String) -> Result<(), String> {
    let mut file = SessionsFile::load();
    file.sessions.retain(|s| s.id != session_id);
    file.save()
}

#[tauri::command]
pub fn update_session(session_id: String, updates: serde_json::Value) -> Result<Session, String> {
    let mut file = SessionsFile::load();
    let session = file
        .sessions
        .iter_mut()
        .find(|s| s.id == session_id)
        .ok_or("会话不存在")?;

    if let Some(v) = updates.get("name").and_then(|v| v.as_str()) {
        session.name = v.to_string();
    }
    if let Some(v) = updates.get("host").and_then(|v| v.as_str()) {
        session.host = v.to_string();
    }
    if let Some(v) = updates.get("port").and_then(|v| v.as_u64()) {
        session.port = v as u16;
    }
    if let Some(v) = updates.get("username").and_then(|v| v.as_str()) {
        session.username = v.to_string();
    }
    if let Some(v) = updates.get("group").and_then(|v| v.as_str()) {
        session.group = Some(v.to_string());
    }

    let session = session.clone();
    file.save()?;
    Ok(session)
}

// ==================== SSH 连接 ====================

#[tauri::command]
pub fn connect_ssh(
    state: tauri::State<'_, AppState>,
    session: Session,
    on_data: Channel<String>,
) -> Result<String, String> {
    state.connection_manager.connect(
        session.id.clone(),
        &session.host,
        session.port,
        &session.username,
        session.password.as_deref(),
        session.private_key_path.as_deref(),
        session.passphrase.as_deref(),
        on_data,
    )?;

    // 更新最后连接时间
    let mut file = SessionsFile::load();
    if let Some(s) = file.sessions.iter_mut().find(|s| s.id == session.id) {
        s.last_connected = Some(chrono::Local::now().format("%Y-%m-%d %H:%M").to_string());
        let _ = file.save();
    }

    Ok(session.id)
}

#[tauri::command]
pub fn send_ssh_data(
    state: tauri::State<'_, AppState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    state
        .connection_manager
        .send_data(&session_id, data.as_bytes())
}

#[tauri::command]
pub fn disconnect_ssh(
    state: tauri::State<'_, AppState>,
    session_id: String,
) -> Result<(), String> {
    state.connection_manager.disconnect(&session_id);
    Ok(())
}

// ==================== SFTP ====================

#[tauri::command]
pub fn sftp_connect(
    state: tauri::State<'_, AppState>,
    session: Session,
) -> Result<(), String> {
    state.sftp_manager.connect(
        session.id.clone(),
        &session.host,
        session.port,
        &session.username,
        session.password.as_deref(),
        session.private_key_path.as_deref(),
        session.passphrase.as_deref(),
    )
}

#[tauri::command]
pub fn sftp_list_dir(
    state: tauri::State<'_, AppState>,
    session_id: String,
    path: String,
) -> Result<Vec<SftpEntry>, String> {
    state.sftp_manager.list_dir(&session_id, &path)
}

#[tauri::command]
pub fn sftp_download(
    state: tauri::State<'_, AppState>,
    session_id: String,
    remote_path: String,
    local_path: String,
) -> Result<(), String> {
    state
        .sftp_manager
        .download_file(&session_id, &remote_path, &local_path)
}

#[tauri::command]
pub fn sftp_upload(
    state: tauri::State<'_, AppState>,
    session_id: String,
    local_path: String,
    remote_path: String,
) -> Result<(), String> {
    state
        .sftp_manager
        .upload_file(&session_id, &local_path, &remote_path)
}

#[tauri::command]
pub fn sftp_delete(
    state: tauri::State<'_, AppState>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    state.sftp_manager.delete_file(&session_id, &path)
}

#[tauri::command]
pub fn sftp_mkdir(
    state: tauri::State<'_, AppState>,
    session_id: String,
    path: String,
) -> Result<(), String> {
    state.sftp_manager.mkdir(&session_id, &path)
}

#[tauri::command]
pub fn sftp_rename(
    state: tauri::State<'_, AppState>,
    session_id: String,
    src: String,
    dst: String,
) -> Result<(), String> {
    state.sftp_manager.rename(&session_id, &src, &dst)
}

#[tauri::command]
pub fn sftp_disconnect(state: tauri::State<'_, AppState>, session_id: String) {
    state.sftp_manager.disconnect(&session_id);
}

#[tauri::command]
pub fn get_home_dir() -> String {
    dirs::home_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("/tmp"))
        .to_string_lossy()
        .to_string()
}
