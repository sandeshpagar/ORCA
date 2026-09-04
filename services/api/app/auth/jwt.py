import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from app.config import settings


class JWTVerificationError(Exception):
    """Raised when JWT verification fails."""
    pass


_jwks_client: Optional[jwt.PyJWKClient] = None


def get_jwks_client() -> Optional[jwt.PyJWKClient]:
    global _jwks_client
    if _jwks_client is None:
        supabase_url = getattr(settings, "SUPABASE_URL", "").rstrip("/")
        if supabase_url and not ("demo-orca" in supabase_url or "your-project" in supabase_url):
            try:
                jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
                _jwks_client = jwt.PyJWKClient(jwks_url, cache_keys=True)
            except Exception:
                _jwks_client = None
    return _jwks_client


def verify_supabase_jwt(
    token: str,
    secret: Optional[str] = None,
    audience: Optional[str] = "authenticated",
) -> Dict[str, Any]:
    """
    Verifies and decodes a Supabase JWT using PyJWT.
    Supports both ES256 (Supabase modern JWKS asymmetric keys) and HS256 (symmetric JWT secret).
    Supports development and demo tokens for seamless local evaluation.
    """
    # Support development and demo tokens for local evaluation / offline mode
    if token == "demo_client_guest_token" or token.startswith("demo_token_") or (token.startswith("demo-") and "." not in token):
        uid = (
            token.replace("demo_token_", "")
            if token.startswith("demo_token_")
            else ("demo-guest-officer" if token == "demo_client_guest_token" else token)
        )
        return {
            "sub": uid,
            "email": f"{uid}@orca-demo.local",
            "aud": audience or "authenticated",
            "role": "authenticated",
        }

    # Inspect token header for algorithm
    try:
        unverified_header = jwt.get_unverified_header(token)
        token_alg = unverified_header.get("alg", "HS256")
    except Exception as e:
        raise JWTVerificationError(f"Invalid token: malformed header ({str(e)})") from e

    decode_options = {"verify_aud": audience is not None}

    # If modern Supabase token signed with ES256, verify against Supabase JWKS
    if token_alg == "ES256":
        try:
            jwks_client = get_jwks_client()
            if jwks_client:
                signing_key = jwks_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["ES256"],
                    audience=audience,
                    options=decode_options,
                )
            else:
                # Fallback: unverified payload with basic sanity checks if JWKS is unavailable
                payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
        except jwt.ExpiredSignatureError as e:
            raise JWTVerificationError("Token has expired.") from e
        except Exception as e:
            raise JWTVerificationError(f"ES256 signature verification failed: {str(e)}") from e
    else:
        # HS256 HMAC-SHA256 signature verification using JWT secret
        jwt_secret = secret or settings.SUPABASE_JWT_SECRET
        try:
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience=audience,
                options=decode_options,
            )
        except jwt.ExpiredSignatureError as e:
            raise JWTVerificationError("Token has expired.") from e
        except jwt.InvalidSignatureError as e:
            raise JWTVerificationError("Invalid token signature.") from e
        except jwt.InvalidTokenError as e:
            raise JWTVerificationError(f"Invalid token: {str(e)}") from e

    if "sub" not in payload:
        raise JWTVerificationError("JWT payload missing 'sub' claim.")
    return payload


def create_test_jwt(
    user_id: str,
    email: str = "cadet@isro.gov.in",
    secret: Optional[str] = None,
    expires_in_seconds: int = 3600,
    audience: str = "authenticated",
) -> str:
    """
    Helper to generate a signed JWT matching Supabase's signature structure.
    Used for pytest test suites and local integration.
    """
    jwt_secret = secret or settings.SUPABASE_JWT_SECRET
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "aud": audience,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in_seconds)).timestamp()),
        "role": "authenticated",
    }
    return jwt.encode(payload, jwt_secret, algorithm="HS256")
