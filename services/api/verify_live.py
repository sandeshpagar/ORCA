import asyncio
import sys
from pathlib import Path

# Add services/api to sys.path
sys.path.insert(0, str(Path(__file__).parent))

import httpx
from app.main import app
from app.db.session import init_db
from app.auth.jwt import create_test_jwt


async def verify():
    # Ensure tables are initialized for standalone execution
    await init_db()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health check
        h_resp = await client.get("/health")
        assert h_resp.status_code == 200, f"Health check failed: {h_resp.text}"
        print(f"[OK] /health -> {h_resp.json()}")

        # 2. Data sources check
        ds_resp = await client.get("/api/data-sources")
        assert ds_resp.status_code == 200, f"Data sources check failed: {ds_resp.text}"
        sources = ds_resp.json()
        print(f"[OK] /api/data-sources -> {len(sources)} sources registered:")
        for s in sources:
            print(f"     - {s['name']} [{s['type'].upper()} | {s['reliability']}]")

        # 3. Phase 1 AI Chat endpoint with Live Open-Meteo Telemetry
        token = create_test_jwt("phase1-verify-user")
        chat_resp = await client.post(
            "/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "query": "Can small fishing boats sail off Gopalpur coast today?",
                "latitude": 19.31,
                "longitude": 84.91,
            },
        )
        assert chat_resp.status_code == 200, f"Chat check failed: {chat_resp.text}"
        data = chat_resp.json()
        print(f"[OK] /chat endpoint response:")
        print(f"     - User Role (from server profile): {data.get('user_role')}")
        print(f"     - Safety Verdict: {data.get('safety_verdict')}")
        print(f"     - Data Source: {data.get('data_source', {}).get('name')} (Reliability: {data.get('data_source', {}).get('reliability')})")
        print(f"     - Marine Metrics: {data.get('metrics')}")
        print(f"     - Advisory Preview: {data.get('reply', '')[:120]}...")

        # 4. Verify unauthenticated client / guest token (used by frontend in demo/guest mode)
        guest_resp = await client.post(
            "/chat",
            headers={"Authorization": "Bearer demo_client_guest_token"},
            json={
                "query": "Is Puri beach safe for swimming?",
                "latitude": 19.81,
                "longitude": 85.83,
            },
        )
        assert guest_resp.status_code == 200, f"Guest chat check failed: {guest_resp.text}"
        guest_data = guest_resp.json()
        print(f"[OK] Guest /chat with demo_client_guest_token -> Status 200 OK (Verdict: {guest_data.get('safety_verdict')})")

    print("\n[ALL PHASE 1 BACKEND VERIFICATIONS PASSED SUCCESSFULLY!]")


if __name__ == "__main__":
    asyncio.run(verify())
