import {
  accessCookie,
  accessCookieName,
  createAccessToken,
  readCookie,
  timingSafeEqual,
} from './apps/web/src/lib/access-gate.js';

export const config = {
  matcher: '/(.*)',
};

const securityHeaders = {
  'Cache-Control': 'no-store, private',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'Content-Type': 'text/html; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
} as const;

function loginPage(error?: string): Response {
  const errorMarkup = error ? `<p class="error" role="alert">${error}</p>` : '';
  return new Response(
    `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow,noarchive" />
    <title>Dostęp chroniony — CreatorRig Match</title>
    <style>
      :root { color-scheme: light; font-family: Inter, system-ui, sans-serif; color: #171713; background: #f2efe8; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; }
      main { width: min(440px, 100%); background: #fffdf7; border: 1px solid #171713; border-left: 6px solid #e36645; box-shadow: 10px 10px 0 #171713; padding: clamp(24px, 6vw, 42px); }
      .eyebrow { color: #b9472d; font: 800 12px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
      h1 { margin: 10px 0 12px; font-size: clamp(30px, 8vw, 46px); line-height: 1; }
      p { line-height: 1.55; color: #57534b; }
      label { display: grid; gap: 8px; margin-top: 28px; font-weight: 800; }
      input { width: 100%; border: 1px solid #171713; background: white; color: #171713; font: inherit; padding: 14px; }
      button { width: 100%; margin-top: 12px; border: 1px solid #171713; background: #171713; color: white; font: 800 15px inherit; padding: 14px; cursor: pointer; }
      button:hover { background: #b9472d; }
      .error { color: #a42525; font-weight: 800; }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">CreatorRig Match · wersja chroniona</p>
      <h1>Wpisz hasło.</h1>
      <p>Ta prywatna wersja badawcza produktu jest dostępna wyłącznie dla zaproszonych osób.</p>
      ${errorMarkup}
      <form method="post" action="/__unlock">
        <label>Hasło dostępu<input name="password" type="password" required autocomplete="current-password" autofocus /></label>
        <button type="submit">Otwórz CreatorRig Match</button>
      </form>
    </main>
  </body>
</html>`,
    { status: error ? 401 : 200, headers: securityHeaders },
  );
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    return new Response('Brak bezpiecznej konfiguracji hasła.', {
      status: 503,
      headers: securityHeaders,
    });
  }

  const token = await createAccessToken(password);
  const suppliedToken = readCookie(request.headers.get('cookie'), accessCookieName());
  if (timingSafeEqual(suppliedToken, token)) return undefined;

  const url = new URL(request.url);
  if (url.pathname === '/__unlock' && request.method === 'POST') {
    const form = await request.formData();
    const suppliedPassword = form.get('password');
    const suppliedPasswordToken =
      typeof suppliedPassword === 'string' ? await createAccessToken(suppliedPassword) : undefined;
    if (timingSafeEqual(suppliedPasswordToken, token)) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: '/',
          'Set-Cookie': accessCookie(token),
          'Cache-Control': 'no-store, private',
        },
      });
    }
    return loginPage('Podane hasło jest nieprawidłowe.');
  }

  return loginPage();
}
