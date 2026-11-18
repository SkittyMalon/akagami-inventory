# Akagami – Catálogo

Next.js + Supabase (base de datos, login y almacenamiento de imágenes) + Vercel.

- **Clientes**: ven el catálogo, buscan, filtran y amplían imágenes (sin login).
- **Administrador** (`/admin`): importa el Excel, sube imágenes, edita/oculta/borra productos.

## Puesta en marcha

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En **SQL Editor** ejecuta [supabase/schema.sql](supabase/schema.sql).
3. En **Authentication → Users** crea tu usuario administrador y, en
   **Authentication → Sign In / Providers**, desactiva el registro público
   (*Allow new users to sign up*). Cualquier usuario con sesión es administrador.
4. Copia `.env.example` a `.env.local` y pon la URL y la anon key
   (Project Settings → API).
5. `npm install` y `npm run dev` → http://localhost:3000

## Formato del Excel

Primera hoja, con encabezados (acentos y mayúsculas no importan):

| sku | nombre | descripcion | categoria | precio | stock | imagen |
|---|---|---|---|---|---|---|

`imagen` puede ser una URL completa o el nombre de un archivo subido desde el panel.
Si el `sku` ya existe, el producto se actualiza.

## Despliegue

Sube el repo a GitHub, impórtalo en [Vercel](https://vercel.com) y agrega las dos
variables de entorno de `.env.example`.
