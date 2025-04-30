declare module 'ethers' {
  export interface ExternalProvider {
    request?: (request: { method: string; params?: Array<any> }) => Promise<any>;
    send?: (request: { method: string; params?: Array<any> }, callback: (error: any, response: any) => void) => void;
    sendAsync?: (request: { method: string; params?: Array<any> }, callback: (error: any, response: any) => void) => void;
  }

  export interface Window {
    ethereum?: ExternalProvider;
  }
} 