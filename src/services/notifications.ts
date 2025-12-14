export interface InAppNotification {
  id: string;
  type: 'buy' | 'sell-profit' | 'sell-loss';
  title: string;
  message: string;
  timestamp: number;
}

type NotificationCallback = (notification: InAppNotification) => void;

let notificationCallback: NotificationCallback | null = null;

export const setNotificationCallback = (callback: NotificationCallback) => {
  notificationCallback = callback;
};

const sendInAppNotification = (notification: InAppNotification) => {
  if (notificationCallback) {
    notificationCallback(notification);
  }
};

export const sendBuyNotification = (price: number, takeProfitProb: number) => {
  const title = '🔵 매수 체결';
  const message = `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}에 매수 체결\n익절 확률: ${(takeProfitProb * 100).toFixed(1)}%`;

  sendInAppNotification({
    id: `buy-${Date.now()}`,
    type: 'buy',
    title,
    message,
    timestamp: Date.now(),
  });
};

export const sendSellNotification = (type: 'profit' | 'loss', price: number, profit: number) => {
  const isProfit = type === 'profit';
  const title = isProfit ? '🟢 익절 체결' : '🔴 손절 체결';
  const message = `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}에 매도 체결\n수익률: ${profit >= 0 ? '+' : ''}${profit.toFixed(2)}%`;

  sendInAppNotification({
    id: `sell-${Date.now()}`,
    type: isProfit ? 'sell-profit' : 'sell-loss',
    title,
    message,
    timestamp: Date.now(),
  });
};
