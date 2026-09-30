ALTER TABLE `offer_revisions` ADD `author` text DEFAULT 'pipeline' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` ADD `reason` text;--> statement-breakpoint
ALTER TABLE `reviews` ADD `reason_code` text;