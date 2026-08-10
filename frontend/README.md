# IIPM Payroll Management System - Frontend

A modern React.js web application for managing employee payroll with real-time calculations, reporting, and administration.

## Features

✅ **User Authentication**
- Secure login with JWT tokens
- Role-based access control (Admin, Payroll Officer, Employee)
- Automatic session management

✅ **Admin Dashboard**
- Overview of payroll statistics
- Quick access to all system functions
- User management interface
- Settings configuration

✅ **Payroll Management**
- Create and process monthly payroll
- Automatic salary calculations
- Approval workflow
- Payroll locking mechanism

✅ **Employee Portal**
- View personal payslips
- Download payslips as PDF
- Year-to-date salary tracking
- Salary comparison reports

✅ **Reporting**
- Salary register reports
- NPS reports
- TDS reports
- YTD reports
- Department-wise analysis
- Export to Excel

✅ **Settings Management**
- Configure DA%, HRA%, NPS%
- Set PT and CGHS amounts
- Manage TA calculations
- Real-time configuration updates

✅ **User Management**
- Create employees
- Update employee information
- Deactivate users
- Assign roles

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **React Router v6** - Client-side routing
- **Axios** - HTTP client
- **Bootstrap 5** - CSS framework
- **React Bootstrap** - Bootstrap components
- **Chart.js** - Data visualization
- **FontAwesome** - Icons

## Prerequisites

- Node.js 16+ 
- npm or yarn package manager
- Backend API running on http://localhost:8080/api

## Installation

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Edit `.env` file:
```
REACT_APP_API_URL=http://localhost:8080/api
```

### 3. Start Development Server

```bash
npm start
```

The application will open at `http://localhost:3000`

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── Navbar.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── PayrollManagement.tsx
│   │   ├── EmployeePortal.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── UserManagement.tsx
│   ├── services/
│   │   └── api.ts
│   ├── styles/
│   │   ├── App.css
│   │   ├── LoginPage.css
│   │   ├── Navbar.css
│   │   ├── Dashboard.css
│   │   └── Pages.css
│   ├── App.tsx
│   └── index.tsx
├── package.json
├── tsconfig.json
└── .env
```

## API Integration

All API calls are managed through `src/services/api.ts`. The service provides:

- **Authentication**: login(), logout(), refreshToken()
- **Users**: getAllUsers(), createUser(), updateUser(), deleteUser()
- **Payroll**: createPayroll(), getPayrollsByUser(), approvePayroll(), etc.
- **Reports**: getSalaryRegister(), getNPSReport(), getTDSReport(), etc.
- **Settings**: getAllSettings(), updateSetting()
- **Arrears**: createDAArear(), approveArrear(), markAsPaid()

## Authentication Flow

1. User enters credentials on login page
2. API returns JWT token and refresh token
3. Token stored in localStorage
4. All API requests include Authorization header with Bearer token
5. Protected routes check authentication before rendering
6. Auto-logout on token expiration

## Styling

- Bootstrap 5 for responsive layouts
- Custom CSS for enhanced styling
- Mobile-responsive design
- Dark-themed navbar
- Professional color scheme

## Building for Production

```bash
npm run build
```

Creates optimized production build in `build/` directory.

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Expose build config (one-way operation)

## Demo Credentials

```
Admin:
  Username: admin
  Password: admin123

Payroll Officer:
  Username: payroll_officer
  Password: payroll123

Employee:
  Username: employee1
  Password: emp123
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Code splitting for faster load times
- Lazy loading of routes
- Optimized component rendering
- Efficient API calls

## Security

- JWT token-based authentication
- BCrypt password hashing (backend)
- HTTPS in production
- Role-based access control
- CORS configuration

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npm run kill:port:3000
```

### API Connection Issues
- Ensure backend is running on http://localhost:8080
- Check .env file API_URL setting
- Verify CORS configuration on backend

### Login Not Working
- Verify credentials match database
- Check browser console for errors
- Ensure backend is responding

## Contributing

Follow these guidelines:
1. Create feature branch: `git checkout -b feature/name`
2. Commit changes: `git commit -m "Add feature"`
3. Push to remote: `git push origin feature/name`
4. Open pull request

## License

Proprietary - IIPM Visakhapatnam

## Support

For issues and support, contact the development team.

## Changelog

### v1.0.0 (2026-08-07)
- Initial release
- Complete payroll management system
- 7+ report types
- Employee self-service portal
- Admin control panel

---

**Status**: ✅ Production Ready  
**Last Updated**: August 7, 2026  
**Maintainer**: Development Team
