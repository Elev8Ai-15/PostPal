CREATE TABLE `campaign_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`postId` int NOT NULL,
	`platform` enum('instagram','twitter','linkedin','facebook','youtube','tiktok','reddit') NOT NULL,
	`impressions` int DEFAULT 0,
	`engagement` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`likes` int DEFAULT 0,
	`comments` int DEFAULT 0,
	`shares` int DEFAULT 0,
	`performanceScore` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','active','completed','paused') NOT NULL DEFAULT 'draft',
	`startDate` timestamp,
	`endDate` timestamp,
	`totalImpressions` int DEFAULT 0,
	`totalEngagement` int DEFAULT 0,
	`totalClicks` int DEFAULT 0,
	`bestPlatform` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `post_templates` MODIFY COLUMN `platform` enum('instagram','twitter','linkedin','facebook','youtube','tiktok','reddit','email','blog');--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `platform` enum('instagram','twitter','linkedin','facebook','youtube','tiktok','reddit','email','blog');