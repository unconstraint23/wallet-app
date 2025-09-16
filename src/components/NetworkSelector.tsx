import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { SUPPORTED_NETWORKS } from '../types/wallet';

const NetworkSelector: React.FC = () => {
  const { network, switchNetwork, isConnected } = useWallet();

  const handleNetworkChange = async (chainId: number) => {
    try {
      await switchNetwork(chainId);
    } catch (error) {
      console.error('切换网络失败:', error);
      // 这里可以添加错误提示
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      <label className="text-sm font-medium text-gray-700">
        网络:
      </label>
      <select
        value={network?.chainId || ''}
        onChange={(e) => handleNetworkChange(Number(e.target.value))}
        className="input-field text-sm py-1"
      >
        {Object.values(SUPPORTED_NETWORKS).map((net) => (
          <option key={net.chainId} value={net.chainId}>
            {net.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default NetworkSelector;
