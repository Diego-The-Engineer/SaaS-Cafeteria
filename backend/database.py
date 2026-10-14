import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()


MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "cafeteria_db")

if not MONGO_URI:
    raise ValueError("Error: Variable MONGO_URI no encontrada en el archivo .env")


client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]
productos_collection = db["productos"]
pedidos_collection = db["pedidos"]

async def connect_db():
    try:
        await client.admin.command('ping')
        print("Conectado exitosamente a MongoDB Atlas")
    except Exception as e:
        print(f"Error conectando a la base de datos: {e}")

async def close_db():
    
    client.close()
    print("Conexión a MongoDB cerrada")