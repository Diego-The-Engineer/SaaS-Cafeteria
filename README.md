# Cafeteria POS MVP: High-Performance Asynchronous System

Sistema de Punto de Venta (POS) de alto rendimiento, diseñado con una arquitectura asíncrona y escalable. Este proyecto implementa una solución completa desde la persistencia de datos hasta una interfaz de usuario fluida, optimizada para entornos de contenedores industriales.

## Arquitectura Técnica

El sistema sigue un modelo desacoplado de alto rendimiento:

* **Backend:** FastAPI (Python 3.10) con ejecución asíncrona (Async/Await) y driver `Motor` para MongoDB.
* **Frontend:** Single Page Application (SPA) con JavaScript Vanilla y Tailwind CSS para un diseño responsivo.
* **Infraestructura:** Despliegue industrial sobre **openEuler** utilizando el motor de contenedores **iSula**.
* **Base de Datos:** Clúster distribuido en la nube con MongoDB Atlas.

## Tecnologías Utilizadas

| Capa | Tecnología |
| :--- | :--- |
| **Backend** | FastAPI, Motor, Pydantic, Uvicorn |
| **Frontend** | HTML5, Tailwind CSS, JS Fetch API |
| **Infraestructura** | iSula, Linux openEuler, Nginx |
| **Persistencia** | MongoDB Atlas (NoSQL) |

## Características Principales

* **Asincronía Real:** Procesamiento no bloqueante de peticiones HTTP.
* **Validación Robusta:** Esquemas de datos estrictos mediante Pydantic.
* **Gestión de Carrito en Tiempo Real:** Interfaz dinámica para agregar, editar y eliminar productos del ticket antes del cobro.
* **Cálculo de Precios en Servidor:** Lógica transaccional segura para evitar discrepancias en el total a cobrar.
* **Infraestructura Inmutable:** Despliegue profesional mediante contenedores iSula.

## Instalación y Ejecución

### Backend
1. Asegúrate de tener un archivo `.env` configurado:
```
MONGO_URI=mongodb+srv://<usuario>:<password>@cluster.mongodb.net/...
DB_NAME=cafeteria_db

```

2. Inicia el contenedor con iSula:
```
isula run -d --network host --name api_cafeteria \
  -v /opt/cafeteria:/app \
  --env-file /opt/cafeteria/.env \
  api-cafeteria:latest \
  uvicorn main:app --host 0.0.0.0 --port 8010 --reload

```



## Documentación

La documentación técnica detallada (incluyendo el diseño de la base de datos, diagramas de arquitectura y bitácora de depuración) se encuentra disponible en formato LaTeX. Puedes consultar los archivos fuentes en el directorio `/docs`.

## Seguridad

* Este repositorio **no incluye** el archivo `.env` para proteger las credenciales de acceso a MongoDB Atlas.
* El código está diseñado para evitar inyección de precios mediante validación en el lado del servidor.

---

*Desarrollado con arquitectura industrial por Diego Aimar Gómez de la Rosa.*
