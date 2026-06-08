# Scan by Arxeni

Scan by Arxeni creates static QR codes, so the code itself does not expire.

A generated QR code can still stop being useful if it points to a URL that later goes offline, changes, or is deleted. For the strongest permanence, encode a URL you control or encode the final text directly in the QR code.

## Run

```sh
npm start
```

For local development, open:

```text
http://localhost:4173
```

## Deploy

Use this start command on a Node host:

```sh
npm run start:prod
```

The server reads `PORT` from the deployment platform. In production it binds to `0.0.0.0` so public hosting platforms can route traffic to it.

## Downloads

Use PNG for normal sharing and printing. Use SVG when you need a scalable file for design work.
