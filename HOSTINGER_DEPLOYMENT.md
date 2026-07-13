# OneTrue Admin Deployment

## Domain

- Admin portal: `https://admin.onetrue.ph`
- API and Socket.IO server: `https://api.onetrue.ph`

## Hostinger build settings

- Framework preset: Vite
- Root directory: `./`
- Package manager: npm
- Node.js: 22.x
- Build command: `npm run build`
- Output directory: `dist`

## Environment variables

```env
VITE_API_URL=https://api.onetrue.ph/api
VITE_SOCKET_URL=https://api.onetrue.ph
```

The project also contains `.env.production` with these production values. Redeploy after changing any Vite environment variable because Vite inserts it during the build.

## SPA routing

`public/.htaccess` is included. Vite copies it to `dist/.htaccess`, allowing direct visits to routes such as `/dashboard`, `/operations/tracking`, and `/yard/inventory`.

## Backend CORS

The backend must include the client and admin origins:

```env
CLIENT_ORIGINS=https://onetrue.ph,https://www.onetrue.ph,https://admin.onetrue.ph
CLIENT_PUBLIC_URL=https://onetrue.ph
```

Redeploy the API after changing its environment variables.
