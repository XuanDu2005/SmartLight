# 14 — AI Architecture (Future)

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft — Future Capability
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document describes the **future AI capabilities** of SmartLight. **AI is NOT part of MVP.** It is enabled progressively from V1.5 onward, behind feature flags, with measured value.

> This document does not block the MVP. It explains the roadmap for AI integration.

---

## 2. AI Principles

1. **AI is optional** — never block core flows on AI.
2. **Feature-flagged** — each capability behind `feature_flag`.
3. **Measured** — every capability has success metrics.
4. **Human-in-the-loop** — for content generation, never auto-publish.
5. **Cost-controlled** — per-request token caps; daily budget.
6. **Audit friendly** — every AI output logged for review.
7. **Privacy** — never send PII to external LLMs without consent.

---

## 3. AI Capability Roadmap

| Capability | Target | Use Case | Priority |
|---|---|---|---|
| **AI Search** | V1.5 | Semantic product search | High |
| **Product Recommendations** | V1.5 | "Customers also bought" | High |
| **Customer Support Assistant** | V1.5 | Help center bot | Medium |
| **Sales Assistant** | V2 | Personalized suggestions | Medium |
| **Review Summarization** | V2 | Product review TL;DR | Medium |
| **Auto-Categorization** | V2 | Product categorization | Low |
| **Image Tagging** | V1.5 (already partial via Cloudinary) | SEO tags | Low |
| **Demand Forecasting** | V2 | Inventory planning | Low |
| **Ad Copy Generation** | V2 | Promotion copy | Low |

---

## 4. AI Provider Options

| Provider | Best For | Cost | Notes |
|---|---|---|---|
| **OpenAI** | General LLM | Token-based | Strong reasoning |
| **Anthropic** | Reasoning, long context | Token-based | Quality + safety |
| **Open-source (Mistral, Llama 3)** | Self-hosted | Compute | Data privacy |
| **Pinecone / pgvector** | Embedding storage | Tiered | Vector DB |
| **Cohere** | Embeddings | Token-based | Multilingual strong |

### 4.1 V1.5 Strategy

- LLM API (OpenAI or Anthropic via API)
- Vector storage: **pgvector** in PostgreSQL (Neon supports it)
- Local files only when needed

### 4.2 V2 Strategy

- Possible self-hosted for cost-sensitive workloads
- Multi-provider abstraction

---

## 5. AI Module (Future)

### 5.1 Bounded Context

Future AI module lives at `modules/ai/`.

```
modules/ai/
├── domain/                    # PURE
│   ├── models/                # Type definitions (Recommendation, SearchResult)
│   ├── ports/                 # AiProviderPort, EmbeddingPort
│   └── services/              # RecommendationService, SemanticSearchService
├── application/               # Use cases
│   ├── commands/
│   └── queries/
├── infrastructure/
│   ├── adapters/              # OpenAI, Anthropic, Cohere adapters
│   ├── vector/                # pgvector repository
│   └── jobs/                  # batch indexers
└── interface/
    ├── controllers/
    └── dtos/
```

### 5.2 Cross-Module Rules

- AI may call: Catalog, Order (via events), Media
- AI must NOT block: any module's main flows
- AI output always has a TTL / freshness indicator

---

## 6. Capability Designs

### 6.1 AI Search (V1.5)

#### Goal

Users type natural-language queries and get relevant products, even for fuzzy/non-keyword matches.

#### Flow

```
1. User enters query
2. Embed query (LLM embedding model)
3. Vector search over `product_embedding` table
4. Rerank results (LLM-based reranker)
5. Return top-K with snippet/explanation
```

#### Storage

```
product_embedding table:
  product_id (UUID, PK)
  embedding (vector(1536))
  text_hash (deterministic key)
  updated_at (timestamp)
  indexed_at (timestamp)
```

#### Indexing

- Daily batch job reindexes all products
- On `product.published` event → reindex single product
- On `product.updated` event → reindex if title/description changed

#### Cost Guardrails

- Daily search budget cap
- Result count limit
- Cache frequent queries (1h TTL)
- Rate limit per IP

#### Endpoint

```
POST /v1/ai/search
{
  "query": "đèn led phòng khách ánh sáng vàng",
  "filters": { "category": "lighting", "priceMax": 2000000 }
}
→ {
  "results": [
    { "productId": "...", "score": 0.92, "explanation": "..." }
  ]
}
```

### 6.2 Product Recommendation (V1.5)

#### Strategy

Hybrid: collaborative + content-based.

```
Recommendation = α * CF + β * ContentBased + γ * Popularity
```

#### Inputs

- User order history (last 90 days)
- Cart contents (current)
- Browsing history (last 30 days, anonymous allowed)
- Product embeddings (for content-based)
- Co-purchase matrix (batch-calculated)

#### Endpoint

```
GET /v1/ai/recommendations?context=cart
→ { "items": [{ productId, score, reason }] }
```

#### Cold Start

For new users: popularity + recent views. For new products: content-based.

#### Refresh

- Real-time: when user adds to cart
- Batch: nightly full recompute
- Limit: top 20 per category

### 6.3 Customer Support Assistant (V1.5)

#### Goal

Bot answers common FAQs using existing help articles + order status.

