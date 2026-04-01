from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, index=True)
    player_name = Column(String)
    player_color = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CustomQuestion(Base):
    __tablename__ = "custom_questions"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, index=True)
    question_type = Column(String)
    level = Column(Integer)
    text = Column(String)
    created_by = Column(String)
