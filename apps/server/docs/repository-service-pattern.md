# Repository-Service Pattern Refactoring

## Overview
Refactored repositories and services to follow a consistent architectural pattern where filter building logic resides in the service layer, and repositories handle only data access.

## Architecture Pattern

### ✅ Repository Layer (Data Access)
**Responsibilities:**
- Execute database queries with pre-built filters
- Provide generic `find()` and `count()` methods
- Accept structured filter objects
- No business logic or filter building

**Standard Methods:**
```typescript
// Generic find with RepositoryQuery
async find(query: { filter: any; skip: number; limit: number; sort: any }): Promise<Document[]>

// Generic count with filter
async count(filter: any): Promise<number>

// Specific lookups (allowed)
async findBySlashId(slashId: string): Promise<Document | null>
```

### ✅ Service Layer (Business Logic)
**Responsibilities:**
- Build MongoDB filters from request parameters
- Handle business logic and validation
- Transform DTOs to repository queries
- Compose complex queries

**Pattern:**
```typescript
async findAllWithFilters(filters: Filters, pagination: PaginationOptions) {
  // 1. Build MongoDB filter
  const mongoFilter: any = { isDeleted: false };
  if (filters.field) mongoFilter.field = filters.field;
  
  // 2. Build sort
  const sortField = filters.sortBy || 'createdAt';
  const sortDirection = filters.sortOrder === SortOrder.ASC ? 1 : -1;
  
  // 3. Build query
  const query = {
    filter: mongoFilter,
    skip: (pagination.page - 1) * pagination.limit,
    limit: pagination.limit,
    sort: { [sortField]: sortDirection },
  };
  
  // 4. Execute via repository
  const [data, total] = await Promise.all([
    this.repository.find(query),
    this.repository.count(mongoFilter),
  ]);
  
  return [data, total];
}
```

## Refactored Components

### ✅ Card Repository & Service
**Repository:**
- Removed: `findByVirtualAccountId()` with filter building
- Removed: `count(virtualAccountId, filters)` with filter building
- Kept: Generic `find(query)` and `count(filter)`

**Service:**
- Moved filter building from repository to service
- `findByVirtualAccountId()` now builds filters in service
- `countByVirtualAccountId()` now builds filters in service
- `findAllWithFilters()` builds complete MongoDB queries

### ✅ Card Group Repository & Service
**Repository:**
- Removed: `findByVirtualAccountId()` with filter building
- Removed: `count(virtualAccountId)` with optional filter
- Added: Generic `find(query)` and `count(filter)`

**Service:**
- `findAllWithFilters()` now builds all filters including:
  - Virtual account filtering
  - Name search with regex
  - Sort field and direction
  - Pagination

### ✅ Virtual Account Repository & Service
**Status:** Already following the pattern
- Repository has generic `find()` and `count()` methods
- Service builds filters in `findAllWithFilters()`

### ⚠️ Transaction Repository & Service
**Status:** Using custom `TransactionFilters` interface
- Has its own consistent pattern with `TransactionFilters` type
- Filter building is in repository but through a structured interface
- Acceptable as it's consistent within its domain
- **Note:** Could be refactored later if needed

## Benefits

### 1. **Clear Separation of Concerns**
- Repositories: Pure data access
- Services: Business logic and filter building

### 2. **Consistency**
- All repositories follow the same pattern
- Predictable method signatures
- Easy to understand and maintain

### 3. **Flexibility**
- Services can build complex filters
- Easy to add new filter conditions
- Repository methods remain simple

### 4. **Testability**
- Services can be tested with mocked repositories
- Filter building logic is testable
- Repository tests focus on data access

### 5. **Maintainability**
- Changes to filter logic only affect services
- Repository changes don't cascade to services
- Clear boundaries between layers

## Migration Guide

### Before (❌ Anti-pattern)
```typescript
// Repository
async findByVirtualAccountId(
  virtualAccountId: string,
  filters?: { status?: string; cardGroupId?: string }
): Promise<Document[]> {
  const query: any = { virtualAccountId, isDeleted: false };
  if (filters?.status) query.status = filters.status;
  if (filters?.cardGroupId) query.cardGroupId = filters.cardGroupId;
  return this.model.find(query).exec();
}

// Service
async findCards(virtualAccountId: string, status?: string) {
  return this.repository.findByVirtualAccountId(virtualAccountId, { status });
}
```

### After (✅ Correct pattern)
```typescript
// Repository
async find(query: { filter: any; skip: number; limit: number; sort: any }): Promise<Document[]> {
  return this.model
    .find(query.filter)
    .skip(query.skip)
    .limit(query.limit)
    .sort(query.sort)
    .exec();
}

async count(filter: any): Promise<number> {
  return this.model.countDocuments(filter).exec();
}

// Service
async findCards(virtualAccountId: string, status?: string) {
  const mongoFilter: any = { virtualAccountId, isDeleted: false };
  if (status) mongoFilter.status = status;
  
  const query = {
    filter: mongoFilter,
    skip: 0,
    limit: 100,
    sort: { createdAt: -1 },
  };
  
  return this.repository.find(query);
}
```

## Best Practices

1. **Always build filters in services**, not repositories
2. **Use generic repository methods** (`find`, `count`)
3. **Keep repositories thin** - only data access logic
4. **Services own business logic** - including filter construction
5. **Use TypeScript interfaces** for filter types in services
6. **Document filter building** with comments in services
7. **Consistent naming** - `mongoFilter` for MongoDB queries

## Future Improvements

1. Create a base repository class with generic methods
2. Add filter builder utility functions
3. Implement query optimization hints
4. Add caching layer at service level
5. Create filter validation in services
