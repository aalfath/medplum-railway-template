# Medplum server, pinned by version and digest.
# Upstream image: https://hub.docker.com/r/medplum/medplum-server
FROM medplum/medplum-server:5.2.17@sha256:f7bf954bc5fb606b2b88e54300a82953af79e8bfe75056d727b00401e54de1b1

# Railway volumes are owned by root, so the server runs as root to write /data.
USER 0

# The upstream image is a hardened Node image without a shell, so the start
# wrapper is a small Node script: it fills in Railway-friendly defaults, waits
# for Postgres and Redis, creates the storage signing key on the volume, and
# then starts the server exactly as the upstream ENTRYPOINT does.
COPY railway-start.mjs /usr/src/medplum/railway-start.mjs

ENV DATA_DIR=/data
EXPOSE 8103
ENTRYPOINT ["node", "/usr/src/medplum/railway-start.mjs"]
