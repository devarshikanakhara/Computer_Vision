import asyncio
import random
from typing import Dict, Optional
from fastapi import WebSocket
from datetime import datetime

class RoomState:
    def __init__(self, room_id: int, code: str):
        self.room_id = room_id
        self.code = code
        self.players: Dict[int, WebSocket] = {}
        self.player_names: Dict[int, str] = {}
        self.player_scores: Dict[int, int] = {}
        self.game_active = False
        self.current_turn_player_id: Optional[int] = None
        self.spice_level = 2
        self.scoring_enabled = True
        self.timer_seconds = 30
        self.current_question: Optional[dict] = None
        self.current_question_type: Optional[str] = None
        self.waiting_for_custom = False
        self.waiting_for_completion = False
        self.used_question_ids: set[int] = set()
        self.timer_task: Optional[asyncio.Task] = None

    def add_player(self, player_id: int, websocket: WebSocket, name: str):
        self.players[player_id] = websocket
        self.player_names[player_id] = name
        self.player_scores[player_id] = 0

    def remove_player(self, player_id: int):
        self.players.pop(player_id, None)
        self.player_names.pop(player_id, None)
        self.player_scores.pop(player_id, None)

    def get_other_player(self, player_id: int) -> Optional[int]:
        for pid in self.players:
            if pid != player_id:
                return pid
        return None

class RoomManager:
    def __init__(self):
        self.rooms: Dict[int, RoomState] = {}
        self.code_to_room: Dict[str, int] = {}

    def create_room(self, room_id: int, code: str) -> RoomState:
        room = RoomState(room_id, code)
        self.rooms[room_id] = room
        self.code_to_room[code] = room_id
        return room

    def get_room_by_code(self, code: str) -> Optional[RoomState]:
        room_id = self.code_to_room.get(code)
        if room_id:
            return self.rooms.get(room_id)
        return None

    def get_room(self, room_id: int) -> Optional[RoomState]:
        return self.rooms.get(room_id)

    def delete_room(self, room_id: int):
        if room_id in self.rooms:
            code = self.rooms[room_id].code
            self.code_to_room.pop(code, None)
            self.rooms.pop(room_id, None)
