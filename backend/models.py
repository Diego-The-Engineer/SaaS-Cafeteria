import os
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Model_producto(BaseModel):
    nombre: str = Field(..., example="Latte")
    precio_unitario: float = Field(..., example=30.5)
    disponible: bool = True
    cantidad: int = 0

class Response_producto(Model_producto):
        id: str

class Item_pedido(BaseModel):
        producto_id: str
        cantidad: int
class Create_pedido(BaseModel):
        items: list[Item_pedido]
        first_name: str
        last_name: str
        email: str
        phone: str
        token_tarjeta: str

class Response_pedido(BaseModel):
        id: str
        items: List[dict]
        fecha: datetime
        total_pagado: float

class Response_msg(BaseModel):
	msg: str
