> **When to Read This:** Load this document when changing the OpenAI GPT Live preview agent, its greeting, credentials, or session options.

# Invite Agent Config

The server-side agent configuration lives in `app/api/invite-agent/route.ts`. The route receives `{ requester_id, channel_name }`, constructs an `AgoraClient`, and starts an MLLM-only session for that RTC user.

```ts
const client = new AgoraClient({
  area: Area.US,
  appId: requireEnv('NEXT_PUBLIC_AGORA_APP_ID'),
  appCertificate: requireEnv('NEXT_AGORA_APP_CERTIFICATE'),
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
}).withMllm(new OpenAIGPTLive({
  apiKey: requireEnv('NEXT_OPENAI_API_KEY'),
  greeting: GREETING,
  model: "gpt-live-1",
  voice: "cedar",
  prompt: INSTRUCTIONS,
}));
```

`OpenAIGPTLive` emits `mllm.vendor: "openai_gpt_live"`, `wss://api.openai.com/v1/live/sessions`, and `greeting_message` for the opening line. The standard client detects this provider and routes start through the preview gateway. Do not add `.withStt()`, `.withLlm()`, or `.withTts()` to this demo.

After `session.start()` returns an agent ID, the invite route stores that exact `AgentSession` in `lib/agent-sessions.ts`. The stop route atomically takes the retained session and calls `session.stop()`; unknown or repeated IDs return idempotent `not-found` success. This registry is process-local, so multi-process deployments need shared lifecycle state or request affinity.

Required server environment:

```bash
NEXT_PUBLIC_AGORA_APP_ID=...
NEXT_AGORA_APP_CERTIFICATE=...
NEXT_OPENAI_API_KEY=...
```

`NEXT_AGENT_GREETING` and `AGENT_INSTRUCTIONS` are optional. `instructions` is persistent system guidance; `greeting` is only the first spoken turn. Session UIDs stay strings on the wire, `remoteUids` stays an array, and RTM remains enabled for transcript, state, metrics, and errors.

Verify changes with `pnpm run typecheck`, `pnpm run verify:api`, and `pnpm run build`.

## Seed prior conversation

Set `AGENT_PRIOR_MESSAGES` in `.env.local` to a JSON array of prior user and assistant text messages, in chronological order:

```dotenv
AGENT_PRIOR_MESSAGES='[{"role":"user","content":"I am planning a trip to Kyoto."},{"role":"assistant","content":"How many days will you be staying?"},{"role":"user","content":"Three days. I enjoy gardens and local food."}]'
```

The invite route sends these as `mllm.messages`, separately from `AGENT_INSTRUCTIONS`, which still supplies `mllm.params.prompt`. Unset, blank, or `[]` means no prior conversation. Invalid JSON or entries without a user/assistant role and string content fail locally before starting an agent. This demo keeps system guidance in the prompt; the SDK's broader messages surface is unchanged.

Restart the demo after editing `.env.local`. Start a session and ask “What city was I planning to visit?” to try the seeded context. These turns seed model context; they are not added to the browser's live transcript. This static demo history is shared by every new session; a real application should load the authenticated user's own history server-side. Debug request logging includes the supplied message content.
