---
name: raindrop
description: Manage Raindrop.io bookmarks via REST API using curl or bun -e
---

Base URL: `https://api.raindrop.io/rest/v1/`
Auth: `Authorization: Bearer $RAINDROP_API_KEY` header

> Note: $RAINDROP_API_KEY is assumed to exist in environment. Don't check for it.

## Endpoints

### Collections

- `GET /collections` - List root collections
- `GET /collections/childrens` - List nested collections
- `GET /collection/{id}` - Get single collection
- `POST /collection` - Create collection
- `PUT /collection/{id}` - Update collection
- `DELETE /collection/{id}` - Delete collection (moves bookmarks to trash)
- `DELETE /collection/-99` - Empty trash permanently

### Bookmarks

- `GET /raindrops/{collectionId}` - List bookmarks in collection
- `GET /raindrop/{id}` - Get single bookmark
- `POST /raindrop` - Create bookmark
- `PUT /raindrop/{id}` - Update bookmark
- `DELETE /raindrop/{id}` - Delete bookmark (moves to trash)
- `PUT /raindrops/{collectionId}` - Bulk update bookmarks
- `DELETE /raindrops/{collectionId}` - Bulk delete bookmarks

### Tags

- `GET /tags/{collectionId}` - List tags (omit ID for all collections)
- `PUT /tags/{collectionId}` - Rename/merge tags (omit ID for all collections)
- `DELETE /tags/{collectionId}` - Remove tags (omit ID for all collections)

## Collection IDs

- `0` - All bookmarks
- `-1` - Unsorted
- `-99` - Trash

## Query Parameters for GET /raindrops/{id}

| Param     | Description                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| `sort`    | `-created` (newest, default), `created` (oldest), `score`, `-sort`, `title`, `-title`, `domain`, `-domain` |
| `perpage` | Max 50 (default 25)                                                                                        |
| `page`    | Page number (0-indexed)                                                                                    |
| `search`  | Search query (see operators below)                                                                         |
| `nested`  | Include child collections: `true`/`false`                                                                  |

## Search Operators

| Operator             | Example            | Description                                                |
| -------------------- | ------------------ | ---------------------------------------------------------- |
| `#tag`               | `#javascript`      | Tag filter                                                 |
| `collection:ID`      | `collection:12345` | Specific collection                                        |
| `type:TYPE`          | `type:video`       | Content type: link, article, image, video, document, audio |
| `important:true`     |                    | Favorites only                                             |
| `domain:example.com` |                    | Domain filter                                              |

| `word` | `react tutorial` | Full-text search |

## Response Format

Success returns data in `item` (single) or `items` (array).

### Bookmark

```json
{
  "result": true,
  "item": {
    "_id": 123456789,
    "link": "https://example.com",
    "title": "Page Title",
    "type": "link" | "article" | "image" | "video" | "document" | "audio",
    "cover": "https://cdn.raindrop.io/cover.jpg",
    "media": [{"link": "https://cdn.raindrop.io/media.jpg"}],
    "tags": ["tag1", "tag2"],
    "collection": {"$id": 12345},
    "created": "2024-01-15T10:30:00.000Z",
    "file": {"name": "file.pdf", "size": 1024, "type": "application/pdf"},
  }
}
```

### Collection

```json
{
  "result": true,
  "items": [
    {
      "_id": 8492393,
      "title": "Development",
      "count": 16,
      "parent": { "$id": 1111 }
    }
  ]
}
```

### Tags

```json
{
  "result": true,
  "items": [{ "_id": "tagname", "count": 42 }]
}
```

### Error Response

```json
{
  "result": false,
  "error": "error_code",
  "errorMessage": "Human readable message"
}
```

### List Response (raindrops/collections)

```json
{
  "result": true,
  "items": [...],
  "count": 50,
  "page": 0
}
```

## Workflow Examples

### 1. List Bookmarks Paginated, Oldest First, Detect 404s

**What to do:**

1. Use `GET /collections` to find the target collection ID
2. Use `GET /raindrops/{collectionId}` with:
   - `sort=created` (oldest first)
   - `perpage=50` (max items per page)
   - Increment `page` param until `items.length < perpage`
3. Response fields: `_id`, `link`, `title`

### 2. Move Bookmarks by URL Pattern to Collection

**What to do:**

1. Use `GET /collections` to find or create target collection via `POST /collection`
2. Use `GET /raindrops/0?search={domain}` to find matching bookmarks
   - Example: `search=rule34.com`
3. For each match, use `PUT /raindrop/{id}` with body:
   ```json
   {"collection": {"$id": TARGET_COLLECTION_ID}}
   ```

### 3. Bulk Tag Bookmarks (NOT one-by-one)

**What to do:**

1. Use `PUT /raindrops/{collectionId}` endpoint for bulk operations
2. Two approaches:
   - **By search**: Include `search` param in body + `tags` array (appends tags)
   - **By IDs**: Include `ids` array (chunk max 100) + `tags` array
3. Body format:
   ```json
   {
     "search": "optional filter",
     "ids": [111, 222, 333],
     "tags": ["new-tag-1", "new-tag-2"]
   }
   ```
4. Tags are appended, not replaced. Empty array `[]` clears all tags.

### 4. Delete Bookmarks

**What to do:**

- **Single**: `DELETE /raindrop/{id}` - moves to trash
- **Bulk by IDs**: `DELETE /raindrops/{collectionId}` with body `{"ids": [1, 2, 3]}`

- **Empty trash**: `DELETE /collection/-99` - permanent delete

### 5. Common Utilities

**List collections:**

- `GET /collections` - root collections
- `GET /collections/childrens` - nested collections
- Response: `items[]` with `_id`, `title`, `parent.$id`

**List tags:**

- `GET /tags` - all tags with counts (omit ID for all collections)
- Response: `items[]` with `_id` (tag name), `count`

**Search:**

- `GET /raindrops/0?search={query}` - search all collections
- Supports operators: `#tag`, `domain:`, etc.

## Tools

Use **curl** for simple requests or **bun -e** for multi-step logic. Both use `$RAINDROP_API_KEY` from environment.

## Rate Limits

120 requests per minute per user. Batch operations (`PUT /raindrops/*`, `DELETE /raindrops/*`) count as one request.
