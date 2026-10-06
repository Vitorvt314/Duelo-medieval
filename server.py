"""Duelo Medieval: servidor estilo AirConsole.

A TV/PC abre a tela do jogo (/), cada celular abre o controle (/c) lendo o
QR code. O servidor só repassa mensagens entre os celulares e a tela — toda a
lógica do jogo roda no navegador da tela (screen.html).

    python games/duelo/server.py        (porta padrão 8090, Wi-Fi de casa)

Online (num site de hospedagem, DUELO_ONLINE=1): cada tela ganha uma sala com
código de 4 números, e os celulares entram nela (pelo QR code ou digitando o
código). Assim várias pessoas podem jogar ao mesmo tempo sem uma pegar a tela
da outra.
"""

import json
import os
import random
import socket
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse

HERE = Path(__file__).resolve().parent
# Sites de hospedagem (Render etc.) dizem a porta pelo PORT.
PORT = int(os.environ.get("DUELO_PORT") or os.environ.get("PORT") or "8090")
ONLINE = os.environ.get("DUELO_ONLINE") == "1"
MAX_ROOMS = 300
MAX_PADS = 12

app = FastAPI()
# Sem cache: senão o celular pode continuar com uma versão antiga do controle.
NO_CACHE = {"Cache-Control": "no-store"}


class Room:
    def __init__(self, code: str):
        self.code = code
        self.screen: WebSocket | None = None
        self.pads: dict[str, WebSocket] = {}
        self.names: dict[str, str] = {}


# Em casa só existe uma sala (código ""); online, uma por tela.
rooms: dict[str, Room] = {}


def get_room(code: str) -> Room | None:
    if not ONLINE:
        return rooms.setdefault("", Room(""))
    return rooms.get(code)


def new_code() -> str:
    while True:
        code = f"{random.randint(0, 9999):04d}"
        if code not in rooms:
            return code


def drop_if_empty(room: Room):
    if ONLINE and room.screen is None and not room.pads and rooms.get(room.code) is room:
        del rooms[room.code]


def lan_ip() -> str:
    # No Chromebook o servidor roda dentro do Linux, que tem um IP interno que os
    # celulares não enxergam: lá o IP do Wi-Fi vem de fora (DUELO_IP).
    if os.environ.get("DUELO_IP"):
        return os.environ["DUELO_IP"].strip()
    # Não envia nada: só pergunta ao SO qual interface seria usada pra sair
    # pra rede, que é o IP que os celulares no mesmo Wi-Fi enxergam.
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


@app.get("/")
def screen_page():
    return FileResponse(HERE / "screen.html", headers=NO_CACHE)


@app.get("/c")
def controller_page():
    return FileResponse(HERE / "controller.html", headers=NO_CACHE)


# Scripts do jogo (lista fechada: nada além destes arquivos é servido).
SCRIPTS = {"looks", "weapons", "arenas", "audio", "game", "events", "bosses", "ui"}


@app.get("/{name}.js")
def script(name: str):
    if name not in SCRIPTS:
        return JSONResponse({"erro": "não encontrado"}, status_code=404)
    return FileResponse(HERE / f"{name}.js", media_type="text/javascript", headers=NO_CACHE)


@app.get("/info")
def info(request: Request):
    if ONLINE:
        # Atrás do site de hospedagem o endereço certo é o que o navegador usou (https).
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        return JSONResponse({"pad_url": f"{proto}://{request.headers.get('host', request.url.netloc)}/c", "online": True})
    return JSONResponse({"pad_url": f"http://{lan_ip()}:{PORT}/c", "online": False})


async def send_screen(room: Room, msg: dict):
    if room.screen is not None:
        try:
            await room.screen.send_text(json.dumps(msg))
        except Exception:
            pass


@app.websocket("/ws/screen")
async def ws_screen(ws: WebSocket, fresh: int = 0, room: str = ""):
    await ws.accept()
    if ONLINE:
        # A tela volta pra mesma sala se ela estiver livre (recarregou a página ou a
        # internet caiu); se outra tela estiver usando esse código, ganha uma sala nova.
        r = rooms.get(room) if room.isdigit() and len(room) == 4 else None
        if r is None or r.screen is not None:
            if len(rooms) >= MAX_ROOMS:
                await ws.send_text(json.dumps({"type": "full"}))
                await ws.close()
                return
            code = room if room.isdigit() and len(room) == 4 and room not in rooms else new_code()
            r = rooms[code] = Room(code)
        await ws.send_text(json.dumps({"type": "room", "code": r.code}))
    else:
        r = get_room("")
        # Só pode haver uma tela, senão os comandos dos celulares vão pra aba
        # errada. A página aberta por último ganha (fresh=1); uma aba antiga que
        # só está se reconectando (fresh=0) não toma o lugar da que está ativa.
        if r.screen is not None:
            loser = r.screen if fresh else ws
            try:
                await loser.send_text(json.dumps({"type": "replaced"}))
                await loser.close()
            except Exception:
                pass
            if not fresh:
                return
    r.screen = ws
    # Celulares que já estavam conectados antes da tela abrir (ou recarregar).
    for pid in list(r.pads):
        await send_screen(r, {"type": "join", "id": pid, "name": r.names.get(pid, "?")})
    try:
        while True:
            msg = json.loads(await ws.receive_text())
            target = msg.pop("to", "all")
            data = json.dumps(msg)
            targets = list(r.pads.values()) if target == "all" else [r.pads.get(target)]
            for pad in targets:
                if pad is not None:
                    try:
                        await pad.send_text(data)
                    except Exception:
                        pass
    except (WebSocketDisconnect, ValueError):
        pass
    finally:
        if r.screen is ws:
            r.screen = None
        drop_if_empty(r)


@app.websocket("/ws/pad")
async def ws_pad(ws: WebSocket, id: str, name: str = "Jogador", room: str = ""):
    await ws.accept()
    r = get_room(room)
    if r is None:
        await ws.send_text(json.dumps({"type": "noroom"}))
        await ws.close()
        return
    if id not in r.pads and len(r.pads) >= MAX_PADS:
        await ws.send_text(json.dumps({"type": "roomfull"}))
        await ws.close()
        return
    old = r.pads.get(id)
    if old is not None:
        try:
            await old.close()
        except Exception:
            pass
    r.pads[id] = ws
    r.names[id] = name[:12]
    await send_screen(r, {"type": "join", "id": id, "name": r.names[id]})
    try:
        while True:
            msg = json.loads(await ws.receive_text())
            msg["id"] = id
            await send_screen(r, msg)
    except (WebSocketDisconnect, ValueError):
        pass
    finally:
        if r.pads.get(id) is ws:
            del r.pads[id]
            await send_screen(r, {"type": "leave", "id": id})
        drop_if_empty(r)


def port_in_use() -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", PORT)) == 0


if __name__ == "__main__":
    if ONLINE:
        uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning", proxy_headers=True, forwarded_allow_ips="*")
        raise SystemExit(0)
    if port_in_use():
        # Já tem um servidor do jogo rodando: não é erro, é só abrir o navegador.
        print(f"\n  O servidor já está rodando. Abra http://localhost:{PORT}/\n")
        raise SystemExit(3)  # código 3 = já estava rodando (o Jogar Duelo.bat usa isso)
    print(f"\n  TV/PC abra:      http://localhost:{PORT}/")
    print(f"  Celulares:       http://{lan_ip()}:{PORT}/c  (ou leia o QR code na tela)\n")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")
