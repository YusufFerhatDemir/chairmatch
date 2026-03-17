import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/provider', '/owner', '/booking'],
    },
    sitemap: 'https://chairmatch.de/sitemap.xml',
  }
}
