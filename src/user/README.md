# User Module

## Description

The User module manages user accounts in the system. It handles CRUD operations for users and implements business rules for different user types (CLIENTE and PRESTADOR).

## User Types

The system supports two types of users:

- **CLIENTE**: Regular customer users
- **PRESTADOR**: Service provider users (can have stores)

## Endpoints

### Create User
- **Method**: `POST`
- **Path**: `/users`
- **Body**: `CreateUserDto`
- **Response**: `UserOutput` (201 Created)

### List All Users
- **Method**: `GET`
- **Path**: `/users`
- **Response**: `UserOutput[]` (200 OK)

### Get User by ID
- **Method**: `GET`
- **Path**: `/users/:id`
- **Response**: `UserOutput` (200 OK)
- **Error**: 404 Not Found if user doesn't exist

### Update User
- **Method**: `PUT`
- **Path**: `/users/:id`
- **Body**: `UpdateUserDto`
- **Response**: `UserOutput` (200 OK)
- **Error**: 404 Not Found if user doesn't exist

### Delete User
- **Method**: `DELETE`
- **Path**: `/users/:id`
- **Response**: 204 No Content
- **Error**: 404 Not Found if user doesn't exist

### Test Endpoint
- **Method**: `GET`
- **Path**: `/users/admin/test`
- **Response**: `{ message: string }` (200 OK)

## Business Rules

1. **Email Uniqueness**: Email addresses must be unique across all users. Creating a user with an existing email will result in a 409 Conflict error.

2. **User Type Requirements**:
   - **CLIENTE**: Must have a phone number. Missing phone will result in a 400 Bad Request error.
   - **PRESTADOR**: Must have a CPF. Missing CPF will result in a 400 Bad Request error.

3. **Password**: Passwords are automatically hashed using bcrypt (10 rounds) before storage. The password is never returned in API responses.

4. **Email Validation**: When updating a user, if the email is changed, it must be unique. Attempting to use an existing email will result in a 409 Conflict error.

5. **Password Updates**: Passwords can be updated and are automatically hashed before storage.

## Data Validation

### CreateUserDto

- **name**: 
  - Required
  - Type: string
  - Minimum length: 2 characters

- **email**: 
  - Required
  - Type: string
  - Must be a valid email format

- **password**: 
  - Required
  - Type: string
  - Minimum length: 6 characters

- **type**: 
  - Required
  - Type: enum (UserType)
  - Values: 'cliente' or 'prestador'

- **cpf**: 
  - Optional
  - Type: string
  - Format: XXX.XXX.XXX-XX (e.g., 123.456.789-00)
  - Required for PRESTADOR type

- **phone**: 
  - Optional
  - Type: string
  - Format: Valid phone number (10-14 digits, optional + prefix)
  - Required for CLIENTE type

### UpdateUserDto

All fields from `CreateUserDto` are optional. Same validation rules apply when fields are provided.

## User Output Structure

```typescript
{
  id: string;              // UUID
  name: string;
  email: string;
  type: UserType;          // 'cliente' | 'prestador'
  cpf?: string;            // Only for PRESTADOR
  phone?: string;          // Only for CLIENTE
  createdAt: Date;
  updatedAt: Date;
}
```

## Security Notes

- Passwords are never exposed in API responses
- Password hashing uses bcrypt with 10 rounds
- User IDs are UUIDs for better security

## Dependencies

- `UserRepository`: Handles database operations
- TypeORM: For entity management and database access

## Module Exports

- `UserService`: Business logic service
- `UserRepository`: Database repository


