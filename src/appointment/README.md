# Appointment Module

## Description

The Appointment module manages service appointments for clients (CLIENTE users) in stores. The module allows authenticated clients to schedule services at stores, with automatic calculation of available time slots based on store working hours, appointment intervals, service duration, and existing appointments. The module handles CRUD operations for appointments with comprehensive validation and conflict detection.

## Endpoints

### Create Appointment
- **Method**: `POST`
- **Path**: `/appointments`
- **Authentication**: Required (JWT Bearer Token)
- **Body**: `CreateAppointmentDto`
- **Response**: `AppointmentOutput` (201 Created)
- **Description**: Creates a new appointment for the authenticated CLIENTE user. Validates store, service, time availability, and working hours.

### List User Appointments
- **Method**: `GET`
- **Path**: `/appointments`
- **Authentication**: Required (JWT Bearer Token)
- **Response**: `AppointmentOutput[]` (200 OK)
- **Description**: Retrieves all appointments for the authenticated user, ordered by appointment date.

### Get Appointment by ID
- **Method**: `GET`
- **Path**: `/appointments/:id`
- **Authentication**: Required (JWT Bearer Token)
- **Response**: `AppointmentOutput` (200 OK)
- **Description**: Retrieves a specific appointment. Users can view their own appointments, and PRESTADOR users can view appointments from their own store.
- **Error**: 
  - 404 Not Found if appointment doesn't exist
  - 403 Forbidden if user doesn't have permission to view the appointment

### Get Store Appointments
- **Method**: `GET`
- **Path**: `/appointments/store/:storeId`
- **Authentication**: Required (JWT Bearer Token)
- **Response**: `AppointmentOutput[]` (200 OK)
- **Description**: Retrieves all appointments for a specific store. Only the store owner (PRESTADOR) can access this endpoint.
- **Error**: 
  - 404 Not Found if store doesn't exist
  - 403 Forbidden if user is not the store owner

### Get Available Time Slots
- **Method**: `GET`
- **Path**: `/appointments/available-slots/:storeId/:serviceId`
- **Query Parameters**: `date` (YYYY-MM-DD format, required)
- **Response**: `AvailableTimeSlot[]` (200 OK)
- **Description**: Calculates and returns available time slots for a specific store and service on a given date. This endpoint is public (no authentication required).
- **Example**: `/appointments/available-slots/store-uuid/service-uuid?date=2024-12-25`

### Update Appointment
- **Method**: `PUT`
- **Path**: `/appointments/:id`
- **Authentication**: Required (JWT Bearer Token)
- **Body**: `UpdateAppointmentDto`
- **Response**: `AppointmentOutput` (200 OK)
- **Description**: Updates an appointment. Only the appointment owner can update it. Validates new time if provided.
- **Error**: 
  - 404 Not Found if appointment doesn't exist
  - 403 Forbidden if user is not the appointment owner
  - 400 Bad Request if appointment is cancelled or completed
  - 409 Conflict if new time conflicts with existing appointments

### Cancel Appointment
- **Method**: `POST`
- **Path**: `/appointments/:id/cancel`
- **Authentication**: Required (JWT Bearer Token)
- **Response**: `AppointmentOutput` (200 OK)
- **Description**: Cancels an appointment. Only the appointment owner can cancel it.
- **Error**: 
  - 404 Not Found if appointment doesn't exist
  - 403 Forbidden if user is not the appointment owner
  - 400 Bad Request if appointment is already cancelled or completed

### Delete Appointment
- **Method**: `DELETE`
- **Path**: `/appointments/:id`
- **Authentication**: Required (JWT Bearer Token)
- **Response**: 204 No Content
- **Description**: Permanently deletes an appointment. Only the appointment owner can delete it.
- **Error**: 
  - 404 Not Found if appointment doesn't exist
  - 403 Forbidden if user is not the appointment owner

### Test Endpoint
- **Method**: `GET`
- **Path**: `/appointments/admin/test`
- **Response**: `{ message: string }` (200 OK)

## Business Rules

1. **User Type Restriction**: 
   - Only users of type `CLIENTE` can create appointments.
   - Attempting to create an appointment as a PRESTADOR user results in a 400 Bad Request error.

2. **Store and Service Validation**: 
   - The store must exist.
   - The service must exist and belong to the specified store.
   - Attempting to use a service from a different store results in a 400 Bad Request error.

