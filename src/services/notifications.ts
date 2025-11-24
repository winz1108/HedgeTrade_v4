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

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return true;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return true;
    }
  }

  return true;
};

const sendInAppNotification = (notification: InAppNotification) => {
  if (notificationCallback) {
    notificationCallback(notification);
  }
};

const tryNativeNotification = (title: string, body: string, tag: string, vibrate: number[]) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag,
        requireInteraction: false,
        vibrate,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.log('Native notification not supported, using in-app only');
    }
  }
};

export const sendBuyNotification = (price: number, takeProfitProb: number) => {
  const title = '🟢 BTC Buy Signal';
  const message = `Buy at $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nTake Profit Probability: ${(takeProfitProb * 100).toFixed(1)}%`;

  sendInAppNotification({
    id: `buy-${Date.now()}`,
    type: 'buy',
    title,
    message,
    timestamp: Date.now(),
  });

  tryNativeNotification(title, message, 'buy-signal', [200, 100, 200]);
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

  tryNativeNotification(
    title,
    message,
    'sell-signal',
    isProfit ? [200, 100, 200, 100, 200] : [300, 100, 300]
  );
};
