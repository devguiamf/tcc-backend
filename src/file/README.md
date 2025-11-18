# File Module

## Description

The File module is an **internal module** that manages file uploads and storage for the system. It organizes files by module (service, store) and entity ID, allowing each entity to have multiple associated files. The module handles file storage on the filesystem, metadata persistence in the database, and provides base64 encoding for image retrieval.

**Note**: This module does not expose public endpoints. It is used internally by Service and Store modules to handle file uploads automatically when FormData is sent.

## Internal Usage

The File module is used internally by:
- **Service Module**: Automatically processes image uploads when creating/updating services via FormData
- **Store Module**: Automatically processes image uploads when creating/updating stores via FormData

## Business Rules

1. **Module Organization**: 
   - Files are organized by module (service, store) in separate directories.
   - Each file is associated with a specific entity within that module.
   - Multiple files can be associated with the same entity.

2. **File Storage**: 
   - Files are stored in the filesystem under `./uploads/{module}/{fileName}`.
   - The upload directory path can be configured via `UPLOAD_PATH` environment variable (default: `./uploads`).
   - File names are generated to avoid conflicts: `{originalName}_{timestamp}_{randomString}.{extension}`.
   - The file path is saved in the database in the `imageUrl` field of Service and Store entities.

3. **File Metadata**: 
   - All file metadata is stored in the database.
   - Original filename, generated filename, MIME type, size, module, entity ID, and file path are persisted.
   - When files are retrieved, they are automatically converted to base64 format for easy consumption.

4. **Base64 Encoding**: 
   - When Service or Store entities are retrieved, if they have an associated image file, the image is automatically read from disk and converted to base64.
   - The base64 string is returned in the `imageBase64` field with the format: `data:{mimeType};base64,{base64String}`.
   - This allows the frontend to display images directly without additional API calls.

## File Service Methods

### upload(file, module, entityId)
- Uploads a file and saves it to the filesystem
- Creates metadata entry in the database
- Returns `FileOutput` with file information
- The file path is saved in the entity's `imageUrl` field

### findById(id)
- Retrieves file metadata by ID
- Returns `FileOutput` with base64 encoded content

### findByModuleAndEntityId(module, entityId)
- Retrieves all files for a specific module and entity
- Returns array of `FileOutput` with base64 encoded content

### getFileBase64(filePath)
- Reads a file from disk and converts it to base64
- Returns base64 string or undefined if file doesn't exist
- Used internally by Service and Store modules

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
  url: string;                    // URL (deprecated, not used)
  base64?: string;                // Base64 encoded file content (when retrieved)
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
- **BASE_URL**: Base URL (deprecated, not used for file access)

## Integration with Service and Store Modules

The File module is automatically used by Service and Store modules:

1. **Automatic Upload**: When a file is sent via FormData in create/update endpoints, the FileService automatically:
   - Saves the file to `./uploads/{module}/`
   - Creates metadata in the database
   - Updates the entity's `imageUrl` field with the file path

2. **Automatic Base64 Encoding**: When Service or Store entities are retrieved:
   - The system checks if `imageUrl` points to a local file
   - If the file exists, it reads it and converts to base64
   - Returns the base64 string in the `imageBase64` field

3. **Automatic Cleanup**: When a Service or Store is deleted:
   - All associated files are automatically deleted from disk
   - File metadata is removed from the database

## Database Relations

- **FileEntity**: Stores file metadata
- No foreign key constraints (module and entityId are stored as UUIDs)
- Indexes on `module` and `entityId` for efficient queries

## Dependencies

- `FileRepository`: Handles database operations for file metadata
- `ConfigService`: Reads environment variables for configuration
- TypeORM: For entity management and database access

## Module Exports

- `FileService`: Business logic service for file operations
- `FileRepository`: Database repository for file metadata

## Example Usage Flow

1. **Create/Update with File**: 
   - Client sends POST/PUT request with FormData containing entity data + file
   - Service/Store module receives the request
   - FileService automatically uploads the file to `./uploads/{module}/`
   - File metadata is saved to database
   - Entity's `imageUrl` is updated with the file path
   - Entity is returned with `imageBase64` field populated

2. **Retrieve Entity**: 
   - Client requests Service or Store by ID
   - System checks if `imageUrl` points to a local file
   - If file exists, reads it and converts to base64
   - Returns entity with `imageBase64` field containing `data:{mimeType};base64,{base64String}`

3. **Delete Entity**: 
   - When Service or Store is deleted
   - System automatically deletes all associated files from disk
   - File metadata is removed from database

## Notes

- Files are stored on the local filesystem in `./uploads/{module}/` directory
- File paths are saved in the `imageUrl` field of Service and Store entities
- Images are automatically converted to base64 when entities are retrieved
- File names are sanitized to avoid conflicts and special characters
- No file size limits are enforced (consider adding limits for production)
- No MIME type restrictions (consider adding validation for security)
- The module automatically creates necessary directories if they don't exist
- Files are automatically deleted when entities are deleted
- The module is internal-only and has no public endpoints

