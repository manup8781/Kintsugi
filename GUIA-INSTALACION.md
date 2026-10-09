# Kintsugi — instalación con Supabase y Netlify

Este paquete incluye la web, el panel privado y la configuración necesaria para que el portfolio y las nuevas joyas se guarden online.

Las imágenes de la portada, el cuenco kintsugi, la presentación del estudio y los elementos decorativos permanecen dentro del sitio y no dependen de Supabase. Solamente las fotografías del portfolio y las imágenes de los piercings administrables usan Supabase.

## Qué queda administrable

- Los nueve tatuajes actuales se importan a Supabase desde el panel.
- Puedes crear, editar, reemplazar la foto, cambiar el orden, ocultar o eliminar cada tatuaje.
- Las joyas nuevas también se guardan en Supabase y aparecen en la tienda.
- El checkout abre WhatsApp al número `+591 68532799` con el nombre del cliente y su pedido.
- El panel usa una cuenta real de Supabase; ya no utiliza un PIN local.

## 1. Crear y preparar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. Abre **SQL Editor**, crea una consulta nueva y pega todo el contenido de `supabase/schema.sql`.
3. Ejecuta la consulta. Esto crea las tablas, los depósitos de imágenes y las reglas de seguridad.
4. Ve a **Authentication > Users** y crea el usuario que administrará Kintsugi con su correo y contraseña.
5. Vuelve a **SQL Editor** y ejecuta esta consulta cambiando el correo:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'TU-CORREO@EJEMPLO.COM'
on conflict (user_id) do nothing;
```

La URL `https://objyguojvofrtqyreftw.supabase.co` y su clave pública `publishable` ya están integradas en este paquete. No pongas una `service_role` en Netlify ni en el código del sitio.

## 2. Publicar en Netlify

La forma más cómoda es subir esta carpeta a un repositorio de GitHub/GitLab y conectarlo desde **Add new site > Import an existing project** en Netlify.

Puedes desplegar directamente: el paquete ya contiene la conexión pública. Opcionalmente, en **Site configuration > Environment variables** puedes crear estas variables si luego quieres sustituir la conexión sin editar archivos:

```text
SUPABASE_URL = la Project URL de Supabase
SUPABASE_ANON_KEY = la clave pública anon/publishable
```

Netlify detectará `netlify.toml` y usará automáticamente:

- Build command: `npm run build`
- Publish directory: `dist`

Después pulsa **Deploy site**. Si cambias una variable, vuelve a desplegar.

## 3. Activar el portfolio actual

1. Abre `https://TU-SITIO.netlify.app/admin`.
2. Inicia sesión con el usuario que creaste en Supabase.
3. En **Resumen**, pulsa **Importar 9 tatuajes**.
4. Espera el mensaje de importación completa.

Desde ese momento las imágenes visibles se cargan desde Supabase. Las copias incluidas en este paquete solo sirven para esa importación inicial; la página pública ya no tiene el portfolio escrito de forma fija.

Si abres `index.html` directamente antes de conectar Supabase, verás una vista previa local con la portada original y las fotografías iniciales. En el sitio publicado, una vez configuradas las variables, el portfolio se sustituye por el contenido de Supabase.

## Uso cotidiano

- **Editar** permite cambiar los datos o seleccionar una nueva foto.
- Si editas sin escoger archivo, conserva la imagen actual.
- Desmarcar **Visible** oculta una publicación sin borrarla.
- **Orden** controla la posición; los números más bajos aparecen primero.
- **Eliminar** borra tanto la publicación como su archivo de Supabase Storage.

## Seguridad

La clave pública de Supabase se entrega al navegador por diseño. La protección está en las políticas RLS incluidas en `schema.sql`: el público solo puede leer publicaciones visibles y únicamente las cuentas agregadas a `admin_users` pueden modificar datos o imágenes.
