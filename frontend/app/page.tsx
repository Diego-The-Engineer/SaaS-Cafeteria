'use client'

import { useState } from 'react'

const products = [
  { name: 'Latte de la casa', detail: 'Espresso · leche cremosa · caramelo', price: '$4.50', image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=900&q=85' },
  { name: 'Croissant de almendras', detail: 'Hojaldre · almendra · azúcar glass', price: '$3.80', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=85' },
  { name: 'Pour over de temporada', detail: 'Café de especialidad · notas florales', price: '$5.00', image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=85' },
]

const values = [
  { number: '01', title: 'Calidad', text: 'Elegimos cada grano, ingrediente y detalle con intención.' },
  { number: '02', title: 'Comunidad', text: 'Un lugar para encontrarnos, conversar y sentirnos en casa.' },
  { number: '03', title: 'Origen', text: 'Celebramos el trabajo detrás de cada taza y cada historia.' },
]

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <main className="site-shell">
      <header className="nav-wrap">
        <nav className="nav container" aria-label="Navegación principal">
          <a className="brand" href="#inicio" aria-label="Séptima Cafetería, inicio"><span className="logo-mark"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-d7Ropt4LPypBN16QgnGIj6inal0EpQ.png" alt="Ilustración de changuito barista estilo sketch" /></span><span>Séptima</span></a>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Abrir menú">{menuOpen ? 'Cerrar' : 'Menú'} <span>{menuOpen ? '×' : '☰'}</span></button>
          <div className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
            <a href="#nosotros" onClick={() => setMenuOpen(false)}>Nosotros</a>
            <a href="#menu" onClick={() => setMenuOpen(false)}>Menú</a>
            <a href="#ubicacion" onClick={() => setMenuOpen(false)}>Ubicación</a>
            <a className="nav-cta" href="#menu" onClick={() => setMenuOpen(false)}>Ver menú <span>↗</span></a>
          </div>
        </nav>
      </header>

      <section id="inicio" className="hero">
        <div className="hero-photo" aria-hidden="true" />
        <div className="hero-overlay" />
        <div className="container hero-content">
          <p className="eyebrow light">Café de especialidad · desde 2018</p>
          <h1>Un buen café<br /><em>cambia el día.</em></h1>
          <p className="hero-copy">Un espacio para hacer una pausa, disfrutar lo simple y volver a lo esencial.</p>
          <div className="hero-actions"><a className="button button-light" href="menu.html">Descubre el menú <span>↗</span></a><a className="text-link light" href="#nosotros">Conócenos <span>↓</span></a></div>
        </div>
        <div className="hero-note">07° 23' 14.2&quot; N<br /><span>Tu pausa favorita</span></div>
      </section>

      <section id="nosotros" className="about section container">
        <div className="section-label">01 / La casa</div>
        <div className="about-grid">
          <div><p className="eyebrow">Sobre nosotros</p><h2>Hecho para<br /><em>quedarse.</em></h2></div>
          <div className="about-text"><p>Somos una cafetería de especialidad nacida del amor por el café, la buena conversación y esos pequeños momentos que hacen que un día sea distinto.</p><p>En Séptima creemos que cada taza cuenta una historia. Por eso trabajamos con productores que comparten nuestra pasión y cocinamos con ingredientes honestos, locales y de temporada.</p><a className="text-link" href="#valores">Nuestra manera de hacer <span>↗</span></a></div>
        </div>
        <div className="about-image"><img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1800&q=85" alt="Barista preparando café filtrado en la barra" /><div className="image-caption">Un lugar para volver<br /><span>— Séptima, barrio y café</span></div></div>
      </section>

      <section id="valores" className="values section">
        <div className="container"><div className="section-label">02 / Lo que nos mueve</div><div className="values-heading"><h2>Más que café,<br /><em>una forma de estar.</em></h2><p>Creemos en hacer las cosas con calma, con propósito y con mucho cariño.</p></div><div className="values-grid">{values.map((value) => <article className="value-card" key={value.number}><span className="value-number">{value.number}</span><h3>{value.title}</h3><p>{value.text}</p><span className="card-line" /></article>)}</div></div>
      </section>

      <section id="menu" className="products section container"><div className="section-label">03 / Para disfrutar</div><div className="products-heading"><div><p className="eyebrow">De nuestra barra</p><h2>Lo que se<br /><em>antoja hoy.</em></h2></div><a className="text-link" href="/menu.pdf" target="_blank" rel="noreferrer">Ver menú completo <span>↗</span></a></div><div className="product-grid">{products.map((product) => <article className="product-card" key={product.name}><div className="product-image"><img src={product.image} alt={product.name} /><span className="product-price">{product.price}</span></div><div className="product-info"><h3>{product.name}</h3><p>{product.detail}</p></div></article>)}</div></section>

      <section className="menu-banner"><div className="menu-banner-photo" aria-hidden="true" /><div className="menu-banner-content"><p className="eyebrow light">Todo lo que hacemos</p><h2>Ven por el café.<br /><em>Quédate por todo.</em></h2><a className="button button-outline" href="/menu.pdf" target="_blank" rel="noreferrer">Descargar menú <span>↓</span></a></div></section>

      <section id="ubicacion" className="location section container"><div className="section-label">04 / Encuéntranos</div><div className="location-grid"><div><p className="eyebrow">Visítanos</p><h2>Tu mesa<br /><em>te espera.</em></h2><div className="address"><p>Av. Séptima 142<br />Barrio La Soledad<br />Bogotá, Colombia</p><a href="https://maps.google.com/?q=Av.+Séptima+142+Bogotá" target="_blank" rel="noreferrer" className="text-link">Cómo llegar <span>↗</span></a></div></div><div className="map-card"><iframe title="Ubicación de Séptima Cafetería" src="https://www.openstreetmap.org/export/embed.html?bbox=-74.076%2C4.635%2C-74.066%2C4.645&layer=mapnik&marker=4.640%2C-74.071" /><div className="map-label"><span className="map-dot" /> Séptima Cafetería</div></div></div></section>

      <footer className="footer"><div className="container footer-top"><a className="brand footer-brand" href="#inicio" aria-label="Séptima Cafetería, inicio"><span className="logo-mark"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-d7Ropt4LPypBN16QgnGIj6inal0EpQ.png" alt="Ilustración de changuito barista estilo sketch" /></span><span>Séptima</span></a><p>Un buen café cambia el día.</p><div className="socials"><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram ↗</a><a href="mailto:hola@septimacafeteria.com">Contacto ↗</a></div></div><div className="container footer-bottom"><span>© 2026 Séptima Cafetería</span><span>Hecho con calma, servido con amor.</span><a href="#inicio">Volver arriba ↑</a></div></footer>
    </main>
  )
}
