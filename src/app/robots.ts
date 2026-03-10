import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/provider', '/owner', '/admin', '/auth', '/api/'],
    },
    sitemap: 'https://chairmatch.de/sitemap.xml',
  }
}
