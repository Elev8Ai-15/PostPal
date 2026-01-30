CREATE TABLE `notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pushEnabled` boolean NOT NULL DEFAULT true,
	`emailEnabled` boolean NOT NULL DEFAULT false,
	`reminderMinutesBefore` int NOT NULL DEFAULT 30,
	`dailyDigestEnabled` boolean NOT NULL DEFAULT false,
	`dailyDigestTime` varchar(10) DEFAULT '09:00',
	`expoPushToken` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `post_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`contentType` enum('social','blog','newsletter','video') NOT NULL,
	`platform` enum('instagram','twitter','linkedin','facebook','youtube','email','blog'),
	`recurrenceType` enum('daily','weekly','biweekly','monthly') NOT NULL,
	`recurrenceDays` varchar(50),
	`recurrenceTime` varchar(10),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastGeneratedAt` timestamp,
	`nextScheduledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `post_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `reminderEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `reminderMinutesBefore` int DEFAULT 30;--> statement-breakpoint
ALTER TABLE `posts` ADD `reminderSent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `templateId` int;