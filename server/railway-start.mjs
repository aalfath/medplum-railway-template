// Start wrapper for Medplum server on Railway.
// See README.md for every setting it fills in.
import { spawn } from 'node:child_process';
import { createPrivateKey, generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { dirname } from 'node:path';

const env = process.env;
const dataDir = env.DATA_DIR || '/data';

function setDefault(name, value) {
  if (env[name] === undefined || env[name] === '') {
    env[name] = value;
  }
}

// Railway injects PORT; Medplum reads MEDPLUM_PORT.
if (env.PORT) setDefault('MEDPLUM_PORT', env.PORT);
setDefault('MEDPLUM_PORT', '8103');

// Files (FHIR Binary / attachments) go on the Railway volume.
setDefault('MEDPLUM_BINARY_STORAGE', `file:${dataDir}/binary/`);
mkdirSync(`${dataDir}/binary`, { recursive: true });

// Self-hosted defaults (upstream docker-compose.full-stack.yml), minus the
// AWS-only parts: bots run in the server's VM context, and email is off until
// you add MEDPLUM_SMTP_* variables.
setDefault('MEDPLUM_VM_CONTEXT_BOTS_ENABLED', 'true');
setDefault('MEDPLUM_DEFAULT_BOT_RUNTIME_VERSION', 'vmcontext');
setDefault('MEDPLUM_EMAIL_PROVIDER', env.MEDPLUM_SMTP_HOST ? 'smtp' : 'none');
setDefault('MEDPLUM_SUPPORT_EMAIL', '"Medplum" <support@medplum.com>');
setDefault('MEDPLUM_INTROSPECTION_ENABLED', 'true');
// Open self-registration is off: the super admin invites users from the app.
setDefault('MEDPLUM_REGISTER_ENABLED', 'false');
// Super admin created on the first boot (password comes from the template).
setDefault('MEDPLUM_DEFAULT_SUPER_ADMIN_EMAIL', 'admin@example.com');
if (!env.MEDPLUM_DEFAULT_SUPER_ADMIN_PASSWORD) {
  console.error('[railway-start] MEDPLUM_DEFAULT_SUPER_ADMIN_PASSWORD is not set; refusing to seed the upstream default password');
  process.exit(1);
}
setDefault('MEDPLUM_MAX_JSON_SIZE', '1mb');
setDefault('MEDPLUM_MAX_BATCH_SIZE', '50mb');
setDefault('MEDPLUM_SHUTDOWN_TIMEOUT_MILLISECONDS', '30000');
setDefault('MEDPLUM_BOT_LAMBDA_LAYER_NAME', 'medplum-bot-layer');
if (env.MEDPLUM_BOT_LAMBDA_ROLE_ARN === undefined) env.MEDPLUM_BOT_LAMBDA_ROLE_ARN = '';

// Signing key for pre-signed storage URLs (attachment downloads and uploads).
// Medplum needs a PEM key plus passphrase; we create one on the volume the
// first time and keep it, encrypted with MEDPLUM_SIGNING_KEY_PASSPHRASE.
if (!env.MEDPLUM_SIGNING_KEY) {
  const passphrase = env.MEDPLUM_SIGNING_KEY_PASSPHRASE;
  if (!passphrase) {
    console.error('[railway-start] MEDPLUM_SIGNING_KEY_PASSPHRASE is not set');
    process.exit(1);
  }
  const keyFile = `${dataDir}/keys/storage-signing-key.pem`;
  let pem;
  if (existsSync(keyFile)) {
    pem = readFileSync(keyFile, 'utf8');
    try {
      createPrivateKey({ key: pem, format: 'pem', passphrase });
    } catch {
      console.warn('[railway-start] stored signing key does not match the passphrase; creating a new one');
      pem = undefined;
    }
  }
  if (!pem) {
    mkdirSync(dirname(keyFile), { recursive: true });
    pem = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase },
    }).privateKey;
    writeFileSync(keyFile, pem, { mode: 0o600 });
    console.log('[railway-start] created storage signing key on the volume');
  }
  env.MEDPLUM_SIGNING_KEY = pem;
}
setDefault('MEDPLUM_SIGNING_KEY_ID', 'railway-storage-key');

// Wait for Postgres and Redis so the first deploy starts in the right order.
function waitForTcp(host, port, label, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const attempt = () => {
      const socket = net.connect({ host, port: Number(port) });
      socket.setTimeout(3000);
      const retry = () => {
        socket.destroy();
        if (Date.now() > deadline) {
          console.warn(`[railway-start] ${label} at ${host}:${port} not reachable yet; starting anyway`);
          resolve();
        } else {
          setTimeout(attempt, 2000);
        }
      };
      socket.once('connect', () => {
        socket.end();
        console.log(`[railway-start] ${label} is reachable`);
        resolve();
      });
      socket.once('error', retry);
      socket.once('timeout', retry);
    };
    attempt();
  });
}

if (env.MEDPLUM_DATABASE_HOST) {
  await waitForTcp(env.MEDPLUM_DATABASE_HOST, env.MEDPLUM_DATABASE_PORT || 5432, 'Postgres');
}
if (env.MEDPLUM_REDIS_HOST) {
  await waitForTcp(env.MEDPLUM_REDIS_HOST, env.MEDPLUM_REDIS_PORT || 6379, 'Redis');
}

// Same command as the upstream image's ENTRYPOINT, with config from env vars.
const child = spawn(
  process.execPath,
  [
    '--experimental-loader=@opentelemetry/instrumentation/hook.mjs',
    '--import',
    './packages/server/dist/otel/instrumentation.js',
    'packages/server/dist/index.js',
    'env',
  ],
  { cwd: '/usr/src/medplum', env, stdio: 'inherit' }
);
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