3. **Time Validation**: 
   - Appointment date must be in the future.
   - Appointment time must be within the store's working hours for that day of the week.
   - Appointment time must not conflict with existing appointments (considering service duration).
   - Cancelled appointments are not considered when checking for conflicts.

4. **Ownership**: 
   - Clients can only create appointments for themselves.
   - Clients can only view, update, cancel, or delete their own appointments.
   - PRESTADOR users can view appointments from their own store only.

5. **Status Management**: 
   - New appointments are created with status `PENDING`.
   - Cancelled appointments cannot be updated or cancelled again.
   - Completed appointments cannot be cancelled or updated.

6. **Conflict Detection**: 
   - The system checks for overlapping appointments considering:
     - The start time of the new appointment
     - The end time (start time + service duration)
     - Existing appointments' start and end times
   - Appointments with status `CANCELLED` are ignored in conflict checks.

## Data Validation

### CreateAppointmentDto

- **storeId**: 
  - Required
  - Type: string (UUID)
  - Must reference an existing store

- **serviceId**: 
  - Required
  - Type: string (UUID)
  - Must reference an existing service that belongs to the specified store

- **appointmentDate**: 
  - Required
  - Type: string (ISO 8601 date-time format)
  - Must be a future date and time
  - Must be within store's working hours for that day
  - Must not conflict with existing appointments

- **notes**: 
  - Optional
  - Type: string
  - Maximum length: 500 characters

### UpdateAppointmentDto

All fields are optional. Same validation rules apply when fields are provided.

- **appointmentDate**: 
  - Optional
  - Type: string (ISO 8601 date-time format)
  - If provided, must be a future date and time
  - Must be within store's working hours
  - Must not conflict with existing appointments (excluding the current appointment)

- **status**: 
  - Optional
  - Type: `AppointmentStatus` enum
  - Valid values: `pending`, `confirmed`, `completed`, `cancelled`

- **notes**: 
  - Optional
  - Type: string
  - Maximum length: 500 characters

## Appointment Output Structure

```typescript
{
  id: string;                      // UUID
  userId: string;                   // UUID of the CLIENTE user
  storeId: string;                   // UUID of the store
  serviceId: string;                // UUID of the service
  appointmentDate: Date;            // Date and time of the appointment
  status: AppointmentStatus;         // pending | confirmed | completed | cancelled
  notes?: string;                    // Optional notes (max 500 chars)
  createdAt: Date;
  updatedAt: Date;
}
```

## Available Time Slot Structure

```typescript
{
  startTime: string;                 // HH:mm format (e.g., "09:00")
  endTime: string;                   // HH:mm format (e.g., "10:30")
  date: string;                      // YYYY-MM-DD format (e.g., "2024-12-25")
}
```

## Appointment Status

- **PENDING**: Appointment is pending confirmation (default status for new appointments)
- **CONFIRMED**: Appointment has been confirmed
- **COMPLETED**: Service has been completed
- **CANCELLED**: Appointment has been cancelled

## Authentication

The module uses JWT authentication for protected endpoints:

1. **Token Extraction**: The `JwtAuthGuard` extracts the Bearer token from the `Authorization` header.
2. **User Identification**: The `@CurrentUser()` decorator extracts the user ID from the decoded token.
3. **Authorization**: The service validates user permissions based on user type and ownership.

### Token Format

```
Authorization: Bearer <jwt-token>
```

The JWT token should contain the user ID in the `sub` claim (as generated by the Auth module).

## Available Time Slots Calculation

The system calculates available time slots based on:

1. **Store Working Hours**: The store's working hours for the requested day of the week
2. **Appointment Interval**: The store's `appointmentInterval` (5, 10, 15, or 30 minutes)
3. **Service Duration**: The service's `durationMinutes`
4. **Existing Appointments**: All non-cancelled appointments for that store on that date

### Algorithm

1. Retrieve the store and service
2. Verify the service belongs to the store
3. Get working hours for the requested day of the week
4. If the store is closed that day, return empty array
5. Retrieve all existing appointments for that store on that date
6. Generate time slots:
   - Start from the store's opening time
   - Create slots of `durationMinutes` length
   - Advance by `appointmentInterval` minutes
   - Continue until closing time
7. For each generated slot:
   - Check if it conflicts with existing appointments (considering their duration)
   - Check if it fits within working hours
   - If valid, add to available slots
8. Return the list of available time slots

### Example Calculation

