# FinTrack - Финтех-агрегатор MVP

## Overview
FinTrack is a working MVP financial aggregator for Russian market, designed for managing bank accounts, budgets, savings, and investments. Successfully deployed with functional dashboard showing real banking data from Sberbank and VTB. Core features include user authentication, financial data visualization, and administrative controls for Russian fintech ecosystem.

## User Preferences
- Language of interface: Russian.
- Target audience: Users in Russia.
- Focus on security and ease of use.
- **CATEGORICALLY FORBIDDEN**: To change database parameters in the Secret window without explicit user permission.
- **IMPORTANT**: Only the user manages the DATABASE_URL settings and other secret parameters.
- **PAYMENTS**: Stripe does not work in Russia - Russian systems are used (YuKassa, CloudPayments, Sberbank Acquiring).

## System Architecture
FinTrack is built as a full-stack application with simplified frontend architecture for maximum stability and reliable Russian banking integration.

**Recent Architecture Decision (Dec 26, 2024)**: Simplified frontend by removing complex dependency layers (AuthProvider, Router, shadcn/ui) and implementing direct state management with inline styling. This resolved critical rendering issues and ensures consistent dashboard display.

**Feature Enhancement (Dec 28, 2024)**: Implemented secure document upload and verification system with object storage integration, enabling users to upload and verify identity documents. Added comprehensive bank connection interface with real banking API integration for account aggregation and asset management dashboard with portfolio tracking.

**Major Modularization (Sep 8, 2025)**: Completed massive refactoring of frontend architecture. Successfully extracted App.tsx from monolithic 3731 lines to modular 453 lines (-87.8% reduction). Created 6 reusable components: DocumentsSection (636 lines), BankConnectionsSection (323 lines), AssetManagementSection (371 lines), AdminPanel (1033 lines), ProfileSection (488 lines), and AuthForm (430 lines). All original functionality preserved with improved maintainability and reusability.

### Frontend
- **Technology Stack**: React with TypeScript, fully modularized component architecture with direct state management and inline styling for maximum reliability.
- **Component Architecture**: Modular design with 6 major extracted components from main App.tsx, enabling reuse and easier maintenance.
- **UI/UX**: Responsive design with clean, professional interface optimized for Russian banking data display.
- **Key Features**: Working authentication system, comprehensive dashboard with financial cards, bank account listing, transaction history, and administrative controls.
- **User Authentication**: Two-factor authentication (2FA) support via TOTP authenticators and SMS codes (for dev), QR code setup, and backup codes.
- **User Roles**: Supports "Personal" and "Family Plan" roles, with "Business" planned. Family groups include invite codes and access rights.

### Backend
- **Technology Stack**: Express.js server with JWT authentication.
- **Database**: PostgreSQL is used as the primary database.
- **Security**: End-to-end encryption (E2EE), JWT tokens for authorization, separate encryption key for financial data, and secure storage of API keys.
- **Admin System**: Multi-level administration with six distinct roles (Super Admin, DevOps Admin, Analytics Admin, Finance Admin, API Admin, Security Admin) is implemented with granular permission control via middleware (`requireAdmin`, `requirePermission`). All administrative actions are logged.
- **Feature Specifications**:
    - **Account Aggregation**: Supports aggregation via mock PCS / Gosuslugi.
    - **Expense Analysis**: Automatic categorization of expenses and budget management.
    - **AI Financial Assistant**: Provides predictions and personalized financial advice.
    - **Family Finances**: Supports joint financial management.
    - **Subscription Optimizer**: Analyzes and optimizes user subscriptions.
    - **Cashback Aggregator**: Recommends cashback opportunities.
    - **Gamification**: Points and achievements for financial goals.
    - **GosUslugi (ESIA) Integration**: Full integration for OAuth 2.0 authorization, supporting test and production environments. Extends user schema with SNILS, TIN, patronymic, and date of birth, allowing automatic user verification and creation through government data. Supports GOST cryptography for production.

### General Design Principles
- **Modularity**: Separation of concerns between frontend and backend, and distinct modules for features like authentication, finance, and administration.
- **Scalability**: Designed with future integrations (e.g., real banks, investments) in mind.
- **Security First**: Emphasis on robust encryption and secure data handling.

## External Dependencies
- **OpenAI API**: For the AI financial assistant.
- **OpenRouter API**: For AI consultations, specifically using Claude 3.5 Sonnet.
- **PostgreSQL**: Database solution.
- **GosUslugi (ESIA)**: For user authentication and data verification in Russia.
- **Russian Payment Systems**: YuKassa, CloudPayments, Sberbank Acquiring (for payment processing in Russia).
- **TOTP Authenticators**: Google Authenticator, Yandex.Key, etc., for 2FA.
- **Object Storage**: Google Cloud Storage for secure document and file uploads.
- **Banking APIs**: Integration with Russian banks (Sberbank, VTB, Tinkoff, etc.) for account aggregation via Open Banking standards.