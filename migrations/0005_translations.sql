CREATE TABLE `translations` (
	`hash` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`zh` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
