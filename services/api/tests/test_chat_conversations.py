import pytest
from httpx import AsyncClient
from app.db.models import Profile, UserRoleEnum


@pytest.mark.asyncio
async def test_conversation_crud_flow(client: AsyncClient, make_token, db_session):
    user_id = "test-user-conv-1"
    token = make_token(user_id=user_id, email="mariner@orca.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    profile = Profile(
        id=user_id,
        display_name="Navigator",
        role=UserRoleEnum.TOURIST,
    )
    db_session.add(profile)
    await db_session.commit()

    # 1. Create a conversation
    create_res = await client.post(
        "/api/chat/conversations",
        headers=headers,
        json={"title": "Goa Beach Advisory Planning"},
    )
    assert create_res.status_code == 200
    conv_data = create_res.json()
    conv_id = conv_data["id"]
    assert conv_data["title"] == "Goa Beach Advisory Planning"
    assert conv_data["message_count"] == 0

    # 2. List conversations
    list_res = await client.get("/api/chat/conversations", headers=headers)
    assert list_res.status_code == 200
    conversations = list_res.json()
    assert any(c["id"] == conv_id for c in conversations)

    # 3. Rename conversation title
    update_res = await client.patch(
        f"/api/chat/conversations/{conv_id}",
        headers=headers,
        json={"title": "Updated Goa Beach Trip"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated Goa Beach Trip"

    # 4. Post chat message with this conversation_id
    chat_payload = {
        "query": "Is swimming safe at Calangute Beach today?",
        "conversation_id": conv_id,
        "region_name": "Goa Sector",
        "latitude": 15.54,
        "longitude": 73.75,
        "selected_model": "deterministic",
    }
    chat_res = await client.post("/api/chat", headers=headers, json=chat_payload)
    assert chat_res.status_code == 200
    assert chat_res.json()["conversation_id"] == conv_id

    # 5. Retrieve conversation messages
    detail_res = await client.get(f"/api/chat/conversations/{conv_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["messages"]) >= 2
    assert detail["messages"][0]["role"] == "user"
    assert "Calangute" in detail["messages"][0]["content"]
    assert detail["messages"][1]["role"] == "assistant"

    # 6. Delete conversation
    del_res = await client.delete(f"/api/chat/conversations/{conv_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify conversation is gone
    get_res = await client.get(f"/api/chat/conversations/{conv_id}", headers=headers)
    assert get_res.status_code == 404
