Astra Brain

«Persistent AI Brain & Agent Runtime for Roblox»

Astra Brain là backend AI Agent dành cho Roblox, cung cấp persistent memory, learning, knowledge, player/game context, agent planning, tools, capabilities và provider routing trong một hệ thống thống nhất.

Astra không chỉ nhận câu hỏi rồi trả lời.

Mục tiêu của Astra là:

Observe
   ↓
Understand
   ↓
Remember
   ↓
Plan
   ↓
Use Tools
   ↓
Execute
   ↓
Verify
   ↓
Learn
   ↓
Respond

---

✨ Core Features

🧠 Persistent Brain

Astra có bộ nhớ lâu dài cho từng Brain:

- Brain identity
- Player identity
- Player sessions
- Game context
- Knowledge
- Learning events
- Language observations
- Agent state
- Memories

Storage hỗ trợ:

PostgreSQL
    ↓
JSON fallback

PostgreSQL là persistent storage chính khi "DATABASE_URL" được cấu hình.

"brains.json" vẫn được giữ làm fallback/backup.

---

🤖 Agent Runtime

Astra sử dụng Agent Loop thay vì chỉ chạy:

message → response

Agent Runtime hướng tới:

Input
  ↓
Observation
  ↓
Intent Detection
  ↓
Memory Retrieval
  ↓
Planning
  ↓
Capability Selection
  ↓
Tool Execution
  ↓
Verification
  ↓
Memory / Learning
  ↓
Final Response

Các thành phần chính:

agent/
├── BrainRuntime.js
├── AgentLoop.js
├── IntentEngine.js
├── Planner.js
├── WorldModel.js
├── ObservationEngine.js
├── ActionSystem.js
└── SelfState.js

"BrainRuntime" vẫn là runtime hiện tại của Astra và được sử dụng làm lớp tương thích với hệ thống cũ.

"AgentLoop" là orchestration layer mới.

---

🧩 Existing Tools

Astra giữ và tích hợp trực tiếp các tool hiện tại:

tools/
├── memory-tool.js
├── knowledge-tool.js
├── player-tool.js
└── game-tool.js

Các tool này không bị thay thế.

Agent Loop sẽ gọi chúng thông qua một unified action/capability layer.

Ví dụ:

User:
"Tôi đã nói gì về project này trước đây?"

       ↓

IntentEngine
       ↓
memory.retrieve
       ↓
memory-tool
       ↓
Brain memory
       ↓
Agent response

Hoặc:

User:
"Thông tin player hiện tại là gì?"

       ↓

Intent
       ↓
player.inspect
       ↓
player-tool
       ↓
Player context
       ↓
Response

---

🌐 Capability System

Astra sử dụng Capability Registry để biết hệ thống hiện tại có thể làm gì.

Ví dụ:

memory.retrieve       READY
knowledge.search      READY
player.inspect        READY
game.inspect          READY
web.search            READY

github                OFFLINE
youtube               OFFLINE
workspace             OFFLINE
security.scan         DISABLED

Điều này giúp Agent không giả vờ có khả năng mà server thực tế không có.

Cấu trúc:

capabilities/
├── index.js
├── capabilityRouter.js
├── health.js
│
├── web/
│   ├── index.js
│   └── search.js
│
├── github/
│   └── index.js
│
├── youtube/
│   └── index.js
│
├── workspace/
│   └── index.js
│
└── security/
    └── index.js

---

🔧 Agent Tools

Agent có thể sử dụng:

Memory
Knowledge
Player
Game
Web
Workspace
Planner
Verification

Mỗi tool phải trả về dữ liệu có cấu trúc.

Ví dụ:

{
  "success": true,
  "tool": "memory.retrieve",
  "results": []
}

Tool không nên trực tiếp quyết định câu trả lời cuối cùng.

Tool chỉ cung cấp:

Observation
Data
Result
Error
Metadata

Agent Loop mới quyết định bước tiếp theo.

---

🧠 Memory Architecture

Memory được chia thành:

Short-term context
        ↓
Session memory
        ↓
Brain memory
        ↓
Knowledge
        ↓
Learning events

Astra có thể:

- retrieve memories
- update memories
- record observations
- record learning events
- associate memories với Brain
- associate memories với player
- sử dụng game context

---

🌍 World Model

World Model lưu trạng thái thế giới mà Astra đang quan sát.

Ví dụ:

{
  "brainId": "ASTRA-123",
  "game": {},
  "player": {},
  "players": [],
  "location": null,
  "nearbyObjects": [],
  "activeTasks": [],
  "activeSkills": [],
  "capabilities": []
}

World Model không phải database thay thế.

Nó là:

Current world state

Database là:

Persistent history

---

🤖 Self State

Astra cũng theo dõi trạng thái của chính Agent:

idle
observing
planning
executing
verifying
error

Ví dụ:

{
  "status": "executing",
  "currentTask": "research",
  "currentSkill": "web-search",
  "lastError": null,
  "totalActions": 12
}

Điều này cho phép dashboard hiển thị Agent đang thực sự làm gì.

---

🔀 Provider System

Astra không yêu cầu người dùng Roblox nhập AI API key.

Kiến trúc provider:

Agent
  ↓
Provider Router
  ├── No-Key Provider
  ├── Local Provider
  └── Future Providers

Provider là backend implementation.

Roblox client không cần biết provider nào đang chạy.

---

API Key Policy

Astra không yêu cầu:

OPENAI_API_KEY
XAI_API_KEY
GROK_API_KEY
ANTHROPIC_API_KEY
GEMINI_API_KEY

ở phía Roblox/user.

Nếu một provider phía server yêu cầu credential, credential đó phải nằm trong server environment và không bao giờ được gửi về Roblox.

