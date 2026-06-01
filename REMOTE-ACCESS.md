# Reaching the dashboard from anywhere (Cloudflare Named Tunnel)

The bot stays on your PC. Your domain `zenbyte-dashboard.de` is routed through
a Cloudflare named tunnel so the dashboard is reachable at a permanent https
address. Visitors log in with their own Discord and only see servers where they
are an admin.

## How it runs

`launch.js` starts the tunnel and the bot together. It is what auto-starts when
you log in to Windows (via the Zenbyte.vbs in your Startup folder). To run it by
hand:

    node launch.js

The dashboard is always reachable at:

    https://zenbyte-dashboard.de

## Discord login (one-time)

1. Open https://discord.com/developers/applications and pick your app.
2. Go to OAuth2 > Redirects.
3. Add: https://zenbyte-dashboard.de/auth/discord/callback
4. Save.

That's it. The address never changes, so you only do this once.

## How it works

- Your domain's nameservers point to Cloudflare.
- Cloudflare has a named tunnel called `zenbyte-dashboard` that routes
  `zenbyte-dashboard.de` to `localhost:3000` (your bot's dashboard).
- The tunnel credentials are stored securely at `C:\Users\gorbu\.cloudflared\`.
- Every time `launch.js` starts, the tunnel connects and your dashboard is live.

## Turning it off

Delete `Zenbyte.vbs` from your Startup folder
(C:\Users\gorbu\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup)
to stop auto-starting, or just close the launcher window/process.

To disable the tunnel entirely, delete the tunnel in Cloudflare and it will no
longer be reachable (the bot still runs locally on your PC).
