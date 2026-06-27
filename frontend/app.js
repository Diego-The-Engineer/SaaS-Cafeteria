const esLocal = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "192.168.56.101");

 const API_URL = esLocal ? "http://localhost:5500" : "https://sep7ima-cafeteria-f7z2.onrender.com";

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
    const index = carrito.findIndex(item => item.producto_id === id);
    
    if(index !== -1) {
        if(carrito[index].cantidad > 1) {
            carrito[index].cantidad--;
        } else {
            carrito.splice(index, 1);
        }
        actualizarCarrito();
    } else {
        console.error("No se encontró el producto con ese ID en el carrito");
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
    const btnPagar = document.getElementById("btn-pagar"); 
    btnPagar.innerText = "Encriptando tarjeta...";
    btnPagar.disabled = true;

    try {

        const nombre = document.getElementById("nombre").value || "Diego";
        const apellido = document.getElementById("apellido").value || "Gómez";
        const email = document.getElementById("email").value || "diego.aimi67@gmail.com";
        const telefono = document.getElementById("telefono").value || "9514087678";
        
        const cardNum = document.getElementById("card-number").value.replace(/\s/g, ''); 
        const cardMonth = document.getElementById("card-month").value;
        const cardYear = document.getElementById("card-year").value;
        const cardCvc = document.getElementById("card-cvc").value;       
        const respuestaToken = await fetch(`${API_URL}/pedidos/api/obtener_token`,{
            method: "POST"
        }); 
        if (!respuestaToken.ok) throw new Error("Fallo al obtener el pase del banco");
        const datosToken = await respuestaToken.json();
        const miToken = datosToken.token;
        const tokenResponse = await fetch("https://ecartpay.com/api/tokens", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${miToken}`
            },
            body: JSON.stringify({
                name: nombre + " " + apellido,
                number: cardNum,
                exp_month: cardMonth,
                exp_year: "20" + cardYear,
                cvc: cardCvc
            })
        });

        if (!tokenResponse.ok) {
            const token_response = await tokenResponse.json()
            throw new Error("Datos inválidos");
        }

        const tokenData = await tokenResponse.json();
        const tokenSeguro = tokenData.id || tokenData.token; 
        btnPagar.innerText = "Procesando cobro...";
     
        const pedidoData = {
            items: carrito, 
            first_name: nombre,
            last_name: apellido,
            email: email,
            phone: telefono,
            token_tarjeta: tokenSeguro 
        };

        const backendResponse = await fetch(`${API_URL}/pedidos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pedidoData)
        });

        if (!backendResponse.ok) {
            const errorBack = await backendResponse.json();
            throw new Error(errorBack.detail || "Error en el servidor");
        }

        alert("¡Pago exitoso! Tu pedido ha sido confirmado.");

        carrito = [];
        const modal = bootstrap.Modal.getInstance(document.getElementById('staticBackdrop'));
        modal.hide();
        cargarMenu();
        actualizarCarrito();
        document.getElementById("form-checkout").reset();

    } catch (error) {
        alert("El pago fue rechazado: " + error.message);
    } finally {
        btnPagar.innerText = "Confirmar y Pagar";
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
