ALTER TABLE `subscriptions` ADD `current_start` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `next_charge_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `payment_status` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `payment_event_at` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `subscriptions` SET `payment_event_at` = `event_at` WHERE `payment_id` <> '';
--> statement-breakpoint
UPDATE `subscriptions` SET `payment_status` = CASE WHEN `status` = 'refunded' THEN 'refunded' ELSE 'captured' END WHERE `payment_id` <> '';
