--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4 (Ubuntu 16.4-1.pgdg22.04+1)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.verification_requests DROP CONSTRAINT IF EXISTS verification_requests_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.verification_requests DROP CONSTRAINT IF EXISTS verification_requests_reviewed_by_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.verification_codes DROP CONSTRAINT IF EXISTS verification_codes_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.user_verifications DROP CONSTRAINT IF EXISTS user_verifications_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.transactions DROP CONSTRAINT IF EXISTS transactions_account_id_accounts_id_fk;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.savings_goals DROP CONSTRAINT IF EXISTS savings_goals_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.family_groups DROP CONSTRAINT IF EXISTS family_groups_admin_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.family_group_members DROP CONSTRAINT IF EXISTS family_group_members_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.family_group_members DROP CONSTRAINT IF EXISTS family_group_members_group_id_family_groups_id_fk;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_document_type_id_document_types_id_fk;
ALTER TABLE IF EXISTS ONLY public.document_verification_history DROP CONSTRAINT IF EXISTS document_verification_history_document_id_documents_id_fk;
ALTER TABLE IF EXISTS ONLY public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.bank_connections DROP CONSTRAINT IF EXISTS bank_connections_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.ai_chat_sessions DROP CONSTRAINT IF EXISTS ai_chat_sessions_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.admin_logs DROP CONSTRAINT IF EXISTS admin_logs_admin_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.accounts DROP CONSTRAINT IF EXISTS accounts_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.accounts DROP CONSTRAINT IF EXISTS accounts_bank_connection_id_bank_connections_id_fk;
DROP INDEX IF EXISTS public.verification_request_status_idx;
DROP INDEX IF EXISTS public.verification_codes_expire_idx;
DROP INDEX IF EXISTS public.user_verification_idx;
DROP INDEX IF EXISTS public.user_transaction_idx;
DROP INDEX IF EXISTS public.user_session_idx;
DROP INDEX IF EXISTS public.user_request_idx;
DROP INDEX IF EXISTS public.user_goal_idx;
DROP INDEX IF EXISTS public.user_code_idx;
DROP INDEX IF EXISTS public.user_budget_idx;
DROP INDEX IF EXISTS public.user_bank_idx;
DROP INDEX IF EXISTS public.user_account_idx;
DROP INDEX IF EXISTS public.system_settings_category_idx;
DROP INDEX IF EXISTS public.group_user_idx;
DROP INDEX IF EXISTS public.email_idx;
DROP INDEX IF EXISTS public.category_idx;
DROP INDEX IF EXISTS public.bank_account_idx;
DROP INDEX IF EXISTS public.admin_user_idx;
DROP INDEX IF EXISTS public.admin_logs_created_at_idx;
DROP INDEX IF EXISTS public.action_idx;
DROP INDEX IF EXISTS public.account_transaction_idx;
ALTER TABLE IF EXISTS ONLY public.verification_requests DROP CONSTRAINT IF EXISTS verification_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.verification_levels DROP CONSTRAINT IF EXISTS verification_levels_pkey;
ALTER TABLE IF EXISTS ONLY public.verification_levels DROP CONSTRAINT IF EXISTS verification_levels_level_unique;
ALTER TABLE IF EXISTS ONLY public.verification_codes DROP CONSTRAINT IF EXISTS verification_codes_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_snils_unique;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_phone_unique;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_inn_unique;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_esia_oid_unique;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_unique;
ALTER TABLE IF EXISTS ONLY public.user_verifications DROP CONSTRAINT IF EXISTS user_verifications_pkey;
ALTER TABLE IF EXISTS ONLY public.transactions DROP CONSTRAINT IF EXISTS transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_key_unique;
ALTER TABLE IF EXISTS ONLY public.savings_goals DROP CONSTRAINT IF EXISTS savings_goals_pkey;
ALTER TABLE IF EXISTS ONLY public.family_groups DROP CONSTRAINT IF EXISTS family_groups_pkey;
ALTER TABLE IF EXISTS ONLY public.family_groups DROP CONSTRAINT IF EXISTS family_groups_invite_code_unique;
ALTER TABLE IF EXISTS ONLY public.family_group_members DROP CONSTRAINT IF EXISTS family_group_members_pkey;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_pkey;
ALTER TABLE IF EXISTS ONLY public.document_verification_history DROP CONSTRAINT IF EXISTS document_verification_history_pkey;
ALTER TABLE IF EXISTS ONLY public.document_types DROP CONSTRAINT IF EXISTS document_types_pkey;
ALTER TABLE IF EXISTS ONLY public.budgets DROP CONSTRAINT IF EXISTS budgets_pkey;
ALTER TABLE IF EXISTS ONLY public.bank_connections DROP CONSTRAINT IF EXISTS bank_connections_pkey;
ALTER TABLE IF EXISTS ONLY public.ai_chat_sessions DROP CONSTRAINT IF EXISTS ai_chat_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_name_unique;
ALTER TABLE IF EXISTS ONLY public.admin_logs DROP CONSTRAINT IF EXISTS admin_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.accounts DROP CONSTRAINT IF EXISTS accounts_pkey;
DROP TABLE IF EXISTS public.verification_requests;
DROP TABLE IF EXISTS public.verification_levels;
DROP TABLE IF EXISTS public.verification_codes;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_verifications;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.system_settings;
DROP TABLE IF EXISTS public.savings_goals;
DROP TABLE IF EXISTS public.family_groups;
DROP TABLE IF EXISTS public.family_group_members;
DROP TABLE IF EXISTS public.documents;
DROP TABLE IF EXISTS public.document_verification_history;
DROP TABLE IF EXISTS public.document_types;
DROP TABLE IF EXISTS public.budgets;
DROP TABLE IF EXISTS public.bank_connections;
DROP TABLE IF EXISTS public.ai_chat_sessions;
DROP TABLE IF EXISTS public.admin_roles;
DROP TABLE IF EXISTS public.admin_logs;
DROP TABLE IF EXISTS public.accounts;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    bank_connection_id uuid NOT NULL,
    external_account_id character varying(100) NOT NULL,
    account_type character varying(50) NOT NULL,
    account_name character varying(100) NOT NULL,
    balance numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'RUB'::character varying,
    is_active boolean DEFAULT true,
    last_updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.accounts OWNER TO replit;

