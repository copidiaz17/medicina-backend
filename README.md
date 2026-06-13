# MedicinaIA / Cardio — AI Clinical Assistant

A **clinical-assistant SaaS for doctors**. For each patient, **Claude reads the full clinical context** — history, antecedents, medications, prior visits and attached medical images (**Claude Vision**) — and **suggests a diagnosis**, with conversational follow-up.

## What it does
- **Patient records:** clinical history, antecedents, medications, studies & medical images.
- **AI consultation:** Claude analyzes the **complete patient context + images** and returns a **diagnostic suggestion**.
- **Conversational follow-up:** the doctor asks follow-up questions; the assistant keeps the consultation context (with history limits).
- **Multi-doctor SaaS:** per-doctor patients and **monthly AI-usage metering**.

## AI
- Official **Anthropic SDK** — Claude (Opus / Sonnet), **Claude Vision** for medical images.
- The prompt is built from the **full patient record** (age, antecedents, medications, prior consultations) plus the attached studies.

## Tech stack
`Node.js` · `Express` · `Anthropic SDK (Claude)` · `Sequelize + MySQL` · `Multer` (uploads) · `JWT` + `bcrypt` · `Helmet` · `Vue 3` (frontend)

## ⚠️ Note
This is a **decision-support tool**: the AI assists the physician and **does not replace professional medical judgment**.

> Built by [copidiaz17](https://github.com/copidiaz17) — AI automation & full-stack developer.
