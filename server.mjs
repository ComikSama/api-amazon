import express from 'express';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 10000;

// Configurar CSP para permitir imágenes base64 y carga desde https
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline';"
  );
  next();
});

// Ruta raíz para verificar que la API está activa
app.get('/', (req, res) => {
  res.send('<h1>API de Scraping Activa</h1>');
});

// Endpoint de scraping
app.get('/scrape', async (req, res) => {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://www.amazon.com/s?k=playstation+5', { waitUntil: 'domcontentloaded' });

    const products = await page.$$eval('.s-card-container', (results) =>
      results.map((el) => {
        const title = el.querySelector('h2')?.innerText?.trim() || 'Sin título';
        const image = el.querySelector('img')?.getAttribute('src') || '';

        // Buscamos precios en texto que contenga "US$"
        const rawText = Array.from(el.querySelectorAll('.a-color-base, .a-price .a-offscreen'))
          .map(span => span.innerText)
          .find(text => text && text.includes('US$'));

        const priceMatch = rawText?.match(/US\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/);
        const price = priceMatch ? priceMatch[0] : 'Sin precio';

        const link = el.querySelector('a')?.href || '';
        return { title, image, price, link };
      }).filter(p => p.title !== 'Sin título')
    );

    await browser.close();
    res.json(products);
  } catch (error) {
    console.error('Error al hacer scraping:', error);
    res.status(500).json({
      error: 'Ocurrió un error al hacer scraping.',
      detalle: error.message,
      stack: error.stack
    });
  }
});

// Servidor escuchando en el puerto configurado
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
