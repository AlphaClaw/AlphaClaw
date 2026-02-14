"""Web channel — FastAPI + WebSocket for testing and web UI."""

from __future__ import annotations

import json
import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

from alphaclaw.agent import loop as agent

log = logging.getLogger(__name__)

HTML = """<!DOCTYPE html>
<html>
<head><title>AlphaClaw</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0a; color: #e0e0e0; }
  #chat { max-width: 700px; margin: 0 auto; padding: 20px; display: flex; flex-direction: column; height: 100vh; }
  h1 { font-size: 1.2em; padding: 10px 0; color: #6cf; }
  #messages { flex: 1; overflow-y: auto; padding: 10px 0; }
  .msg { margin: 8px 0; padding: 10px 14px; border-radius: 12px; max-width: 85%; line-height: 1.5; white-space: pre-wrap; }
  .user { background: #1a3a5c; margin-left: auto; }
  .assistant { background: #1a1a2e; }
  #input-row { display: flex; gap: 8px; padding: 10px 0; }
  #input { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #333; background: #111; color: #e0e0e0; font-size: 15px; }
  #send { padding: 12px 24px; border-radius: 8px; border: none; background: #1a5276; color: white; cursor: pointer; font-size: 15px; }
  #send:hover { background: #1f6f9f; }
</style>
</head>
<body>
<div id="chat">
  <h1>AlphaClaw</h1>
  <div id="messages"></div>
  <div id="input-row">
    <input id="input" placeholder="Ask about markets..." autofocus />
    <button id="send" onclick="send()">Send</button>
  </div>
</div>
<script>
  const ws = new WebSocket(`ws://${location.host}/ws`);
  const msgs = document.getElementById('messages');
  const input = document.getElementById('input');

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    addMsg(data.content, data.role);
  };

  function addMsg(text, role) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function send() {
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    ws.send(JSON.stringify({content: text}));
    input.value = '';
  }

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
</script>
</body>
</html>"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Web channel started")
    yield
    log.info("Web channel stopped")


app = FastAPI(title="AlphaClaw", lifespan=lifespan)


@app.get("/")
async def index():
    return HTMLResponse(HTML)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    user_id = str(uuid.uuid4())
    history: list = []
    log.info("WebSocket connected: %s", user_id)

    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            user_text = msg.get("content", "")

            reply, history = await agent.run(user_text, history=history, user_id=user_id)
            await ws.send_text(json.dumps({"role": "assistant", "content": reply}))
    except WebSocketDisconnect:
        log.info("WebSocket disconnected: %s", user_id)
