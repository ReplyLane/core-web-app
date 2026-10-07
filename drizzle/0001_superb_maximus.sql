CREATE TABLE `opt_outs` (
	`user_id` text NOT NULL,
	`recipient` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `recipient`)
);
--> statement-breakpoint
CREATE TABLE `webhook_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `activities` ADD `sender_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `attempt_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `event_at` integer DEFAULT 0 NOT NULL;