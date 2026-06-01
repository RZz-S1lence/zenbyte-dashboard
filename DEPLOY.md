# Hosting Zenbyte 24/7

This guide gets the bot running on a rented Linux server (a VPS) so it stays
online all the time, restarts itself if it crashes, and comes back up on its own
after a server reboot. Your own PC is not involved once this is done.

## 1. Rent a server

Pick any Linux VPS provider. Good cheap options:

- Hetzner (best value, the CX22 plan is around 4 euro per month)
- DigitalOcean, Vultr, or Contabo
- Oracle Cloud has a free tier if you want zero cost

When creating it, choose:

- Image / OS: Ubuntu 24.04 LTS
- Size: 2 GB RAM is plenty to start (4 GB if you expect many servers)

You will get an IP address and a root password (or an SSH key).

## 2. Connect to the server

From your PC, open PowerShell and run (replace the IP):

    ssh root@YOUR_SERVER_IP

Type yes the first time, then enter the password.

## 3. Install Node.js and PM2

PM2 is the tool that keeps the bot running and restarts it automatically.

    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
    npm install -g pm2

Check it worked:

    node -v
    pm2 -v

## 4. Get the bot files onto the server

Easiest way from your PC (run this in PowerShell, from the folder that
contains the my-discord-bot folder):

    scp -r "my-discord-bot" root@YOUR_SERVER_IP:/root/

That uploads the whole project to /root/my-discord-bot on the server.

(Do not upload node_modules; it is rebuilt on the server in step 6. If it got
uploaded anyway, delete it on the server with: rm -rf /root/my-discord-bot/node_modules)

## 5. Create the .env file

On the server:

    cd /root/my-discord-bot
    cp .env.example .env
    nano .env

Fill in your real values (bot token, owner ID, OAuth client ID and secret, and so on).
Important for a public server:

- Set SESSION_SECRET to a long random string (any 40+ random characters).
- Set DASHBOARD_URL to how you will reach the dashboard, for example
  http://YOUR_SERVER_IP:3000 (or your domain if you set one up).

Save in nano with Ctrl+O, Enter, then Ctrl+X.

## 6. Install dependencies

    npm install

## 7. Start the bot with PM2

    pm2 start ecosystem.config.js

Check it is running:

    pm2 status
    pm2 logs zenbyte

## 8. Make it survive reboots

This is the step that makes it truly 24/7. It tells the server to start the
bot automatically every time the server restarts.

    pm2 save
    pm2 startup

PM2 prints one command. Copy that command, paste it, and run it. Done.

## 9. Reaching the dashboard

Open the dashboard port in the firewall:

    ufw allow 3000
    ufw allow OpenSSH
    ufw enable

Now visit http://YOUR_SERVER_IP:3000 in your browser.

For a real public bot you should put it behind HTTPS with a domain name. The
simplest way is Caddy, which gets a free certificate automatically:

    apt-get install -y caddy

Then set /etc/caddy/Caddyfile to:

    yourdomain.com {
        reverse_proxy localhost:3000
    }

Reload with: systemctl reload caddy
Then set DASHBOARD_URL in .env to https://yourdomain.com and restart the bot
(pm2 restart zenbyte). The dashboard cookie automatically becomes secure on https.

## 10. Everyday commands

    pm2 status            show whether the bot is running
    pm2 logs zenbyte      watch live logs
    pm2 restart zenbyte   restart the bot
    pm2 stop zenbyte      stop it
    pm2 monit             live CPU and memory view

## 11. Updating the bot later

Upload the changed files again (step 4), then on the server:

    cd /root/my-discord-bot
    npm install
    pm2 restart zenbyte

## 12. Backups

Your data lives in the .json files in the project folder. To keep a safe copy,
download them to your PC now and then. From your PC:

    scp -r root@YOUR_SERVER_IP:/root/my-discord-bot/*.json ./backup/

The bot also writes a .bak copy next to each data file automatically, so a
crash mid-save cannot corrupt your data.
