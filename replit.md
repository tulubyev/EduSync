# Overview
This project is a web application providing user profile management capabilities. It allows users to view and edit their personal information, including name, email, phone number, and profile picture. The application also displays subscription status and basic account information. The core purpose is to offer a user-friendly interface for managing personal account details within a larger system.

# User Preferences
I want to develop this project iteratively. Please provide clear and detailed explanations for any proposed changes or new features. When suggesting code, aim for modern React practices and ensure type safety with TypeScript. I prefer that you ask for my confirmation before making any significant architectural changes or adding new external dependencies.

# System Architecture
The application is built using React and TypeScript, leveraging Shadcn UI components for a modern and responsive user interface. State management is handled with React's `useState` and `useEffect` hooks. Form validation is implemented client-side. User authentication is managed via an `accessToken` stored in `localStorage`, which is sent with API requests.

Key features include:
- **User Profile Display and Editing**: Users can update their first name, last name, email, and phone number.
- **Profile Picture Management**: Supports uploading, previewing, and updating profile images with drag-and-drop functionality and client-side validation for file size and type.
- **Subscription Status Display**: Shows the user's current plan type (e.g., Free, Premium, Pro) with corresponding visual badges.
- **Account Information**: Displays user ID and account creation date.
- **Form Validation**: Client-side validation for email, phone number, and required fields.
- **Error and Success Handling**: Provides visual feedback for form submissions and errors.

The UI/UX adheres to a clean, modern aesthetic provided by Shadcn UI, utilizing `Card`, `Button`, and `Badge` components. The design incorporates clear typography, accessible form elements, and intuitive feedback mechanisms.

# External Dependencies
- **Shadcn UI**: Utilized for various UI components (`Card`, `Button`, `Badge`).
- **Lucide React**: Used for iconography (`User`, `Upload`, `Mail`, `Phone`).
- **Internal REST API Endpoints**:
    - `/api/users/profile`: For fetching and updating user profile data.
    - `/api/users/profile/photo`: For uploading and updating the user's profile picture.