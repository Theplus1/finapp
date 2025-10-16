# Card Group Sync Implementation

## Overview
This document describes the implementation of card group synchronization functionality based on the official Slash API documentation.

## Implementation Summary

### 1. Data Transfer Objects (DTOs)
**File:** `src/integrations/slash/dto/card-group.dto.ts`

Created comprehensive DTOs matching the Slash API schema:
- `CardGroupDto` - Main card group data structure
- `CardGroupSpendingConstraintDto` - Spending constraints with rules
- `SpendingRuleDto` - Utilization limits and transaction size limits
- `MerchantCategoryRuleDto`, `MerchantRuleDto`, `CountryRuleDto`, `MerchantCategoryCodeRuleDto` - Various restriction rules
- `CreateCardGroupDto` - For creating new card groups
- `UpdateCardGroupDto` - For updating existing card groups
- `ListCardGroupsQuery` - Query parameters for listing card groups

### 2. Database Schema
**File:** `src/database/schemas/card-group.schema.ts`

Created MongoDB schema with:
- `slashId` - Unique identifier from Slash API
- `name` - Card group name
- `virtualAccountId` - Associated virtual account
- `spendingConstraint` - Flexible object for spending rules
- Sync metadata fields (`lastSyncedAt`, `syncSource`, `isDeleted`)
- Indexes for efficient querying

### 3. Repository Layer
**File:** `src/database/repositories/card-group.repository.ts`

Implemented repository with methods:
- `create()` - Create new card group
- `upsert()` - Create or update card group
- `findBySlashId()` - Find by Slash ID
- `findByVirtualAccountId()` - Find by virtual account with filters
- `findAll()` - Get all card groups
- `count()` - Count card groups
- `softDelete()` - Soft delete card group
- `findStale()` - Find stale records for sync
- `bulkUpsert()` - Bulk upsert operations

### 4. Entity Mapping
**File:** `src/integrations/slash/entities/card-group.entity.ts`

Created entity class using `class-transformer` decorators for automatic mapping from Slash API DTOs to database entities.

### 5. Sync Mapper Utility
**File:** `src/integrations/slash/utils/sync-mappers.util.ts`

Added `mapCardGroupDtoToEntity()` function to transform Slash API DTOs to database entities using class-transformer.

### 6. API Client Methods
**File:** `src/integrations/slash/services/slash-api.service.ts`

Implemented Slash API methods:
- `listCardGroups(query?)` - GET /card-group (with cursor pagination)
- `getCardGroup(cardGroupId)` - GET /card-group/{cardGroupId}
- `createCardGroup(data)` - POST /card-group
- `updateCardGroup(cardGroupId, data)` - PATCH /card-group/{cardGroupId}
- `getCardGroupUtilization(cardGroupId)` - GET /card-group/{cardGroupId}/utilization

All methods match the official Slash API documentation at https://docs.slash.com/api-reference/schema-card-group

### 7. Sync Service Methods
**File:** `src/integrations/slash/services/slash-sync.service.ts`

Implemented sync methods following the existing pattern:

#### Webhook Sync
- `syncCardGroupFromWebhook(cardGroupData)` - Sync card group from webhook event

#### Scheduled Sync
- `syncAllCardGroups()` - Full sync of all card groups with pagination
- `syncCardGroupsWithPagination()` - Private method for cursor-based pagination
- `syncSingleCardGroup(cardGroup)` - Private method to sync individual card group

### 8. Controller Endpoint
**File:** `src/integrations/slash/controllers/slash-sync.controller.ts`

Added endpoint:
- `POST /slash/sync/card-groups` - Manually trigger card group sync
  - Returns 202 Accepted
  - Runs async without blocking
  - Logs errors if sync fails

### 9. Constants Update
**File:** `src/integrations/slash/constants/sync.constants.ts`

Added `CARD_GROUP: 'card_group'` to `ENTITY_TYPE` enum.

### 10. Module Registration
**File:** `src/database/database.module.ts`

Registered:
- `CardGroup` schema with Mongoose
- `CardGroupRepository` as provider and export

## API Endpoints

### Sync Endpoint
```
POST /slash/sync/card-groups
```
Manually triggers a full sync of all card groups from Slash API.

**Response:**
```json
{
  "message": "Card group sync started"
}
```

### Stats Endpoint
```
GET /slash/sync/stats?entityType=card_group
```
Get sync statistics for card groups.

## Sync Flow

### Webhook Flow
1. Webhook receives card group event
2. `syncCardGroupFromWebhook()` called
3. DTO mapped to entity using `mapCardGroupDtoToEntity()`
4. Repository upserts to database
5. Sync metadata updated

### Scheduled Sync Flow
1. Manual trigger or scheduled job calls `syncAllCardGroups()`
2. Creates sync log with status 'started'
3. `syncCardGroupsWithPagination()` fetches all card groups using cursor pagination
4. For each card group:
   - Check if exists in database
   - Map DTO to entity
   - Upsert to database
   - Track created/updated/failed counts
5. Complete sync log with statistics
6. Log results

## Database Schema

```typescript
{
  slashId: string;           // Unique, indexed
  name: string;
  virtualAccountId: string;  // Indexed
  spendingConstraint: object;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date;        // Indexed
  syncSource: 'webhook' | 'scheduled' | 'manual';
  isDeleted: boolean;
}
```

## Testing

To test the implementation:

1. **Manual Sync:**
   ```bash
   curl -X POST http://localhost:3000/slash/sync/card-groups
   ```

2. **Check Stats:**
   ```bash
   curl http://localhost:3000/slash/sync/stats?entityType=card_group
   ```

3. **Verify Database:**
   ```javascript
   db.slash_card_groups.find()
   ```

## Compliance with Slash API

The implementation follows the official Slash API documentation:
- API endpoints match documented URLs
- Request/response structures match schemas
- Cursor-based pagination implemented
- All documented fields included in DTOs
- Spending constraint structure matches API spec

## Future Enhancements

Potential improvements:
1. Add webhook event handlers for card group events
2. Implement incremental sync based on last sync time
3. Add card group utilization tracking
4. Create domain service layer for business logic
5. Add GraphQL resolvers if needed
6. Implement card group filtering by name
7. Add scheduled sync jobs for card groups
