import sys, json

d = json.load(sys.stdin)

print('=== 모든 문제 분석 ===\n')

# 1. pricePredictions
pred_len = len(d.get('pricePredictions', []))
print(f'1. pricePredictions: {pred_len} candles', '❌ REQUIRED!' if pred_len == 0 else '✅')
if pred_len == 0:
    print('   → 차트에 예측 라인 안 그려짐')
print()

# 2. priceHistory 길이 체크
print('2. priceHistory 캔들 개수 (500개 필요):')
ph = d.get('priceHistory', {})
for tf in ['1m', '5m', '15m', '1h', '4h', '1d']:
    length = len(ph.get(tf, []))
    status = '✅' if length >= 500 else '❌'
    print(f'   {tf}: {length} candles {status}')
print()

# 3. 1m 캔들 기술 지표
ph_1m = ph.get('1m', [])
if len(ph_1m) > 0:
    print('3. 1m 캔들 첫 번째 캔들의 기술 지표:')
    c = ph_1m[0]
    indicators = ['ema20', 'ema50', 'bb_upper', 'bb_lower', 'macd', 'signal', 'histogram', 'rsi']
    for ind in indicators:
        val = c.get(ind)
        status = '✅' if val is not None else '❌'
        print(f'   {ind}: {val} {status}')
    print()

# 4. holding 필드
holding = d.get('holding', {})
is_holding = holding.get('isHolding', False)
print(f'4. holding.isHolding: {is_holding}')
if is_holding:
    fields = ['buyPrice', 'buyTime', 'currentProfit', 'takeProfitPrice', 'stopLossPrice', 'initialTakeProfitProb']
    for f in fields:
        val = holding.get(f)
        status = '❌' if val is None or val == 0 else '✅'
        print(f'   {f}: {val} {status}')
else:
    print('   (포지션 없음 - 체크 스킵)')
print()

# 5. trades
trades = d.get('trades', [])
print(f'5. trades: {len(trades)}개')
if len(trades) > 0:
    sell_trades = [t for t in trades if t.get('type') == 'sell']
    if len(sell_trades) > 0:
        first_sell = sell_trades[0]
        profit = first_sell.get('profit')
        status = '✅' if profit is not None else '❌ REQUIRED for sell trades!'
        print(f'   sell 거래 profit 필드: {profit} {status}')
print()

# 6. 필수 필드
print('6. 필수 필드 체크:')
required = {
    'version': d.get('version'),
    'currentPrediction': d.get('currentPrediction'),
    'lastPredictionUpdateTime': d.get('lastPredictionUpdateTime'),
    'metrics.portfolioReturnWithCommission': d.get('metrics', {}).get('portfolioReturnWithCommission')
}
for key, val in required.items():
    status = '✅' if val is not None else '❌ REQUIRED!'
    print(f'   {key}: {val} {status}')
