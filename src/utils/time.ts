/**
 * Time utility functions for converting Binance server time (UTC) to local time
 */

/**
 * Converts UTC timestamp to local Date object
 * @param utcTimestamp - Timestamp in milliseconds (UTC)
 * @returns Date object in local timezone
 */
export const convertToLocalTime = (utcTimestamp: number): Date => {
  return new Date(utcTimestamp);
};

/**
 * Formats timestamp as local time string
 * @param timestamp - Timestamp in milliseconds
 * @returns Formatted time string (e.g., "오후 06:30:45")
 */
export const formatLocalTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? '오후' : '오전';
  const displayHours = String(hours % 12 || 12).padStart(2, '0');

  return `${ampm} ${displayHours}:${minutes}:${seconds}`;
};

/**
 * Formats timestamp as local date and time string
 * @param timestamp - Timestamp in milliseconds
 * @returns Formatted date-time string (e.g., "Dec 4, 06:30 PM")
 */
export const formatLocalDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formats timestamp for chart tooltip
 * @param timestamp - Timestamp in milliseconds
 * @returns Formatted string with full date-time (e.g., "2024-12-04 18:30:45")
 */
export const formatChartTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Gets time difference description between two timestamps
 * @param fromTime - Start timestamp
 * @param toTime - End timestamp
 * @returns Human-readable time difference (e.g., "5분 전", "2시간 전")
 */
export const getTimeDifference = (fromTime: number, toTime: number): string => {
  const diffMs = toTime - fromTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${diffDays}일 전`;
};