--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    target_type character varying(50),
    target_id character varying(100),
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_logs OWNER TO replit;

--
-- Name: admin_roles; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.admin_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text NOT NULL,
    permissions jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_roles OWNER TO replit;

--
-- Name: ai_chat_sessions; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.ai_chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id character varying(100) NOT NULL,
    messages jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ai_chat_sessions OWNER TO replit;

--
-- Name: bank_connections; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.bank_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    bank_code character varying(50) NOT NULL,
    bank_name character varying(100) NOT NULL,
    access_token text,
    refresh_token text,
    consent_id character varying(100),
    status character varying(20) DEFAULT 'active'::character varying,
    last_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.bank_connections OWNER TO replit;

--
-- Name: budgets; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category character varying(50) NOT NULL,
    monthly_limit numeric(15,2) NOT NULL,
    current_spent numeric(15,2) DEFAULT '0'::numeric,
    month integer NOT NULL,
    year integer NOT NULL,
    is_active boolean DEFAULT true
);


ALTER TABLE public.budgets OWNER TO replit;

--
-- Name: document_types; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.document_types (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    display_name character varying NOT NULL,
    description text,
    required_fields jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.document_types OWNER TO replit;

--
-- Name: document_verification_history; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.document_verification_history (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    document_id character varying NOT NULL,
    previous_status character varying NOT NULL,
    new_status character varying NOT NULL,
    changed_by character varying,
    change_reason text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.document_verification_history OWNER TO replit;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.documents (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    document_type_id character varying NOT NULL,
    file_name character varying NOT NULL,
    file_path character varying NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying NOT NULL,
    status character varying DEFAULT 'uploaded'::character varying NOT NULL,
    verification_method character varying,
    extracted_data jsonb,
    verification_notes text,
    verified_by character varying,
    verified_at timestamp without time zone,
    rejection_reason text,
    expires_at timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    checksum character varying
);


ALTER TABLE public.documents OWNER TO replit;

--
-- Name: family_group_members; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.family_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying,
    permissions jsonb DEFAULT '{}'::jsonb,
    joined_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.family_group_members OWNER TO replit;

--
-- Name: family_groups; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.family_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    admin_user_id uuid NOT NULL,
    invite_code character varying(10),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.family_groups OWNER TO replit;

--
-- Name: savings_goals; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.savings_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    target_amount numeric(15,2) NOT NULL,
    current_amount numeric(15,2) DEFAULT '0'::numeric,
    target_date timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.savings_goals OWNER TO replit;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    is_editable boolean DEFAULT true,
    updated_by uuid,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO replit;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id uuid NOT NULL,
    external_transaction_id character varying(100),
    amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'RUB'::character varying,
    description text NOT NULL,
    merchant character varying(200),
    category character varying(50),
    subcategory character varying(50),
    transaction_date timestamp without time zone NOT NULL,
    processing_date timestamp without time zone DEFAULT now(),
    is_recurring boolean DEFAULT false,
    metadata jsonb
);


ALTER TABLE public.transactions OWNER TO replit;

--
-- Name: user_verifications; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.user_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    current_level integer DEFAULT 1,
    phone_verified boolean DEFAULT false,
    phone_verified_at timestamp without time zone,
    email_verified boolean DEFAULT false,
    email_verified_at timestamp without time zone,
    documents_verified boolean DEFAULT false,
    documents_verified_at timestamp without time zone,
    gosuslugi_verified boolean DEFAULT false,
    gosuslugi_verified_at timestamp without time zone,
    banking_verified boolean DEFAULT false,
    banking_verified_at timestamp without time zone,
    last_upgrade_attempt timestamp without time zone,
    next_upgrade_eligible timestamp without time zone,
    monthly_usage numeric(15,2) DEFAULT '0'::numeric,
    usage_reset_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_verifications OWNER TO replit;

--
-- Name: users; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255),
    password_hash text NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20) NOT NULL,
    is_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    two_factor_enabled boolean DEFAULT false,
    two_factor_secret character varying(100),
    two_factor_backup_codes text[],
    sms_code_expiry timestamp without time zone,
    sms_code character varying(6),
    role character varying(20) DEFAULT 'personal'::character varying,
    plan_type character varying(20) DEFAULT 'free'::character varying,
    middle_name character varying(100),
    birth_date timestamp without time zone,
    gender character varying(1),
    snils character varying(14),
    inn character varying(12),
    esia_oid character varying(50),
    verification_method character varying(20),
    admin_role character varying(20),
    profile_image_url character varying(500),
    is_email_verified boolean DEFAULT false,
    is_phone_verified boolean DEFAULT false,
    verification_level_2 boolean DEFAULT false,
    verification_level_3 boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO replit;

