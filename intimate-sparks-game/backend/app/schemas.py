from pydantic import BaseModel
from typing import Optional, List

class RoomCreate(BaseModel):
    player_name: str

class RoomJoin(BaseModel):
    code: str
    player_name: str

class RoomResponse(BaseModel):
    room_id: int
    code: str
    player_id: int

class QuestionRequest(BaseModel):
    type: str
    level: int
    custom_mode: bool = False
    room_id: int

class QuestionResponse(BaseModel):
    id: int
    type: str
    level: int
    text: str

class CustomQuestionCreate(BaseModel):
    type: str
    level: int
    text: str

class AIQuestionRequest(BaseModel):
    mood: str
    relationship_type: Optional[str] = "long distance"

class GameStateResponse(BaseModel):
    room_id: int
    game_active: bool
    current_turn_player_id: Optional[int]
    scores: dict
    spice_level: int
    scoring_enabled: bool
    current_question: Optional[dict]
