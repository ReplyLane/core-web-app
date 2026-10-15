ALTER TABLE `activities` ADD `media_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `sender_username` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `matched_keyword` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `reply_text` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `accepted_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `instagram_message_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_activities_campaign` ON `activities` (`user_id`,`campaign_id`,`created_at`);