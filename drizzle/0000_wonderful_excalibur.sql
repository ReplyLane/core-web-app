CREATE TABLE `accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`instagram_id` text NOT NULL,
	`username` text NOT NULL,
	`encrypted_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`next_send_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_accounts_instagram` ON `accounts` (`instagram_id`);--> statement-breakpoint
CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`campaign_id` text DEFAULT '' NOT NULL,
	`campaign_name` text NOT NULL,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`test` integer DEFAULT 0 NOT NULL,
	`recipient` text DEFAULT '' NOT NULL,
	`trigger` text DEFAULT '' NOT NULL,
	`event_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activities_user` ON `activities` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activities_status` ON `activities` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`trigger` text NOT NULL,
	`keywords` text NOT NULL,
	`message` text NOT NULL,
	`link` text DEFAULT '' NOT NULL,
	`media_id` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_campaigns_user` ON `campaigns` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`interval` text NOT NULL,
	`status` text NOT NULL,
	`current_end` integer DEFAULT 0 NOT NULL,
	`cancel_at_end` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`payment_id` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subscriptions_provider` ON `subscriptions` (`subscription_id`);--> statement-breakpoint
CREATE TABLE `usage` (
	`user_id` text NOT NULL,
	`month` text NOT NULL,
	`sent` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `month`)
);