--
-- Name: verification_codes; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.verification_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying NOT NULL,
    code character varying(10) NOT NULL,
    target character varying NOT NULL,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    is_used boolean DEFAULT false,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.verification_codes OWNER TO replit;

--
-- Name: verification_levels; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.verification_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level integer NOT NULL,
    name character varying NOT NULL,
    description text,
    monthly_limit numeric(15,2) NOT NULL,
    balance_limit numeric(15,2),
    required_verifications jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.verification_levels OWNER TO replit;

--
-- Name: verification_requests; Type: TABLE; Schema: public; Owner: replit
--

CREATE TABLE public.verification_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    requested_level integer NOT NULL,
    current_level integer NOT NULL,
    status character varying DEFAULT 'pending'::character varying,
    submitted_data jsonb,
    verification_results jsonb,
    reviewed_by uuid,
    review_notes text,
    rejection_reason text,
    approved_at timestamp without time zone,
    rejected_at timestamp without time zone,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.verification_requests OWNER TO replit;

--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.accounts (id, user_id, bank_connection_id, external_account_id, account_type, account_name, balance, currency, is_active, last_updated_at) FROM stdin;
\.


--
-- Data for Name: admin_logs; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.admin_logs (id, admin_user_id, action, target_type, target_id, details, ip_address, user_agent, created_at) FROM stdin;
c0a72755-97c2-47e2-904e-8bf9aaf86f5d	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "10", "search": ""}	127.0.0.1	curl/8.14.1	2025-08-29 13:38:00.660612
afa71f3d-a76f-457f-a979-7453156bf596	51b800b1-ea70-47aa-b6a4-31015a753ac0	user_role_updated	user	419e7684-672b-4217-8f39-f243dff990dd	{"newRole": "devops_admin", "previousRole": null, "targetUserName": "Александр Тестовый", "targetUserPhone": "+79001234567"}	127.0.0.1	curl/8.14.1	2025-08-29 13:38:08.433278
2a42f6a7-e31b-4684-930d-c5dd9a6c5a4b	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "20", "search": ""}	10.82.4.151	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-08-29 14:13:57.21222
464b8084-c4c4-4c5a-b0eb-97b49b2a437e	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "20", "search": ""}	10.82.8.90	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-08-29 14:18:57.119215
21e68a24-fe5a-4cb4-968e-2dd540652673	51b800b1-ea70-47aa-b6a4-31015a753ac0	user_role_updated	user	9847172e-9046-446a-9497-463f70ff4376	{"newRole": "super_admin", "previousRole": null, "targetUserName": "Александр Тулубьев", "targetUserPhone": "+79955080600"}	10.82.8.90	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-08-29 14:19:33.246803
52449e21-23e7-4f9f-bc66-33a87e4d28d0	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "20", "search": ""}	10.82.8.90	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-08-29 14:19:34.138898
29707e7e-d950-4e7d-a41f-16009cebd79a	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "20", "search": ""}	10.82.1.205	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-08-29 15:13:20.770525
b2be1d03-e1c6-403f-b7c9-47f3e5798f2d	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "20", "search": ""}	10.82.10.43	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-08-29 15:39:31.783904
a5c7d3c7-4b5a-40fd-bae5-cde2d01f8cd4	51b800b1-ea70-47aa-b6a4-31015a753ac0	user_role_updated	user	9847172e-9046-446a-9497-463f70ff4376	{"newRole": null, "previousRole": "super_admin", "targetUserName": "Александр Тулубьев", "targetUserPhone": "+79955080600"}	10.82.10.43	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-08-29 15:39:56.786543
30d1e995-371a-4eec-9157-ccedd0a89c8c	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "20", "search": ""}	10.82.10.43	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-08-29 15:39:57.677447
5d4a2d80-a8a5-4f26-be18-b03f0e4508dd	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.9.247	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-05 15:15:30.675813
d8b8a142-973d-4592-a714-d92e265dbed4	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.12.199	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-05 15:26:47.111271
c709f917-6f0d-406a-aede-4bc96020e2a2	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.4.142	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-05 17:04:59.469313
452f34e6-9e07-4cb2-a0f7-3c7fd12b8d4b	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.4.142	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-05 17:15:14.920517
8bcd1bd9-4fb5-4d72-badc-a342a505a944	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.4.142	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-05 17:25:02.170996
846fe7b4-5345-4c1c-b550-ff12b4545118	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.9.247	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-05 17:26:31.517321
3f2a3843-3126-40fb-99c2-d875ff9c4d31	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.7.235	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-05 17:38:02.141718
0265b111-73e2-4cfe-9752-c64c02819f5a	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.4.142	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-05 17:39:41.111621
977e1d57-e9a1-4e93-90df-0cbe9be4ebe6	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.5.66	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-06 17:24:36.50021
6becc055-5d5e-449c-9a59-164d289b16f7	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.7.235	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-06 17:34:29.430417
db0ed52a-78b6-48ca-b273-886cd3f960fb	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.4.142	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Replit-Bonsai/2.147.2 (iOS 18.5)	2025-09-07 12:36:34.916993
c6b8f777-8578-4873-9c40-21bc16267ee2	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.5.66	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-07 13:12:33.292167
158225a8-b120-4e1f-a330-8f5defe173e1	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.12.199	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-07 13:21:17.013464
bdd8417f-913f-470d-84dc-2136f24ab553	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.9.247	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	2025-09-07 13:27:21.200906
d65349c9-0d6f-42fd-9dcb-d69f19a6fdeb	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "20", "search": ""}	10.82.2.129	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-07 13:49:21.885939
38056183-9845-4639-b67f-b5d5a524a818	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "20", "search": ""}	10.82.7.235	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-07 16:41:57.365798
96426919-672f-4129-8368-26e88e57b6be	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.1.169	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-08 05:56:12.472543
2667512b-e607-430c-8360-f7c96d52ae50	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.7.98	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-08 06:23:44.521571
ad91e713-de2c-4279-bfb9-10db38bc483e	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.4.142	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-08 07:12:38.155825
705f0349-1398-48bf-a974-fb4f43aee307	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.2.199	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-08 13:49:39.630925
21cbc718-28dd-42e7-bbbb-98a32a49a7ae	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.9.95	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-08 13:50:40.566789
06e0c83e-4cab-441c-8705-29c4a7481efc	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.8.207	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-08 14:02:42.707873
9bbbb0fb-afe8-4440-8dbe-450c05bbd56a	020354e8-ca8f-4fd1-aaea-75d088988202	successful_login	\N	\N	"{\\"identifier\\":\\"+79086633425\\"}"	\N	\N	2025-09-08 14:04:26.153876
bf299630-8324-4bdb-aa54-92f46a61144a	020354e8-ca8f-4fd1-aaea-75d088988202	successful_login	\N	\N	"{\\"identifier\\":\\"+79086633425\\"}"	\N	\N	2025-09-08 14:06:51.304318
4b42f257-9852-4edb-b091-5ec6add6163e	020354e8-ca8f-4fd1-aaea-75d088988202	successful_login	\N	\N	"{\\"identifier\\":\\"+79086633425\\"}"	\N	\N	2025-09-08 14:08:34.487488
f0366c73-0cf4-4ca5-9d68-127c187d62fe	51b800b1-ea70-47aa-b6a4-31015a753ac0	successful_login	\N	\N	"{\\"identifier\\":\\"+79025606199\\"}"	\N	\N	2025-09-08 14:29:39.081693
3034d740-55be-49ff-bb68-d696c91eef50	51b800b1-ea70-47aa-b6a4-31015a753ac0	users_list_viewed	admin_panel	\N	{"page": "1", "limit": "50", "search": ""}	10.82.12.174	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.0.14 Chrome/124.0.6367.119 Electron/30.0.3 Safari/537.36	2025-09-08 14:30:51.911152
77a0aab1-15c5-481c-9124-94b5e343be00	51b800b1-ea70-47aa-b6a4-31015a753ac0	getUserDocuments	\N	\N	"{\\"count\\":3}"	\N	\N	2025-09-08 15:23:33.16673
6d919480-0511-4220-a563-1135bf5dd18b	51b800b1-ea70-47aa-b6a4-31015a753ac0	error_getAdminDashboardData	\N	\N	"{\\"error\\":\\"this.storage.getTotalUsersCount is not a function\\",\\"stack\\":\\"TypeError: this.storage.getTotalUsersCount is not a function\\\\n    at AdminService.getAdminDashboardData (/home/runner/workspace/server/services/AdminService.ts:45:22)\\\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\\\\n    at async <anonymous> (/home/runner/workspace/server/routes/admin.ts:57:27)\\"}"	\N	\N	2025-09-08 17:15:57.392317
0ee6f214-81dd-42c5-88b9-b5a0a66fc756	274fa089-dec8-4bb9-b206-3ae76f78a754	successful_login	\N	\N	"{\\"identifier\\":\\"+79086636062\\"}"	\N	\N	2025-09-08 17:27:22.125291
9170fdf9-39fe-4c67-8ffa-34f4cf621a91	ac4d2f5e-d924-4559-8c7a-e39ba5ba6381	failed_login	\N	\N	"{\\"identifier\\":\\"+79086600585\\"}"	\N	\N	2025-09-08 17:28:12.383624
9db9c989-d6b9-43a2-8c67-f8a952bb2130	ac4d2f5e-d924-4559-8c7a-e39ba5ba6381	successful_login	\N	\N	"{\\"identifier\\":\\"+79086600585\\"}"	\N	\N	2025-09-08 17:28:25.27248
5cf12b65-3ce5-41bf-bdf8-9edcd6562c39	ac4d2f5e-d924-4559-8c7a-e39ba5ba6381	getUserDocuments	\N	\N	"{\\"count\\":0}"	\N	\N	2025-09-08 17:29:07.384326
e3e4b11a-a6ac-4797-af6e-8c3dcf06d131	51b800b1-ea70-47aa-b6a4-31015a753ac0	successful_login	\N	\N	"{\\"identifier\\":\\"+79025606199\\"}"	\N	\N	2025-09-08 17:31:42.932194
49d1a1a4-4f22-447b-a3bb-5c1b81056520	51b800b1-ea70-47aa-b6a4-31015a753ac0	successful_login	\N	\N	"{\\"identifier\\":\\"+79025606199\\"}"	\N	\N	2025-09-08 17:32:14.050986
814a3f16-c361-4bcf-81ea-f47713672f1f	51b800b1-ea70-47aa-b6a4-31015a753ac0	getUserDocuments	\N	\N	"{\\"count\\":3}"	\N	\N	2025-09-08 17:32:24.144174
\.


