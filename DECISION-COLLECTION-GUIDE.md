# GeekAI - Decision Collection Guide

## Easy instructions for the team

### Why we need this

We have finished Stages S0, S1 and S2 of the backend work. The code is tested and ready.
Before we can start Stage S3 (cloud setup) and later stages, 12 open decisions must be closed.
This file explains, in simple words:

1. what each decision is;
2. who must approve it;
3. what that person must do;
4. what details they must send back to the project lead.

The project lead collects the answers and sends them to the implementation team.
The implementation team will write the approved answers into `docs/decisions.md`.

---

## Rules for everyone

1. **Only the named owner can approve.** If you are not the owner, ask the owner for a written answer.
2. **Every answer needs proof.** Proof can be an email, a ticket, or meeting minutes.
3. **Every answer must say:** decision number, chosen answer, approver name, role, date, and proof reference.
4. **Never send secrets.** Do not send passwords, API keys, signing keys, account numbers or bank details. Send only names, choices and reference numbers.
5. **If a date is not known, write TBA.** Never invent a date, a speaker, a sponsor or a capacity number.
6. **Agreement in a meeting is not enough.** Write the answer down and keep the proof.

### Copy this small form for every decision

```text
Decision number: D__
Chosen answer:
Approver name:
Approver role:
Date (YYYY-MM-DD):
Proof: email subject / ticket ID / meeting minutes reference
Secrets shared: none
```

---

## Who can approve which decision

| Decision | Who must approve |
|---|---|
| D1, D2 | Event owner together with university legal/privacy office |
| D3 | University legal/privacy office |
| D4 | Infrastructure lead (check university data rules) |
| D5 | University IT/DNS owner together with infrastructure lead |
| D6, D10, D11 | Event owner |
| D7 | Backend lead together with security reviewer |
| D8 | Backend lead together with infrastructure lead |
| D9 | Infrastructure lead together with frontend and backend leads |
| D12 | Event owner together with volunteer coordinator |

If the project lead is one of these people, the project lead can approve that decision.
If not, the project lead only collects the written answer from the correct person.

---

# Part 1 - Decisions needed before Stage S3

## D1 - Who owns the participant data

**What we must decide:** Who is the data controller for registration forms, photos, face data, attendance and audit records? "Data controller" means the organisation that is legally responsible for the data.

**Who approves:** Event owner plus university legal/privacy office.

**Steps:**

1. Find the named legal or privacy contact at SOA University / AIC for Innovation Center.
2. Ask them to confirm in writing who is the data controller.
3. Ask for the public contact email or address where participants can send data questions or deletion requests.
4. Ask which organisation signs the AWS and email vendor agreements.
5. Keep the written reply.

**Send back:**

- Name of the data controller organisation.
- Public privacy contact (email or address).
- Approver name, role, date and proof reference.

**Expected answer:** SOA University / AIC for Innovation Center. This is only a recommendation until approved.

---

## D2 - The consent wording on the form

**What we must decide:** Which exact words and version of the biometric consent text will we use on the registration form?

**Who approves:** University legal/privacy office plus event owner.

**Important:** The website is already built and frozen. Its consent version is `2026-11`. Changing the words means we must create a new version and change the website contract. Tell us before doing that.

**Steps:**

1. Read the current consent text in `frontend/src/lib/registration.js`. It says the photo is used only for event check-in and is deleted after the retention period.
2. Ask legal to approve that text exactly as it is, or send the exact new text.
3. If the text changes, write a new version name, for example `2026-12`. Never edit old wording quietly.
4. Keep the written approval.

**Send back:**

- Approved version name (for example `2026-11`).
- Approved exact text, or confirmation that the current text is approved.
- Approver name, role, date and proof reference.

---

## D3 - How long we keep photos and face data

**What we must decide:** How many days after the event do we delete photos and face embeddings? How long do we keep attendance and audit records?

**Who approves:** University legal/privacy office.

**Steps:**

1. Choose the number of days after the event for deleting photos and face data. The proposed number is 90 days.
2. Choose the rule for attendance and audit records. Example: "kept for 3 years as per university policy" - use the real university rule.
3. The clock starts when the event ends. The event date is still TBA, so write the rule, not a calendar date.
4. Confirm that deletion jobs must have a dry run and a signed deletion report.
5. Name the person who signs the deletion report.
6. Keep the written approval.

**Send back:**

