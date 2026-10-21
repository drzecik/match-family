import { next, rewrite } from '@vercel/functions';

const ACCESS_USERNAME = 'filtermatch';
const AUTH_REALM = 'FilterMatch';
const NO_INDEX = 'noindex, nofollow, noarchive';

export default function middleware(request: Request): Response {
  const password = process.env.FILTERMATCH_ACCESS_PASSWORD;
  if (!password) {
    return new Response('FilterMatch jest chwilowo niedostępny: brak konfiguracji dostępu.', {
      status: 503,
      headers: protectedHeaders()
    });
  }

  const expectedAuthorization = `Basic ${btoa(`${ACCESS_USERNAME}:${password}`)}`;
  if (request.headers.get('authorization') !== expectedAuthorization) {
    return new Response('Dostęp do FilterMatch wymaga hasła.', {
      status: 401,
      headers: {
        ...protectedHeaders(),
        'www-authenticate': `Basic realm="${AUTH_REALM}", charset="UTF-8"`
      }
    });
  }

  if (process.env.FILTERMATCH_BUILD_PROFILE === 'private-review') {
    const url = new URL(request.url);
    if (url.pathname === '/katalog/' || url.pathname === '/katalog') {
      return rewrite(new URL('/przeglad-danych/', url), {
        headers: privateResponseHeaders()
      });
    }
    if (/^\/(?:urzadzenia|materialy|szukaj|korekty|afiliacja)(?:\/|$)/u.test(url.pathname)) {
      return new Response('Ta trasa demonstracyjna jest wyłączona w prywatnym katalogu.', {
        status: 404,
        headers: protectedHeaders()
      });
    }
  }

  return next({ headers: privateResponseHeaders() });
}

function protectedHeaders(): Record<string, string> {
  return {
    'cache-control': 'no-store',
    'content-type': 'text/plain; charset=utf-8',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': NO_INDEX
  };
}

function privateResponseHeaders(): Record<string, string> {
  return {
    'cache-control': 'private, no-store',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': NO_INDEX
  };
}
