# Despliegue del frontend en Vercel

Requisito: la API ya desplegada en Render (ver el repositorio del backend) y su URL, p. ej. `https://reapersys-api.onrender.com`.

## 1. Proyecto en Vercel

1. Vercel → **Add New → Project** → importa este repositorio. Framework: **Next.js** (detectado). No cambies los comandos.
2. **Environment Variables** (Production):

| Variable | Valor | Para qué |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://<tu-proyecto>.vercel.app` (o tu dominio) | Metadatos, sitemap, CSP |
| `NEXT_PUBLIC_API_URL` | `https://<tu-proyecto>.vercel.app/api/v1` | El navegador llama a la API **a través del propio sitio** |
| `API_PROXY_TARGET` | `https://reapersys-api.onrender.com` | Destino real del reenvío de `/api/v1/*` |
| `API_INTERNAL_URL` | `https://reapersys-api.onrender.com/api/v1` | Las páginas del servidor llaman directo a Render |

3. **Deploy**. Después, en Render, pon esta misma URL en `PUBLIC_APP_URL` y `CORS_ORIGINS` y vuelve a desplegar la API.

### ¿Por qué el reenvío?

Vercel (`*.vercel.app`) y Render (`*.onrender.com`) son dominios distintos: el navegador no enviaría la cookie de sesión
del panel a otro dominio. Con `API_PROXY_TARGET`, el navegador solo habla con el sitio de Vercel y Vercel reenvía `/api/v1/*`
a Render, así que el inicio de sesión del panel funciona en todos los navegadores.

## 2. Dominio propio (opcional)

Vercel → **Settings → Domains** → agrega tu dominio y sigue las instrucciones de DNS. Luego actualiza
`NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_API_URL` con el dominio, redepliega, y actualiza `PUBLIC_APP_URL` y `CORS_ORIGINS` en Render.

## 3. Comprobación

- `https://<tu-sitio>/api/v1/health` responde (pasa por el reenvío).
- El inicio muestra paquetes y la sección de testimonios.
- `https://<tu-sitio>/admin` permite iniciar sesión con el usuario creado con `user:create`.

> Las variables `NEXT_PUBLIC_*` se incrustan al compilar: si las cambias, vuelve a desplegar.