- Number of days for photos and face data.
- Rule for attendance and audit records.
- Person who signs deletion reports.
- Approver name, role, date and proof reference.

---

## D4 - Which AWS region to use

**What we must decide:** In which AWS region do we create the database, storage and email service?

**Who approves:** Infrastructure lead, after checking university data rules.

**Steps:**

1. Ask the university whether data must stay in India.
2. If yes, or if there is no objection, approve `ap-south-1` (Mumbai). This is the current proposed default.
3. If another region is required, write that region name instead.
4. Check that the region has the services we need: database with pgvector, storage, email, secrets manager and container hosting.
5. Keep the written approval.

**Send back:**

- Final region code, for example `ap-south-1`.
- Approver name, role, date and proof reference.

---

## D5 - Which email address sends registration emails

**What we must decide:** Which university-owned domain or subdomain sends registration and pass emails? Who can change its DNS records?

**Who approves:** University IT/DNS owner plus infrastructure lead.

**Plain words:** We use an AWS email service called SES. Before it can send email, we must prove we own the sending domain. This is called verification. Production access can take days, so start early.

**Steps:**

1. Choose the exact sending domain. It must belong to the university. Write the full name, for example `oas2026.university.edu`. Never use a personal email domain.
2. Name the person who can add DNS records. We will need TXT, DKIM, SPF and DMARC records.
3. In the approved AWS region, create the SES identity and publish the DNS records.
4. Request SES production sending access immediately. Save the AWS support ticket number.
5. Decide where bounce and complaint messages will be sent and who watches them.
6. Keep the written approval.

**Send back:**

- Exact sending domain name.
- DNS owner name.
- SES production access ticket number.
- Approver name, role, date and proof reference.
- No passwords or keys.

---

## D6 - Who owns the AWS and Cloudflare accounts

**What we must decide:** Which people own the AWS account and the Cloudflare account?

**Who approves:** Event owner.

**Steps:**

1. Name one primary and one backup owner for AWS.
2. Name one primary and one backup owner for Cloudflare. They may be the same people if the rules allow it.
3. Confirm multi-factor authentication (MFA) is on for all owner accounts.
4. Confirm no long-lived access keys are stored on volunteer laptops.
5. Confirm where the credentials are kept, for example the team password vault. Send only the vault name or reference, never the credentials.
6. Name the person who approves cloud spending.
7. Name the person who will rotate keys after the event.
8. Keep a short ownership sheet with names, roles and the date.

**Send back:**

- Primary and backup owners for AWS and Cloudflare.
- Confirmation that MFA is on and no long-lived keys are used.
- Vault reference, billing approver and key-rotation owner.
- Approver name, role, date and proof reference.

---

## D9 - How we stop fake registrations

**What we must decide:** What protection will the public registration form use against bots?

**Who approves:** Infrastructure lead plus frontend and backend leads.

**Plain words:** Cloudflare Turnstile is a small check that proves a real person is filling the form. The current proposal is to use it with rate limits on the API.

**Steps:**

1. Approve Cloudflare Turnstile for the registration page, or choose another method and write it down.
2. Confirm that the check is accessible to all users and that privacy text will mention it.
3. Decide where the Turnstile keys are stored and who rotates them.
4. **Important:** the website is frozen. Prefer a Cloudflare edge check so we do not need to change website code. If a website change is really needed, say so clearly and get owner approval first.
5. Keep the written approval.

**Send back:**

- Chosen protection method.
- Whether website code changes are allowed (yes or no).
- Person who owns the Turnstile keys.
- Approver name, role, date and proof reference.

---

# Part 2 - Decisions needed before later stages

These do not block Stage S3. We can collect them together with the others so work does not stop later.

## D7 - How QR passes are signed

**What we must decide:** How do we make QR passes impossible to forge?

**Who approves:** Backend lead plus security reviewer.

**Plain words:** A digital signature is like an official stamp. A scanner can check the stamp and reject fake passes. The QR content must stay exactly as planned. We must not add new fields to it.

**Steps:**

1. Approve the proposed method: Ed25519 signatures.
2. Confirm the QR content stays the same eight fields. The signing key is chosen by the issuer name (`iss`). We do not add a `kid` field.
3. Name the person who owns the signing key.
4. Decide where the private key is stored. It must be in a secrets store, never in the repository or in chat.
5. Write the rotation plan: how to replace the key and how to revoke old passes.
6. Keep the written approval.

