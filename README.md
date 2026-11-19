[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template/medplum-1?utm_medium=integration&utm_source=button&utm_campaign=medplum)

# Deploy and Host Medplum on Railway

Medplum is an open-source (Apache-2.0) healthcare developer platform built on HL7 FHIR R4. It gives you a FHIR server with REST and GraphQL APIs, OAuth2/OpenID Connect and SMART on FHIR login, subscriptions, bots for server-side logic, file storage, and a web app for browsing and editing clinical data and managing projects and users.

## About Hosting Medplum

Medplum needs four parts: the Node.js server (FHIR API, auth, background jobs), the web app (a static React app served by nginx), PostgreSQL for all FHIR data, and Redis for the cache, pub/sub and BullMQ job queues. This template runs each as its own Railway service on the private network. The server waits for Postgres and Redis, runs its database migrations, and seeds the FHIR definitions and a super admin with a generated password on first boot. Uploaded files and the key that signs attachment links live on the server's volume, so they survive redeploys. Public HTTPS domains are set up for the server and the app.

## Common Use Cases

* Back end for an EHR, patient portal or care-coordination app built on FHIR
* Self-hosted FHIR R4 server for integrations, data exchange and SMART on FHIR apps
* Prototyping clinical workflows with Medplum bots, subscriptions and the admin web app

## Dependencies for Medplum Hosting

* Medplum server 5.2.17 and Medplum app 5.2.17 (official `medplum/medplum-server` and `medplum/medplum-app` images, pinned by digest)
* PostgreSQL (Railway's Postgres service) and Redis (Railway's Redis service), each on its own volume

### Deployment Dependencies

* Medplum self-hosting docs: https://www.medplum.com/docs/self-hosting
* Medplum server config reference: https://www.medplum.com/docs/self-hosting/server-config
* Medplum releases: https://github.com/medplum/medplum/releases
* Template source: https://github.com/aalfath/medplum-railway-template

### Implementation Details

**Services**

| Service | What it does | Volume |
|---|---|---|
| Medplum-Server | FHIR API, OAuth2 login, bots and background workers on port 8103; health check `/healthcheck` | `/data` (uploaded files, storage signing key) |
| Medplum-App | Web app (nginx) on port 3000, talks to the server's public URL | none |
| Postgres | FHIR resources, users and projects | `/var/lib/postgresql/data` |
| Redis | Cache, pub/sub and job queues | `/data` |

**After deploy**

1. Wait until Medplum-Server is healthy. The first boot runs migrations and loads the FHIR definitions, about 1 minute.
2. Open the Medplum-Server service's Variables tab and copy `MEDPLUM_DEFAULT_SUPER_ADMIN_PASSWORD` (generated for you).
3. Open the Medplum-App domain and sign in as `admin@example.com` (or the email you set in `MEDPLUM_DEFAULT_SUPER_ADMIN_EMAIL`) with that password. Change the password under your profile.
4. Create your own project and invite users from the app's Admin pages. Open sign-up is off.

The super admin is created on the first boot only. Changing the two `MEDPLUM_DEFAULT_SUPER_ADMIN_*` variables later has no effect.

**Variables (Medplum-Server)**

| Variable | Default | Notes |
|---|---|---|
| `MEDPLUM_DEFAULT_SUPER_ADMIN_EMAIL` | `admin@example.com` | Email of the first super admin, first boot only |
| `MEDPLUM_DEFAULT_SUPER_ADMIN_PASSWORD` | generated | Password of the first super admin, first boot only |
| `MEDPLUM_SIGNING_KEY_PASSPHRASE` | generated | Encrypts the key that signs attachment URLs. Don't change it after the first deploy |
| `MEDPLUM_BASE_URL`, `MEDPLUM_APP_BASE_URL` | Railway domains | Set to `https://YOUR-DOMAIN/` when you add custom domains |
| `MEDPLUM_DATABASE_*`, `MEDPLUM_REDIS_*` | references to Postgres and Redis | Leave as they are |

Medplum-App reads `MEDPLUM_BASE_URL` (the server's public URL).

**Optional settings.** Any Medplum server setting can be added as a `MEDPLUM_*` variable on Medplum-Server ([config reference](https://www.medplum.com/docs/self-hosting/server-config)). Email is off by default: add `MEDPLUM_SMTP_HOST`, `MEDPLUM_SMTP_PORT`, `MEDPLUM_SMTP_USERNAME`, `MEDPLUM_SMTP_PASSWORD` and `MEDPLUM_SUPPORT_EMAIL` to send invites and password resets. To allow open sign-up, set `MEDPLUM_REGISTER_ENABLED=true` on both services. Google sign-in and reCAPTCHA use `MEDPLUM_GOOGLE_CLIENT_ID` / `MEDPLUM_RECAPTCHA_*` on the server and `GOOGLE_CLIENT_ID` / `RECAPTCHA_SITE_KEY` on the app. Bots run inside the server (`vmcontext`); AWS Lambda bots and Textract are not set up.

**Updates**

Medplum-Server and Medplum-App build from this repository. When a new Medplum version is pinned here, Railway shows "update available" on your project and you choose when to apply it. The server runs Medplum's database migrations on start. Read `CHANGELOG.md` first and back up the Postgres volume.

## Why Deploy Medplum on Railway?

<!-- Recommended: Keep this section as shown below -->
Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying Medplum on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
<!-- End recommended section -->
