# Data Source Configuration Guide

This application supports two data sources:
1. **Supabase Database** (default)
2. **Remote NestJS API Server**

## Switching Between Data Sources

### Using the Settings Page

1. Navigate to **Settings** page in the application
2. Find the **Data Source Configuration** card
3. Select your preferred data source:
   - **Supabase Database**: Uses the built-in Supabase backend
   - **Remote API (NestJS)**: Connects to your external NestJS server
4. If selecting Remote API, enter your **API Base URL** (e.g., `https://api.example.com`)
5. Click **Save Data Source**
6. Refresh the page to apply changes

## For Developers: Using the Data Service Layer

### Overview

The application uses a data abstraction layer that automatically routes requests to either Supabase or your API based on configuration.

### Available Services

Located in `/lib/services/data-service.ts`:

```typescript
import { dataService } from '@/lib/services/data-service'

// Fetch operations
await dataService.fetchReservations()
await dataService.fetchLabs()
await dataService.fetchUsers()
await dataService.fetchAttendances()
await dataService.fetchEquipment()
await dataService.fetchDashboardStats()

// Update operations
await dataService.updateReservation(id, updates)
await dataService.createReservation(reservation)
await dataService.createLab(lab)
await dataService.updateLab(id, updates)
await dataService.deleteLab(id)
```

### Response Format

All data service methods return:

```typescript
{
  data: T | null,
  error: Error | null
}
```

### Example Usage

```typescript
async function fetchReservations() {
  const { data, error } = await dataService.fetchReservations()

  if (error) {
    console.error('Failed to fetch:', error)
    return
  }

  if (data) {
    setReservations(data)
  }
}
```

## NestJS API Requirements

Your NestJS API should implement the following endpoints:

### Reservations
- `GET /reservations` - List all reservations
- `POST /reservations` - Create a reservation
- `PATCH /reservations/:id` - Update a reservation

### Labs (Activities)
- `GET /labs` - List all labs
- `POST /labs` - Create a lab
- `PATCH /labs/:id` - Update a lab
- `DELETE /labs/:id` - Delete a lab

### Users
- `GET /users` - List all users

### Attendances
- `GET /attendances` - List all attendance logs

### Equipment
- `GET /equipment` - List all equipment

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics

### Expected Response Format

Your API should return JSON responses with the same structure as Supabase queries. For example:

**GET /reservations**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "desired_start_time": "2024-01-01T10:00:00Z",
    "desired_end_time": "2024-01-01T12:00:00Z",
    "status": "pending",
    "priority": "high",
    "profiles": {
      "full_name": "John Doe",
      "email": "john@example.com"
    },
    "reservation_activities": [
      {
        "activities": {
          "name": "Computer Lab"
        }
      }
    ]
  }
]
```

## Configuration Files

- `/lib/config/data-source.ts` - Configuration management
- `/lib/services/api-client.ts` - HTTP client for API requests
- `/lib/services/data-service.ts` - Main data abstraction layer

## Troubleshooting

### API Connection Issues

1. Verify your API URL is correct and accessible
2. Check CORS settings on your NestJS server
3. Ensure your API endpoints match the expected routes
4. Check browser console for error messages

### Switching Back to Supabase

1. Go to Settings
2. Select "Supabase Database"
3. Click "Save Data Source"
4. Refresh the page

## Notes

- Configuration is stored in browser localStorage
- Each user can have their own data source preference
- When switching data sources, you may need to refresh the page
- The Manage Reservations page has been updated as an example implementation
