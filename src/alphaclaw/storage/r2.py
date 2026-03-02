"""Cloudflare R2 async storage client (S3-compatible via aioboto3)."""

from __future__ import annotations

import json
import logging
from typing import Any

import aioboto3

log = logging.getLogger(__name__)


class R2Client:
    """Async wrapper around Cloudflare R2's S3-compatible API."""

    def __init__(
        self,
        account_id: str,
        access_key_id: str,
        secret_access_key: str,
        bucket_name: str = "alphaclaw",
    ) -> None:
        if not account_id:
            raise RuntimeError(
                "R2 is not configured — set ALPHACLAW_R2_ACCOUNT_ID and related env vars"
            )
        self._bucket = bucket_name
        self._endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
        self._session = aioboto3.Session(
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
        )

    def _client(self):
        """Return an async context-managed S3 client."""
        return self._session.client("s3", endpoint_url=self._endpoint)

    async def upload(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
        """Upload bytes to R2."""
        async with self._client() as s3:
            await s3.put_object(Bucket=self._bucket, Key=key, Body=data, ContentType=content_type)
        log.debug("Uploaded %s (%d bytes)", key, len(data))

    async def download(self, key: str) -> bytes:
        """Download bytes from R2."""
        async with self._client() as s3:
            resp = await s3.get_object(Bucket=self._bucket, Key=key)
            return await resp["Body"].read()

    async def list_objects(self, prefix: str = "") -> list[str]:
        """List object keys under a prefix."""
        keys: list[str] = []
        async with self._client() as s3:
            paginator = s3.get_paginator("list_objects_v2")
            async for page in paginator.paginate(Bucket=self._bucket, Prefix=prefix):
                for obj in page.get("Contents", []):
                    keys.append(obj["Key"])
        return keys

    async def delete(self, key: str) -> None:
        """Delete an object from R2."""
        async with self._client() as s3:
            await s3.delete_object(Bucket=self._bucket, Key=key)
        log.debug("Deleted %s", key)

    async def exists(self, key: str) -> bool:
        """Check whether an object exists."""
        async with self._client() as s3:
            try:
                await s3.head_object(Bucket=self._bucket, Key=key)
                return True
            except s3.exceptions.ClientError:
                return False

    async def upload_json(self, key: str, data: Any) -> None:
        """Serialize data as JSON and upload."""
        raw = json.dumps(data, default=str).encode()
        await self.upload(key, raw, content_type="application/json")

    async def download_json(self, key: str) -> Any:
        """Download and deserialize JSON."""
        raw = await self.download(key)
        return json.loads(raw)
