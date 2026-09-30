CREATE TABLE `offer_proposals` (
	`offer_id` text PRIMARY KEY NOT NULL,
	`candidate` text NOT NULL,
	`diff` text NOT NULL,
	`detected_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `offer_revisions` ADD `evidence_before` text;--> statement-breakpoint
ALTER TABLE `offer_revisions` ADD `evidence_after` text;