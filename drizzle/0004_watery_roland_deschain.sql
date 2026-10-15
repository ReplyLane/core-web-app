CREATE TABLE `owner_trials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`instagram_id` text NOT NULL,
	`starts_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`dm_limit` integer DEFAULT 25 NOT NULL,
	`used` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owner_trials_instagram_id_unique` ON `owner_trials` (`instagram_id`);