# LMS Elmister ITI API

A comprehensive Learning Management System (LMS) API built with Node.js, Express, and MongoDB. This API provides authentication, course management, group management, and user profile features for an educational platform.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
  - [Authentication](#authentication)
  - [Users](#users)
  - [Courses](#courses)
  - [Groups](#groups)
  - [Subscriptions & Payments](#subscriptions--payments)
  - [Teacher Payouts](#teacher-payouts)
- [Data Models](#data-models)
- [Authentication & Authorization](#authentication--authorization)
- [Third-Party Integrations](#third-party-integrations)
- [Project Structure](#project-structure)

## Features

- **User Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - Email verification
  - Password reset functionality
  - OAuth integration (Google)
  - Provider linking/unlinking
  - Profile completion

- **User Management**
  - Multiple user roles: Admin, Teacher, Parent, Student
  - User profile management
  - Avatar upload with Cloudinary integration

- **Course Management**
  - Create, read, update, and delete courses
  - Course thumbnails upload
  - Course status management (draft, published, archived)
  - Pricing configuration (free/paid)
  - Grade level filtering
  - Subject categorization

- **Group Management**
  - Create and manage study groups
  - Support for online, offline, and hybrid groups
  - Schedule management
  - Capacity and enrollment tracking
  - Group status (open/closed)

- **Stripe Subscriptions & Billing**
  - Monthly recurring subscriptions per group
  - Automatic invoicing with Stripe webhooks
  - Built-in 10% platform fee tracking

- **Teacher Payouts**
  - Teachers can claim their available balance
  - Admin workflow to approve or reject payout requests
  - Balance adjustments reflected on teacher profiles

- **Email Services**
  - Email verification
  - Password reset emails
  - Notification emails via Nodemailer

- **File Upload**
  - Image uploads via Multer
  - Cloudinary integration for media storage

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.1.0
- **Database**: MongoDB with Mongoose 9.0.0
- **Authentication**: JWT (jsonwebtoken), Passport.js
- **Validation**: Joi
- **File Upload**: Multer
- **Cloud Storage**: Cloudinary
- **Email**: Nodemailer
- **Payment**: Stripe
- **Security**: bcryptjs, express-rate-limit

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lms-elmister-iti-api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory (see [Environment Variables](#environment-variables))

4. Start the application:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Base Configuration
NODE_ENV=development
PORT=4040
SERVER_URL=http://localhost:4040
CLIENT_URL=http://localhost:3000

# Database
MONGO_URI=mongodb://localhost:27017/lms-elmister

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_REFRESH_EXPIRE=7d

# OAuth (Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary
CLOUDINARY_URL=your_cloudinary_url

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email Configuration (Nodemailer)
SMTP_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SENDER_EMAIL=your_email@gmail.com
```

## Running the Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:4040` (or the port specified in your `.env` file).

## API Documentation

Base URL: `http://localhost:4040/api/v1`

### Authentication

All authentication endpoints are prefixed with `/api/v1/auth`.

#### Register
- **POST** `/api/v1/auth/register`
- **Description**: Register a new user
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "student"
  }
  ```
- **Response**: User object with tokens

#### Login
- **POST** `/api/v1/auth/login`
- **Description**: Login with email and password
- **Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response**: User object with access and refresh tokens

#### Logout
- **POST** `/api/v1/auth/logout`
- **Description**: Logout user (clears refresh token cookie)
- **Auth**: Required

#### Refresh Token
- **POST** `/api/v1/auth/refresh-token`
- **Description**: Refresh access token using refresh token
- **Auth**: Required (refresh token in cookie)

#### Change Password
- **POST** `/api/v1/auth/change-password`
- **Description**: Change user password
- **Auth**: Required
- **Body**:
  ```json
  {
    "currentPassword": "oldpassword",
    "newPassword": "newpassword123"
  }
  ```

#### Forgot Password
- **POST** `/api/v1/auth/forgot-password`
- **Description**: Request password reset email
- **Body**:
  ```json
  {
    "email": "john@example.com"
  }
  ```

#### Reset Password
- **POST** `/api/v1/auth/reset-password`
- **Description**: Reset password using OTP
- **Body**:
  ```json
  {
    "email": "john@example.com",
    "otp": "123456",
    "newPassword": "newpassword123"
  }
  ```

#### Email Verification
- **GET** `/api/v1/auth/verify-email?token=<verification_token>`
- **Description**: Verify email via link (clicked from email)
- **POST** `/api/v1/auth/verify-email`
- **Description**: Verify email via API
- **Body**:
  ```json
  {
    "token": "verification_token"
  }
  ```

#### Resend Verification Email
- **POST** `/api/v1/auth/resend-verification`
- **Description**: Resend email verification
- **Body**:
  ```json
  {
    "email": "john@example.com"
  }
  ```

#### Google OAuth
- **GET** `/api/v1/auth/google`
- **Description**: Initiate Google OAuth login
- **GET** `/api/v1/auth/google/callback`
- **Description**: Google OAuth callback (handled automatically)

#### Link Provider
- **POST** `/api/v1/auth/link-provider`
- **Description**: Link OAuth provider to existing account
- **Auth**: Required
- **Body**:
  ```json
  {
    "provider": "google",
    "providerId": "google_user_id"
  }
  ```

#### Unlink Provider
- **POST** `/api/v1/auth/unlink-provider`
- **Description**: Unlink OAuth provider from account
- **Auth**: Required
- **Body**:
  ```json
  {
    "provider": "google"
  }
  ```

#### Complete Profile
- **POST** `/api/v1/auth/complete-profile`
- **Description**: Complete user profile after OAuth registration
- **Auth**: Required
- **Body**:
  ```json
  {
    "name": "John Doe",
    "role": "student"
  }
  ```

### Users

All user endpoints are prefixed with `/api/v1/users` and require authentication.

#### Get Current User
- **GET** `/api/v1/users/me`
- **Description**: Get authenticated user's profile
- **Auth**: Required

#### Update Current User
- **PATCH** `/api/v1/users/me`
- **Description**: Update authenticated user's profile
- **Auth**: Required
- **Body**: (multipart/form-data)
  ```json
  {
    "name": "John Doe",
    "phone": "+1234567890"
  }
  ```
- **Note**: Can include avatar file upload

#### Upload Avatar
- **POST** `/api/v1/users/me/avatar`
- **Description**: Upload user avatar
- **Auth**: Required
- **Body**: (multipart/form-data)
  - `avatar`: Image file

### Courses

All course endpoints are prefixed with `/api/v1/courses`.

#### Get All Courses
- **GET** `/api/v1/courses`
- **Description**: Get all courses (public)
- **Query Parameters**: (optional)
  - `status`: Filter by status (draft, published, archived)
  - `gradeLevel`: Filter by grade level
  - `subject`: Filter by subject
  - `search`: Search in title and description

#### Get Course by ID
- **GET** `/api/v1/courses/:id`
- **Description**: Get a specific course by ID
- **Params**: `id` - Course ID

#### Create Course
- **POST** `/api/v1/courses`
- **Description**: Create a new course
- **Auth**: Required (Teacher/Admin)
- **Body**: (multipart/form-data)
  ```json
  {
    "title": "Introduction to Mathematics",
    "description": "Learn the basics of mathematics",
    "subject": "Mathematics",
    "gradeLevel": "9",
    "status": "draft",
    "pricing": {
      "isPaid": true,
      "price": 99.99,
      "currency": "USD"
    },
    "language": "English",
    "tags": ["math", "beginner"]
  }
  ```
- **Files**: `thumbnail` - Course thumbnail image

#### Update Course
- **PATCH** `/api/v1/courses/:id`
- **Description**: Update a course
- **Auth**: Required (Teacher/Admin)
- **Params**: `id` - Course ID
- **Body**: (multipart/form-data) - Same as create, all fields optional

#### Delete Course
- **DELETE** `/api/v1/courses/:id`
- **Description**: Delete a course
- **Auth**: Required (Teacher/Admin)
- **Params**: `id` - Course ID

### Groups

All group endpoints are prefixed with `/api/v1/groups`.

#### Get All Groups
- **GET** `/api/v1/groups`
- **Description**: Get all groups (public)
- **Query Parameters**: (optional)
  - `status`: Filter by status (open, closed)
  - `type`: Filter by type (online, offline, hybrid)
  - `courseId`: Filter by course ID

#### Get Group by ID
- **GET** `/api/v1/groups/:id`
- **Description**: Get a specific group by ID
- **Params**: `id` - Group ID

#### Create Group
- **POST** `/api/v1/groups`
- **Description**: Create a new group
- **Auth**: Required (Teacher/Admin)
- **Body**:
  ```json
  {
    "title": "Math Group A",
    "description": "Advanced mathematics group",
    "type": "online",
    "isFree": false,
    "price": 50,
    "startingDate": "2024-01-15",
    "startingTime": "10:00",
    "duration": 60,
    "schedule": [
      {
        "day": "mon",
        "time": "10:00"
      },
      {
        "day": "wed",
        "time": "10:00"
      }
    ],
    "capacity": 30,
    "courseId": "course_id_here",
    "link": "https://meet.google.com/xxx-yyyy-zzz"
  }
  ```

#### Update Group
- **PATCH** `/api/v1/groups/:id`
- **Description**: Update a group
- **Auth**: Required (Teacher/Admin)
- **Params**: `id` - Group ID
- **Body**: Same as create, all fields optional

#### Delete Group
- **DELETE** `/api/v1/groups/:id`
- **Description**: Delete a group
- **Auth**: Required (Teacher/Admin)
- **Params**: `id` - Group ID

### Subscriptions & Payments

All subscription endpoints are prefixed with `/api/v1/subscriptions`.

#### Start a Group Subscription
- **POST** `/api/v1/subscriptions/groups/:groupId/subscribe`
- **Description**: Charge a monthly Stripe subscription for one of the parent's students to join the specified group.
- **Auth**: Required (Parent)
- **Body**:
  ```json
  {
    "studentId": "66f1b8c2c4d1f4b25e9e1234",
    "paymentMethodId": "pm_1Nc5bSDp9..."
  }
  ```
- **Response**: Local subscription record plus `clientSecret` for confirming the first payment intent.
- **Notes**:
  - The selected student must belong to the authenticated parent (based on `StudentProfile.parent`).
  - Stripe products/prices are generated per group automatically.
  - Each successful invoice logs both the teacher share (90%) and the platform fee (10%).

#### List My Subscriptions
- **GET** `/api/v1/subscriptions/me`
- **Description**: List subscriptions created by the authenticated parent.
- **Auth**: Required (Parent)

#### Cancel Subscription
- **DELETE** `/api/v1/subscriptions/:subscriptionId`
- **Description**: Schedule cancellation at the end of the current billing period.
- **Auth**: Required (Parent)

#### Stripe Webhook
- **POST** `/api/v1/subscriptions/stripe/webhook`
- **Description**: Receives Stripe events (`invoice.payment_succeeded`, `customer.subscription.updated`, etc.) to update local records, credit teachers, and enroll students after payment succeeds.
- **Auth**: None (Stripe only) — raw body is required; configure `STRIPE_WEBHOOK_SECRET`.

### Teacher Payouts

All payout endpoints are prefixed with `/api/v1/payouts`.

#### Create Payout Request
- **POST** `/api/v1/payouts/claim`
- **Description**: Move part of the teacher's available balance into a payout request after deducting the platform fee (already handled on each invoice).
- **Auth**: Required (Teacher)
- **Body**:
  ```json
  {
    "amount": 120.5,
    "note": "October earnings"
  }
  ```

#### List My Payout Requests
- **GET** `/api/v1/payouts/me`
- **Description**: View the teacher's payout history and statuses.
- **Auth**: Required (Teacher)

#### Admin: List Payout Requests
- **GET** `/api/v1/payouts?status=pending`
- **Description**: Review payout queue, optionally filtered by status (`pending`, `approved`, `paid`, `rejected`).
- **Auth**: Required (Admin)

#### Admin: Update Payout Status
- **PATCH** `/api/v1/payouts/:payoutId`
- **Description**: Approve, pay, or reject a payout. Rejecting restores the amount to the teacher's available balance, paying stores the payout timestamp and optional banking references.
- **Auth**: Required (Admin)
- **Body**:
  ```json
  {
    "status": "paid",
    "adminNote": "Transferred via bank wire",
    "referenceIds": ["payout_tx_123"]
  }
  ```

### Health Check

#### Ping
- **GET** `/ping`
- **Description**: Health check endpoint
- **Response**:
  ```json
  {
    "message": "pong"
  }
  ```

## Data Models

### User Model
- `name` (String, required)
- `username` (String, unique, auto-generated)
- `email` (String, required, unique)
- `avatar` (Object: url, publicId, type)
- `phone` (String)
- `role` (Enum: admin, teacher, parent, student, default: parent)
- `password` (String, required for local auth)
- `provider` (Enum: local, google, facebook, default: local)
- `providerId` (String)
- `linkedProviders` (Array)
- `emailVerified` (Boolean, default: false)
- `otp` (String)
- `otpExpiry` (Number)
- `timestamps` (createdAt, updatedAt)

### Course Model
- `title` (String, required, max: 150)
- `description` (String, max: 2000)
- `thumbnail` (Object: url, publicId, type)
- `subject` (String, required)
- `gradeLevel` (String, enum: 1-12, required)
- `status` (Enum: draft, published, archived, default: draft)
- `pricing` (Object: isPaid, price, currency)
- `language` (String, default: "English")
- `tags` (Array of Strings)
- `teacherId` (ObjectId, ref: User, required)
- `groups` (Array of ObjectIds, ref: Group)
- `averageRating` (Number, default: 0, min: 0, max: 5)
- `totalReviews` (Number, default: 0)
- `totalStudents` (Number, default: 0)
- `totalLessons` (Number, default: 0)
- `timestamps` (createdAt, updatedAt)

### Group Model
- `title` (String, required, min: 5, max: 150)
- `description` (String, max: 500)
- `type` (Enum: online, offline, hybrid, required)
- `isFree` (Boolean, default: false)
- `price` (Number, min: 0, required if not free)
- `currency` (String, 3-letter uppercase, default: USD)
- `billingInterval` (String, currently `month`)
- `startingDate` (Date, required)
- `startingTime` (String, required)
- `duration` (Number, required) - in minutes
- `schedule` (Array: day, time)
- `capacity` (Number, required, min: 0)
- `studentsCount` (Number, default: 0, auto-synced)
- `status` (Enum: open, closed, default: open, auto-synced)
- `location` (String, required if not online)
- `link` (String, required if online)
- `courseId` (ObjectId, ref: Course, required)
- `teacherId` (ObjectId, ref: User, required)
- `students` (Array of ObjectIds, ref: User)
- `stripeProductId` / `stripePriceId` / `stripePriceAmount` (Stripe billing metadata)
- `timestamps` (createdAt, updatedAt)
- `availableSeats` (Virtual: capacity - studentsCount)

### Subscription Model
- `parent` (ObjectId, ref: User)
- `student` (ObjectId, ref: User)
- `group` (ObjectId, ref: Group)
- `course` (ObjectId, ref: Course)
- `teacher` (ObjectId, ref: User)
- `amount` (Number) — monthly list price
- `currency` (String) — defaults to USD
- `status` (Enum: incomplete, trialing, active, past_due, canceled, unpaid)
- `stripeCustomerId` / `stripeSubscriptionId` / `stripePriceId`
- `currentPeriodStart` / `currentPeriodEnd`
- `cancelAtPeriodEnd`, `canceledAt`
- `charges[]` — ledger of Stripe invoices (gross amount, teacher share, platform fee, paidAt)

### Payout Model
- `teacher` (ObjectId, ref: User)
- `amount` (Number) — net value requested
- `currency` (String, default USD)
- `status` (Enum: pending, approved, paid, rejected)
- `requestedBy` / `approvedBy` (ObjectId, refs: User)
- `teacherNote`, `adminNote`
- `paidAt` timestamp
- `referenceIds[]` (external transaction identifiers)
- `period` (start/end) for bookkeeping
- `platformFeeSnapshot` (Number) for audit purposes

## Authentication & Authorization

### Authentication
- JWT-based authentication using access tokens and refresh tokens
- Access tokens expire in 15 minutes (configurable)
- Refresh tokens expire in 7 days (configurable)
- Refresh tokens are stored in HTTP-only cookies
- OAuth support via Google

### Authorization
The API supports role-based access control with the following roles:
- **Admin**: Full access to all resources
- **Teacher**: Can create and manage courses and groups
- **Parent**: Limited access (profile management)
- **Student**: Limited access (profile management, enrollment)

### Protected Routes
Most routes require authentication. Include the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Third-Party Integrations

### Cloudinary
- Used for image storage and management
- Handles avatar and course thumbnail uploads
- Provides optimized image URLs

### Stripe
- Handles all recurring group subscriptions
- Stripe Products/Prices are auto-provisioned per group
- Webhook (`/api/v1/subscriptions/stripe/webhook`) records invoices, credits teacher balances, and tracks the 10% platform fee

### Nodemailer
- Email service for:
  - Email verification
  - Password reset
  - Notifications

### Google OAuth
- Social authentication via Google
- Profile linking/unlinking support

## Project Structure

```
src/
├── app.js                 # Express app configuration
├── server.js              # Server entry point
├── config/                # Configuration files
│   ├── database.js        # MongoDB connection
│   ├── cloudinary.js      # Cloudinary setup
│   ├── nodemailer.js      # Email service setup
│   ├── stripe.js          # Stripe setup
│   └── passport/          # Passport strategies
├── controllers/           # Route controllers
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── course.controller.js
│   ├── group.controller.js
│   ├── subscription.controller.js
│   └── payout.controller.js
├── middlewares/           # Custom middlewares
│   ├── auth.middleware.js
│   ├── error.middleware.js
│   ├── multer.middleware.js
│   └── validate.middleware.js
├── models/                # Mongoose models
│   ├── User.js
│   ├── Course.js
│   ├── Group.js
│   ├── Subscription.js
│   └── Payout.js
├── routes/                # API routes
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── course.routes.js
│   ├── group.routes.js
│   ├── subscription.routes.js
│   └── payout.routes.js
├── services/              # Business logic
│   ├── auth.service.js
│   ├── user.service.js
│   ├── course.service.js
│   ├── mail.service.js
│   ├── subscription.service.js
│   └── payout.service.js
├── utils/                 # Utility functions
│   ├── app.error.js
│   ├── constants.js
│   └── mail.templates.js
└── validation/            # Joi validation schemas
    ├── auth.validation.js
    ├── user.validation.js
    ├── course.validation.js
    └── ...
```

## License

ISC

## Author

ITI Graduation Project
