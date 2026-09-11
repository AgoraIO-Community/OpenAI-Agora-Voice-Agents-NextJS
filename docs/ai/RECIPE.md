# Build an OpenAI GPT Live voice agent with Next.js

Use Agora's TypeScript SDK to run an OpenAI GPT Live voice agent from Next.js server routes. GPT Live handles speech input, reasoning, and speech output as one MLLM stage. The browser publishes microphone audio and displays transcripts, agent state, and latency metrics.

| Item | Value |
| --- | --- |
| SDK | `agora-agents@2.8.1` |
| Provider | `openai_gpt_live` |
| Model | `gpt-live-1` |
| Voice | `cedar` |
| Runtime | Next.js and TypeScript |
| Data channel | RTM |

## Prerequisites

- Node.js 22 or newer
- [pnpm](https://pnpm.io/installation)
- [Agora CLI](https://github.com/AgoraIO/cli)
- An Agora project with an App ID and App Certificate
- An OpenAI API key with GPT Live access

## Run the recipe

Clone the repository, install dependencies, and create the environment file:

```bash
git clone git@github.com:AgoraIO-Community/OpenAI-Agora-Voice-Agents-NextJS.git
cd OpenAI-Agora-Voice-Agents-NextJS
pnpm install
cp env.local.example .env.local
```

Use the Agora CLI to select a project and write its credentials to `.env.local`:

```bash
agora login
agora project use <your-project-name-or-id>
agora project env write .env.local --template nextjs
```

Add your OpenAI key to `.env.local`:

```dotenv
NEXT_OPENAI_API_KEY=your_openai_api_key
```

Start the app:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000), allow microphone access, and select **Start conversation**.

## Configure GPT Live

The server route creates the MLLM and starts a session with the browser's channel and UID:

```typescript
import { AgoraClient, Agent, Area, ExpiresIn, OpenAIGPTLive } from 'agora-agents';

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
      model: 'gpt-live-1',
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

The complete sample generates an RTC+RTM token before starting the agent. The browser and agent join the same channel with different UIDs, and `remoteUids` identifies the browser user whose audio the agent should process.

## Customize the conversation

| TypeScript option | Request field | Purpose |
| --- | --- | --- |
| `prompt` | `mllm.params.prompt` | Persistent system instructions |
| `greeting` | `mllm.greeting_message` | Requested opening line |
| `messages` | `mllm.messages` | Prior user and assistant turns |
| `voice` | `mllm.params.voice` | Output voice |

Use `prompt` for system behavior and `messages` to continue an earlier conversation. Keep the App Certificate, OpenAI key, and conversation history in server code.

## Stop the agent

Retain the session returned by `startAgent` and stop it when the call ends:

```typescript
await session.stop();
```

For a multi-instance deployment, store lifecycle ownership in shared state or route start and stop requests to the same instance.

## Verify the project

```bash
pnpm run verify
```

See the [project README](../../README.md) for architecture, deployment, configuration options, and troubleshooting.
