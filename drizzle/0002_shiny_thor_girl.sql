CREATE TABLE `auth_identities` (
	`provider` text NOT NULL,
	`subject` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`provider`, `subject`)
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_expiry` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `auth_users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_pending` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`intent` text NOT NULL,
	`browser_hash` text NOT NULL,
	`encrypted_data` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD `provider` text DEFAULT 'instagram' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `page_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `picture_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `followers` integer;--> statement-breakpoint
ALTER TABLE `accounts` ADD `media_count` integer;--> statement-breakpoint
ALTER TABLE `oauth_states` ADD `provider` text DEFAULT 'instagram' NOT NULL;--> statement-breakpoint
ALTER TABLE `oauth_states` ADD `intent` text DEFAULT 'connect' NOT NULL;--> statement-breakpoint
ALTER TABLE `oauth_states` ADD `browser_hash` text DEFAULT '' NOT NULL;