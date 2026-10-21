import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const privateReview = import.meta.env.FILTERMATCH_BUILD_PROFILE === 'private-review';
  const body = privateReview
    ? ['User-agent: *', 'Disallow: /']
    : [
        'User-agent: *',
        'Allow: /',
        'Disallow: /szukaj/',
        `Sitemap: ${new URL('sitemap-index.xml', site).href}`
      ];

  return new Response(`${body.join('\n')}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
};
