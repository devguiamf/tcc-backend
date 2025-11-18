# File Module

## Description

The File module manages file uploads and downloads for the system. It organizes files by module (service, store) and entity ID, allowing each entity to have multiple associated files. The module handles file storage on the filesystem, metadata persistence in the database, and provides endpoints for uploading, downloading, and managing files using FormData.

## Endpoints

### Upload File
- **Method**: `POST`
- **Path**: `/files/upload`
- **Authentication**: Required (JWT Bearer Token)
- **Content-Type**: `multipart/form-data`
- **Query Parameters**:
  - `module`: `service` or `store` (enum)
  - `entityId`: UUID of the entity (service or store)
- **Body**: FormData with field name `file`
- **Response**: `FileOutput` (201 Created)
- **Description**: Uploads a file and associates it with a specific module and entity. The file is stored in a directory structure organized by module.

### Get File by ID
- **Method**: `GET`
- **Path**: `/files/:id`
- **Response**: `FileOutput` (200 OK)
- **Error**: 404 Not Found if file doesn't exist
- **Description**: Retrieves file metadata by its ID.

### Get Files by Module and Entity
- **Method**: `GET`
- **Path**: `/files/module/:module/entity/:entityId`
- **Response**: `FileOutput[]` (200 OK)
- **Description**: Retrieves all files associated with a specific module and entity ID, ordered by creation date (newest first).

### Download File
- **Method**: `GET`
- **Path**: `/files/:id/download`
- **Response**: File stream with appropriate Content-Type and Content-Disposition headers
- **Error**: 404 Not Found if file doesn't exist
- **Description**: Downloads the actual file content as a stream.

### Delete File
- **Method**: `DELETE`
- **Path**: `/files/:id`
- **Authentication**: Required (JWT Bearer Token)
- **Response**: 204 No Content
- **Error**: 404 Not Found if file doesn't exist
- **Description**: Deletes both the file from the filesystem and its metadata from the database.

### Test Endpoint
- **Method**: `GET`
- **Path**: `/files/admin/test`
- **Response**: `{ message: string }` (200 OK)

## Business Rules

1. **Module Organization**: 
   - Files are organized by module (service, store) in separate directories.
   - Each file is associated with a specific entity within that module.
   - Multiple files can be associated with the same entity.

2. **File Storage**: 
   - Files are stored in the filesystem under `./uploads/{module}/{fileName}`.
   - The upload directory path can be configured via `UPLOAD_PATH` environment variable.
   - File names are generated to avoid conflicts: `{originalName}_{timestamp}_{randomString}.{extension}`.

3. **File Metadata**: 
   - All file metadata is stored in the database.
   - Original filename, generated filename, MIME type, size, module, entity ID, and file path are persisted.
   - The URL for accessing the file is automatically generated based on the `BASE_URL` environment variable.

4. **File Access**: 
   - File metadata can be retrieved without authentication.
   - File downloads are public (no authentication required).
   - File uploads and deletions require authentication.

## Data Validation

### UploadFileDto (Query Parameters)

- **module**: 
  - Required
  - Type: enum (`service` or `store`)
  - Must be one of the valid FileModule values

- **entityId**: 
  - Required
  - Type: UUID string
  - Must be a valid UUID format

### File Upload (FormData)

- **file**: 
  - Required
  - Type: File (multipart/form-data)
  - Field name must be `file`
  - Any file type is accepted (no MIME type restrictions)

## File Output Structure

```typescript
{
  id: string;                    // UUID
  originalName: string;           // Original filename from upload
  fileName: string;               // Generated filename on disk
  mimeType: string;               // MIME type of the file
  size: number;                   // File size in bytes
  module: FileModule;             // 'service' or 'store'
  entityId: string;               // UUID of the associated entity
  filePath: string;               // Full path on filesystem
  url: string;                    // URL for downloading the file
  createdAt: Date;                // Upload timestamp
}
```

## File Storage Structure

Files are organized in the following directory structure:

```
uploads/
  ├── service/
  │   ├── service-image_1234567890_abc123.jpg
  │   └── service-image_1234567891_def456.png
  └── store/
      ├── store-logo_1234567892_ghi789.jpg
      └── store-banner_1234567893_jkl012.png
```

## Environment Variables

- **UPLOAD_PATH**: Base directory for file uploads (default: `./uploads`)
- **BASE_URL**: Base URL for generating file download URLs (default: `http://localhost:3000`)

## Authentication

The module uses JWT authentication for protected endpoints:

1. **Token Extraction**: The `JwtAuthGuard` extracts the Bearer token from the `Authorization` header.
2. **User Identification**: The user ID is extracted from the decoded token.

### Token Format

```
Authorization: Bearer <jwt-token>
```

## Error Responses

### 400 Bad Request
- Missing file in upload request
- Invalid module value
- Invalid UUID format for entityId

### 401 Unauthorized
- Missing or invalid JWT token (for upload/delete endpoints)
- Token not provided in Authorization header

### 404 Not Found
- File not found by ID
- File not found on filesystem (metadata exists but file is missing)

## Database Relations

- **FileEntity**: Stores file metadata
- No foreign key constraints (module and entityId are stored as UUIDs)
- Indexes on `module` and `entityId` for efficient queries

## Dependencies

- `FileRepository`: Handles database operations for file metadata
- `JwtAuthGuard`: Validates JWT tokens for protected endpoints
- `ConfigService`: Reads environment variables for configuration
- TypeORM: For entity management and database access
- `@nestjs/platform-express`: Provides FileInterceptor for handling multipart/form-data

## Module Exports

- `FileService`: Business logic service for file operations
- `FileRepository`: Database repository for file metadata

## Example Usage Flow

1. **Upload File**: 
   - Client sends POST request with FormData containing the file
   - Query parameters specify module and entityId
   - System generates unique filename and stores file
   - File metadata is saved to database
   - Returns FileOutput with URL for accessing the file

2. **List Files**: 
   - Client requests files by module and entityId
   - System returns all associated files

3. **Download File**: 
   - Client requests file by ID
   - System streams file content with appropriate headers

4. **Delete File**: 
   - Authenticated user requests deletion
   - System removes file from filesystem and metadata from database

## Integration with Service and Store Modules

The File module is designed to work with the Service and Store modules:

- **Service Module**: Can upload images for services using `module=service` and the service ID as `entityId`
- **Store Module**: Can upload images for stores using `module=store` and the store ID as `entityId`

After uploading a file, the returned URL can be used to update the `imageUrl` field in Service or Store entities.

## Notes

- Files are stored on the local filesystem (consider using cloud storage for production)
- File names are sanitized to avoid conflicts and special characters
- No file size limits are enforced (consider adding limits for production)
- No MIME type restrictions (consider adding validation for security)
- The module automatically creates necessary directories if they don't exist
- Files are not automatically deleted when entities are deleted (should be handled manually or via cascade operations)

