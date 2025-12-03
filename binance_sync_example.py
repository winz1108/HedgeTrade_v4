"""
바이낸스 서버 시간 동기화 예시

이 코드는 백엔드 서버에서 사용할 수 있는 바이낸스 서버 시간 동기화 예시입니다.
"""

import time
import asyncio
from datetime import datetime
import requests
from typing import Optional

class BinanceTimeSync:
    """바이낸스 서버 시간 동기화 클래스"""

    BINANCE_TIME_API = "https://api.binance.com/api/v3/time"

    def __init__(self):
        self.time_offset: Optional[int] = None  # ms 단위
        self.last_sync_time: Optional[float] = None
        self.sync_interval = 3600  # 1시간마다 재동기화

    def get_server_time(self) -> int:
        """
        바이낸스 서버 시간 가져오기

        Returns:
            int: Unix timestamp in milliseconds
        """
        try:
            response = requests.get(self.BINANCE_TIME_API, timeout=5)
            response.raise_for_status()
            server_time = response.json()['serverTime']
            return server_time
        except Exception as e:
            print(f"❌ 바이낸스 서버 시간 가져오기 실패: {e}")
            # 실패 시 로컬 시간 사용
            return int(time.time() * 1000)

    def sync(self) -> None:
        """서버 시간 동기화"""
        try:
            local_time_before = int(time.time() * 1000)
            server_time = self.get_server_time()
            local_time_after = int(time.time() * 1000)

            # 네트워크 지연 보정 (왕복 시간의 절반)
            network_delay = (local_time_after - local_time_before) // 2
            adjusted_server_time = server_time + network_delay

            # 오프셋 계산
            self.time_offset = adjusted_server_time - local_time_after
            self.last_sync_time = time.time()

            # 로그 출력
            local_dt = datetime.fromtimestamp(local_time_after / 1000)
            server_dt = datetime.fromtimestamp(adjusted_server_time / 1000)

            print("=" * 70)
            print("⏰ 바이낸스 서버 시간 동기화 완료")
            print(f"   로컬 시간:  {local_dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]} (KST)")
            print(f"   서버 시간:  {server_dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]} (UTC)")
            print(f"   시간 차이:  {self.time_offset:+d} ms")
            print(f"   네트워크 지연: {network_delay} ms")
            print("=" * 70)

        except Exception as e:
            print(f"❌ 시간 동기화 실패: {e}")
            self.time_offset = 0

    def get_synced_time(self) -> int:
        """
        동기화된 현재 시간 반환

        Returns:
            int: Unix timestamp in milliseconds (Binance server time)
        """
        # 주기적 재동기화
        if (self.last_sync_time is None or
            time.time() - self.last_sync_time > self.sync_interval):
            self.sync()

        if self.time_offset is None:
            self.sync()

        local_time = int(time.time() * 1000)
        return local_time + self.time_offset

    def wait_until_next_minute_candle(self, buffer_seconds: int = 2) -> None:
        """
        다음 분봉 완료까지 대기 (buffer 포함)

        Args:
            buffer_seconds: 분봉 완료 후 추가 대기 시간 (초)
        """
        current_time = self.get_synced_time()
        current_dt = datetime.fromtimestamp(current_time / 1000)

        # 다음 분 정각 계산
        next_minute = (current_time // 60000 + 1) * 60000
        # 버퍼 시간 추가
        next_minute_with_buffer = next_minute + (buffer_seconds * 1000)

        wait_ms = next_minute_with_buffer - current_time
        wait_seconds = wait_ms / 1000

        next_dt = datetime.fromtimestamp(next_minute_with_buffer / 1000)

        print("⏳ 다음 분봉 대기 중...")
        print(f"   현재 시간 (서버): {current_dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}")
        print(f"   다음 업데이트:     {next_dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}")
        print(f"   대기 시간:         {wait_seconds:.1f}초")
        print()

        time.sleep(max(0, wait_seconds))

        # 업데이트 완료 로그
        actual_time = self.get_synced_time()
        actual_dt = datetime.fromtimestamp(actual_time / 1000)
        print(f"✅ 분봉 업데이트 완료! 현재 시간: {actual_dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}")
        print()

    async def async_wait_until_next_minute_candle(self, buffer_seconds: int = 2) -> None:
        """
        다음 분봉 완료까지 대기 (비동기 버전)

        Args:
            buffer_seconds: 분봉 완료 후 추가 대기 시간 (초)
        """
        current_time = self.get_synced_time()
        current_dt = datetime.fromtimestamp(current_time / 1000)

        # 다음 분 정각 계산
        next_minute = (current_time // 60000 + 1) * 60000
        # 버퍼 시간 추가
        next_minute_with_buffer = next_minute + (buffer_seconds * 1000)

        wait_ms = next_minute_with_buffer - current_time
        wait_seconds = wait_ms / 1000

        next_dt = datetime.fromtimestamp(next_minute_with_buffer / 1000)

        print("⏳ 다음 분봉 대기 중...")
        print(f"   현재 시간 (서버): {current_dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}")
        print(f"   다음 업데이트:     {next_dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}")
        print(f"   대기 시간:         {wait_seconds:.1f}초")
        print()

        await asyncio.sleep(max(0, wait_seconds))

        # 업데이트 완료 로그
        actual_time = self.get_synced_time()
        actual_dt = datetime.fromtimestamp(actual_time / 1000)
        print(f"✅ 분봉 업데이트 완료! 현재 시간: {actual_dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}")
        print()


# 사용 예시 1: 동기 방식
def sync_example():
    """동기 방식 예시"""
    print("\n" + "=" * 70)
    print("동기 방식 예시")
    print("=" * 70 + "\n")

    sync_manager = BinanceTimeSync()

    # 초기 동기화
    sync_manager.sync()

    # 메인 루프
    for i in range(3):
        print(f"\n📊 [{i+1}/3] 데이터 수집 사이클")

        # 다음 분봉까지 대기 (2초 버퍼)
        sync_manager.wait_until_next_minute_candle(buffer_seconds=2)

        # 현재 시간 확인
        current_time = sync_manager.get_synced_time()
        current_dt = datetime.fromtimestamp(current_time / 1000)

        print(f"🔄 데이터 다운로드 중... (시간: {current_dt.strftime('%H:%M:%S.%f')[:-3]})")
        # 여기서 바이낸스 API 호출
        # - GET /api/v3/klines (캔들 데이터)
        # - 기술 지표 계산
        # 등의 작업 수행

        print("✅ 데이터 처리 완료\n")


# 사용 예시 2: 비동기 방식
async def async_example():
    """비동기 방식 예시"""
    print("\n" + "=" * 70)
    print("비동기 방식 예시")
    print("=" * 70 + "\n")

    sync_manager = BinanceTimeSync()

    # 초기 동기화
    sync_manager.sync()

    # 메인 루프
    for i in range(3):
        print(f"\n📊 [{i+1}/3] 데이터 수집 사이클")

        # 다음 분봉까지 대기 (2초 버퍼)
        await sync_manager.async_wait_until_next_minute_candle(buffer_seconds=2)

        # 현재 시간 확인
        current_time = sync_manager.get_synced_time()
        current_dt = datetime.fromtimestamp(current_time / 1000)

        print(f"🔄 데이터 다운로드 중... (시간: {current_dt.strftime('%H:%M:%S.%f')[:-3]})")
        # 여기서 바이낸스 API 호출
        # - GET /api/v3/klines (캔들 데이터)
        # - 기술 지표 계산
        # 등의 작업 수행

        print("✅ 데이터 처리 완료\n")


# 사용 예시 3: FastAPI 통합
def fastapi_integration_example():
    """FastAPI에 통합하는 예시"""
    print("\n" + "=" * 70)
    print("FastAPI 통합 예시 코드")
    print("=" * 70 + "\n")

    example_code = '''
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 전역 시간 동기화 객체
time_sync = BinanceTimeSync()

@app.on_event("startup")
async def startup_event():
    """서버 시작 시 시간 동기화"""
    time_sync.sync()
    print("✅ 서버 시작 - 바이낸스 시간 동기화 완료")

@app.get("/api/dashboard")
async def get_dashboard():
    """실시간 대시보드 데이터 반환"""

    # 동기화된 현재 시간 사용
    current_time = time_sync.get_synced_time()

    # 데이터 수집 및 반환
    data = {
        "currentTime": current_time,
        "currentPrice": 95100.50,
        # ... 나머지 필드
    }

    return data

# 백그라운드 태스크: 주기적 데이터 업데이트
async def periodic_update():
    """주기적으로 데이터 업데이트"""
    while True:
        # 다음 분봉까지 대기
        await time_sync.async_wait_until_next_minute_candle(buffer_seconds=2)

        # 바이낸스 API에서 데이터 다운로드
        current_time = time_sync.get_synced_time()
        # download_and_process_data(current_time)

        print(f"✅ 데이터 업데이트 완료: {current_time}")

@app.on_event("startup")
async def start_background_tasks():
    """백그라운드 태스크 시작"""
    import asyncio
    asyncio.create_task(periodic_update())

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=54321)
'''

    print(example_code)


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("🚀 바이낸스 서버 시간 동기화 예시")
    print("=" * 70)

    # 1. 동기 방식 예시 실행
    sync_example()

    # 2. FastAPI 통합 예시 코드 출력
    fastapi_integration_example()

    # 3. 비동기 방식 예시 (주석 처리 - 원하면 실행)
    # asyncio.run(async_example())

    print("\n" + "=" * 70)
    print("✅ 모든 예시 완료")
    print("=" * 70 + "\n")
