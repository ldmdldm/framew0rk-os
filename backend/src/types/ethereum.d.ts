interface Window {
  ethereum?: {
    request: (request: { method: string; params?: Array<any> }) => Promise<any>;
    send: (request: { method: string; params?: Array<any> }, callback: (error: any, response: any) => void) => void;
    sendAsync: (request: { method: string; params?: Array<any> }, callback: (error: any, response: any) => void) => void;
    on: (event: string, callback: (params: any) => void) => void;
    removeListener: (event: string, callback: (params: any) => void) => void;
  };
} 