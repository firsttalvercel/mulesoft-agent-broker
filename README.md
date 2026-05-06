# MuleSoft Agent Broker — Energy Intelligence Platform

A live demo application that visualizes AI-powered agent orchestration using the MuleSoft Agent Broker. Designed for enterprise demos, it shows how a central broker receives natural language queries, discovers available agents, routes tasks intelligently, and synthesizes results — all with real-time visual feedback.

**Live:** https://mulesoft-agent-broker.vercel.app

---

## What It Does

```
User → Agent Broker → [Inventory Agent, Google Search Agent, ...]
                                   ↓
                           Synthesized Response
```

1. User enters a Broker URL and clicks **Load Broker**
2. The app discovers available agents and skills from `/.well-known/agent-card.json`
3. A dynamic node graph renders: User → Broker → one node per skill
4. User sends a query (or clicks a skill button)
5. The flow animates step-by-step: each node lights up as it processes
6. The final response appears in the chat with a **Skill used** attribution badge

---

## Features

| Feature | Detail |
|---------|--------|
| Dynamic broker discovery | Fetches agent card from `/.well-known/agent-card.json` (MuleSoft/CloudHub) with 14 fallback paths including origin-level well-known and POST-based `agent/info` |
| Live A2A mode | Proxies real `message/send` JSON-RPC 2.0 requests through `/api/broker` — handles CORS |
| Simulation mode | Full animated flow with configurable latency and error injection |
| Step-by-step flow animation | User → Broker → Agent(s) → Broker → User, each node glows in sequence |
| Skill → node routing | Clicking a skill button routes to and highlights that specific agent node |
| Skill attribution badge | Every response shows which skill/agent handled the query as a color-coded pill |
| Skills tab | Lists all broker skills with description, tags, examples, and linked agent node |
| Refresh broker | Re-fetches metadata with cache-bust and updates graph/agents/skills without resetting the session |
| Drag-to-resize panel | Right sidebar resizable from 260px to 600px via 16px drag handle |
| Trace panel | Real-time event log of all routing, API calls, and responses with configurable verbosity |
| Official MuleSoft branding | MuleSoft from Salesforce logo, robot avatar in chat, favicon |

---

## A2A Protocol

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

### Response Extraction

The broker parser handles all known A2A response formats in priority order:

| Format | Path |
|--------|------|
| A2A Task (MuleSoft) | `result.artifacts[].parts[].text` |
| A2A Message (newer spec) | `result.parts[].text` |
| Nested message | `result.message.parts[].text` |
| Status message | `result.status.message.parts[].text` |
| Plain string fields | `result.response`, `result.answer`, `result.text`, etc. |

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
│   ├── api/
│   │   ├── broker/route.ts       # A2A proxy — CORS, JSON-RPC formatting, response extraction
│   │   └── agent-card/route.ts   # Agent card discovery — 14 endpoint candidates, in-memory cache
│   ├── icon.png                  # Browser tab favicon
│   ├── page.tsx                  # Main layout — BrokerSetup / App, drag-to-resize
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── AgentGraph.tsx            # ReactFlow graph — dynamic nodes, animated edges
│   ├── AgentNode.tsx             # Custom node — Framer Motion pulse on active
│   ├── BrokerSetup.tsx           # Onboarding — URL input, discovery, node building
│   ├── ConversationPanel.tsx     # Chat UI — skills grid, message bubbles, skill attribution
│   ├── SkillsPanel.tsx           # Skills tab — name, description, linked agent, tags, example
│   ├── SettingsPanel.tsx         # Simulation toggles, verbosity, connection info
│   ├── Sidebar.tsx               # Tabbed panel — Chat / Skills / Trace / Settings
│   └── TracePanel.tsx            # Real-time event log
├── lib/
│   ├── broker.ts                 # Shared broker loading logic (fetchBrokerData, buildAgentNodes)
│   ├── simulation.ts             # Simulation engine + real broker call + flow animation
│   └── types.ts                  # Shared types (AgentNodeData, Message, MessageAttribution, ...)
└── store/
    └── index.ts                  # Zustand store — agents, messages, skills, trace, UI state
```

---

## API Routes

### `POST /api/broker`
Server-side A2A proxy. Accepts `{ message, brokerUrl }`, wraps in JSON-RPC 2.0, forwards to broker, extracts text from response.

### `GET /api/agent-card?url=...`
Discovers the broker's agent card. Tries 14 endpoint candidates in order (path-relative and origin-level `.well-known/agent-card.json`, `.well-known/agent.json`, and variants). Falls back to POST-based `agent/info` discovery. Caches results in-memory; pass `?refresh=1` to bust the cache.

---

## Demo Broker

The reference broker used in development:

```
https://agent-network-ingress-gw-m3oxt6.dzpv27.usa-e2.cloudhub.io/energy-agent-network-demo/
```

A MuleSoft-hosted energy agent network with two skills:
- **Inventory and Distribution Skill** — SAP ERP inventory queries, sales orders, deliveries
- **Google Search Skill** — live web search for energy market data

Agent card at: `{broker-url}/.well-known/agent-card.json`

---

## Deployment

```bash
npm i -g vercel
vercel --prod
```

No environment variables needed. The broker URL is runtime-configurable via the Load Broker screen.
