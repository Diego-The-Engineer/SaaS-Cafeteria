const esLocal = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "192.168.56.101");
const API_URL = esLocal ? "http://localhost:5500" : "https://sep7ima-cafeteria-f7z2.onrender.com";

let carrito = [];
let productosGlobales = []; 
let categoriasGlobales = [];
let categoriaActiva = "Todos"; 

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
        const resCat = await fetch(`${API_URL}/categorias/lista`);
        if(resCat.ok){
            categoriasGlobales = await resCat.json();
        }
        const res = await fetch(`${API_URL}/productos/lista`);
        if (!res.ok) throw new Error("Error en la conexión con el servidor");

        const productos = await res.json();
        productosGlobales = productos.filter(p => p.disponible);

        if (productosGlobales.length === 0) {
            contenedor.innerHTML = "<p style='color: var(--text-muted); width: 100%; text-align: center; grid-column: 1 / -1;'>No hay productos disponibles por el momento.</p>";
            return;
        }

        renderizarCategorias();
        renderizarProductos();

    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<p style="color: var(--danger); width: 100%; text-align: center; grid-column: 1 / -1;">Error conectando con el menú. Verifica el estado del servidor.</p>`;
    }
}

// --- SISTEMA DE FILTROS ---
function renderizarCategorias() {
    const contenedorFiltros = document.getElementById("categorias-filtro");
    if (!contenedorFiltros) return;

    const categoriasSet = new Set(productosGlobales.map(p => p.categoria_id || "Otros"));
    const categorias = ["Todos", ...Array.from(categoriasSet)];

    let botonesHTML = `<div class="categorias-wrapper">`;
    
    categorias.forEach(cat => {
        const claseActiva = (cat === categoriaActiva) ? 'activa' : '';
        let mostrar_nombre = cat;
        if(cat === "Todos"){
            mostrar_nombre = "Todos";
        }else if( cat === "Otros") mostrar_nombre = "Otros";
        else {
            const categoria_encontrada = categoriasGlobales.find(c => c.categoria_id === cat);
            mostrar_nombre = categoria_encontrada ? categoria_encontrada.nombre : "Sin nombre";
        }
        botonesHTML += `<button class="btn-categoria ${claseActiva}" onclick="filtrarCategoria('${cat}')">${mostrar_nombre}</button>`;
    });
    
    botonesHTML += `</div>`;
    contenedorFiltros.innerHTML = botonesHTML;
}

function filtrarCategoria(categoria) {
    categoriaActiva = categoria; 
    renderizarCategorias();      
    renderizarProductos();       
}

// --- RENDERIZADO DEL MENÚ ---
function renderizarProductos() {
    const contenedor = document.getElementById("menu-contenedor");
    contenedor.innerHTML = "";

    let productosAMostrar = productosGlobales;
    if (categoriaActiva !== "Todos") {
        productosAMostrar = productosGlobales.filter(p => (p.categoria_id || "Otros") === categoriaActiva);
    }

    if (productosAMostrar.length === 0) {
        contenedor.innerHTML = `<p style="color: gray; text-align: center; width: 100%; grid-column: 1 / -1;">No hay productos en esta categoría.</p>`;
        return;
    }

    productosAMostrar.forEach(p => {
        const stock = p.cantidad !== undefined ? p.cantidad : 0;
        const agotado = stock <= 0;

        let selectorHTML = '';
        let tieneVariantes = p.variantes && p.variantes.length > 0;

        if (tieneVariantes) {
            selectorHTML = `<select id="variante-${p.id || p._id}" style="margin: 8px 0; padding: 6px; border-radius: 5px; width: 100%; border: 1px solid #ccc; background-color: #fff;">`;
            p.variantes.forEach(v => {
                selectorHTML += `<option value="${v.tamaño}|${v.precio}">${v.tamaño} - $${v.precio.toFixed(2)}</option>`;
            });
            selectorHTML += `</select>`;
        } else {
            selectorHTML = `<p style="color: red; font-size: 12px; margin: 8px 0;">Sin tamaños configurados</p>`;
        }

        const imagenSource = p.imagen ? p.imagen : "https://via.placeholder.com/400x200/E8D5C4/8B5E34?text=S%C3%A9ptima+Caf%C3%A9";

        contenedor.innerHTML += `
            <div class="producto-card reveal">
                <img src="${imagenSource}" alt="${p.nombre}" class="producto-img" loading="lazy">
                
                <div class="producto-info">
                    <div>
                        <h3>${p.nombre}</h3>
                        <p class="stock">${agotado ? 'Agotado' : `Disponibles: ${stock}`}</p>
                        ${selectorHTML}
                    </div>
                    
                    <div style="margin-top: 10px;">
                        <button class="btn-add" style="width: 100%;"
                            onclick="agregarAlCarrito('${p.id || p._id}', '${p.nombre}')"
                            ${(agotado || !tieneVariantes) ? 'disabled' : ''}>
                            ${agotado ? 'Sin Stock' : 'Agregar'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    iniciarObservadorAnimaciones();
}

