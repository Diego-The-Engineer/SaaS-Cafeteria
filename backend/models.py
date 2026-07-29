from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class MetodoPago(str, Enum):
       efectivo = "Efectivo"
       tarjeta = "Tarjeta"
       transferencia = "Transferencia"

class EstadoCliente(str, Enum):
       pendiente = "Pendiente"
       preparando = "Preparando"
       enviando = "Enviando" #Para pedidos a domicilio
       entregado = "Entregado"
       cancelado = "Cancelado"

class Ingredientes(BaseModel):
       nombre: str = Field(..., example = "Azucar")
       cantidad: int
       disponible: bool = True

class Variante(BaseModel):
       tamaño: str
       precio: float
       disponible: bool = True

class Opcion(BaseModel):
       nombre: str
       precio_extra: Optional[float] = None
       disponible: bool = True

class Item_pedido(BaseModel):
        idUnico: str
        producto_id: str
        nombre: str
        tamano: str
        precio: float
        cantidad: int

class Create_pedido(BaseModel):
        items: list[Item_pedido]
        first_name: str
        last_name: str
        phone: str
        metodo_pago: MetodoPago
        estado: EstadoCliente.pendiente
        total: float
        fecha: datetime = Field(default_factory=datetime.utcnow)
        token_tarjeta: str

class Response_pedido(BaseModel):
        id: str
        items: List[dict]
        fecha: datetime
        total_pagado: float

class Response_msg(BaseModel):
	msg: str
       
class Create_stats(BaseModel):
       fecha: datetime = Field(default_factory=datetime.utcnow)
       ingresos: float
       egresos: float

class Response_stats(BaseModel):
        msg: str

class Categoria(BaseModel):
       nombre: str
       image: Optional[str] = None
       disponible: bool = True
       orden: int = 0
       color: Optional[str] = None

class Sabores (BaseModel):
       nombre: str
       disponible: bool = True

class Model_producto(BaseModel):
    nombre: str = Field(..., example="Latte")
    descripcion: Optional[str] = None
    cantidad: int = 0
    categoria_id: str
    variantes: list[Variante] = []
    disponible: bool = True
    imagen: Optional[str] = None
    opciones: list[Opcion] = []
    destacado: bool = False
    sabores: list[Sabores] = []

class Response_producto(Model_producto):
        id: str
        descripcion: Optional[str] = None
        opciones: list[Opcion] = []