#### Architecture

```
User question
   ↓
Embedding lookup (RAG over help articles)
   ↓
Fetch relevant context (order status, ticket history)
   ↓
LLM with system prompt + context
   ↓
Answer + optional actions (link to order, escalate)
```

#### Constraints

- No PII to LLM without consent
- All conversations logged
- Auto-escalate to human after 2 failed attempts

#### Endpoint

```
POST /v1/ai/support/chat
{ "message": "...", "conversationId": "..." }
→ {
    "answer": "...",
    "actions": [{ "type": "open_order", "data": {...} }],
    "confidence": 0.85,
    "shouldEscalate": false
}
```

### 6.4 Sales Assistant (V2)

- Personalized homepage
- Bundle suggestions at checkout
- Conversion likelihood scoring

### 6.5 Review Summarization (V2)

- Cluster reviews
- LLM-generated TL;DR
- Per-product Star distribution already shown

### 6.6 Auto-Categorization (V2)

- Suggest category on product create
- Admin confirms; over time, full auto

### 6.7 Image Tagging (V1.5 — partial)

- Already using Cloudinary auto-tagging
- Can extend with custom model

### 6.8 Demand Forecasting (V2)

- Time-series forecasting per product
- Inventory alerts based on forecast
- Models trained per category

---

## 7. Vector Storage

### 7.1 PostgreSQL pgvector

```
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE product_embedding (
  product_id UUID PRIMARY KEY,
  embedding vector(1536),     -- OpenAI ada-002
  text TEXT,                  -- source text (for debugging)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON product_embedding USING ivfflat (embedding vector_cosine_ops);
```

### 7.2 Indexing Strategy

| Period | Action |
|---|---|
| Daily | Refresh stale embeddings (>7 days old) |
| On publish | New product: index immediately |
| On unpublish | Delete embedding |
| On update | Re-embed if title/desc changed |

---

## 8. LLM Provider Adapter

### 8.1 Port Interface

```
interface LlmPort {
  embed(text: string): Promise<number[]>;
  complete(prompt: string, options: LlmOptions): Promise<LlmResponse>;
  chat(messages: ChatMessage[], options: LlmOptions): Promise<LlmResponse>;
  rerank(query: string, candidates: Candidate[]): Promise<RerankResult>;
}
```

### 8.2 Adapter Implementations (Future)

```
class OpenAILlmAdapter implements LlmPort { ... }
class AnthropicLlmAdapter implements LlmPort { ... }
class CohereEmbeddingAdapter implements EmbeddingPort { ... }
```

### 8.3 Provider Selection per Use Case

| Use Case | Provider |
|---|---|
| Embeddings | OpenAI `text-embedding-3-small` |
| Generation (chat) | Anthropic Claude Sonnet |
| Reranking | Cohere Rerank |
| VI-specific | Open-source Vietnamese model |

---

## 9. Cost Management

### 9.1 Budget

| Limit | Value |
|---|---|
| Daily USD cap | e.g., $20 |
| Per-request token cap | e.g., 2000 |
| Monthly USD cap | e.g., $500 |

### 9.2 Enforcement

- Track token spend per service per day
- If limit hit, fall back to non-AI behavior
- Alert on 80%, 100% spend

### 9.3 Caching

- Search query → cache top-K results (1h TTL)
- Embeddings → cache by hash of input
- LLM completions → cache deterministic outputs

---

## 10. Privacy and Compliance

### 10.1 PII Rules

- Anonymize user IDs (hash) before sending to LLM
- Strip PII from prompts
- Never send raw order data containing card info
- User data export / delete includes AI-derived data

### 10.2 PDPD / GDPR

- AI processing recorded in consent
- User can request human-readable summary of data used
- Right to delete extends to AI embeddings / logs

---

## 11. Evaluation & A/B Testing

| Capability | Metric |
|---|---|
| Search | Click-through rate, conversion |
| Recommendations | Add-to-cart rate, conversion |
| Support Bot | Resolution rate, handoff rate |
| Summarization | Useful rate (admin-rated) |

Implementation: split traffic behind feature flag; track outcomes.

---

## 12. Failure Handling

| Failure | Action |
|---|---|
| Provider timeout | Fallback to non-AI; log |
| Rate limit | Backoff; queue |
| Invalid / off-topic response | Filter; log; show "no match" |
| Budget exceeded | Auto-disable for the rest of day |

---

## 13. Observability

For every AI call:

```
logs/ai/
  - request_id
  - capability
  - provider
  - tokens_in / tokens_out
  - cost_usd
  - latency_ms
  - cache_hit (bool)
  - quality_score (when measurable)
```

---

## 14. Coverage Validation

| Check | Status |
|---|---|
| AI marked as future (not MVP) | ✓ |
| Capabilities with priority | ✓ |
| Provider options | ✓ |
| Module boundary documented | ✓ |
| Per-capability designs | ✓ |
| Vector storage approach | ✓ |
| LLM provider adapter pattern | ✓ |
| Cost controls | ✓ |
| Privacy and PDPD | ✓ |
| Evaluation plan | ✓ |
| Failure handling | ✓ |

---

## 15. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial AI architecture (future capability, not MVP) |

---

**End of 14_AI_ARCHITECTURE.md**