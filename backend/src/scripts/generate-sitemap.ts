import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://growflowai.space';

const STATIC_PAGES = [
  '',
  '/sign-in',
  '/sign-up',
  '/pricing',
  '/for/fitness-creators',
  '/for/finance-creators',
  '/for/tech-creators',
  '/for/food-bloggers',
  '/tools/instagram-caption-generator',
  '/tools/youtube-hook-generator',
  '/tools/linkedin-post-generator',
  '/tools/viral-hook-generator-india',
  '/blog/how-to-grow-instagram-india-2026',
  '/blog/viral-content-formula-hindi-creators',
  '/vs/jasper-ai-india',
  '/vs/copy-ai-india',
];

export function generateSitemap() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${STATIC_PAGES.map(page => `
  <url>
    <loc>${BASE_URL}${page}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>`).join('')}
</urlset>`;

  const outputPath = path.join(process.cwd(), '..', 'frontend', 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, sitemap.trim());
  console.log(`Sitemap generated successfully at ${outputPath}`);
}

generateSitemap();
