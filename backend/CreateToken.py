import requests
import os
from datetime import datetime, timedelta
from routers import productos, pedidos, authRouter, stats
from typing import List, Optional, Annotated
from fastapi import Depends, HTTPException, status, FastAPI, Body, APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from bson import ObjectId
from models import Model_producto, Response_producto, Item_pedido, Create_pedido, Response_pedido, Response_msg
from database import db
from dotenv import load_dotenv
load_dotenv()
app = FastAPI()
url = "https://ecartpay.com/api/authorizations/token"
token_secreto = os.getenv("TOKEN")

def generar_token():
    headers = {
        "accept": "application/json",
        "authorization": f"Basic {token_secreto}"
    }

    response = requests.post(url, headers=headers)

    data = response.json()

    token_ecart = data.get("token")
    print(f"¡Éxito! Mi token de eCartPay es: {token_secreto}")

@app.post("/pedidos/api/obtener_token")
async def obtener_token_ecart():
    token_generado = generar_token()
    return {"token": token_generado }
