# TaniyAI

A production-ready chat web app that talks to OpenRouter models (default: `tencent/hy3:free`).
Built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**, and designed to deploy
free on **Vercel**.

## Features

- Streaming responses (token-by-token)
- Model picker (OpenRouter models)
- Temperature + max tokens controls
- Light/dark theme toggle
- Clear chat
- Copy message to clipboard
- Chat history kept in context
- **Secure**: the OpenRouter API key lives only on the server (`/api/chat`), never in the browser

## Local development

```bash
npm install
cp .env.example .env   # then add your OPENROUTER_API_KEY
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com → New Project → import the repo.
3. Add Environment Variable:
   - `OPENROUTER_API_KEY` = your `sk-or-...` key
4. Deploy. Done.

The app reads the key from `process.env.OPENROUTER_API_KEY` on the server only.

## Project structure

```
app/
  layout.tsx        # root layout + theme class
  page.tsx          # renders <Chat />
  globals.css       # tailwind
  api/chat/route.ts # secure streaming proxy to OpenRouter
components/
  Chat.tsx          # state, streaming, persistence
  ConfigPanel.tsx   # model + params + theme + clear
  MessageList.tsx   # scroll container
  MessageBubble.tsx # bubble + copy
  Composer.tsx      # input box
lib/
  types.ts          # shared types + model list
```

## Notes

- The key is never sent to the browser. All model calls go through `/api/chat`.
- `tencent/hy3:free` is the default model; switch from the dropdown.
