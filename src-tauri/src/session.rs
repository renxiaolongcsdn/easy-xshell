use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: AuthType,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub private_key_path: Option<String>,
    #[serde(default)]
    pub passphrase: Option<String>,
    #[serde(default)]
    pub group: Option<String>,
    #[serde(default)]
    pub last_connected: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AuthType {
    Password,
    Key,
}

impl Session {
    pub fn new(
        name: String,
        host: String,
        port: u16,
        username: String,
        auth_type: AuthType,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            host,
            port,
            username,
            auth_type,
            password: None,
            private_key_path: None,
            passphrase: None,
            group: None,
            last_connected: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct SessionsFile {
    pub sessions: Vec<Session>,
}

impl SessionsFile {
    pub fn path() -> std::path::PathBuf {
        let config_dir = dirs::config_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        let app_dir = config_dir.join("easy-xshell");
        let _ = std::fs::create_dir_all(&app_dir);
        app_dir.join("sessions.json")
    }

    pub fn load() -> Self {
        let path = Self::path();
        if path.exists() {
            let data = std::fs::read_to_string(&path).unwrap_or_default();
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            Self::default()
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let path = Self::path();
        let data = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(&path, data).map_err(|e| e.to_string())
    }
}
