import React, { useState, useEffect, useCallback } from 'react';
import { 
  Code2, FileText, Scale, Briefcase, Users, TestTube, 
  Bird, Glasses, Brain, BarChart4, Bot, Send, Terminal,
  Copy, Check, ChevronDown, X, Loader2, Maximize2, Minimize2,
  Wallet, AlertCircle
} from 'lucide-react';
import { APIService } from './services/api';
import { SocketService } from './services/socket';

type Message = {
  type: string;
  content: string;
  agent?: string;
  codeSnippet?: string;
  status?: 'pending' | 'complete';
};

type Agent = {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  prompt?: string;
  wallet?: string;
};

type Billionaire = {
  icon: React.ReactNode;
  color: string;
  name: string;
  prompt: string;
  id: string;
};

function App() {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeAgent, setActiveAgent] = useState<string>('system');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<number, boolean>>({});
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiService = APIService.getInstance();
  const socketService = SocketService.getInstance();

  const handleError = useCallback((error: Error) => {
    setError(error.message);
    setIsTyping(false);
    setTimeout(() => setError(null), 5000);
  }, []);

  const agents: Record<string, Agent> = {
    productManager: {
      id: 'productManager',
      name: 'Product Manager',
      icon: <Briefcase className="w-5 h-5" />,
      color: 'text-blue-400',
      description: 'Define product requirements and manage development',
      prompt: 'What would you like to build?'
    },
    architect: {
      id: 'architect',
      name: 'Software Architect',
      icon: <Code2 className="w-5 h-5" />,
      color: 'text-green-400',
      description: 'Design system architecture and specifications',
      prompt: 'Describe your system architecture needs:'
    },
    projectManager: {
      id: 'projectManager',
      name: 'Project Manager',
      icon: <Users className="w-5 h-5" />,
      color: 'text-orange-400',
      description: 'Manage project timeline and resources',
      prompt: 'What project needs organizing?'
    },
    engineer: {
      id: 'engineer',
      name: 'Software Engineer',
      icon: <TestTube className="w-5 h-5" />,
      color: 'text-purple-400',
      description: 'Implement and test solutions',
      prompt: 'What needs to be built?'
    }
  };

  const billionaires: Record<string, Billionaire> = {
    elon: { 
      id: 'elon',
      icon: <Bird className="w-5 h-5" />, 
      color: 'text-sky-400', 
      name: 'ElonGPT',
      prompt: '10x moonshot potential:'
    },
    naval: { 
      id: 'naval',
      icon: <Brain className="w-5 h-5" />, 
      color: 'text-indigo-400', 
      name: 'NavalGPT',
      prompt: 'Leverage analysis for:'
    },
    chamath: { 
      id: 'chamath',
      icon: <BarChart4 className="w-5 h-5" />, 
      color: 'text-pink-400', 
      name: 'ChamathGPT',
      prompt: 'Market disruption potential:'
    },
    zuck: { 
      id: 'zuck',
      icon: <Glasses className="w-5 h-5" />, 
      color: 'text-violet-400', 
      name: 'ZuckGPT',
      prompt: 'Social/viral aspects of:'
    },
    vitalik: { 
      id: 'vitalik',
      icon: <Bot className="w-5 h-5" />, 
      color: 'text-emerald-400', 
      name: 'VitalikGPT',
      prompt: 'Web3 architecture for:'
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (isWalletConnected) {
          const roles = await apiService.getAvailableRoles();
          roles.forEach(role => {
            if (agents[role.name.toLowerCase()]) {
              agents[role.name.toLowerCase()].wallet = role.wallet;
            }
          });
        }
      } catch (error) {
        handleError(error as Error);
      }
    };

    initializeApp();
  }, [isWalletConnected]);

  useEffect(() => {
    if (isWalletConnected) {
      socketService.connect(apiService.getToken());
      return () => {
        socketService.disconnect();
      };
    }
  }, [isWalletConnected]);

  const connectWallet = async () => {
    try {
      const address = await apiService.connectWallet();
      setWalletAddress(address);
      setIsWalletConnected(true);
      setMessages(prev => [...prev, {
        type: 'system',
        content: `Wallet connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`
      }]);
    } catch (error) {
      handleError(error as Error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !isWalletConnected) return;

    const currentAgent = agents[activeAgent] || billionaires[activeAgent];
    
    setMessages(prev => [...prev, { 
      type: 'user', 
      content: userInput,
      status: 'complete'
    }]);

    setUserInput('');
    setIsTyping(true);

    try {
      socketService.joinAgentRoom(activeAgent);
      const response = await apiService.interactWithAgent(activeAgent, userInput);
      
      setMessages(prev => [...prev, {
        type: activeAgent,
        content: response.response,
        codeSnippet: response.action === 'DesignArchitecture' ? response.response : undefined,
        status: 'complete'
      }]);
    } catch (error) {
      handleError(error as Error);
    } finally {
      setIsTyping(false);
    }
  };

  const simulateTyping = async () => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    setIsTyping(false);
  };

  const handleCopyCode = (index: number) => {
    const message = messages[index];
    if (message.codeSnippet) {
      navigator.clipboard.writeText(message.codeSnippet);
      setCopiedStates({ ...copiedStates, [index]: true });
      setTimeout(() => {
        setCopiedStates({ ...copiedStates, [index]: false });
      }, 2000);
    }
  };

  const renderMessage = (message: Message, index: number) => {
    if (!message || typeof message.type === 'undefined') {
      return null;
    }

    if (message.type === 'system') {
      return (
        <div key={index} className="text-[#93a1a1] text-center text-xs py-2">
          {message.content}
        </div>
      );
    }
    
    if (message.type === 'user') {
      return (
        <div key={index} className="flex justify-end mb-4">
          <div className="bg-[#073642] text-[#93a1a1] rounded-lg p-3 max-w-[80%]">
            {message.content}
          </div>
        </div>
      );
    }

    const agent = agents[message.type] || billionaires[message.type];
    if (!agent) {
      return (
        <div key={index} className="text-[#93a1a1] text-center text-xs py-2">
          Message from unknown agent type
        </div>
      );
    }

    return (
      <div key={index} className="flex items-start gap-3 animate-fadeIn">
        <div className={`mt-1 ${agent.color}`}>{agent.icon}</div>
        <div className="bg-[#073642]/50 text-[#93a1a1] rounded-lg p-3 flex-1">
          <div className={`font-bold mb-1 ${agent.color}`}>
            {agent.name}
          </div>
          <div className="mb-2">{message.content}</div>
          {message.codeSnippet && (
            <div className="relative mt-2 bg-black rounded-md p-4">
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => handleCopyCode(index)}
                  className="p-1 hover:bg-[#073642] rounded"
                >
                  {copiedStates[index] ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#93a1a1]" />
                  )}
                </button>
              </div>
              <pre className="text-[#93a1a1] overflow-x-auto">
                <code>{message.codeSnippet}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 z-50">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      <div className="absolute top-4 right-4">
        <button
          onClick={connectWallet}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isWalletConnected ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Wallet className="w-5 h-5" />
          {isWalletConnected 
            ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
            : 'Connect Wallet'}
        </button>
      </div>

      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="flex gap-4 w-full max-w-[90rem]">
          <div className="bg-black border-2 border-[#93a1a1] rounded font-mono text-sm shadow-[0_0_15px_rgba(147,161,161,0.3)] flex-1">
            <div className="border-b-2 border-[#93a1a1] bg-[#073642] p-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-[#93a1a1] ml-2">FRAMEW0RK-OS.EXE</span>
              <Terminal className="w-4 h-4 text-[#93a1a1] ml-2" />
              <span className="text-[#586e75] ml-auto text-xs">6 agents | 5 advisors online</span>
            </div>
            
            <div className="flex h-[600px]">
              <div className="w-48 border-r-2 border-[#93a1a1] p-2 flex flex-col overflow-y-auto">
                <div className="space-y-1 mb-2">
                  <h2 className="text-[#93a1a1] font-bold px-2 py-1">Agents</h2>
                  {Object.values(agents).map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => setActiveAgent(agent.id)}
                      className={`flex items-center gap-2 w-full p-1.5 rounded text-left hover:bg-[#073642]/50 ${
                        activeAgent === agent.id ? 'bg-[#073642]' : ''
                      }`}
                    >
                      <span className={agent.color}>{agent.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-[#93a1a1] text-xs leading-tight">{agent.name}</span>
                        <span className="text-[#586e75] text-xs leading-tight">{agent.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-[#93a1a1] font-bold px-2 py-1">Advisors</h2>
                  {Object.entries(billionaires).map(([id, advisor]) => (
                    <button
                      key={id}
                      onClick={() => setActiveAgent(id)}
                      className={`flex items-center gap-2 w-full p-1.5 rounded text-left hover:bg-[#073642]/50 ${
                        activeAgent === id ? 'bg-[#073642]' : ''
                      }`}
                    >
                      <span className={advisor.color}>{advisor.icon}</span>
                      <span className="text-[#93a1a1] text-xs leading-tight">{advisor.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                  {messages.map((message, index) => renderMessage(message, index))}
                  {isTyping && (
                    <div className="flex items-center gap-2 text-[#93a1a1] text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Agent is typing...
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="border-t-2 border-[#93a1a1] p-4 bg-[#073642]/30">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={
                          (agents[activeAgent] || billionaires[activeAgent])?.prompt ||
                          "Describe your project idea..."
                        }
                        className="w-full bg-[#073642] text-[#93a1a1] rounded px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#93a1a1]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-[#073642] text-[#93a1a1] p-2 rounded hover:bg-[#073642]/70 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className={`bg-black border-2 border-[#93a1a1] rounded font-mono text-sm shadow-[0_0_15px_rgba(147,161,161,0.3)] ${isPreviewExpanded ? 'w-full' : 'w-[600px]'}`}>
            <div className="border-b-2 border-[#93a1a1] bg-[#073642] p-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-[#93a1a1] ml-2">OVERVIEW.EXE</span>
              <button
                onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                className="ml-auto text-[#93a1a1] hover:text-[#eee8d5] transition-colors"
              >
                {isPreviewExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
            <div className="h-[600px] bg-[#002b36] p-4 overflow-auto">
              <div className="bg-[#073642] rounded-lg p-4 h-full flex items-center justify-center text-[#93a1a1]">
                Project preview will appear here
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;