**Store Configuration:**
- Working hours: Monday 09:00 - 18:00
- Appointment interval: 30 minutes

**Service:**
- Duration: 60 minutes

**Existing Appointments:**
- 10:00 - 11:00 (60 min service)
- 14:00 - 15:00 (60 min service)

**Available Slots Generated:**
- 09:00 - 10:00 ✓ (no conflict)
- 09:30 - 10:30 ✗ (conflicts with 10:00 appointment)
- 10:00 - 11:00 ✗ (conflicts with existing)
- 11:00 - 12:00 ✓ (no conflict)
- 11:30 - 12:30 ✓ (no conflict)
- ... (continues until 17:00, considering conflicts)
- 15:00 - 16:00 ✓ (no conflict)
- 15:30 - 16:30 ✓ (no conflict)
- 16:00 - 17:00 ✓ (no conflict)
- 16:30 - 17:30 ✓ (no conflict)
- 17:00 - 18:00 ✓ (no conflict)

## Error Responses

### 400 Bad Request
- User is not a CLIENTE type (when creating)
- Store not found
- Service not found
- Service does not belong to the specified store
- Appointment date is in the past
- Appointment time is outside store working hours
- Appointment time conflicts with existing appointments
- Invalid data format
- Validation errors

### 401 Unauthorized
- Missing or invalid JWT token
- Token not provided in Authorization header

### 403 Forbidden
- User attempting to view/update/delete an appointment they don't own
- PRESTADOR user attempting to view appointments from another user's store
- User attempting to update a cancelled appointment
- User attempting to cancel a completed appointment

### 404 Not Found
- Appointment not found
- Store not found
- Service not found
- User not found

### 409 Conflict
- Appointment time conflicts with existing appointments

## Database Relations

- **UserEntity** (Many-to-One): Each appointment belongs to one CLIENTE user
  - Foreign key: `userId` references `users.id`
  
- **StoreEntity** (Many-to-One): Each appointment belongs to one store
  - Foreign key: `storeId` references `stores.id`
  
- **ServiceEntity** (Many-to-One): Each appointment is for one service
  - Foreign key: `serviceId` references `services.id`

## Dependencies

- `AppointmentRepository`: Handles database operations
- `StoreRepository`: Validates store existence and retrieves store information
- `ServiceRepository`: Validates service existence and retrieves service information
- `UserRepository`: Validates user type and retrieves user information
- `JwtAuthGuard`: Validates JWT tokens and extracts user information
- `CurrentUser` decorator: Extracts user ID from request
- TypeORM: For entity management and database access

## Module Exports

- `AppointmentService`: Business logic service
- `AppointmentRepository`: Database repository

## Example Usage Flow

1. **Get Available Slots**: Client requests available time slots for a store and service
   ```
   GET /appointments/available-slots/store-uuid/service-uuid?date=2024-12-25
   ```

2. **Create Appointment**: Client creates an appointment
   ```
   POST /appointments
   Authorization: Bearer <token>
   {
     "storeId": "store-uuid",
     "serviceId": "service-uuid",
     "appointmentDate": "2024-12-25T10:00:00.000Z",
     "notes": "Please arrive 10 minutes early"
   }
   ```

3. **List Appointments**: Client views their appointments
   ```
   GET /appointments
   Authorization: Bearer <token>
   ```

4. **Update Appointment**: Client updates appointment time or notes
   ```
   PUT /appointments/appointment-uuid
   Authorization: Bearer <token>
   {
     "appointmentDate": "2024-12-25T14:00:00.000Z",
     "notes": "Updated notes"
   }
   ```

5. **Cancel Appointment**: Client cancels an appointment
   ```
   POST /appointments/appointment-uuid/cancel
   Authorization: Bearer <token>
   ```

6. **Store Owner View**: PRESTADOR views appointments for their store
   ```
   GET /appointments/store/store-uuid
   Authorization: Bearer <token>
   ```

## Notes

- Appointment dates are stored as datetime in the database
- Status is stored as varchar(20) with enum values
- Notes are optional and limited to 500 characters
- The system automatically validates time conflicts considering service duration
- Cancelled appointments are excluded from conflict checks
- The available time slots endpoint is public (no authentication required)
- Day of week mapping: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
- Time slots are calculated in real-time based on current appointments
- The appointment interval determines the granularity of available slots (e.g., 30 minutes means slots start every 30 minutes)
