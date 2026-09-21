CREATE TABLE `gacha_draws` (
	`trainer_id` text NOT NULL,
	`date` text NOT NULL,
	`seed_version` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`trainer_id`, `date`),
	FOREIGN KEY (`trainer_id`) REFERENCES `trainers`(`id`) ON UPDATE no action ON DELETE cascade
);
