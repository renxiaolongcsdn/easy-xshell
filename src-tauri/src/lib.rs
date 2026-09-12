mod commands;
mod session;
mod sftp;
mod ssh;

use commands::AppState;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let connection_manager = Arc::new(ssh::ConnectionManager::new());
    let sftp_manager = Arc::new(sftp::SftpManager::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            connection_manager,
            sftp_manager,
        })
        .invoke_handler(tauri::generate_handler![
            // 会话管理
            commands::load_sessions,
            commands::save_session,
            commands::delete_session,
            commands::update_session,
            // SSH 连接
            commands::connect_ssh,
            commands::send_ssh_data,
            commands::disconnect_ssh,
            // SFTP
            commands::sftp_connect,
            commands::sftp_list_dir,
            commands::sftp_download,
            commands::sftp_upload,
            commands::sftp_delete,
            commands::sftp_mkdir,
            commands::sftp_rename,
            commands::sftp_disconnect,
            // 工具
            commands::get_home_dir,
        ])
        .run(tauri::generate_context!())
        .expect("启动 EasyXShell 失败");
}
