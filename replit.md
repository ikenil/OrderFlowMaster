# Master Order ERP - Replit Configuration

## Overview

Master Order ERP is a comprehensive order management system designed to centralize e-commerce operations across multiple platforms including Amazon, Flipkart, Meesho, and custom websites. The application provides a unified dashboard for tracking orders, managing expenses, user administration, and generating analytics insights. Built as a full-stack TypeScript application, it features a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Library**: shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Storage**: PostgreSQL-based session store with connect-pg-simple
- **API Design**: RESTful API with structured error handling and request logging

### Database Design
- **Database**: PostgreSQL with Neon serverless integration
- **Schema Management**: Drizzle migrations with shared schema definitions
- **Key Tables**: 
  - Users with role-based access control (admin, manager, viewer)
  - Orders with status tracking and platform differentiation
  - Expenses with category-based organization and approval workflows
  - Order status history for audit trails
  - Sessions for authentication state persistence

### Authentication & Authorization
- **Provider**: Replit Auth with OIDC (OpenID Connect)
- **Session Management**: Secure HTTP-only cookies with PostgreSQL storage
- **Role-Based Access**: Three-tier permission system (admin, manager, viewer)
- **Security**: Environment-based configuration with secure session handling

### API Structure
- **Orders Management**: CRUD operations with filtering, pagination, and status updates
- **Expense Tracking**: Create, approve, and categorize business expenses
- **User Administration**: Role management and user status control (admin only)
- **Dashboard Analytics**: Aggregated statistics and trend data
- **Platform Integration**: Sync endpoints for external e-commerce platforms

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit Auth service for user identity management
- **Session Storage**: PostgreSQL-based session persistence

### Development Tools
- **Build System**: Vite for frontend bundling and development server
- **TypeScript**: Full-stack type safety with shared schema definitions
- **ESBuild**: Server-side bundling for production deployment

### UI and Styling
- **Component Library**: Radix UI primitives for accessible base components
- **Design System**: shadcn/ui for pre-built component patterns
- **Styling Framework**: Tailwind CSS with custom design tokens
- **Charts**: Recharts for data visualization and analytics

### Backend Services
- **Web Framework**: Express.js with middleware for logging and error handling
- **Database Client**: Neon serverless PostgreSQL driver with WebSocket support
- **Validation**: Zod for runtime type checking and API validation
- **Form Processing**: React Hook Form resolvers for client-side validation

### Platform Integrations
- **E-commerce APIs**: Integration capabilities for Amazon, Flipkart, Meesho platforms
- **Data Synchronization**: Scheduled sync operations for order and inventory updates
- **Export Functionality**: CSV and PDF generation for reports and data export

### Monitoring and Development
- **Error Handling**: Centralized error boundary with user-friendly messaging
- **Request Logging**: Structured API request/response logging
- **Development Tools**: Hot module replacement and runtime error overlays