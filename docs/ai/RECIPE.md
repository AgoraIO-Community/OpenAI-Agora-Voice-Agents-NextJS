# Recipe card: OpenAI GPT Live with the Agora TypeScript SDK

Use this recipe when a Next.js server route should run an end-to-end GPT Live voice agent in an Agora channel.

| Item | Value |
| --- | --- |
| SDK | `agora-agents@2.8.0` |
| Provider | `openai_gpt_live` |
| Model | `gpt-live-1-diamond-alpha` |
| Voice | `cedar` |
| Data channel | RTM |
| Agent pipeline | MLLM only |

## Install

```bash
pnpm add agora-agents@2.8.0
```

## Configure credentials

```dotenv
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id
NEXT_AGORA_APP_CERTIFICATE=your_agora_app_certificate
NEXT_OPENAI_API_KEY=your_openai_api_key
```

Only the App ID belongs in browser code. Read the App Certificate and OpenAI key from a server route.

## Create the agent

```typescript
import {
  AgoraClient,
  Agent,
  Area,
  ExpiresIn,
  OpenAIGPTLive,
} from 'agora-agents';

async function startAgent(channel: string, agentUid: string, userUid: string) {
  const client = new AgoraClient({
    area: Area.US,
    appId: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
    appCertificate: process.env.NEXT_AGORA_APP_CERTIFICATE!,
  });

  const agent = new Agent({
    client,
    advancedFeatures: { enable_rtm: true, enable_tools: false },
    parameters: {
      audio_scenario: 'chorus',
      data_channel: 'rtm',
      enable_error_message: true,
      enable_metrics: true,
    },
  }).withMllm(
    new OpenAIGPTLive({
      apiKey: process.env.NEXT_OPENAI_API_KEY!,
      model: 'gpt-live-1-diamond-alpha',
      alphaSelector: 'quicksilver=v3',
      voice: 'cedar',
      prompt: 'You are a concise and helpful voice assistant.',
      greeting: 'Hello! How can I help?',
      messages: [
        { role: 'user', content: 'My name is Arlene.' },
        { role: 'assistant', content: 'Nice to meet you, Arlene.' },
      ],
    }),
  );

  const session = agent.createSession({
    channel,
    agentUid,
    remoteUids: [userUid],
    idleTimeout: 30,
    expiresIn: ExpiresIn.hours(1),
  });

  const agentId = await session.start();
  return { agentId, session };
}
```

Generate the RTC+RTM token before starting the session. The browser and agent must join the same channel with different UIDs. Set `remoteUids` to the browser user's UID so the agent processes that user's audio.

## Parameter map

| TypeScript option | Request field | Purpose |
| --- | --- | --- |
| `prompt` | `mllm.params.prompt` | Persistent system instructions |
| `greeting` | `mllm.greeting_message` | Opening line |
| `messages` | `mllm.messages` | Prior user and assistant turns |
| `voice` | `mllm.params.voice` | Output voice |
| `alphaSelector` | `mllm.params.alpha_selector` | Selects the GPT Live v3 contract |

Use `messages` for prior conversation. Keep system behavior in `prompt`.

## Stop the session

Retain the session object with its returned agent ID, then stop it through the same object:

```typescript
await session.stop();
```

For a multi-instance deployment, store lifecycle ownership in shared state or route start and stop requests to the same instance.

## Try the complete sample

Return to the [project README](../../README.md) for credential setup, local run commands, browser UI, and troubleshooting.
