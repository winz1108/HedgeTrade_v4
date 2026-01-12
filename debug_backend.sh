#!/bin/bash

echo "=== CSV 파일 확인 ==="
ls -lh ~/HedgeTrade-v5/data/raw/binance_btcusdc_*.csv

echo ""
echo "=== CSV 파일 데이터 개수 ==="
wc -l ~/HedgeTrade-v5/data/raw/binance_btcusdc_1min.csv
wc -l ~/HedgeTrade-v5/data/raw/binance_btcusdc_5min.csv
wc -l ~/HedgeTrade-v5/data/raw/binance_btcusdc_15min.csv
wc -l ~/HedgeTrade-v5/data/raw/binance_btcusdc_1h.csv

echo ""
echo "=== 1분봉 CSV 파일 최신 5개 데이터 ==="
tail -5 ~/HedgeTrade-v5/data/raw/binance_btcusdc_1min.csv

echo ""
echo "=== 서버 로그 (최근 100줄, get_price_history 관련) ==="
sudo journalctl -u hedgetrade-api --no-pager -n 100 | grep -E "(get_price_history|CSV|priceHistory|데이터 계산|캐시 갱신)"

echo ""
echo "=== 서버 로그 (최근 100줄, 에러만) ==="
sudo journalctl -u hedgetrade-api --no-pager -n 100 | grep -i error

echo ""
echo "=== API 직접 호출 테스트 ==="
curl -s "http://localhost:54321/api/dashboard" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('cacheStatus:', data.get('cacheStatus'))
print('priceHistory 1m 개수:', len(data.get('priceHistory', {}).get('1m', [])))
print('priceHistory 5m 개수:', len(data.get('priceHistory', {}).get('5m', [])))
print('priceHistory 15m 개수:', len(data.get('priceHistory', {}).get('15m', [])))
print('priceHistory 1h 개수:', len(data.get('priceHistory', {}).get('1h', [])))
"
