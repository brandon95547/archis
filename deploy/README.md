# Deploying Archis

Prod is the box behind skylanex.com (`ssh root@phansora.com`). Archis is **static**:
the name engine runs in the browser, so nothing needs to stay alive to serve it. nginx
hands out the built files and the systemd unit exists only to rebuild them.

| Piece | Where |
|---|---|
| Checkout | `/var/www/archis` (branch `main`) |
| Build | `dist/` — gitignored, built on the host by `deploy/rebuild.sh` |
| Unit | `/etc/systemd/system/archis.service`, a copy of `deploy/archis.service`. Oneshot: it builds and exits |
| nginx | `/etc/nginx/conf.d/archis.skylanex.com.conf`, a copy of `deploy/archis.skylanex.com.conf` |
| TLS | Let's Encrypt for `archis.skylanex.com`, through the shared webroot at `/var/www/certbot` |

## Deploy a change

```bash
cd /var/www/archis && git pull --ff-only && systemctl restart archis
```

The build stages into `dist.new` and swaps it in with one `mv`, so the document root is
never half-written and a failed build leaves the live site untouched. The previous build
stays as `dist.old`, so undoing a bad deploy is `mv dist dist.bad && mv dist.old dist`.

## Check it

```bash
systemctl status archis                       # "active (exited)" after a good build
journalctl -u archis -n 30 --no-pager         # the build output
curl -sI https://archis.skylanex.com | head -1
```

## First install

DNS first: `archis.skylanex.com` needs an A record pointing at the server, and it must
resolve before the certificate can be issued.

```bash
git clone git@github.com:brandon95547/archis.git /var/www/archis
cp /var/www/archis/deploy/archis.service /etc/systemd/system/archis.service
systemctl daemon-reload && systemctl enable --now archis      # builds dist/

# HTTP only at first, so the ACME challenge can be answered. The full file below
# names a certificate that does not exist yet, and nginx -t would fail on it.
printf 'server {\n  listen 80;\n  server_name archis.skylanex.com;\n  location ^~ /.well-known/acme-challenge/ { root /var/www/certbot; }\n  location / { return 404; }\n}\n' \
  > /etc/nginx/conf.d/archis.skylanex.com.conf
nginx -t && nginx -s reload

certbot certonly --webroot -w /var/www/certbot -d archis.skylanex.com

cp /var/www/archis/deploy/archis.skylanex.com.conf /etc/nginx/conf.d/archis.skylanex.com.conf
nginx -t && nginx -s reload
```

`systemctl reload nginx` can fail 226/NAMESPACE on this box — use `nginx -s reload`.
