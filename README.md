# SaaS Cafetería - POS - Sistema de Gestión Full-Stack
Sistema integral para la gestión de inventario y pedidos en línea para cafeterías, desarrollado con arquitectura de microservicios y despliegue en la nube.
<a href="https://www.python.org/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg" width="100" height="60" alt="Python"/></a>
<a href="https://fastapi.tiangolo.com/" target="_blank"><img src="https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png" width="100" height="60" alt="FastAPI"/></a>
<a href="https://www.mongodb.com/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/9/93/MongoDB_Logo.svg" width="100" height="60" alt="MongoDB"/></a>
<a href="https://tailwindcss.com/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Tailwind_CSS_Logo.svg" width="100" height="60" alt="Tailwind"/></a>
<a href= "https://nginx.org/" target="_blank"> <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Nginx_logo.svg/1280px-Nginx_logo.svg.png?_=20170311021525" width="100" height="60" alt="Nginx"/></a>
<a href= "https://openEuler.org/" target="_blank"> <img src="https://images.seeklogo.com/logo-png/49/1/openeuler-logo-png_seeklogo-491447.png" width="100" height="60" alt="openEuler"/></a>
<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" width="100" height="100"/>
<img src="https://render.com/icons/logo.svg" width="100" height="100"/>
<img src="https://assets.vercel.com/image/upload/v1607554385/repositories/vercel/logo.png" width="100" height="100"/>

Sistema de Punto de Venta (POS) de alto rendimiento, diseñado con una arquitectura asíncrona y escalable. Este proyecto implementa una solución completa desde la persistencia de datos hasta una interfaz de usuario fluida, optimizada para entornos de contenedores industriales.

## Arquitectura Técnica

El sistema sigue un modelo desacoplado de alto rendimiento:

* **Backend:** API REST de alto rendimiento construida con FastAPI. Gestiona la lógica de inventario, autenticación JWT y procesamiento de pedidos.
* **Frontend:** Interfaz de cliente y Panel Administrativo construido en HTML5, CSS3 y JavaScript. Desplegado en Vercel para una distribución global.
* **Infraestructura:** Despliegue industrial sobre **openEuler** utilizando el motor de contenedores **iSula**, desplegando el backend en un servidor de nube en Render mediante CI/CD.
* **Base de Datos:** CMongoDB Atlas (Cloud Database) para almacenamiento persistente y escalable.

## Tecnologías Utilizadas

| Capa | Tecnología |
| :--- | :--- |
| **Backend** | FastAPI, Pydantic, Uvicorn, Render |
| **Frontend** | HTML5, Tailwind CSS, JS Fetch API, Vercel |
| **Infraestructura** | iSula, Linux openEuler, Nginx |
| **Persistencia** | MongoDB Atlas (NoSQL) |

## Características Principales

* **Asincronía Real:** Procesamiento no bloqueante de peticiones HTTP.
* **Validación Robusta:** Esquemas de datos estrictos mediante Pydantic.
* **Gestión de Carrito en Tiempo Real:** Interfaz dinámica para agregar, editar y eliminar productos del ticket antes del cobro.
* **Cálculo de Precios en Servidor:** Lógica transaccional segura para evitar discrepancias en el total a cobrar.
* **Infraestructura Inmutable:** Despliegue profesional mediante contenedores iSula.


## Seguridad

* Este repositorio **no incluye** el archivo `.env` para proteger las credenciales de acceso a MongoDB Atlas y la autenticación JWT.
* El código está diseñado para evitar inyección de precios mediante validación en el lado del servidor.

---

*Desarrollado por Diego Aimar Gómez de la Rosa.*
