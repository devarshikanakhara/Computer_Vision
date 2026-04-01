from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json, asyncio, random
from app.database import SessionLocal
from app.routes.api import fetch_question_from_pool

router = APIRouter()

@router.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    await websocket.accept()
    room_manager = websocket.app.state.room_manager
    room = room_manager.get_room_by_code(room_code)
    if not room:
        await websocket.send_json({"type": "error", "message": "Room not found"})
        await websocket.close()
        return
    player_id = None
    try:
        data = await websocket.receive_json()
        if data.get("type") == "join":
            player_id = int(data.get("player_id")) if data.get("player_id") else None
            player_name = data.get("player_name")
            if player_id and player_name:
                room.add_player(player_id, websocket, player_name)
                await broadcast_players(room)
                await websocket.send_json({
                    "type": "joined", 
                    "player_id": player_id,
                    "game_active": room.game_active,
                    "current_turn": room.current_turn_player_id,
                    "scores": room.player_scores,
                    "spice_level": room.spice_level,
                    "current_question": room.current_question,
                    "waiting_for_custom": room.waiting_for_custom,
                    "waiting_for_completion": room.waiting_for_completion
                })
        while True:
            msg = await websocket.receive_json()
            await handle_message(room, player_id, msg)
    except WebSocketDisconnect:
        if player_id:
            room.remove_player(player_id)
            await broadcast_players(room)
            if room.game_active:
                room.game_active = False
                if room.timer_task:
                    room.timer_task.cancel()
                await broadcast_to_room(room, {"type": "game_ended", "reason": "player_disconnected"})

async def handle_message(room, player_id, msg):
    t = msg.get("type")
    if t == "start_game" and len(room.players) >= 2:
        room.game_active = True
        room.current_turn_player_id = random.choice(list(room.players.keys()))
        room.waiting_for_completion = False
        await broadcast_to_room(room, {"type": "game_started", "first_turn": room.current_turn_player_id, "scores": room.player_scores, "spice_level": room.spice_level})
        await start_turn_timer(room)
    elif t == "update_spice":
        new_level = msg.get("level", 2)
        if 1 <= new_level <= 4:
            room.spice_level = new_level
            await broadcast_to_room(room, {"type": "spice_updated", "spice_level": room.spice_level})
    elif t == "select_choice":
        if room.current_turn_player_id != player_id or room.waiting_for_completion or room.waiting_for_custom:
            return
        choice = msg.get("choice")
        room.current_question_type = choice
        room.waiting_for_custom = True
        await broadcast_to_room(room, {"type": "choice_selected", "choice": choice, "player_turn": player_id})
    elif t == "submit_custom" and room.waiting_for_custom and room.current_turn_player_id != player_id:
        text = msg.get("text")
        if text:
            room.current_question = {"id": random.randint(10000, 99999), "type": room.current_question_type, "level": room.spice_level, "text": text}
            room.waiting_for_custom = False
            room.waiting_for_completion = True
            await broadcast_to_room(room, {"type": "question_display", "question": room.current_question, "player_turn": room.current_turn_player_id, "choice": room.current_question_type})
            await start_turn_timer(room, for_completion=True)
    elif t == "request_random" and room.waiting_for_custom and room.current_turn_player_id != player_id:
        db = SessionLocal()
        try:
            custom_mode = msg.get("custom_mode", False)
            question = fetch_question_from_pool(room.current_question_type, room.spice_level, custom_mode, room.room_id, db, room.used_question_ids)
            if question:
                room.used_question_ids.add(question["id"])
                room.current_question = question
                room.waiting_for_custom = False
                room.waiting_for_completion = True
                await broadcast_to_room(room, {"type": "question_display", "question": question, "player_turn": room.current_turn_player_id, "choice": room.current_question_type})
                await start_turn_timer(room, for_completion=True)
        finally:
            db.close()
    elif t == "complete_action" and room.waiting_for_completion and room.current_turn_player_id == player_id:
        if room.scoring_enabled:
            points = 10 if room.current_question_type == "dare" else 5
            room.player_scores[player_id] = room.player_scores.get(player_id, 0) + points
            await broadcast_to_room(room, {"type": "action_completed", "player_id": player_id, "points_awarded": points, "new_scores": room.player_scores})
        else:
            await broadcast_to_room(room, {"type": "action_completed", "player_id": player_id, "new_scores": room.player_scores})
        await next_turn(room)
    elif t == "skip_action" and room.waiting_for_completion and room.current_turn_player_id == player_id:
        if room.scoring_enabled:
            room.player_scores[player_id] = room.player_scores.get(player_id, 0) - 5
            await broadcast_to_room(room, {"type": "action_skipped", "player_id": player_id, "penalty": -5, "new_scores": room.player_scores})
        else:
            await broadcast_to_room(room, {"type": "action_skipped", "player_id": player_id})
        await next_turn(room)
    elif t == "reaction":
        target = room.get_other_player(player_id)
        if target:
            await room.players[target].send_json({"type": "reaction_received", "from_player": player_id, "reaction": msg.get("reaction")})

async def next_turn(room):
    if room.timer_task:
        room.timer_task.cancel()
    room.waiting_for_completion = False
    room.waiting_for_custom = False
    room.current_question = None
    room.current_question_type = None
    players = list(room.players.keys())
    if len(players) == 2:
        idx = players.index(room.current_turn_player_id)
        room.current_turn_player_id = players[(idx + 1) % 2]
    await broadcast_to_room(room, {"type": "turn_changed", "current_turn": room.current_turn_player_id, "scores": room.player_scores})
    await start_turn_timer(room)

async def start_turn_timer(room, for_completion=False):
    if room.timer_task:
        room.timer_task.cancel()
    async def timer_cb():
        await asyncio.sleep(room.timer_seconds)
        if for_completion and room.waiting_for_completion:
            if room.scoring_enabled:
                room.player_scores[room.current_turn_player_id] = room.player_scores.get(room.current_turn_player_id, 0) - 5
                await broadcast_to_room(room, {"type": "action_skipped", "player_id": room.current_turn_player_id, "penalty": -5, "new_scores": room.player_scores, "reason": "timeout"})
            else:
                await broadcast_to_room(room, {"type": "action_skipped", "player_id": room.current_turn_player_id, "reason": "timeout"})
            await next_turn(room)
        elif not for_completion and not room.waiting_for_completion and room.game_active:
            await next_turn(room)
    room.timer_task = asyncio.create_task(timer_cb())
    await broadcast_to_room(room, {"type": "timer_start", "duration": room.timer_seconds, "for_completion": for_completion})

async def broadcast_to_room(room, message):
    for ws in room.players.values():
        try:
            await ws.send_json(message)
        except:
            pass

async def broadcast_players(room):
    players_info = [{"id": pid, "name": room.player_names[pid], "score": room.player_scores.get(pid, 0)} for pid in room.players]
    await broadcast_to_room(room, {"type": "players_update", "players": players_info})
