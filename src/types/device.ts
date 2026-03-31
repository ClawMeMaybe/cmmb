// Paired Device types
export interface PairedDevice {
  deviceId: string;
  publicKey: string;
  platform?: string;
  clientId?: string;
  clientMode?: string;
  role: string;
  roles?: string[];
  scopes: string[];
  approvedScopes?: string[];
  tokens?: Record<
    string,
    {
      token: string;
      role: string;
      scopes: string[];
      createdAtMs: number;
    }
  >;
  createdAtMs: number;
  approvedAtMs?: number;
  lastSeen?: number;
}

export interface PairedDevices {
  [deviceId: string]: PairedDevice;
}
