CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trainers` (
	`id` text PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_version` integer DEFAULT 1 NOT NULL,
	`tier` text DEFAULT 'registered' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trainers_handle_unique` ON `trainers` (`handle`);