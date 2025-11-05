# Store Module

## Description

The Store module manages store/establishment information for service providers (PRESTADOR users). Each PRESTADOR user can have one store with information about business hours, location, and image. The module handles CRUD operations for stores and enforces business rules related to user types.

## Endpoints

### Create Store
- **Method**: `POST`
- **Path**: `/stores`
- **Body**: `CreateStoreDto`
- **Response**: `StoreOutput` (201 Created)
- **Description**: Creates a new store for a PRESTADOR user

### List All Stores
- **Method**: `GET`
- **Path**: `/stores`
- **Response**: `StoreOutput[]` (200 OK)

### Get Store by ID
- **Method**: `GET`
- **Path**: `/stores/:id`
- **Response**: `StoreOutput` (200 OK)
- **Error**: 404 Not Found if store doesn't exist

### Get Store by User ID
- **Method**: `GET`
- **Path**: `/stores/user/:userId`
- **Response**: `StoreOutput` (200 OK)
- **Description**: Retrieves the store associated with a specific user
- **Error**: 404 Not Found if user doesn't have a store

### Update Store
- **Method**: `PUT`
- **Path**: `/stores/:id`
- **Body**: `UpdateStoreDto`
- **Response**: `StoreOutput` (200 OK)
- **Error**: 404 Not Found if store doesn't exist

### Delete Store
- **Method**: `DELETE`
- **Path**: `/stores/:id`
- **Response**: 204 No Content
- **Error**: 404 Not Found if store doesn't exist

### Test Endpoint
- **Method**: `GET`
- **Path**: `/stores/admin/test`
- **Response**: `{ message: string }` (200 OK)

## Business Rules

1. **User Type Restriction**: 
   - Only users of type `PRESTADOR` can have stores.
   - Attempting to create a store for a CLIENTE user results in a 400 Bad Request error.

2. **One Store Per User**: 
   - Each PRESTADOR user can have only one store.
   - Attempting to create a second store for the same user results in a 409 Conflict error.

3. **Working Hours Validation**:
   - Working hours must include all 7 days of the week (0-6, where 0 = Sunday).
   - Each day of the week must be unique (no duplicates).
   - If `isOpen = true`, both `openTime` and `closeTime` are required.
   - Time format must be HH:mm (24-hour format, e.g., "09:00", "18:30").

4. **User Validation on Update**:
   - If updating the `userId`, the new user must be a PRESTADOR type.
   - The new user must not already have a store.

## Data Validation

### CreateStoreDto

- **name**: 
  - Required
  - Type: string
  - Minimum length: 2 characters

- **userId**: 
  - Required
  - Type: string (UUID)
  - Must reference an existing PRESTADOR user
  - User must not already have a store

- **workingHours**: 
  - Required
  - Type: `WorkingHoursDto[]`
  - Must contain exactly 7 items (one for each day)
  - Each day must be unique (0-6)

- **location**: 
  - Required
  - Type: `LocationDto`

- **imageUrl**: 
  - Optional
  - Type: string
  - Must be a valid URL format

### WorkingHoursDto

- **dayOfWeek**: 
  - Required
  - Type: number
  - Range: 0-6 (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  - Must be unique within the array

- **isOpen**: 
  - Required
  - Type: boolean
  - Indicates if the store is open on this day

- **openTime**: 
  - Optional (required if `isOpen = true`)
  - Type: string
  - Format: HH:mm (24-hour format, e.g., "09:00")
  - Pattern: `^([01]\d|2[0-3]):([0-5]\d)$`

- **closeTime**: 
  - Optional (required if `isOpen = true`)
  - Type: string
  - Format: HH:mm (24-hour format, e.g., "18:30")
  - Pattern: `^([01]\d|2[0-3]):([0-5]\d)$`

### LocationDto

- **street**: 
  - Required
  - Type: string
  - Minimum length: 3 characters

- **number**: 
  - Required
  - Type: string

- **complement**: 
  - Optional
  - Type: string

- **neighborhood**: 
  - Required
  - Type: string
  - Minimum length: 2 characters

- **city**: 
  - Required
  - Type: string
  - Minimum length: 2 characters

- **state**: 
  - Required
  - Type: string
  - Exact length: 2 characters (state abbreviation)

- **zipCode**: 
  - Required
  - Type: string
  - Format: XXXXX-XXX or XXXXXXXX (e.g., "12345-678" or "12345678")
  - Pattern: `^\d{5}-?\d{3}$`

- **latitude**: 
  - Optional
  - Type: number

- **longitude**: 
  - Optional
  - Type: number

### UpdateStoreDto

All fields from `CreateStoreDto` are optional. Same validation rules apply when fields are provided.

## Store Output Structure

```typescript
{
  id: string;                      // UUID
  name: string;
  userId: string;                   // UUID of the PRESTADOR user
  workingHours: WorkingHours[];     // Array of 7 days
  location: Location;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### WorkingHours Structure

```typescript
{
  dayOfWeek: number;        // 0-6 (0 = Sunday)
  isOpen: boolean;
  openTime?: string;       // HH:mm format (required if isOpen = true)
  closeTime?: string;      // HH:mm format (required if isOpen = true)
}
```

### Location Structure

```typescript
{
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;            // 2-character state abbreviation
  zipCode: string;         // XXXXX-XXX or XXXXXXXX
  latitude?: number;
  longitude?: number;
}
```

## Example Working Hours

```json
[
  { "dayOfWeek": 0, "isOpen": false },
  { "dayOfWeek": 1, "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
  { "dayOfWeek": 2, "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
  { "dayOfWeek": 3, "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
  { "dayOfWeek": 4, "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
  { "dayOfWeek": 5, "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
  { "dayOfWeek": 6, "isOpen": true, "openTime": "09:00", "closeTime": "14:00" }
]
```

## Error Responses

### 400 Bad Request
- User is not a PRESTADOR type
- Working hours don't include all 7 days
- Duplicate days in working hours
- Missing openTime/closeTime when isOpen = true
- Invalid time format
- Invalid data format

### 404 Not Found
- Store not found
- User not found (when creating/updating)
- Store not found for user (when querying by userId)

### 409 Conflict
- User already has a store
- Attempting to assign store to user who already has one

## Database Relations

- **UserEntity** (Many-to-One): Each store belongs to one PRESTADOR user
- Foreign key: `userId` references `users.id`

## Dependencies

- `StoreRepository`: Handles database operations
- `UserRepository`: Validates user type and checks for existing stores
- TypeORM: For entity management and database access

## Module Exports

- `StoreService`: Business logic service
- `StoreRepository`: Database repository

## Notes

- Working hours are stored as JSON in the database
- Location data is stored as JSON in the database
- Image URL should point to an accessible image resource
- Day of week mapping: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday


