# Admin Integration

The redesigned admin portal is connected to the existing OTLI API.

## Zustand stores

- `src/stores/authStore.js`: admin login, session restoration, current user, logout
- `src/stores/adminDashboardStore.js`: live dashboard summaries for accounts, bookings, and yard capacity

## Connected workflows

- Admin authentication and module permissions
- Client verification
- Admin user management
- Booking approval and container tracking
- Pre-advice and Gate-In
- Yard area setup, inventory, and storage monitoring
- Billing rate setup and payment verification
- Gate-Out approval and completion
- Real-time Socket.IO updates
- Protected admin routes

## UI consistency update

- Standardized admin accents around the OTLI yard navy and orange template.
- Replaced remaining green/teal and indigo brand accents with orange, navy, or blue semantic states.
- Added reusable pagination to every admin table, including dashboard accounts, admin users, permission modules, clients, inventory, rates, storage monitoring, and yard areas.
