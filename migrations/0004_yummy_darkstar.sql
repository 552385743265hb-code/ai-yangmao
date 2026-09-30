CREATE TABLE `deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`channel` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payload` text NOT NULL,
	`error` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deliveries_fingerprint_unique` ON `deliveries` (`fingerprint`);