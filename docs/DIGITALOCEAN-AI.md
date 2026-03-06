# Using DigitalOcean AI (Gradient) for API and Voice

Meridian can use **DigitalOcean Gradient™ AI Platform** (serverless inference) for AI-backed API operations and for turning voice transcripts into work items. This keeps LLM usage on DO when you prefer not to use OpenAI directly for chat.

## What Uses What

| Feature | DigitalOcean Gradient | OpenAI |
|--------|------------------------|--------|
| **Chat completions** (e.g. “voice → work item” extraction) | ✅ Yes (when `GRADIENT_MODEL_ACCESS_KEY` is set) | ✅ Fallback when only `OPENAI_API_KEY` is set |
| **Speech-to-text (transcription)** | ❌ Not available | ✅ Required (`OPENAI_API_KEY` + Whisper) |

So:

- **Voice commands (full flow):** You need **both**:
  - **Transcription:** `OPENAI_API_KEY` (Whisper; Gradient does not offer speech-to-text).
  - **“Create from transcript” (work items / notes):** Either Gradient or OpenAI (see below).

- **API operations that only need chat (no voice):** You can use **only** Gradient (no OpenAI key).

## 1. Get a Gradient model access key

1. In [DigitalOcean Control Panel](https://cloud.digitalocean.com/) go to **Gradient** (or **AI**).
2. Create a **Model API Key** (or use **Serverless Inference** and create an API key there).
3. Copy the key (it usually starts with `do-`).

Alternatively use the API:

```bash
# Create a model API key (use your DO API token)
curl -X POST "https://api.digitalocean.com/v2/gen-ai/models/api_keys" \
  -H "Authorization: Bearer YOUR_DIGITALOCEAN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"meridian-api"}'
```

## 2. Configure the backend

Set these on the **API service** (e.g. in App Platform env vars or in `backend/.env`).

**Option A – Use DigitalOcean Gradient for chat (recommended if you want DO AI):**

```env
# DigitalOcean Gradient — used for chat completions (e.g. voice → work item)
GRADIENT_MODEL_ACCESS_KEY=do-your-key-here

# Optional: override default chat model (default: gpt-4o)
# GRADIENT_CHAT_MODEL=gpt-4o
# Or e.g. GRADIENT_CHAT_MODEL=llama3.3-70b-instruct
```

**Option B – Use OpenAI for chat (and optionally for voice):**

```env
OPENAI_API_KEY=sk-your-openai-key
```

**For voice transcription you must have:**

```env
# Required for Field Notes voice and any speech-to-text (Whisper)
OPENAI_API_KEY=sk-your-openai-key
```

**Combined (voice + Gradient for “create from transcript”):**

```env
# Voice: speech → text (required for voice)
OPENAI_API_KEY=sk-...

# Chat: transcript → work item / notes (Gradient preferred)
GRADIENT_MODEL_ACCESS_KEY=do-...
```

The backend prefers **Gradient for chat** when `GRADIENT_MODEL_ACCESS_KEY` is set; otherwise it uses **OpenAI** for chat when `OPENAI_API_KEY` is set.

## 3. App Platform (app.yaml / Control Panel)

In `.do/app.yaml` (or in the App Platform UI) add env vars for the **api** service:

```yaml
services:
  - name: api
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
      # … existing keys …
      # DigitalOcean Gradient (chat / work-item extraction)
      - key: GRADIENT_MODEL_ACCESS_KEY
        scope: RUN_TIME
        value: "do-your-key"   # or use App Platform secret
      # Required for voice transcription only
      - key: OPENAI_API_KEY
        scope: RUN_TIME
        value: "sk-..."        # or use App Platform secret
```

Use **Encrypted** or **Secret** values in the Control Panel for both keys.

## 4. Voice commands flow

1. **Browser** records audio and sends it to **POST /api/voice/transcribe**.
2. **Backend** uses **OpenAI Whisper** (only when `OPENAI_API_KEY` is set) and returns `{ transcript }`.
3. **Browser** sends transcript to **POST /api/voice/create** with `item_type: 'note'` or `'task'`.
4. **Backend**:
   - **Notes:** Saves transcript as note (no AI).
   - **Work items:** Calls **Gradient** (or OpenAI) chat completion to get `{ title, description, type, priority, points }`, then creates the item in the DB.

So:

- **All API operations** that use “chat” (e.g. turning text into structured data) can use **DigitalOcean Gradient** when `GRADIENT_MODEL_ACCESS_KEY` is set.
- **Voice commands** use Gradient only for the “create work item from transcript” step; **voice input itself** still uses **OpenAI (Whisper)** until DO offers a transcription API.

## 5. Summary

- **DigitalOcean Gradient:** Use for **chat completions** (API operations, voice → work item). Set `GRADIENT_MODEL_ACCESS_KEY` (or `MODEL_ACCESS_KEY`).
- **OpenAI:** Use for **speech-to-text** (voice). Set `OPENAI_API_KEY`. Optional for chat if you prefer OpenAI over Gradient.
- For **full voice**: set both `OPENAI_API_KEY` (transcription) and optionally `GRADIENT_MODEL_ACCESS_KEY` (create-from-transcript on DO).

Reference: [DigitalOcean Gradient – Serverless Inference](https://docs.digitalocean.com/products/gradient-ai-platform/how-to/use-serverless-inference/).
