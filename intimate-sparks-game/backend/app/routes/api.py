from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Room, Player, CustomQuestion
from app.schemas import RoomCreate, RoomJoin, RoomResponse, QuestionResponse, CustomQuestionCreate, AIQuestionRequest
from app.room_manager import RoomManager
from app.ai_question import generate_ai_question
import random, json, os, string

router = APIRouter()

QUESTIONS_FILE = os.path.join(os.path.dirname(__file__), "../data/questions.json")
with open(QUESTIONS_FILE, "r") as f:
    DEFAULT_QUESTIONS = json.load(f)

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.post("/create-room", response_model=RoomResponse)
async def create_room(room_data: RoomCreate, db: Session = Depends(get_db), request: Request = None):
    code = generate_room_code()
    db_room = Room(code=code, is_active=True)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    db_player = Player(room_id=db_room.id, player_name=room_data.player_name, player_color="#"+''.join(random.choices('0123456789ABCDEF', k=6)))
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    room_manager = request.app.state.room_manager
    room_manager.create_room(db_room.id, code)
    return RoomResponse(room_id=db_room.id, code=code, player_id=db_player.id)

@router.post("/join-room", response_model=RoomResponse)
async def join_room(room_data: RoomJoin, db: Session = Depends(get_db), request: Request = None):
    db_room = db.query(Room).filter(Room.code == room_data.code, Room.is_active == True).first()
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")
    db_player = Player(room_id=db_room.id, player_name=room_data.player_name, player_color="#"+''.join(random.choices('0123456789ABCDEF', k=6)))
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return RoomResponse(room_id=db_room.id, code=room_data.code, player_id=db_player.id)

def fetch_question_from_pool(type: str, level: int, custom_mode: bool = False, room_id: int = None, db: Session = None, used_ids: set[int] = None):
    # Base pool from file
    pool = [q for q in DEFAULT_QUESTIONS if q["type"] == type and q["level"] == level]
    
    # Custom questions from DB
    if custom_mode and room_id and db:
        custom_qs = db.query(CustomQuestion).filter(CustomQuestion.room_id == room_id, CustomQuestion.question_type == type, CustomQuestion.level == level).all()
        for cq in custom_qs:
            pool.append({"type": cq.question_type, "level": cq.level, "text": cq.text})
    
    if not pool:
        return None
        
    # Filtering used questions for no-repeat
    available = pool
    if used_ids:
        # Check against the stable ID
        available = [q for q in pool if q.get("id") not in used_ids]
        
        # If all questions in this set were used, reset for this category
        if not available:
            available = pool
            
    selected = random.choice(available)
    return {"id": selected.get("id", hash(selected["text"])), "type": selected["type"], "level": selected["level"], "text": selected["text"]}

@router.get("/question", response_model=QuestionResponse)
async def get_question(type: str, level: int, custom_mode: bool = False, room_id: int = None, request: Request = None, db: Session = Depends(get_db)):
    selected = fetch_question_from_pool(type, level, custom_mode, room_id, db)
    if not selected:
        raise HTTPException(status_code=404, detail="No questions found")
    return QuestionResponse(**selected)

@router.post("/custom-question")
async def add_custom_question(question_data: CustomQuestionCreate, room_id: int, player_id: int, db: Session = Depends(get_db)):
    db_question = CustomQuestion(room_id=room_id, question_type=question_data.type, level=question_data.level, text=question_data.text, created_by=str(player_id))
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return {"message": "Custom question added", "id": db_question.id}

@router.post("/generate-ai-question")
async def generate_question(ai_request: AIQuestionRequest):
    return generate_ai_question(ai_request.mood, ai_request.relationship_type)
