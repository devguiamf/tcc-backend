# Auth Module

## Description

The Auth module handles user authentication and authorization. It provides endpoints for user signup, login, and password reset. The module uses JWT (JSON Web Tokens) for authentication and bcrypt for password hashing.

## Endpoints

### Signup
- **Method**: `POST`
- **Path**: `/auth/signup`
- **Body**: `SignupDto`
- **Response**: `SignupOutput` (201 Created)
- **Description**: Creates a new user account and returns an access token

### Login
- **Method**: `POST`
- **Path**: `/auth/login`
- **Body**: `LoginDto`
- **Response**: `LoginOutput` (200 OK)
- **Description**: Authenticates a user and returns an access token

### Reset Password
- **Method**: `POST`
- **Path**: `/auth/reset-password`
- **Body**: `ResetPasswordDto`
- **Response**: `{ message: string }` (200 OK)
- **Description**: Resets a user's password

### Test Endpoint
- **Method**: `POST`
- **Path**: `/auth/admin/test`
- **Response**: `{ message: string }` (200 OK)

## Business Rules

1. **Signup Validation**:
   - Email must be unique. Duplicate emails result in a 409 Conflict error.
   - CLIENTE type users must provide a phone number.
   - PRESTADOR type users must provide a CPF.
   - Missing required fields result in a 400 Bad Request error.

2. **Authentication**:
   - Login requires valid email and password.
   - Invalid credentials result in a 401 Unauthorized error with message "Invalid credentials".
   - Passwords are compared using bcrypt.

3. **JWT Token Generation**:
   - Tokens are generated upon successful signup or login.
   - Token payload contains the user ID (`sub` field).
   - Token expiration is configured via `JWT_EXPIRES_IN` environment variable (default: 24h).

4. **Password Reset**:
   - Requires a valid email address.
   - If email doesn't exist, returns 404 Not Found.
   - New password is automatically hashed before storage.

## Data Validation

### SignupDto

- **name**: 
  - Required
  - Type: string
  - Minimum length: 2 characters

- **email**: 
  - Required
  - Type: string
  - Must be a valid email format
  - Must be unique

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

### LoginDto

- **email**: 
  - Required
  - Type: string
  - Must be a valid email format

- **password**: 
  - Required
  - Type: string
  - Minimum length: 6 characters

### ResetPasswordDto

- **email**: 
  - Required
  - Type: string
  - Must be a valid email format

- **newPassword**: 
  - Required
  - Type: string
  - Minimum length: 6 characters

## Response Structures

### SignupOutput / LoginOutput

```typescript
{
  accessToken: string;      // JWT token
  user: {
    id: string;             // UUID
    name: string;
    email: string;
    type: UserType;          // 'cliente' | 'prestador'
    cpf?: string;           // Only for PRESTADOR
    phone?: string;         // Only for CLIENTE
    createdAt: Date;
    updatedAt: Date;
  }
}
```

## Security

1. **Password Hashing**: All passwords are hashed using bcrypt with 10 rounds before storage.

2. **JWT Configuration**:
   - Secret key: Configured via `JWT_SECRET` environment variable
   - Default secret: 'default-secret-key-change-in-production' (should be changed in production)
   - Token expiration: Configured via `JWT_EXPIRES_IN` environment variable
   - Default expiration: '24h'

3. **Token Generation**: JWT tokens contain the user ID in the `sub` claim.

4. **Error Messages**: Generic "Invalid credentials" message is returned for both invalid email and password to prevent user enumeration attacks.

## Error Responses

### 400 Bad Request
- Missing required fields for user type
- Invalid data format

### 401 Unauthorized
- Invalid email or password during login

### 404 Not Found
- User not found during password reset

### 409 Conflict
- Email already exists during signup

## Dependencies

- `UserService`: For creating users
- `UserRepository`: For user database operations
- `JwtService`: For token generation
- `bcrypt`: For password hashing and comparison

## Environment Variables

- `JWT_SECRET`: Secret key for JWT token signing (required)
- `JWT_EXPIRES_IN`: Token expiration time (default: '24h')

## Module Integration

- Imports: `UserModule`
- Exports: `AuthService`


