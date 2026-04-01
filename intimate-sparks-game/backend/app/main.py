from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import api, websocket
from app.database import engine, Base
from app.room_manager import RoomManager

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Intimate Sparks API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

room_manager = RoomManager()
app.state.room_manager = room_manager

app.include_router(api.router, prefix="/api")
app.include_router(websocket.router)

@app.get("/")
def root():
    return {"message": "Intimate Sparks API is running"}
