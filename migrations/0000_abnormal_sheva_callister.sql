CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`origin` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`raw` text,
	`status` text DEFAULT 'new' NOT NULL,
	`offer_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_url_uq` ON `leads` (`url`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`offer_id` text NOT NULL,
	`stage` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`message_id` text,
	`sent_at` text,
	FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_uq` ON `notifications` (`offer_id`,`stage`,`channel`);--> statement-breakpoint
CREATE TABLE `offer_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`offer_id` text NOT NULL,
	`at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`diff` text NOT NULL,
	`evidence_hash` text,
	FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `revisions_offer_idx` ON `offer_revisions` (`offer_id`);--> statement-breakpoint
CREATE TABLE `offers` (
	`id` text PRIMARY KEY NOT NULL,
	`platform_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`modalities` text NOT NULL,
	`claim_method` text NOT NULL,
	`requirements` text NOT NULL,
	`audience` text DEFAULT 'unclear' NOT NULL,
	`value_text` text NOT NULL,
	`usd_estimate` real,
	`claim_start` text,
	`claim_end` text,
	`end_kind` text NOT NULL,
	`credit_validity` text,
	`source_tz` text DEFAULT 'UTC' NOT NULL,
	`published_at` text,
	`discovered_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`last_verified_at` text,
	`verify_result` text,
	`withdrawn_at` text,
	`withdrawn_reason` text,
	`review_state` text DEFAULT 'pending' NOT NULL,
	`evidence` text NOT NULL,
	`steps` text DEFAULT '[]' NOT NULL,
	`first_channel` text,
	`source_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`platform_id`) REFERENCES `platforms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `offers_review_idx` ON `offers` (`review_state`);--> statement-breakpoint
CREATE INDEX `offers_platform_idx` ON `offers` (`platform_id`);--> statement-breakpoint
CREATE TABLE `platforms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`site` text,
	`x_handles` text DEFAULT '[]' NOT NULL,
	`staff_handles` text DEFAULT '[]' NOT NULL,
	`wechat` text,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`offer_id` text NOT NULL,
	`action` text NOT NULL,
	`edited_fields` text DEFAULT '[]' NOT NULL,
	`reviewer` text,
	`at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`started_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`finished_at` text,
	`ok` integer,
	`stats` text DEFAULT '{}' NOT NULL,
	`tokens` integer DEFAULT 0 NOT NULL,
	`cost_cny` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `runs_kind_idx` ON `runs` (`kind`,`started_at`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` text NOT NULL,
	`url` text NOT NULL,
	`hash` text NOT NULL,
	`text` text,
	`fetched_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `snapshots_source_idx` ON `snapshots` (`source_id`,`fetched_at`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`platform_id` text,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`tier` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`auto_publish` integer DEFAULT false NOT NULL,
	`clean_streak` integer DEFAULT 0 NOT NULL,
	`last_ok_at` text,
	`last_error` text,
	`fail_streak` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`platform_id`) REFERENCES `platforms`(`id`) ON UPDATE no action ON DELETE no action
);
