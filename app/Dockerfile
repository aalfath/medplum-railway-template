# Medplum app (web UI, static files served by nginx on port 3000), pinned by version and digest.
# Upstream image: https://hub.docker.com/r/medplum/medplum-app
FROM medplum/medplum-app:5.2.17@sha256:cf6285497179548b5c41e0410ab48642e59194c159332128c45bdd3bf003fcef

# The upstream entrypoint writes these into the app bundle at start.
# MEDPLUM_BASE_URL (the server's public URL) comes from the Railway template.
ENV MEDPLUM_REGISTER_ENABLED=false \
    MEDPLUM_AWS_TEXTRACT_ENABLED=false

EXPOSE 3000
