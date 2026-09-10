import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  ExpiresIn,
  OpenAIGPTLive,
} from 'agora-agents';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { ADA_GREETING, ADA_INSTRUCTIONS } from '@/lib/ada';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import { storeAgentSession } from '@/lib/agent-sessions';

// First thing the agent says when a user joins the channel.
const GREETING =
  process.env.NEXT_AGENT_GREETING ??
  ADA_GREETING;
const INSTRUCTIONS =
  process.env.AGENT_INSTRUCTIONS ??
  ADA_INSTRUCTIONS;

// agentUid identifies the AI in the RTC channel and shares its default with the client.
const agentUid = String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// Prior turns are separate from the persistent system prompt.
function readPriorMessages(): { role: 'user' | 'assistant'; content: string }[] {
  const raw = process.env.AGENT_PRIOR_MESSAGES;
  if (!raw?.trim()) return [];

  const errorMessage =
    'AGENT_PRIOR_MESSAGES must be a JSON array of user/assistant messages with string content';
  let messages: unknown;
  try {
    messages = JSON.parse(raw);
  } catch {
    throw new Error(errorMessage);
  }
  if (!Array.isArray(messages)) throw new Error(errorMessage);
  return messages.map((message) => {
    if (
      !message ||
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.content !== 'string'
    ) {
      throw new Error(errorMessage);
    }
    return { role: message.role, content: message.content };
  });
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name } = body;

    // Validate required env vars on first request so misconfiguration surfaces
    // with a clear error message rather than a silent failure.
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    const priorMessages = readPriorMessages();

    // --- 2. Build and start the agent ---

    // area: change to Area.EU or Area.AP for European or Asia-Pacific deployments.
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    // OpenAI GPT Live handles audio end-to-end; there is no ASR/LLM/TTS cascade.
    const agent = new Agent({
      client,
      // RTM is required for transcript events in the browser client.
      advancedFeatures: { enable_rtm: true, enable_tools: false },
      // Required for browser RTM events:
      // - data_channel: 'rtm' enables RTM delivery path for state/metrics/errors
      // - enable_error_message emits AGENT_ERROR payloads
      // - enable_metrics emits AGENT_METRICS latency payloads
      parameters: {
        // web client → ultra-low-latency chorus profile
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    }).withMllm(
      new OpenAIGPTLive({
        apiKey: requireEnv('NEXT_OPENAI_API_KEY'),
        greeting: GREETING,
        model: "gpt-live-1-diamond-alpha",
        alphaSelector: "quicksilver=v3",
        voice: "cedar",
        prompt: INSTRUCTIONS,
        messages: priorMessages,
      }),
    );

    // remoteUids restricts the agent to only process audio from this user
    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: true, // enable debug to show restful API calls in the console
    });

    const agentId = await session.start();
    storeAgentSession(agentId, session);

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