// --- LÓGICA DEL CARRITO ---
function agregarAlCarrito(id, nombre) {
    const select = document.getElementById(`variante-${id}`);
    if (!select) return;

    const [tamano, precioString] = select.value.split('|');
    const precio = parseFloat(precioString);
    const idUnico = `${id}-${tamano}`;

    const itemExistente = carrito.find(item => item.idUnico === idUnico);

    if (itemExistente) {
        itemExistente.cantidad += 1;
    } else {
        carrito.push({ 
            idUnico: idUnico, 
            producto_id: id, 
            nombre: nombre, 
            tamano: tamano,
            precio: precio, 
            cantidad: 1 
        });
    }
    actualizarCarrito();
}

function quitarDelCarrito(idUnico) {
    const index = carrito.findIndex(item => item.idUnico === idUnico);
    
    if(index !== -1) {
        if(carrito[index].cantidad > 1) {
            carrito[index].cantidad--;
        } else {
            carrito.splice(index, 1);
        }
        actualizarCarrito();
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
    } else {
        carrito.forEach(item => {
            const subtotal = item.precio * item.cantidad;
            total += subtotal;
            lista.innerHTML += `
                <div class="carrito-item">
                    <span>${item.cantidad}x ${item.nombre} <b>(${item.tamano})</b></span>
                    <span>
                        $${subtotal.toFixed(2)}
                        <button class="btn-remove" onclick="quitarDelCarrito('${item.idUnico}')">Quitar</button>
                    </span>
                </div>
            `;
        });
        labelTotal.innerText = `$${total.toFixed(2)}`;
        btnEnviar.disabled = false;
    }

    const flotanteMovil = document.getElementById('flotante-movil');
    const flotanteTotal = document.getElementById('flotante-total');
    const flotanteCantidad = document.getElementById('flotante-cantidad');

    if (flotanteMovil) {
        if (carrito.length > 0) {
            const cantidadItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
            flotanteCantidad.innerText = cantidadItems;
            flotanteTotal.innerText = `$${total.toFixed(2)}`;
            flotanteMovil.classList.add('mostrar'); 
        } else {
            flotanteMovil.classList.remove('mostrar'); 
        }
    }
}

// --- LÓGICA DE PAGO ---
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
            throw new Error("Datos de tarjeta inválidos");
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
            throw new Error(errorBack.detail || "Error procesando el pedido en el servidor");
        }

        alert("¡Pago exitoso! Tu pedido ha sido confirmado.");

        carrito = [];
        const modal = bootstrap.Modal.getInstance(document.getElementById('staticBackdrop'));
        modal.hide();
        cargarMenu();
        actualizarCarrito();
        document.getElementById("form-checkout").reset();

    } catch (error) {
        Toastify({
            text: "Pago rechazado: " + error.message,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: "#D96C6C",
                color: "white",
                borderRadius: "8px"
            }
        }).showToast();
    } finally {
        btnPagar.innerText = "Confirmar y Pagar";
        btnPagar.disabled = false;
    }
}

// --- UTILIDADES ---
function iniciarObservadorAnimaciones() {
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add('activo');
                observador.unobserve(entrada.target);
            }
        });
    }, { threshold: 0.1 });

    const tarjetas = document.querySelectorAll('.reveal');
    tarjetas.forEach((tarjeta) => {
        observador.observe(tarjeta);
    });
}

function scrollToCart() {
    const carritoSeccion = document.querySelector('.carrito-container');
    if (carritoSeccion) {
        carritoSeccion.scrollIntoView({ behavior: 'smooth' });
    }
}