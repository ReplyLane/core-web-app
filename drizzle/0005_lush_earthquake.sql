CREATE TABLE `review_invites` (
	`code_hash` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`max_claims` integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_trials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`instagram_id` text NOT NULL,
	`invite_hash` text NOT NULL,
	`starts_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`dm_limit` integer DEFAULT 25 NOT NULL,
	`used` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_trials_instagram_id_unique` ON `review_trials` (`instagram_id`);--> statement-breakpoint
CREATE INDEX `idx_review_trials_invite` ON `review_trials` (`invite_hash`);