--
-- Data for Name: admin_roles; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.admin_roles (id, name, display_name, description, permissions, is_active, created_at, updated_at) FROM stdin;
88064bc1-15f1-4c6b-bd9c-d2ce663624b1	super_admin	Супер Администратор	Полный доступ ко всем функциям системы	["*"]	t	2025-08-29 13:22:19.588724	2025-08-29 13:22:19.588724
70e7184f-80e8-4a05-80b2-c5b3c0e037df	devops_admin	DevOps Администратор	Управление инфраструктурой, производительностью и системными ресурсами	["system.monitoring", "system.performance", "system.resources", "system.updates", "system.maintenance", "logs.system", "metrics.performance"]	t	2025-08-29 13:22:19.588724	2025-08-29 13:22:19.588724
3a6c1cc8-18ab-4f66-9714-fe465d249092	analytics_admin	Аналитический Администратор	Доступ к аналитике и мониторингу системы	["analytics.view", "analytics.export", "reports.generate", "metrics.view", "dashboard.analytics", "users.analytics", "transactions.analytics"]	t	2025-08-29 13:22:19.588724	2025-08-29 13:22:19.588724
dbd5d2c2-1778-48b3-8285-61fe734384f9	finance_admin	Финансовый Администратор	Управление финансовыми операциями и интеграциями	["transactions.view", "transactions.manage", "banks.manage", "payments.view", "financial.reports", "compliance.view"]	t	2025-08-29 13:22:19.588724	2025-08-29 13:22:19.588724
13800792-4899-4967-b7c8-38a6de5267c2	api_admin	API Администратор	Мониторинг API и внешних интеграций	["api.monitoring", "api.management", "integrations.view", "webhooks.manage", "api.alerts", "third_party.status"]	t	2025-08-29 13:22:19.588724	2025-08-29 13:22:19.588724
884cd65d-ab7f-491c-a5ad-d61a93ef4f47	security_admin	Администратор Безопасности	Управление безопасностью и защитой от угроз	["security.monitoring", "auth.logs", "security.alerts", "ip.analysis", "threats.analysis", "access.control", "audit.logs"]	t	2025-08-29 13:22:19.588724	2025-08-29 13:22:19.588724
\.


