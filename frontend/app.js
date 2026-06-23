const API_URL = "https://sep7ima-cafeteria-f7z2.onrender.com"; 
let carrito = [];

window.onload = () => { cargarMenu(); };

async function cargarMenu() {
    const contenedor = document.getElementById("menu-contenedor");

    contenedor.innerHTML = `
        <div class="loader-wrapper">
            <div class="cup-container">
                <div class="steam steam-1"></div>
                <div class="steam steam-2"></div>
                <div class="steam steam-3"></div>
                <div class="coffee-cup"></div>
            </div>
        </div>
    `;

    try {
        // Petición limpia directa a la nube
        const res = await fetch(`${API_URL}/productos/lista`);

        if (!res.ok) throw new Error("Error en la conexión con el servidor");

        const productos = await res.json();

        contenedor.innerHTML = "";

        const disponibles = productos.filter(p => p.disponible);

        if (disponibles.length === 0) {
            contenedor.innerHTML = "<p style='color: var(--text-muted); width: 100%; text-align: center; grid-column: 1 / -1;'>No hay productos disponibles por el momento.</p>";
            return;
        }

        disponibles.forEach(p => {
            const stock = p.cantidad !== undefined ? p.cantidad : 999;
            const agotado = stock <= 0;

            contenedor.innerHTML += `
                <div class="producto-card reveal">
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

        iniciarObservadorAnimaciones();

    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<p style="color: var(--danger); width: 100%; text-align: center; grid-column: 1 / -1;">Error conectando con el menú. Verifica el estado del servidor.</p>`;
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
    // Typo corregido, ya no hay espacio extra
    const index = carrito.findIndex(item => item.producto_id === id);
    
    if(index !== -1) {
        if(carrito[index].cantidad > 1) {
            carrito[index].cantidad--;
        } else {
            carrito.splice(index, 1);
        }
        actualizarCarrito();
    } else {
        console.error("¡No se encontró el producto con ese ID en el carrito!");
    }
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

async function procesarPago() {
    // 1. Capturar los datos del modal
    const nombre = document.getElementById('cliente-nombre').value;
    const apellido = document.getElementById('cliente-apellido').value;
    const email = document.getElementById('cliente-email').value;
    const telefono = document.getElementById('cliente-telefono').value;
    const tokenTarjeta = document.getElementById('tarjeta-token').value;

    // 2. Validación básica para que no manden campos vacíos
    if (!nombre || !apellido || !email || !telefono || !tokenTarjeta) {
        alert("Por favor, llena todos los datos de contacto y pago.");
        return;
    }

    if (carrito.length === 0) {
        alert("Tu carrito está vacío.");
        return;
    }

    // 3. Bloquear el botón para evitar doble cobro
    const btnPagar = document.querySelector('#staticBackdrop .btn-primary');
    const textoOriginal = btnPagar.innerText;
    btnPagar.innerText = "Procesando pago...";
    btnPagar.disabled = true;

    // 4. Armar el Super-Payload (Datos del cliente + Carrito)
    const payload = {
        first_name: nombre,
        last_name: apellido,
        email: email,
        phone: telefono,
        token_tarjeta: tokenTarjeta,
        items: carrito.map(item => ({
            producto_id: item.producto_id,
            nombre: item.nombre,
            precio_unitario: item.precio, 
            cantidad: item.cantidad
        }))
    };

    try {
        const res = await fetch(`${API_URL}/pedidos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const respuestaData = await res.json();
            alert("¡Pago exitoso! Tu pedido está en preparación.");
            carrito = [];
            actualizarCarrito();
            document.getElementById('form-checkout').reset(); 
            const modalElement = document.getElementById('staticBackdrop');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            modalInstance.hide();
            cargarMenu(); 
        } else {
            const errorData = await res.json();
            alert(`El pago fue rechazado: ${errorData.detail || 'Verifica los datos de la tarjeta'}`);
        }
    } catch (error) {
        console.error("Error al procesar el pago:", error);
        alert("Error de conexión con el servidor de pagos.");
    } finally {
        btnPagar.innerText = textoOriginal;
        btnPagar.disabled = false;
    }
}

function iniciarObservadorAnimaciones() {
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add('activo');
                observador.unobserve(entrada.target);
            }
        });
    }, {
        threshold: 0.1
    });

    const tarjetas = document.querySelectorAll('.reveal');
    tarjetas.forEach((tarjeta) => {
        observador.observe(tarjeta);
    });
}
