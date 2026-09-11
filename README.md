# OpenAI GPT Live with Agora and Next.js

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org/)
[![Agora Agents](https://img.shields.io/badge/agora--agents-2.8.0-099DFD)](https://www.npmjs.com/package/agora-agents/v/2.8.0)

Build a browser-based voice agent with OpenAI GPT Live and the Agora Conversational AI Engine. This sample uses Next.js for both the web client and server routes. It includes microphone audio, agent playback, live transcripts, state updates, and latency metrics.

The sample uses the published `agora-agents` 2.8.0 package and configures GPT Live as one end-to-end multimodal stage.

## Prerequisites

- Node.js 22 or newer
- [pnpm](https://pnpm.io/installation)
- An Agora project with App ID and App Certificate
- An OpenAI API key with access to `gpt-live-1-diamond-alpha`

## Run locally

Install dependencies:

```bash
pnpm install
```

Create the environment file:

```bash
cp env.local.example .env.local
```

Install the [Agora CLI](https://github.com/AgoraIO/cli), sign in, select your Agora project, and write its App ID and App Certificate to the environment file:

```bash
curl -fsSL https://raw.githubusercontent.com/AgoraIO/cli/main/install.sh | sh -s -- --add-to-path
agora login
agora project use <your-project-name-or-id>
agora project env write .env.local --template nextjs
```

The CLI configures `NEXT_PUBLIC_AGORA_APP_ID` and `NEXT_AGORA_APP_CERTIFICATE`. Add your OpenAI key to `.env.local`:

```dotenv
NEXT_OPENAI_API_KEY=your_openai_api_key
```

If you prefer to configure the file manually, also set `NEXT_PUBLIC_AGORA_APP_ID` and `NEXT_AGORA_APP_CERTIFICATE` in `.env.local`.

Start the app:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000), allow microphone access, and select **Start conversation**. Ada will greet you after the agent joins the channel.

## Configure the agent

These optional server-side variables change the default behavior:

| Variable | Purpose |
| --- | --- |
| `NEXT_AGENT_GREETING` | Changes the first line the agent speaks. |
| `AGENT_INSTRUCTIONS` | Replaces the built-in Ada system prompt. |
| `AGENT_PRIOR_MESSAGES` | Seeds prior user and assistant turns as a JSON array. |

Example conversation history:

```dotenv
AGENT_PRIOR_MESSAGES='[{"role":"user","content":"I am planning a trip to Kyoto."},{"role":"assistant","content":"How many days will you be staying?"}]'
```

The invite route sends instructions through `mllm.params.prompt` and sends conversation history through `mllm.messages`. It validates history before starting the agent.

See the [GPT Live recipe card](./docs/ai/RECIPE.md) for the SDK configuration and the fields used by this sample.

## How it works

1. The browser requests an RTC+RTM token from `/api/generate-agora-token`.
2. The browser joins the Agora channel and publishes microphone audio.
3. `/api/invite-agent` creates and starts an `OpenAIGPTLive` session for the same channel.
4. Agora carries audio between the browser and GPT Live. RTM carries transcripts, state changes, metrics, and errors.
5. `/api/stop-conversation` stops the retained session when the call ends.

The server keeps active sessions in process memory. Use shared storage or request affinity before running more than one server instance.

## Project layout

| Path | Purpose |
| --- | --- |
| `app/api/generate-agora-token/route.ts` | RTC+RTM token generation |
| `app/api/invite-agent/route.ts` | GPT Live configuration and session start |
| `app/api/stop-conversation/route.ts` | Agent session stop |
| `components/` | Pre-call and active conversation UI |
| `lib/ada.ts` | Default greeting and instructions |
| `docs/ai/RECIPE.md` | Copyable GPT Live SDK recipe |

## Verify changes

```bash
pnpm run lint
pnpm run typecheck
pnpm run verify:api
pnpm run build
```

Run all checks with:

```bash
pnpm run verify
```

## Deploy

Deploy the repository as a Next.js application. Add the three required environment variables to the hosting provider and keep the App Certificate and OpenAI key server-side.

## Troubleshooting

- **The agent does not join:** confirm that the Agora project has Conversational AI enabled and that the OpenAI key can use the configured GPT Live model.
- **The server route reports a missing value:** check all three required values in `.env.local`, then restart the dev server.
- **The browser receives no transcript or state events:** confirm that RTM is not blocked and that token generation still uses `RtcTokenBuilder.buildTokenWithRtm`.
- **`next` is not found:** run `pnpm install` in this directory before starting the app.

If you use the Agora CLI, `agora project doctor --deep` checks project binding, credentials, feature access, and network reachability.

## Security

Only the App ID belongs in a `NEXT_PUBLIC_*` variable. Keep `NEXT_AGORA_APP_CERTIFICATE`, `NEXT_OPENAI_API_KEY`, instructions, and prior conversation data on the server.

## License

Released under the [MIT License](./LICENSE).
