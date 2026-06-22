const API_URL = "https://twelve-disorder-plenty.ngrok-free.dev";
let carrito = [];

window.onload = () => { cargarMenu(); };

async function cargarMenu() {
    try {
        const res = await fetch(`${API_URL}/productos/lista`, {
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        });

        if (!res.ok) throw new Error("Error en la conexión con el servidor");
        
        const productos = await res.json();
        const contenedor = document.getElementById("menu-contenedor");
        contenedor.innerHTML = "";

        const disponibles = productos.filter(p => p.disponible);

        if (disponibles.length === 0) {
            contenedor.innerHTML = "<p style='color: var(--text-muted); width: 100%; text-align: center;'>No hay productos disponibles por el momento.</p>";
            return;
        }

        disponibles.forEach(p => {
            const stock = p.cantidad !== undefined ? p.cantidad : 999;
            const agotado = stock <= 0;

            contenedor.innerHTML += `
                <div class="producto-card">
                    <div>
                        <h3>${p.nombre}</h3>
                        <p class="stock">${agotado ? 'Agotado' : `Disponibles: ${stock}`}</p>
                    </div>
                    <div>
                        <p class="precio">$${p.precio_unitario.toFixed(2)}</p>
                        <button class="btn-add" 
                            onclick="agregarAlCarrito('${p.id || p._id}', '${p.nombre}', ${p.precio_unitario})" 
                            ${agotado ? 'disabled' : ''}>
                            ${agotado ? 'Sin Stock' : 'Agregar'}
                        </button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error(error);
        document.getElementById("menu-contenedor").innerHTML = `<p style="color: var(--danger); width: 100%; text-align: center;">Error conectando con el menú. Verifica el estado del servidor.</p>`;
    }
}

function agregarAlCarrito(id, nombre, precio) {
    const itemExistente = carrito.find(item => item.producto_id === id);
    
    if (itemExistente) {
        itemExistente.cantidad += 1;
    } else {
        carrito.push({ producto_id: id, nombre: nombre, precio: precio, cantidad: 1 });
    }
    actualizarCarrito();
}

function quitarDelCarrito(id) {
    carrito = carrito.filter(item => item.producto_id !== id);
    actualizarCarrito();
}

function actualizarCarrito() {
    const lista = document.getElementById("lista-carrito");
    const btnEnviar = document.getElementById("btn-enviar");
    const labelTotal = document.getElementById("total-precio");
    
    lista.innerHTML = "";
    let total = 0;

    if (carrito.length === 0) {
        lista.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">El carrito está vacío.</p>';
        btnEnviar.disabled = true;
        labelTotal.innerText = "$0.00";
        return;
    }

    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        lista.innerHTML += `
            <div class="carrito-item">
                <span>${item.cantidad}x ${item.nombre}</span>
                <span>
                    $${subtotal.toFixed(2)}
                    <button class="btn-remove" onclick="quitarDelCarrito('${item.producto_id}')">Quitar</button>
                </span>
            </div>
        `;
    });

    labelTotal.innerText = `$${total.toFixed(2)}`;
    btnEnviar.disabled = false;
}

async function enviarPedido() {
    if (carrito.length === 0) return;
    
    const btnEnviar = document.getElementById("btn-enviar");
    btnEnviar.disabled = true;
    btnEnviar.innerText = "Procesando...";

    const payload = {
        productos: carrito.map(item => ({
            producto_id: item.producto_id,
            cantidad: item.cantidad
        }))
    };

    try {
        const res = await fetch(`${API_URL}/pedidos/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("¡Pedido realizado con éxito!");
            carrito = [];
            actualizarCarrito();
            cargarMenu(); 
        } else {
            alert("Error al procesar el pedido. Intenta de nuevo.");
        }
    } catch (error) {
        console.error(error);
        alert("Error de red conectando al servidor.");
    } finally {
        btnEnviar.innerText = "Confirmar Pedido";
    }
}
