"""S3 / MinIO object-storage client wrapper."""

from __future__ import annotations

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.config import settings


class StorageClient:
    """Thin wrapper around a boto3 S3 client configured for MinIO / S3."""

    def __init__(self) -> None:
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            config=BotoConfig(signature_version="s3v4"),
            region_name="us-east-1",
        )
        self._bucket = settings.S3_BUCKET

    # ── Public API ────────────────────────────────────────────────────────

    def ensure_bucket(self) -> None:
        """Create the bucket if it does not already exist."""
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError:
            self._client.create_bucket(Bucket=self._bucket)

    def upload_file(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
        """Upload *data* to *key* in the configured bucket."""
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )

    def download_file(self, key: str) -> bytes:
        """Download and return the contents of *key*."""
        response = self._client.get_object(Bucket=self._bucket, Key=key)
        return response["Body"].read()

    def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """Return a presigned GET URL valid for *expires_in* seconds."""
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    def delete_file(self, key: str) -> None:
        """Delete *key* from the bucket."""
        self._client.delete_object(Bucket=self._bucket, Key=key)


# Module-level singleton (created lazily so tests can patch settings first).
_storage: StorageClient | None = None


def get_storage_client() -> StorageClient:
    """Return the module-level ``StorageClient`` singleton."""
    global _storage  # noqa: PLW0603
    if _storage is None:
        _storage = StorageClient()
    return _storage
