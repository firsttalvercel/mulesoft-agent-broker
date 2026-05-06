# MuleSoft Agent Broker — Energy Intelligence Platform

A live demo application that visualizes AI-powered agent orchestration using the MuleSoft Agent Broker. Designed for enterprise demos, it shows how a central broker receives natural language queries, discovers available agents, routes tasks intelligently, and synthesizes results — all with real-time visual feedback.

**Live:** https://mulesoft-agent-broker.vercel.app

---

## What It Does

```
User → Agent Broker → [ERP Agent, CRM Agent, Search Agent, ...]
                                    ↓
                            Synthesized Response
```

1. User enters a Broker URL and clicks **Load Broker**
2. The app sends a discovery message to the broker and parses available agents
3. The ReactFlow graph renders dynamically based on what the broker returns
4. User sends a natural language query
5. The broker routes it to relevant agents, which respond in parallel
6. The final response appears in the chat — clean, no raw JSON

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19 + Tailwind CSS 4 |
| Graph | ReactFlow 11 |
| Animation | Framer Motion 12 |
| State | Zustand 5 |
| Deployment | Vercel |

---

## Protocol

The app communicates with any broker that speaks **A2A (Agent-to-Agent) JSON-RPC 2.0**:

```json
POST {brokerUrl}
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": "uuid",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "kind": "message",
      "parts": [{ "kind": "text", "text": "your query here" }],
      "messageId": "uuid"
    }
  }
}
```

Supports two A2A response formats:
- `result.artifacts[].parts[].text` (MuleSoft agent network format)
- `result.message.parts[].text` (standard A2A format)

---

## Features

### Dynamic Agent Discovery
When a broker URL is loaded, the app sends a capabilities discovery message. Agent names are parsed from the response using pattern matching. If discovery fails or returns no parseable agents, the app falls back to context-aware defaults based on URL keywords (energy, finance, HR, etc.).

### Live Broker Mode vs Simulation
- **Live mode** — paste your broker URL; all queries go through your real broker via a server-side proxy (`/api/broker`) that handles CORS
- **Simulation mode** — keyword-based routing with canned responses for demos without a live broker

### Graph Visualization
- Nodes: User → Broker → discovered agents (dynamically positioned)
- Edges animate when a node is active
- Nodes float with subtle per-node staggered animation (Framer Motion)
- Active nodes pulse with a blue glow

### Resizable Sidebar
Drag the handle between the graph and sidebar. Resizes between 260px and 600px. State persists during the session.

### Agent Skills
Predefined prompt templates for common enterprise queries (Check Inventory, Retrieve Customer Info, Analyze Billing Issue, etc.) — available as a grid when the chat is empty, and as a quick-fill chip row once the conversation starts.

### Trace Panel
Every broker call, routing decision, and response is logged with timestamps. Verbosity is configurable (low / medium / high).

---

## Running Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No environment variables required — the broker URL is entered at runtime and proxied server-side.

---

## Project Structure

```
src/
├── app/
│   ├── api/broker/route.ts   # Server-side proxy — handles CORS, A2A formatting
│   ├── page.tsx              # Main layout — two states: BrokerSetup / App
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── AgentGraph.tsx        # ReactFlow graph — dynamic nodes and edges
│   ├── AgentNode.tsx         # Custom node — Framer Motion animations
│   ├── BrokerSetup.tsx       # Onboarding — URL input, discovery, node building
│   ├── ConversationPanel.tsx # Chat UI — skills grid, message bubbles
│   ├── SettingsPanel.tsx     # LLM selection, simulation toggles, verbosity
│   ├── Sidebar.tsx           # Tabbed panel — Chat / Trace / Settings
│   └── TracePanel.tsx        # Event log
├── lib/
│   ├── simulation.ts         # Simulation engine + real broker call logic
│   └── types.ts              # Shared types (AgentNodeData, Message, TraceEvent)
└── store/
    └── index.ts              # Zustand store — agents, messages, trace, UI state
```

---

## API Proxy

All broker calls go through `/api/broker` (Next.js server route) to avoid CORS issues:

```
Browser → /api/broker → Your Broker URL
```

The proxy wraps the query in A2A JSON-RPC 2.0 format, extracts clean response text from the broker's reply (handles both artifact and message formats), and returns `{ response: string, raw: unknown }` to the client.

---

## Deployment

```bash
npm i -g vercel
vercel --prod
```

No environment variables needed — the broker URL is runtime-configurable.

---

## Demo Broker

The reference broker used in development:

```
https://agent-network-ingress-gw-m3oxt6.dzpv27.usa-e2.cloudhub.io/energy-agent-network-demo/
```

A MuleSoft-hosted energy agent network with ERP inventory, CRM account, and market search agents.
