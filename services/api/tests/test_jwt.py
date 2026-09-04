import pytest
import jwt
from app.auth.jwt import verify_supabase_jwt, create_test_jwt, JWTVerificationError
from app.config import settings


def test_verify_valid_jwt():
    user_id = "user-123-uuid"
    token = create_test_jwt(user_id=user_id, email="officer@isro.gov.in")
    payload = verify_supabase_jwt(token)
    assert payload["sub"] == user_id
    assert payload["email"] == "officer@isro.gov.in"
    assert payload["role"] == "authenticated"


def test_verify_expired_jwt():
    user_id = "user-expired-uuid"
    token = create_test_jwt(user_id=user_id, expires_in_seconds=-10)
    with pytest.raises(JWTVerificationError, match="Token has expired"):
        verify_supabase_jwt(token)


def test_verify_invalid_signature_jwt():
    user_id = "user-tampered-uuid"
    wrong_secret = "wrong-secret-key-that-does-not-match-at-all-1234"
    token = create_test_jwt(user_id=user_id, secret=wrong_secret)
    with pytest.raises(JWTVerificationError, match="Invalid token signature"):
        verify_supabase_jwt(token)


def test_verify_missing_sub_claim():
    token = jwt.encode(
        {"email": "no-sub@isro.gov.in", "aud": "authenticated"},
        settings.SUPABASE_JWT_SECRET,
        algorithm="HS256",
    )
    with pytest.raises(JWTVerificationError, match="missing 'sub' claim"):
        verify_supabase_jwt(token)


def test_verify_malformed_jwt():
    with pytest.raises(JWTVerificationError, match="Invalid token"):
        verify_supabase_jwt("not.a.valid.jwt.string")


def test_verify_demo_tokens():
    # Test guest client token
    payload_guest = verify_supabase_jwt("demo_client_guest_token")
    assert payload_guest["sub"] == "demo-guest-officer"
    assert payload_guest["role"] == "authenticated"

    # Test demo user token
    payload_demo = verify_supabase_jwt("demo_token_officer_42")
    assert payload_demo["sub"] == "officer_42"
    assert payload_demo["role"] == "authenticated"
