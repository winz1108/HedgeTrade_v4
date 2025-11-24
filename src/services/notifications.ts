export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const sendBuyNotification = (price: number, takeProfitProb: number) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification('🟢 BTC Buy Signal', {
      body: `Buy at $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nTake Profit Probability: ${(takeProfitProb * 100).toFixed(1)}%`,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: 'buy-signal',
      requireInteraction: true,
      vibrate: [200, 100, 200],
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

export const sendSellNotification = (type: 'profit' | 'loss', price: number, profit: number) => {
  if (Notification.permission === 'granted') {
    const isProfit = type === 'profit';
    const notification = new Notification(
      isProfit ? '🎯 Take Profit Hit!' : '🛑 Stop Loss Hit',
      {
        body: `Sold at $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nProfit: ${profit >= 0 ? '+' : ''}${profit.toFixed(2)}%`,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: 'sell-signal',
        requireInteraction: true,
        vibrate: isProfit ? [200, 100, 200, 100, 200] : [300, 100, 300],
      }
    );

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};
