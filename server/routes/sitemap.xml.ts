import projects from '~~/content/projects.json'

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] || character)
}

export default defineEventHandler(async (event) => {
  const base = useRuntimeConfig(event).public.siteUrl || 'http://localhost:3000'
  const root = base.replace(/\/$/, '')
  const projectUrls = (projects as Array<{ id: string }>).map(project => `
  <url>
    <loc>${escapeXml(`${root}/projects/${project.id}`)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(`${root}/`)}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  ${projectUrls}
</urlset>`
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return xml
})
