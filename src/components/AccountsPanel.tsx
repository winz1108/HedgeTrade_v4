import { Wallet } from 'lucide-react';

interface AccountBalance {
  accountId: 'Account_A' | 'Account_B';
  btcBalance: number;
  btcFree: number;
  btcLocked: number;
  usdcBalance: number;
  usdcFree: number;
  usdcLocked: number;
  btcValue: number;
  totalAsset: number;
}

interface AccountsPanelProps {
  accounts: AccountBalance[];
  totalAsset: number;
}

export const AccountsPanel = ({ accounts, totalAsset }: AccountsPanelProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatBTC = (value: number) => {
    return value.toFixed(8);
  };

  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 hover:shadow-blue-500/10 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-white">Account Balances</h3>
        <div className="p-1 bg-blue-500/20 rounded-lg">
          <Wallet className="w-3 h-3 text-blue-400" />
        </div>
      </div>

      <div className="space-y-2">
        {accounts.map((account) => (
          <div
            key={account.accountId}
            className="bg-slate-700/30 rounded-lg p-2 border border-slate-600/50"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-400 font-semibold">
                {account.accountId}
              </span>
              <span className="text-xs font-bold text-white">
                {formatCurrency(account.totalAsset)}
              </span>
            </div>

            <div className="space-y-1 text-[9px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">BTC</span>
                <div className="flex flex-col items-end">
                  <span className="text-amber-400 font-semibold">
                    {formatBTC(account.btcBalance)}
                  </span>
                  {account.btcLocked > 0 && (
                    <span className="text-slate-500">
                      Locked: {formatBTC(account.btcLocked)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">USDC</span>
                <div className="flex flex-col items-end">
                  <span className="text-emerald-400 font-semibold">
                    {formatCurrency(account.usdcBalance)}
                  </span>
                  {account.usdcLocked > 0 && (
                    <span className="text-slate-500">
                      Locked: {formatCurrency(account.usdcLocked)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-600/50">
                <span className="text-slate-500">Value</span>
                <span className="text-white font-semibold">
                  {formatCurrency(account.btcValue)}
                </span>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-2 rounded-lg border-2 border-blue-500/50 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-blue-300 font-bold tracking-wide">
              TOTAL ASSET
            </span>
            <span className="text-lg font-black text-white">
              {formatCurrency(totalAsset)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
