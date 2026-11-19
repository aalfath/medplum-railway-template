# Changelog

Breaking changes are listed first in each entry. Read the entry before you apply an update on Railway, and back up your Postgres volume first.

## 5.2.17 (2026-11-19)

- First release of this template.
- Medplum server 5.2.17, official image `medplum/medplum-server:5.2.17@sha256:f7bf954bc5fb606b2b88e54300a82953af79e8bfe75056d727b00401e54de1b1`, with a small Node start wrapper (`server/railway-start.mjs`): waits for Postgres and Redis, stores uploaded files on the `/data` volume, creates the attachment-signing key on the volume, and refuses to start without a super-admin password.
- Medplum app 5.2.17, official image `medplum/medplum-app:5.2.17@sha256:cf6285497179548b5c41e0410ab48642e59194c159332128c45bdd3bf003fcef`, with open sign-up and Textract off.
- Railway Postgres and Railway Redis.
- Deploy on Railway button added to the README.
