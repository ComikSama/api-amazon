import express from 'express';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/scrape', async (req, res) => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage();
  await page.goto('https://www.amazon.com/s?k=playstation+5', { waitUntil: 'domcontentloaded' });

  const products = await page.$$eval('.s-card-container', (results) =>
    results.map((el) => {
      const title = el.querySelector('h2')?.innerText?.trim() || 'Sin título';
      const image = el.querySelector('img')?.getAttribute('src') || '';
      
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
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