**Send back:**

- Algorithm (expected: Ed25519).
- Key owner name.
- Where the key is stored (reference only).
- Rotation and revocation plan.
- Approver name, role, date and proof reference.

---

## D8 - How the local hub will run

**What we must decide:** At the venue, should the local hub be a separate service, or the same backend program running in "local mode"?

**Who approves:** Backend lead plus infrastructure lead.

**Plain words:** The hub records arrivals if the internet is down. The proposal is to use the same backend program with a local setting, plus a small local database.

**Steps:**

1. Approve the proposed form: same backend image, with `HUB_MODE=local`.
2. Approve a local database. The proposal is SQLite, unless a drill shows we need local Postgres.
3. Confirm the local hub has its own settings and secrets, separate from the cloud.
4. Name the person who looks after local backups and restore tests.
5. Keep the written approval.

**Send back:**

- Chosen hub form (expected: same image in local mode).
- Local database choice.
- Person responsible for local backups.
- Approver name, role, date and proof reference.

---

## D10 - When registration closes and how many people we accept

**What we must decide:** What is the last date and time to register? Is there a capacity limit or a waitlist?

**Who approves:** Event owner.

**Steps:**

1. Write the closing date and time with timezone, for example `2026-12-20T23:59:00+05:30`. If not known, write TBA.
2. Write the capacity number. If there is no limit, write "no limit".
3. Decide if there is a waitlist and its limit. If none, write "no waitlist".
4. Decide what happens to late registrations. The assisted desk path can still be used.
5. Keep the written approval.

**Send back:**

- Closing date and time, or TBA.
- Capacity and waitlist rule.
- Late registration rule.
- Approver name, role, date and proof reference.

---

## D11 - Who gives the final go for event day

**What we must decide:** After the rehearsal, who signs the final permission to go ahead on event day?

**Who approves:** Event owner.

**Plain words:** This person signs the G6 checklist after Stage S9 rehearsal. They also accept any remaining risk.

**Steps:**

1. Name the main signatory. The proposal is the event owner.
2. Name a backup person in case the main signatory is not available.
3. Write what they sign (the G6 go/no-go checklist).
4. Keep the written approval.

**Send back:**

- Main signatory name and role.
- Backup signatory name and role.
- Approver name, role, date and proof reference.

---

## D12 - Who can manually admit someone

**What we must decide:** If face matching fails or a photo is rejected, who may manually admit the participant?

**Who approves:** Event owner plus volunteer coordinator.

**Steps:**

1. Name one desk lead for each shift.
2. Say clearly that ordinary volunteers cannot override a failed match on their own.
3. List which reasons are allowed, for example "photo rejected but identity checked at desk".
4. Confirm every manual override is recorded in the audit log with the reason and the name of the person who approved it.
5. Keep the written approval.

**Send back:**

- Desk lead names per shift.
- Allowed reasons.
- Confirmation that every override is recorded.
- Approver name, role, date and proof reference.

---

# Final checklist before sending the package to the implementation team

Please send all twelve answers together:

- [ ] D1 - data controller name and privacy contact
- [ ] D2 - approved consent version and exact text
- [ ] D3 - photo/face retention days and attendance/audit retention rule
- [ ] D4 - AWS region code
- [ ] D5 - sending domain, DNS owner, SES ticket number
- [ ] D6 - AWS and Cloudflare owners, MFA confirmation, vault reference, billing and key-rotation owners
- [ ] D7 - QR signing algorithm, key owner, storage reference, rotation plan
- [ ] D8 - hub form, local database, backup owner
- [ ] D9 - bot protection method, website-change decision, key owner
- [ ] D10 - closing date/time, capacity and waitlist rules, late registration rule
- [ ] D11 - main and backup go/no-go signatories
- [ ] D12 - desk leads per shift, allowed override reasons, audit confirmation

Each answer must include: decision number, chosen answer, approver name, role, date and proof reference.

Remember: no passwords, no API keys, no secret keys, no account numbers. Only names, choices and reference numbers.

## What happens after you send the package

1. We write all approved answers into `docs/decisions.md` with the approver, date and proof.
2. We check that no frozen website contract or event fact was changed without permission.
3. We then give the implementation team the real values for Stage S3, instead of placeholders.
4. Stage S3 starts only after that. Stages S4 to S10 follow the same review process.