No-key providers có thể được sử dụng khi chúng thực sự khả dụng.

Astra không giả lập AI khi provider không hoạt động.

---

🔐 Security

Brain API sử dụng:

X-Brain-Secret: <BRAIN_API_SECRET>

Dashboard sử dụng server-side password/session.

Không lưu dashboard password trong frontend.

Không gửi provider credentials tới Roblox.

Không expose database credentials.

---

🗄️ Persistence

Astra hỗ trợ:

DATABASE_URL

Nếu có:

PostgreSQL

Nếu PostgreSQL không khả dụng:

brains.json

Database startup có cơ chế:

PostgreSQL exists
        ↓
restore state

PostgreSQL empty
        ↓
check JSON
        ↓
migrate JSON → PostgreSQL

Astra cũng giữ JSON backup trong quá trình persistence.

---

🌐 API

Brain Registry

Register

POST /api/brains/register

Heartbeat

POST /api/brains/heartbeat

Headers:

X-Brain-Secret: <BRAIN_API_SECRET>
Content-Type: application/json

---

🤖 Agent API

Agent execution endpoint:

POST /api/agent/run

Example:

{
  "brainId": "ASTRA-123",
  "playerId": "123456",
  "message": "Hãy tìm hiểu game này và giải thích cho tôi"
}

Response có thể chứa:

{
  "success": true,
  "requestId": "...",
  "response": "...",
  "intent": {},
  "plan": {},
  "actions": [],
  "results": [],
  "verification": {},
  "errors": []
}

---

🧩 Capability API

GET /api/capabilities

Trả về capability hiện tại:

{
  "success": true,
  "capabilities": []
}

---

❤️ Health API

GET /api/brain/health

Kiểm tra:

- server
- providers
- capabilities
- runtime status

---

📁 Project Structure

AI-Brain/
│
├── agent/
│   ├── BrainRuntime.js
│   ├── AgentLoop.js
│   ├── IntentEngine.js
│   ├── Planner.js
│   ├── WorldModel.js
│   ├── ObservationEngine.js
│   ├── ActionSystem.js
│   └── SelfState.js
│
├── core/
│   ├── memory.js
│   ├── knowledge.js
│   ├── learning.js
│   ├── language.js
│   ├── persistence.js
│   ├── eventBus.js
│   ├── capabilityRegistry.js
│   ├── contextBuilder.js
│   └── providerRouter.js
│
├── capabilities/
│   ├── index.js
│   ├── capabilityRouter.js
│   ├── health.js
│   ├── web/
│   ├── github/
│   ├── youtube/
│   ├── workspace/
│   └── security/
│
├── providers/
│   ├── index.js
│   ├── noKeyProvider.js
│   ├── localProvider.js
│   └── fallbackProvider.js
│
├── tools/
│   ├── memory-tool.js
│   ├── knowledge-tool.js
│   ├── player-tool.js
│   ├── game-tool.js
│   ├── web-tool.js
│   ├── workspace-tool.js
│   ├── planner-tool.js
│   └── verification-tool.js
│
├── skills/
│   ├── build/
│   ├── code/
│   ├── debug/
│   ├── research/
│   ├── analyze/
│   ├── observe/
│   ├── navigate/
│   ├── explain/
│   ├── planner/
│   └── security/
│
├── server/
│   ├── api.js
│   ├── auth.js
│   ├── registry.js
│   ├── brain-api.js
│   ├── agent-api.js
│   ├── capability-api.js
│   └── health-api.js
│
├── data/
│   └── brains.json
│
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── server.js
├── package.json
└── README.md

---

🚀 Local Development

Requirements:

Node.js >= 18

Install:

npm install

Run:

npm start

Open:

http://localhost:3000

---

☁️ Railway Deployment

Recommended environment:

NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://...

DASHBOARD_PASSWORD=your-password

BRAIN_API_SECRET=your-long-random-secret

Optional no-key provider:

NO_KEY_AI_ENDPOINT=https://text.pollinations.ai/openai
NO_KEY_AI_MODEL=openai

Build:

npm install

Start:

node server.js

---

🧪 Agent Execution Example

Input:

"Tìm hiểu về project này rồi cho tôi biết nó có gì"

Astra:

1. Detect intent
        ↓
2. Retrieve relevant memory
        ↓
3. Inspect current world/context
        ↓
4. Create plan
        ↓
5. Select web.search
        ↓
6. Execute search
        ↓
7. Verify result
        ↓
8. Generate response
        ↓
9. Store useful learning

---

🧠 Design Principles

1. Existing systems stay alive

Không thay thế:

BrainRuntime
Memory
Knowledge
Player
Game
Registry
Dashboard
Persistence

Agent layer được xây lên trên chúng.

2. Tools do not become the Agent

Tool:

do one job

Agent:

decide what to do

3. Capability availability must be real

Không khai báo:

web.search = true

nếu backend thực tế không hoạt động.

4. No fake AI

Nếu provider không hoạt động:

provider unavailable

không được tạo câu trả lời giả rồi gọi đó là AI reasoning.

5. Roblox remains a client

Roblox cung cấp:

player context
game context
observations
brain identity

Backend chịu trách nhiệm:

memory
planning
tools
knowledge
agent execution
provider routing
persistence

---

🔮 Future Modules

Các capability có thể được bổ sung mà không thay đổi Agent Loop:

web
github
youtube
reddit
workspace
documents
browser
code execution
knowledge ingestion
MCP
multi-agent

Agent Loop chỉ cần:

discover capability
→ plan
→ execute
→ verify

---

License

Project-specific. Check repository license before redistributing components from third-party projects.
