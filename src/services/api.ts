import { ethers } from 'ethers';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface AgentResponse {
  role: string;
  response: string;
  wallet: string;
  action: string;
}

export interface RoleInfo {
  name: string;
  profile: string;
  goal: string;
  wallet: string;
}

export class APIService {
  private static instance: APIService;
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private token: string | null = null;

  private constructor() {}

  static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  async connectWallet(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      await this.provider.send('eth_requestAccounts', []);
      this.signer = this.provider.getSigner();
      const address = await this.signer.getAddress();
      
      // Get authentication token from backend
      const signature = await this.signer.signMessage('Login to Framework OS');
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature })
      });
      
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      
      const { token } = await response.json();
      this.token = token;
      
      return address;
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  }

  async getAvailableRoles(): Promise<RoleInfo[]> {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      headers: this.getHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }
    return response.json();
  }

  async interactWithAgent(role: string, message: string): Promise<AgentResponse> {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }

    const walletAddress = await this.signer.getAddress();
    const response = await fetch(`${API_BASE_URL}/agents/interact`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        role,
        message,
        wallet: walletAddress
      })
    });

    if (!response.ok) {
      throw new Error('Failed to interact with agent');
    }

    return response.json();
  }

  async getRoleMemory(roleName: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleName}/memory`, {
      headers: this.getHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch role memory');
    }
    return response.json();
  }

  getToken(): string | null {
    return this.token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }
}