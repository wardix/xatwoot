# API Reference - Chatwoot Clone

Semua endpoint menggunakan JSON response dan authentication dengan JWT token.

---

## Authentication Endpoints

### POST /api/v1/auth/login
Login user dan dapatkan JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "string"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "agent"
  }
}
```

### GET /api/v1/auth/me
Dapatkan info user yang sedang login.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "agent"
}
```

---

## Conversations API

### GET /api/v1/conversations
Daftar conversations dengan filter.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| inbox_id | string | Filter berdasarkan inbox channel |
| status | string | Filter: open, pending, resolved, snoozed |
| assignee_id | number | Filter berdasarkan agent |
| page | number | Pagination (default: 1) |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "display_id": 1001,
      "status": "open",
      "priority": "high",
      "subject": "Pertanyaan tentang produk",
      "contact": {
        "id": 5,
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "assignee": {
        "id": 2,
        "name": "Agent Name"
      }
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "per_page": 20
  }
}
```

### POST /api/v1/conversations
Buat conversation baru.

**Request Body:**
```json
{
  "inbox_id": 1,
  "contact_id": 5,
  "subject": "Pertanyaan pelanggan"
}
```

**Response (201):**
```json
{
  "id": 10,
  "display_id": 1003,
  "status": "open",
  "inbox_id": 1,
  "contact_id": 5
}
```

### GET /api/v1/conversations/:id
Detail conversation beserta semua messages.

**Response (200):**
```json
{
  "id": 10,
  "display_id": 1003,
  "status": "open",
  "priority": "normal",
  "subject": "Pertanyaan pelanggan",
  "messages": [
    {
      "id": 50,
      "body": "Halo, saya ada pertanyaan tentang produk...",
      "message_type": "incoming",
      "sender_type": "contact",
      "status": "read",
      "created_at": "2026-08-05T10:30:00Z"
    }
  ]
}
```

### PUT /api/v1/conversations/:id
Update status atau assignee conversation.

**Request Body:**
```json
{
  "status": "resolved",
  "assignee_id": 2
}
```

---

## Messages API

### POST /api/v1/conversations/:conversation_id/messages
Kirim pesan baru ke conversation.

**Request Body (Content-Type: application/json):**
```json
{
  "body": "Pesan yang dikirim oleh agent",
  "message_type": "text"
}
```

**Response (201):**
```json
{
  "id": 51,
  "conversation_id": 10,
  "body": "Pesan yang dikirim oleh agent",
  "sender_type": "user",
  "status": "sent"
}
```

### GET /api/v1/conversations/:conversation_id/messages
List semua messages dalam conversation.

**Response (200):**
```json
[
  {
    "id": 50,
    "body": "Pertanyaan pertama",
    "message_type": "incoming",
    "sender_type": "contact",
    "status": "read"
  }
]
```

---

## Contacts API

### GET /api/v1/contacts
Cari/listing contacts dengan pencarian.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Pencarian by email, name, phone (uses pg_trgm) |
| page | number | Pagination |

### POST /api/v1/contacts
Buat contact baru.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone_number": "+628123456789"
}
```

### GET /api/v1/contacts/:id
Detail contact.

**Response (200):**
```json
{
  "id": 5,
  "name": "John Doe",
  "email": "john@example.com",
  "phone_number": "+628123456789",
  "avatar_url": null,
  "additional_attributes": {}
}
```

---

## Users & Teams API

### GET /api/v1/users
List semua users dalam account.

**Response (200):**
```json
[
  {
    "id": 2,
    "email": "agent@example.com",
    "name": "Agent Name",
    "role": "agent"
  }
]
```

### GET /api/v1/teams
List semua teams.

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Support Team",
    "users": [2, 3]
  }
]
```

---

## Inboxes API

### GET /api/v1/inboxes
List semua inboxes (channels).

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Website Chat",
    "channel_type": "web_widget",
    "enabled": true
  },
  {
    "id": 2,
    "name": "Email Support",
    "channel_type": "email",
    "enabled": true
  }
]
```

### POST /api/v1/inboxes
Buat inbox baru.

**Request Body:**
```json
{
  "name": "WhatsApp Business",
  "channel_type": "whatsapp",
  "integration_config": {
    "phone_number_id": "123456789"
  }
}
```

---

## Webhooks API

### POST /api/v1/webhooks/whatsapp
Webhook endpoint untuk WhatsApp Business API.

**Request Headers:**
```
X-Hub-Signature-256: sha256=<hmac-sha256-signature>
Content-Type: application/json
```

**Request Body (contoh WhatsApp):**
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "628123456789",
          "text": { "body": "Halo" }
        }]
      }
    }]
  }]
}
```

**Response:**
```json
{ "success": true }
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired JWT token"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Conversation not found"
}
```

### 422 Validation Error
```json
{
  "error": "Validation Failed",
  "details": {
    "email": ["Email sudah digunakan"],
    "name": ["Nama tidak boleh kosong"]
  }
}
```