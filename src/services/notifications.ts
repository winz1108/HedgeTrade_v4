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

export const sendBuyNotification = (price: number) => {
  const title = '🟢 BTC Buy Signal';
  const message = `Buy at $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  const title = isProfit ? '🎯 Take Profit Hit!' : '🛑 Stop Loss Hit';
  const message = `Sold at $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nProfit: ${profit >= 0 ? '+' : ''}${profit.toFixed(2)}%`;

  sendInAppNotification({
    id: `sell-${Date.now()}`,
    type: isProfit ? 'sell-profit' : 'sell-loss',
    title,
    message,
    timestamp: Date.now(),
  });
};
