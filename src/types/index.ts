export interface Session {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  password?: string;
  private_key_path?: string;
  passphrase?: string;
  group?: string;
  last_connected?: string;
}

export interface Tab {
  id: string;
  session: Session;
  isActive: boolean;
}

export interface SftpEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  permissions?: string;
  modified?: string;
}