--
-- Data for Name: ai_chat_sessions; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.ai_chat_sessions (id, user_id, session_id, messages, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: bank_connections; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.bank_connections (id, user_id, bank_code, bank_name, access_token, refresh_token, consent_id, status, last_sync_at, created_at) FROM stdin;
\.


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.budgets (id, user_id, category, monthly_limit, current_spent, month, year, is_active) FROM stdin;
\.


--
-- Data for Name: document_types; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.document_types (id, name, display_name, description, required_fields, is_active, created_at, updated_at) FROM stdin;
passport	passport	Паспорт РФ	Общегражданский паспорт Российской Федерации	[]	t	2025-09-05 06:33:30.703435	2025-09-05 06:33:30.703435
inn	inn	ИНН	Свидетельство о постановке на учёт в налоговом органе	[]	t	2025-09-05 06:33:30.703435	2025-09-05 06:33:30.703435
snils	snils	СНИЛС	Страховое свидетельство обязательного пенсионного страхования	[]	t	2025-09-05 06:33:30.703435	2025-09-05 06:33:30.703435
driver_license	driver_license	Водительское удостоверение	Водительское удостоверение РФ	[]	t	2025-09-05 06:33:30.703435	2025-09-05 06:33:30.703435
birth_certificate	birth_certificate	Свидетельство о рождении	Свидетельство о рождении	[]	t	2025-09-05 06:33:30.703435	2025-09-05 06:33:30.703435
military_id	military_id	Военный билет	Военный билет или приписное свидетельство	[]	t	2025-09-05 06:33:30.703435	2025-09-05 06:33:30.703435
foreign_passport	foreign_passport	Загранпаспорт	Паспорт гражданина РФ для выезда за границу	[]	t	2025-09-05 06:33:30.703435	2025-09-05 06:33:30.703435
work_permit	work_permit	Разрешение на работу	Разрешение на работу для иностранных граждан	[]	t	2025-09-05 06:33:30.703435	2025-09-05 06:33:30.703435
\.


--
-- Data for Name: document_verification_history; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.document_verification_history (id, document_id, previous_status, new_status, changed_by, change_reason, metadata, created_at) FROM stdin;
b34de7c5-4ee0-4530-ad7a-b7f4db97bf14	9bff2eba-0a00-4436-8c79-cf05fa7b34d4	uploaded	pending	51b800b1-ea70-47aa-b6a4-31015a753ac0	Отправлено на проверку пользователем	\N	2025-09-05 17:32:15.553501
f2dd1ddf-9d95-4aaf-a043-d4c6e7e935f2	9bff2eba-0a00-4436-8c79-cf05fa7b34d4	pending	verified	51b800b1-ea70-47aa-b6a4-31015a753ac0	Документ проверен и утвержден администратором	\N	2025-09-05 17:32:34.462212
83b1d0c6-687f-48a1-b52e-be873cfc7393	3aa3a7c3-8039-40aa-a568-efbf4d9be05a	uploaded	pending	51b800b1-ea70-47aa-b6a4-31015a753ac0	Отправлено на проверку пользователем	\N	2025-09-08 06:06:51.698764
ae443116-0d49-4182-9bd6-3a1b931b79a3	3aa3a7c3-8039-40aa-a568-efbf4d9be05a	pending	verified	51b800b1-ea70-47aa-b6a4-31015a753ac0	Документ проверен и утвержден администратором	\N	2025-09-08 06:07:06.889418
4da182af-03f3-4631-9f56-b7464854a295	3acb6dde-1d59-46f9-8f04-fc0519d7325c	uploaded	pending	51b800b1-ea70-47aa-b6a4-31015a753ac0	Отправлено на проверку пользователем	\N	2025-09-08 07:08:16.63449
7e9054d3-d13d-4fc6-9b40-91f6679fcd87	3acb6dde-1d59-46f9-8f04-fc0519d7325c	pending	verified	51b800b1-ea70-47aa-b6a4-31015a753ac0	Документ проверен и утвержден администратором	\N	2025-09-08 07:08:34.564899
7e4c8a8c-2381-4823-a4c1-8bfe373daee1	7a1e4d8d-1f95-4742-acf5-ee3be84e775a	uploaded	pending	020354e8-ca8f-4fd1-aaea-75d088988202	Отправлено на проверку пользователем	\N	2025-09-08 12:57:08.948683
16a2bb2d-6a33-4ad5-bb07-f34f489f42ff	7a1e4d8d-1f95-4742-acf5-ee3be84e775a	pending	verified	51b800b1-ea70-47aa-b6a4-31015a753ac0	Документ проверен и утвержден администратором	\N	2025-09-08 12:58:39.222119
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.documents (id, user_id, document_type_id, file_name, file_path, file_size, mime_type, status, verification_method, extracted_data, verification_notes, verified_by, verified_at, rejection_reason, expires_at, is_active, created_at, updated_at, checksum) FROM stdin;
7a1e4d8d-1f95-4742-acf5-ee3be84e775a	020354e8-ca8f-4fd1-aaea-75d088988202	foreign_passport	pasport001.jpg	doc_fbc0dd06_1757325421872_7937a5ce.jpg.enc	269406	image/jpeg	verified	\N	\N	Утверждено администратором	51b800b1-ea70-47aa-b6a4-31015a753ac0	2025-09-08 09:58:39.005	\N	\N	t	2025-09-08 12:57:01.927716	2025-09-08 09:58:39.005	e29c84428008bf194eb854add3c763cb5a01a51cf87f604c72c46c826fa411de
9bff2eba-0a00-4436-8c79-cf05fa7b34d4	51b800b1-ea70-47aa-b6a4-31015a753ac0	passport	Tulubyev.jpg	doc_aced6126_1757082723568_d93d3e23.jpg.enc	534682	image/jpeg	verified	\N	\N	Утверждено администратором	51b800b1-ea70-47aa-b6a4-31015a753ac0	2025-09-05 14:32:34.209	\N	\N	t	2025-09-05 17:32:03.653754	2025-09-05 14:32:34.209	339a967b532730f5a4e2784d96903b53ca5e1498c3ec01bbbfc61a988f2d87b7
3aa3a7c3-8039-40aa-a568-efbf4d9be05a	51b800b1-ea70-47aa-b6a4-31015a753ac0	foreign_passport	Passeporte Tulubyev.jpg	doc_755cef8c_1757300804015_7fe17924.jpg.enc	190125	image/jpeg	verified	\N	\N	Утверждено администратором	51b800b1-ea70-47aa-b6a4-31015a753ac0	2025-09-08 03:07:06.653	\N	\N	t	2025-09-08 06:06:44.09548	2025-09-08 03:07:06.653	37ba18d11b41bfb553ac35068d859dbcbdc7e7b444aab9c577f7b5d8aac4fbc1
3acb6dde-1d59-46f9-8f04-fc0519d7325c	51b800b1-ea70-47aa-b6a4-31015a753ac0	driver_license	photo_2023-12-27_12-40-13.jpg	doc_4a6a3099_1757304486111_22e46857.jpg.enc	200422	image/jpeg	verified	\N	\N	Утверждено администратором	51b800b1-ea70-47aa-b6a4-31015a753ac0	2025-09-08 04:08:34.408	\N	\N	t	2025-09-08 07:08:06.10738	2025-09-08 04:08:34.408	0ab9725648f182bfc107fcee8132b5b3048c9ba3e5a7fc39629bb9a3c04c780a
\.


--
-- Data for Name: family_group_members; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.family_group_members (id, group_id, user_id, role, permissions, joined_at) FROM stdin;
\.


--
-- Data for Name: family_groups; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.family_groups (id, name, admin_user_id, invite_code, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: savings_goals; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.savings_goals (id, user_id, name, description, target_amount, current_amount, target_date, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.system_settings (id, key, value, category, description, is_editable, updated_by, updated_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.transactions (id, user_id, account_id, external_transaction_id, amount, currency, description, merchant, category, subcategory, transaction_date, processing_date, is_recurring, metadata) FROM stdin;
\.


--
-- Data for Name: user_verifications; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.user_verifications (id, user_id, current_level, phone_verified, phone_verified_at, email_verified, email_verified_at, documents_verified, documents_verified_at, gosuslugi_verified, gosuslugi_verified_at, banking_verified, banking_verified_at, last_upgrade_attempt, next_upgrade_eligible, monthly_usage, usage_reset_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.users (id, email, password_hash, first_name, last_name, phone, is_verified, created_at, updated_at, two_factor_enabled, two_factor_secret, two_factor_backup_codes, sms_code_expiry, sms_code, role, plan_type, middle_name, birth_date, gender, snils, inn, esia_oid, verification_method, admin_role, profile_image_url, is_email_verified, is_phone_verified, verification_level_2, verification_level_3) FROM stdin;
419e7684-672b-4217-8f39-f243dff990dd	test.esia@gosuslugi.ru		Александр	Тестовый	+79001234567	t	2025-08-29 11:49:18.535294	2025-08-29 10:38:08.249	f	\N	\N	\N	\N	personal	free	Владимирович	1985-03-15 00:00:00	\N	123-456-789 01	123456789012	mock_oid_working	esia	devops_admin	\N	f	f	f	f
9847172e-9046-446a-9497-463f70ff4376	alt@baikal-internet.ru	$2b$12$Kn1Q8hyjynUKEK5/o4jq2.dAxcX8fDFnpf8jhEGHmGmEs6okWSDZ.	Александр	Тулубьев	+79955080600	f	2025-08-29 09:50:46.178018	2025-08-29 12:39:56.587	t	LU7F4NJZJJYWS3ZJH5GF25Z2OV6UW5DOK54WC4DELM4HQ2KTGU7A	{71042693,67912855,32431766,32986239,95912984,60355998,44548709,21406327,84724589,95039329}	\N	\N	personal	free	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f
9e7cee42-c820-4748-9284-d9e69a7ed682	user1756477020945@gosuslugi.ru	$2b$12$NcC5aalPw6Pq8zzepLpHsON84T6yWXl1es6oCEOC9ex0fyjMOED.6	Александр	Иванов	+7-900-123-45-67	t	2025-08-29 17:17:02.506327	2025-08-29 17:17:02.506327	f	\N	\N	\N	\N	personal	free	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f
274fa089-dec8-4bb9-b206-3ae76f78a754	\N	$2b$12$OYH6f9KQQ4pYcHlc0SvrXesg5lkRXzMAPto4fyGOolCkBe0Esc0c.	Сергей	Сидоров	+79086636062	f	2025-08-29 16:09:47.208219	2025-08-29 16:09:47.208219	f	\N	\N	\N	\N	personal	free	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f
ac4d2f5e-d924-4559-8c7a-e39ba5ba6381	alt@amazonka.biz	$2b$12$ovFSnkQuN8Fy.8iPrlIpCOV6mK5Ip5aApX.SF.TJxGcoWZEjcfyFa	Николай	Лухнев	+79086600585	f	2025-09-07 02:31:52.03722	2025-09-07 02:31:52.03722	f	\N	\N	\N	\N	personal	free	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	f
51b800b1-ea70-47aa-b6a4-31015a753ac0	alt@in2sys.ru	$2b$12$WOA.kaMoNtQwhmnb4aS/NuoCIj9XJT5VXWjE5TCNNHn265XXNp1MO	Александр	Тулубьев	+79025606199	t	2025-08-29 06:08:33.502392	2025-09-08 04:08:35.065	f	\N	\N	\N	\N	admin	free	\N	\N	\N	\N	\N	\N	docs	super_admin	/uploads/profile-images/51b800b1-ea70-47aa-b6a4-31015a753ac0_434c9761-0a9a-4399-9a4c-5e8d74b5ffd4.jpg	t	f	t	f
020354e8-ca8f-4fd1-aaea-75d088988202	\N	$2b$12$SidoH7OPXXoASOVymngNmuS0EePSywe8HvabYtlHeH8EAx3A/Dy66	Лидия	Сидорова	+79086633425	f	2025-09-03 06:25:23.711884	2025-09-08 09:56:40.1	f	\N	\N	\N	\N	personal	free	\N	\N	\N	\N	\N	\N	\N	\N	/uploads/profile-images/020354e8-ca8f-4fd1-aaea-75d088988202_5032a9ba-599c-4646-81ce-df2ac374e462.jpg	f	f	f	f
\.


--
-- Data for Name: verification_codes; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.verification_codes (id, user_id, type, code, target, attempts, max_attempts, is_used, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: verification_levels; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.verification_levels (id, level, name, description, monthly_limit, balance_limit, required_verifications, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: verification_requests; Type: TABLE DATA; Schema: public; Owner: replit
--

COPY public.verification_requests (id, user_id, requested_level, current_level, status, submitted_data, verification_results, reviewed_by, review_notes, rejection_reason, approved_at, rejected_at, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_roles admin_roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_name_unique UNIQUE (name);


--
-- Name: admin_roles admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (id);


--
-- Name: ai_chat_sessions ai_chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.ai_chat_sessions
    ADD CONSTRAINT ai_chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: bank_connections bank_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.bank_connections
    ADD CONSTRAINT bank_connections_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);


--
-- Name: document_verification_history document_verification_history_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.document_verification_history
    ADD CONSTRAINT document_verification_history_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: family_group_members family_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.family_group_members
    ADD CONSTRAINT family_group_members_pkey PRIMARY KEY (id);


--
-- Name: family_groups family_groups_invite_code_unique; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.family_groups
    ADD CONSTRAINT family_groups_invite_code_unique UNIQUE (invite_code);


--
-- Name: family_groups family_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.family_groups
    ADD CONSTRAINT family_groups_pkey PRIMARY KEY (id);


--
-- Name: savings_goals savings_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.savings_goals
    ADD CONSTRAINT savings_goals_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_unique UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_verifications user_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.user_verifications
    ADD CONSTRAINT user_verifications_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_esia_oid_unique; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_esia_oid_unique UNIQUE (esia_oid);


--
-- Name: users users_inn_unique; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_inn_unique UNIQUE (inn);


--
-- Name: users users_phone_unique; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_unique UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_snils_unique; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_snils_unique UNIQUE (snils);


--
-- Name: verification_codes verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);


--
-- Name: verification_levels verification_levels_level_unique; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.verification_levels
    ADD CONSTRAINT verification_levels_level_unique UNIQUE (level);


--
-- Name: verification_levels verification_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.verification_levels
    ADD CONSTRAINT verification_levels_pkey PRIMARY KEY (id);


--
-- Name: verification_requests verification_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_pkey PRIMARY KEY (id);


--
-- Name: account_transaction_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX account_transaction_idx ON public.transactions USING btree (account_id);


--
-- Name: action_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX action_idx ON public.admin_logs USING btree (action);


--
-- Name: admin_logs_created_at_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX admin_logs_created_at_idx ON public.admin_logs USING btree (created_at);


--
-- Name: admin_user_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX admin_user_idx ON public.admin_logs USING btree (admin_user_id);


--
-- Name: bank_account_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX bank_account_idx ON public.accounts USING btree (bank_connection_id);


--
-- Name: category_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX category_idx ON public.transactions USING btree (category);


--
-- Name: email_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX email_idx ON public.users USING btree (email);


--
-- Name: group_user_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX group_user_idx ON public.family_group_members USING btree (group_id, user_id);


--
-- Name: system_settings_category_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX system_settings_category_idx ON public.system_settings USING btree (category);


--
-- Name: user_account_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX user_account_idx ON public.accounts USING btree (user_id);


--
-- Name: user_bank_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX user_bank_idx ON public.bank_connections USING btree (user_id, bank_code);


--
-- Name: user_budget_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX user_budget_idx ON public.budgets USING btree (user_id, month, year);


--
-- Name: user_code_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX user_code_idx ON public.verification_codes USING btree (user_id, type);


--
-- Name: user_goal_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX user_goal_idx ON public.savings_goals USING btree (user_id);


--
-- Name: user_request_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX user_request_idx ON public.verification_requests USING btree (user_id);


--
-- Name: user_session_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX user_session_idx ON public.ai_chat_sessions USING btree (user_id);


--
-- Name: user_transaction_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX user_transaction_idx ON public.transactions USING btree (user_id, transaction_date);


--
-- Name: user_verification_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX user_verification_idx ON public.user_verifications USING btree (user_id);


--
-- Name: verification_codes_expire_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX verification_codes_expire_idx ON public.verification_codes USING btree (expires_at);


--
-- Name: verification_request_status_idx; Type: INDEX; Schema: public; Owner: replit
--

CREATE INDEX verification_request_status_idx ON public.verification_requests USING btree (status);


--
-- Name: accounts accounts_bank_connection_id_bank_connections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_bank_connection_id_bank_connections_id_fk FOREIGN KEY (bank_connection_id) REFERENCES public.bank_connections(id);


--
-- Name: accounts accounts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: admin_logs admin_logs_admin_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_admin_user_id_users_id_fk FOREIGN KEY (admin_user_id) REFERENCES public.users(id);


--
-- Name: ai_chat_sessions ai_chat_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.ai_chat_sessions
    ADD CONSTRAINT ai_chat_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bank_connections bank_connections_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.bank_connections
    ADD CONSTRAINT bank_connections_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: budgets budgets_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: document_verification_history document_verification_history_document_id_documents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.document_verification_history
    ADD CONSTRAINT document_verification_history_document_id_documents_id_fk FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- Name: documents documents_document_type_id_document_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_document_type_id_document_types_id_fk FOREIGN KEY (document_type_id) REFERENCES public.document_types(id);


--
-- Name: family_group_members family_group_members_group_id_family_groups_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.family_group_members
    ADD CONSTRAINT family_group_members_group_id_family_groups_id_fk FOREIGN KEY (group_id) REFERENCES public.family_groups(id);


--
-- Name: family_group_members family_group_members_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.family_group_members
    ADD CONSTRAINT family_group_members_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: family_groups family_groups_admin_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.family_groups
    ADD CONSTRAINT family_groups_admin_user_id_users_id_fk FOREIGN KEY (admin_user_id) REFERENCES public.users(id);


--
-- Name: savings_goals savings_goals_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.savings_goals
    ADD CONSTRAINT savings_goals_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: system_settings system_settings_updated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_users_id_fk FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: transactions transactions_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: transactions transactions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_verifications user_verifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.user_verifications
    ADD CONSTRAINT user_verifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: verification_codes verification_codes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: verification_requests verification_requests_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: verification_requests verification_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: replit
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

