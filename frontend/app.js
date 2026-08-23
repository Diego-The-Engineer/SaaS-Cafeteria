const esLocal = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1:5503" || window.location.hostname === "192.168.56.101");
const API_URL = esLocal ? "http://localhost:5503" : "https://sep7ima-cafeteria-f7z2.onrender.com";
let mapa;
let sucursal;
let autocomplete;
let geocoder;
let carrito = [];
let productosGlobales = []; 
let categoriasGlobales = [];
let categoriaActiva = "Todos"; 
let datosPedido = {
    tipoEntrega: null,
    latitudCliente: null,
    longitudCliente: null,
    direccionTexto: null,
    distanciaKm: null,
    costoEnvio: 0
};
window.onload = () => { cargarMenu(); };

// --- CARGA INICIAL ---
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
        const prodId = p.id || p._id; 

        let selectorHTML = '';
        let tieneVariantes = p.variantes && p.variantes.length > 0;
        let saboresHTML = '';
        if (p.sabores && p.sabores.length > 0) {
            saboresHTML = `<select id="sabor-${prodId}" style="margin: 8px 0; padding: 6px; border-radius: 5px; width: 100%; border: 1px solid #ccc; background-color: #fff;">`;
            saboresHTML += `<option value="" disabled selected>Elige un sabor...</option>`; 
            
            p.sabores.forEach(sab => {
                if (sab.disponible) {
                    saboresHTML += `<option value="${sab.nombre}">${sab.nombre}</option>`;
                }
            });
            saboresHTML += `</select>`;
        }
        if (tieneVariantes) {
            selectorHTML = `<select id="variante-${prodId}" style="margin: 8px 0; padding: 6px; border-radius: 5px; width: 100%; border: 1px solid #ccc; background-color: #fff;">`;
            p.variantes.forEach(v => {
                selectorHTML += `<option value="${v.tamaño}|${v.precio}">${v.tamaño} - $${v.precio.toFixed(2)}</option>`;
            });
            selectorHTML += `</select>`;
        } else {
            selectorHTML = `<p style="color: red; font-size: 12px; margin: 8px 0;">Sin tamaños configurados</p>`;
        }
        const descripcionHTML = (p.descripcion && p.descripcion!== null) 
            ? `<p class="descripcion-prod" style="font-size: 0.85em; color: #777; margin: 4px 0 8px 0; line-height: 1.4; font-style: italic;">${p.descripcion}</p>` 
            : '';

        let opcionesHTML = '';
        if (p.opciones && p.opciones.length > 0) {
            opcionesHTML = `<div class="opciones-seleccion" style="margin: 10px 0; text-align: left; background: #faf6f0; padding: 8px; border-radius: 8px; border: 1px solid #ebd9cb;">`;
            opcionesHTML += `<small style="font-weight: bold; color: #5c4033; display: block; margin-bottom: 5px; font-size: 0.8em;">Personaliza tu bebida:</small>`;
            
            p.opciones.forEach((opc, index) => {
                const precioBadge = opc.precio_extra ? `+$${opc.precio_extra.toFixed(2)}` : 'Gratis';
                const colorBadge = opc.precio_extra ? '#a52a2a' : '#4CAF50';
                
                opcionesHTML += `
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.85em; margin-bottom: 4px;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; width: 100%;">
                            <input type="checkbox" class="opcion-chk-${prodId}" value="${opc.nombre}" data-precio="${opc.precio_extra || 0}">
                            <span>${opc.nombre}</span>
                        </label>
                        <span style="color: ${colorBadge}; font-weight: 600; font-size: 0.9em; white-space: nowrap; margin-left: 5px;">${precioBadge}</span>
                    </div>
                `;
            });
            opcionesHTML += `</div>`;
        }

        

        const imagenSource = p.imagen ? p.imagen : "https://via.placeholder.com/400x200/E8D5C4/8B5E34?text=S%C3%A9ptima+Caf%C3%A9";

        contenedor.innerHTML += `
            <div class="producto-card reveal">
                <img src="${imagenSource}" alt="${p.nombre}" class="producto-img" loading="lazy">
                
                <div class="producto-info">
                    <div>
                        <h3>${p.nombre}</h3>
                        ${descripcionHTML} <p class="stock">${agotado ? 'Agotado' : `Disponibles: ${stock}`}</p>
                        ${selectorHTML}
                        ${saboresHTML}
                        ${opcionesHTML}    
                    </div>
                    
                    <div style="margin-top: 10px;">
                        <button class="btn-add" style="width: 100%;"
                            onclick="agregarAlCarrito('${prodId}', '${p.nombre}')"
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
    let precio = parseFloat(precioString); 
    const selectSabor = document.getElementById(`sabor-${id}`);
    let saborElegido = "";
    if (selectSabor) {
        if (selectSabor.value === "") {
            Toastify({
            text: "Alerta: Por favor, selecciona un sabor",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
        }).showToast();
            return; 
        }
        saborElegido = selectSabor.value;
    }

    const checkboxes = document.querySelectorAll(`.opcion-chk-${id}:checked`);
    let opcionesElegidas = [];
    if (saborElegido !== "") {
        opcionesElegidas.push(`Sabor ${saborElegido}`);
    }

    // Leemos los checkboxes (extras)
    checkboxes.forEach(chk => {
        opcionesElegidas.push(chk.value); 
        precio += parseFloat(chk.getAttribute('data-precio') || 0); 
    });

    let nombreFinal = nombre;
    let sufijoOpciones = ""; 
    
    if (opcionesElegidas.length > 0) {
        sufijoOpciones = opcionesElegidas.join(', ');
        nombreFinal = `${nombre} (${sufijoOpciones})`;
    }

    const idUnico = `${id}-${tamano}-${sufijoOpciones}`;

    const itemExistente = carrito.find(item => item.idUnico === idUnico);

    if (itemExistente) {
        itemExistente.cantidad += 1;
    } else {
        carrito.push({ 
            idUnico: idUnico, 
            producto_id: id, 
            nombre: nombreFinal, 
            tamano: tamano,
            precio: precio,     
            cantidad: 1 
        });
    }
    
    checkboxes.forEach(chk => chk.checked = false);

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
    btnPagar.innerText = "Procesando pedido...";
    btnPagar.disabled = true;

    try {
        const nombre = document.getElementById("nombre").value;
        const apellido = document.getElementById("apellido").value;
        const telefono = document.getElementById("telefono").value;
        const metodoPagoInput = document.getElementById("metodo-pago");
        const metodoPago = metodoPagoInput ? metodoPagoInput.value : "Tarjeta"; 
        const totalPedido = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        let tokenSeguro = "N/A"; 

        // Solo conectamos con eCartPay si eligieron Tarjeta
        if (metodoPago === "Tarjeta") {
            btnPagar.innerText = "Encriptando tarjeta...";
            const cardNum = document.getElementById("card-number").value.replace(/\s/g, ''); 
            const cardMonth = document.getElementById("card-month").value;
            const cardYear = document.getElementById("card-year").value;
            const cardCvc = document.getElementById("card-cvc").value;       
            
            const respuestaToken = await fetch(`${API_URL}/pedidos/api/obtener_token`,{ method: "POST" }); 
            if (!respuestaToken.ok) throw new Error("Fallo al obtener el pase del banco");
            const miToken = (await respuestaToken.json()).token;
            
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

            if (!tokenResponse.ok) throw new Error("Datos de tarjeta inválidos");
            const tokenData = await tokenResponse.json();
            tokenSeguro = tokenData.id || tokenData.token; 
        }

        btnPagar.innerText = "Confirmando pedido...";
        const pedidoData = {
            items: carrito, 
            first_name: nombre,
            last_name: apellido,
            phone: telefono,
            token_tarjeta: tokenSeguro,
            metodo_pago: metodoPago,
            total: totalPedido,
            monto_recibido: montoRecibido,
            cambio: cambio
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
        Toastify({
            text: "¡Pedido confirmado con éxito! " + (metodoPago === 'Efectivo' ? 'Puedes pagar en caja.' : ''),
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#a8d96c", color: "white", borderRadius: "8px" }
        }).showToast();
        carrito = [];
        const modal = bootstrap.Modal.getInstance(document.getElementById('staticBackdrop'));
        if (modal) modal.hide();
        cargarMenu();
        actualizarCarrito();
        document.getElementById("form-checkout").reset();

    } catch (error) {
        Toastify({
            text: "Aviso: " + error.message,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
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

function buscarProducto() {
    const input = document.getElementById("buscador-menu").value.toLowerCase();
    const tarjetas = document.querySelectorAll(".producto-card");
    tarjetas.forEach(tarjeta => {
        const nombreProducto = tarjeta.querySelector("h3").innerText.toLowerCase();
        if (nombreProducto.includes(input)) {
            tarjeta.style.display = "flex"; 
        } else {
            tarjeta.style.display = "none";
        }
    });
}

// PEDIDOS //

function initMapa(){
    const btnContinuar = document.getElementById("btn-continuar-pago");
    const sucursal_lat = {
        lat:17.078399006698426, 
        lng: -96.72288414676025 
    };

    mapa = new google.maps.Map(document.getElementById("mapa-google"), {
        center: sucursal_lat,
        zoom: 15,
    });

    geocoder = new google.maps.Geocoder();

     marcador = new google.maps.Marker({
        position: sucursal_lat,
        map: mapa,
        title: "Tu ubicación de entrega",
        Draggable: true,
        animation: google.maps.Animation.DROP
    });

    marcador.addListener("dragend", (event) => {
        const nuevaPosicion = event.latLng;
        traducirCoordenadasADireccion(nuevaPosicion);
    });

const inputCalle = document.getElementById("input-calle");
    autocomplete = new google.maps.places.Autocomplete(inputCalle, {
        types: ["address"],
        componentRestrictions: { country: "mx" }
    });
    
    autocomplete.bindTo("bounds", mapa);
    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
            alert("Por favor, selecciona una dirección válida de la lista de sugerencias.");
            return;
        }

        const ubicacionCliente = place.geometry.location;
        mapa.setCenter(ubicacionCliente);
        mapa.setZoom(16);
        marcador.setPosition(ubicacionCliente);
        datosPedido.latitudCliente = ubicacionCliente.lat();
        datosPedido.longitudCliente = ubicacionCliente.lng();
        datosPedido.direccionTexto = place.formatted_address;
        document.getElementById("input-colonia").value = "";
        if (place.address_components) {
            const componenteColonia = place.address_components.find(c => c.types.includes("sublocality") || c.types.includes("neighborhood"));
            if (componenteColonia) {
                document.getElementById("input-colonia").value = componenteColonia.long_name;
            }
        }
        btnContinuar.disabled = false;
        calcularDistanciaEntrega(ubicacionCliente);
    });
    
}

function traducirCoordenadasADireccion(latLng) {
    const btnContinuar = document.getElementById("btn-continuar-pago");
    geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === "OK" && results[0]) {
            let calle = "";
            let numero = "";
            let colonia = "";
            let cp = "";
            results[0].address_components.forEach(componente => {
                if (componente.types.includes("route")) calle = componente.long_name;
                if (componente.types.includes("street_number")) numero = componente.long_name;
                if(componente.types.includes("postal_code")) cp = componente.long_name;
                if (componente.types.includes("sublocality") || componente.types.includes("neighborhood")) colonia = componente.long_name;
            });
            let direccionFinal = calle;
            if (numero) direccionFinal += " #" + numero;
            document.getElementById("input-calle").value = direccionFinal;
            document.getElementById("input-colonia").value = colonia;
            document.getElementById("input-cp").value = cp;
            datosPedido.direccion.coordenadas = { lat: latLng.lat(), lng: latLng.lng() };
        } else {
            console.log("No se pudo leer la calle de esas coordenadas.");
        }
    });
    btnContinuar.disabled = false;
}

function validarCamposDomicilio() {
    const calle = document.getElementById("input-calle").value.trim();
    const colonia = document.getElementById("input-colonia").value.trim();
    const cp = document.getElementById("input-cp").value.trim();
    const btnContinuar = document.getElementById("btn-continuar-pago");
    if (calle !== "" && colonia !== "" && cp !== "") {
        btnContinuar.disabled = false;
    } else {
        btnContinuar.disabled = true;
    }
}

function calcularDistanciaEntrega(destinoCliente) {
    const servicioDistancia = new google.maps.DistanceMatrixService(); 
    const btnContinuar = document.getElementById("btn-continuar-pago");

    servicioDistancia.getDistanceMatrix({
        origins: [SUCURSAL_COORDENADAS],
        destinations: [destinoCliente],
        travelMode: google.maps.TravelMode.DRIVING, 
        unitSystem: google.maps.UnitSystem.METRIC
    }, (response, status) => {
        if (status !== "OK") {
            alert("Error al calcular la distancia de envío.");
            return;
        }

        const resultado = response.rows[0].elements[0];

        if (resultado.status === "OK") {
            const distanciaTexto = resultado.distance.text; 
            const distanciaValorKm = resultado.distance.value / 1000; 

            datosPedido.distanciaKm = distanciaValorKm;
            if (distanciaValorKm > DISTANCIA_MAXIMA_KM) {
                alert(`Lo sentimos, la dirección está fuera de nuestra zona de cobertura técnica. Distancia actual: ${distanciaTexto}. Nuestro límite es de ${DISTANCIA_MAXIMA_KM} km.`);
                btnContinuar.disabled = true; 
                datosPedido.costoEnvio = 0;
            } else {
                btnContinuar.disabled = false; 
                
                if (distanciaValorKm <= 5) {
                    datosPedido.costoEnvio = 30; 
                } else {
                    datosPedido.costoEnvio = 60; 
                }
                
                console.log(`Envío autorizado. Distancia: ${distanciaTexto}. Costo de envío: $${datosPedido.costoEnvio}`);
            }
        } else {
            alert("No se pudo calcular una ruta en auto hacia esa dirección.");
            btnContinuar.disabled = true;
        }
    });
}

function iniciarCheckout() {
    const modalEntrega = new bootstrap.Modal(document.getElementById('modal-tipo-entrega'));
    modalEntrega.show();
}

function seleccionarEntrega(tipo) {
    datosPedido.tipoEntrega = tipo;
    
    const seccionDomicilio = document.getElementById("seccion-domicilio");
    const btnContinuar = document.getElementById("btn-continuar-pago");
    const btnVolver = document.getElementById("btn-volver-entrega");
    const contenedorBotones = document.getElementById("botones-entrega");
    const btnMostrador = contenedorBotones.children[0];
    const btnDomicilio = contenedorBotones.children[1];

    if (tipo === 'domicilio') {
        btnMostrador.classList.add('btn-oculto');
        btnDomicilio.classList.remove('btn-oculto');
        
        setTimeout(() => {
            seccionDomicilio.style.display = "block";
            initMapa(); 
            setTimeout(() => seccionDomicilio.style.opacity = "1", 10);
        }, 300);
        
    } else {
        btnDomicilio.classList.add('btn-oculto');
        btnMostrador.classList.remove('btn-oculto');
        
        seccionDomicilio.style.opacity = "0";
        setTimeout(() => {
            seccionDomicilio.style.display = "none";
        }, 300);
          btnContinuar.disabled = false;
    }
    btnVolver.style.display = "block";
}

function volverSeleccion() {
    datosPedido.tipoEntrega = null;
    
    const seccionDomicilio = document.getElementById("seccion-domicilio");
    const btnContinuar = document.getElementById("btn-continuar-pago");
    const btnVolver = document.getElementById("btn-volver-entrega");
    
    const contenedorBotones = document.getElementById("botones-entrega");
    const btnMostrador = contenedorBotones.children[0];
    const btnDomicilio = contenedorBotones.children[1];
    seccionDomicilio.style.opacity = "0";
    
    setTimeout(() => {
        seccionDomicilio.style.display = "none";
        btnMostrador.classList.remove('btn-oculto');
        btnDomicilio.classList.remove('btn-oculto');
    }, 300);
    btnVolver.style.display = "none";
    btnContinuar.disabled = true;
}

function abrirModalResumenPago() {
    const modalResumenEl = document.getElementById('modal-resumen-pago');
    if (!modalResumenEl) {
        console.error("Falta el HTML de modal-resumen-pago");
        alert("Falta agregar el HTML del modal de resumen de pago.");
        return;
    }
    const modalEntregaEl = document.getElementById('modal-tipo-entrega');
    const modalEntrega = bootstrap.Modal.getOrCreateInstance(modalEntregaEl);
    modalEntrega.hide();
    const modalResumen = bootstrap.Modal.getOrCreateInstance(modalResumenEl);
    modalResumen.show();
}

function actualizarMapaDesdeTexto() {
    const btnContinuar = document.getElementById("boton-continuar-pago");
    const calle = document.getElementById("input-calle").value;
    const colonia = document.getElementById("input-colonia").value;
    const cp = document.getElementById("input-cp").value;
    if (calle !== "" || colonia !== "") {

        const direccionCompleta = `${calle}, ${colonia}, ${cp},Oaxaca, Mexico`; 
        
        geocoder.geocode({ address: direccionCompleta }, (results, status) => {
            if (status === "OK") {
                const nuevaUbicacion = results[0].geometry.location;
                mapa.setCenter(nuevaUbicacion);
                marcador.setPosition(nuevaUbicacion);
                datosPedido.direccion.coordenadas = {lat: nuevaUbicacion.lat(), lng: nuevaUbicacion.lng()};
            } else {
                console.log("Google no encontró la dirección escrita: " + status);
            }
        });
    }
    btnContinuar.disabled = false;
}

function abrirModalPago(metodo) {
    datosPedido.metodoPago = metodo;
    const modalResumenEl = document.getElementById('modal-resumen-pago');
    const modalResumen = bootstrap.Modal.getInstance(modalResumenEl);
    modalResumen.hide();
    if (metodo === 'efectivo') {
        const modalEfectivo = new bootstrap.Modal(document.getElementById('modal-efectivo'));
        modalEfectivo.show();   
    } else if (metodo === 'tarjeta') {
        const modalTarjeta = new bootstrap.Modal(document.getElementById('staticBackdrop'));
        modalTarjeta.show();
        
    } else if (metodo === 'transferencia') {
        Toastify({
            text: "Opcion de transferencia en desarrollo",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
        }).showToast();
    }
}

function marcarPagoExacto (){
    let total = document.getElementById("total-efectivo").value;
    return total;
}

function calcularCambio(precio){
    let total = document.getElementById("total-efectivo").value;
    if(precio < total){
        alert("Este monto es menor al total");
    }
    let cambio = total - precio;
    document.getElementById("label-cambio") = cambio;
    
}