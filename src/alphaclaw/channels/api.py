"""API server — FastAPI + WebSocket for the separate frontend."""

from __future__ import annotations

import json
import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from alphaclaw.agent import loop as agent

log = logging.getLogger(__name__)

_MAX_MESSAGE_LENGTH = 4096


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("API server started")
    yield
    log.info("API server stopped")


app = FastAPI(title="AlphaClaw", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    user_id = str(uuid.uuid4())
    log.info("WebSocket connected: %s", user_id)

    try:
        while True:
            raw = await ws.receive_text()
            if len(raw) > _MAX_MESSAGE_LENGTH * 2:
                await ws.send_text(json.dumps({"role": "assistant", "content": "Message too long."}))
                continue
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(json.dumps({"role": "assistant", "content": "Invalid message format."}))
                continue
            user_text = msg.get("content", "").strip()
            if not user_text:
                await ws.send_text(json.dumps({"role": "assistant", "content": "Please enter a message."}))
                continue
            if len(user_text) > _MAX_MESSAGE_LENGTH:
                await ws.send_text(json.dumps({"role": "assistant", "content": "Message too long."}))
                continue

            reply, _ = await agent.run(user_text, user_id=user_id, channel="web")
            await ws.send_text(json.dumps({"role": "assistant", "content": reply}))
    except WebSocketDisconnect:
        log.info("WebSocket disconnected: %s", user_id)
