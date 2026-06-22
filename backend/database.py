import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "cafeteria_db")

if not MONGO_URI:
        raise ValueError("Error, no encontrado")

client = AsyncIOMotorClient(MONGO_URI)

db = client[DB_NAME]

productos_collection = db["productos"]

pedidos_collection = db["pedidos"]

