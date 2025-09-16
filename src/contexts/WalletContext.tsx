import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import type { WalletContextType, WalletAccount, Network } from '../types/wallet';
import { SUPPORTED_NETWORKS } from '../types/wallet';

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // 检查是否已连接钱包
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            const balance = await provider.getBalance(address);
            const networkInfo = await provider.getNetwork();
            
            setAccount({
              address,
              balance: ethers.formatEther(balance),
            });
            
            const currentNetwork = SUPPORTED_NETWORKS[Number(networkInfo.chainId)];
            if (currentNetwork) {
              setNetwork(currentNetwork);
            }
            
            setIsConnected(true);
          }
        } catch (error) {
          console.error('检查钱包连接失败:', error);
        }
      }
    };

    checkConnection();
  }, []);

  // 监听账户变化
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          refreshBalance();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const connectWallet = async (walletType: 'metamask' | 'coinbase') => {
    if (!window.ethereum) {
      throw new Error('请安装MetaMask或Coinbase钱包');
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const balance = await provider.getBalance(address);
        const networkInfo = await provider.getNetwork();
        
        setAccount({
          address,
          balance: ethers.formatEther(balance),
        });
        
        const currentNetwork = SUPPORTED_NETWORKS[Number(networkInfo.chainId)];
        if (currentNetwork) {
          setNetwork(currentNetwork);
        } else {
          // 如果当前网络不在支持列表中，切换到主网
          await switchNetwork(1);
        }
        
        setIsConnected(true);
      }
    } catch (error) {
      console.error('连接钱包失败:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setNetwork(null);
    setIsConnected(false);
  };

  const switchNetwork = async (chainId: number) => {
    if (!window.ethereum) {
      throw new Error('请安装MetaMask或Coinbase钱包');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      
      const network = SUPPORTED_NETWORKS[chainId];
      if (network) {
        setNetwork(network);
      }
    } catch (error: any) {
      // 如果网络不存在，尝试添加网络
      if (error.code === 4902) {
        const network = SUPPORTED_NETWORKS[chainId];
        if (network) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${chainId.toString(16)}`,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: [network.blockExplorerUrl],
                nativeCurrency: network.nativeCurrency,
              }],
            });
            setNetwork(network);
          } catch (addError) {
            console.error('添加网络失败:', addError);
            throw addError;
          }
        }
      } else {
        console.error('切换网络失败:', error);
        throw error;
      }
    }
  };

  const refreshBalance = async () => {
    if (!account || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(account.address);
      setAccount(prev => prev ? {
        ...prev,
        balance: ethers.formatEther(balance),
      } : null);
    } catch (error) {
      console.error('刷新余额失败:', error);
    }
  };

  const value: WalletContextType = {
    account,
    network,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    refreshBalance,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet必须在WalletProvider内部使用');
  }
  return context;
};

// 扩展Window接口以支持ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
