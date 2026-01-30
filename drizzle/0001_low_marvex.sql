CREATE TABLE `analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` timestamp NOT NULL,
	`followers` int DEFAULT 0,
	`impressions` int DEFAULT 0,
	`engagement` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`platform` enum('instagram','twitter','linkedin','facebook','youtube','all') NOT NULL DEFAULT 'all',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`contentType` enum('social','blog','newsletter','video') NOT NULL,
	`platform` enum('instagram','twitter','linkedin','facebook','youtube','email','blog'),
	`status` enum('draft','pending','approved','scheduled','published','rejected') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`imageUrl` text,
	`aiGenerated` boolean NOT NULL DEFAULT false,
	`engagementScore` int DEFAULT 0,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('instagram','twitter','linkedin','facebook','youtube') NOT NULL,
	`accountName` varchar(255),
	`accountId` varchar(255),
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`isConnected` boolean NOT NULL DEFAULT true,
	`followerCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text,
	`goals` text,
	`contentPillars` text,
	`targetAudience` text,
	`recommendations` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategies_id` PRIMARY KEY(`id`)
);
