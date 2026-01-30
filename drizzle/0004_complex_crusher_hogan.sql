CREATE TABLE `auto_responders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`triggerType` enum('keyword','first_message','mention','all') NOT NULL,
	`triggerKeywords` text,
	`platform` enum('instagram','twitter','linkedin','facebook','youtube','all') NOT NULL DEFAULT 'all',
	`messageType` enum('dm','comment','mention','all') NOT NULL DEFAULT 'all',
	`responseContent` text NOT NULL,
	`delaySeconds` int NOT NULL DEFAULT 0,
	`useCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `auto_responders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inbox_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`socialAccountId` int NOT NULL,
	`platform` enum('instagram','twitter','linkedin','facebook','youtube') NOT NULL,
	`messageType` enum('dm','comment','mention','reply') NOT NULL,
	`externalId` varchar(255),
	`senderName` varchar(255),
	`senderUsername` varchar(255),
	`senderAvatar` text,
	`content` text NOT NULL,
	`postId` varchar(255),
	`postContent` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`isArchived` boolean NOT NULL DEFAULT false,
	`isStarred` boolean NOT NULL DEFAULT false,
	`sentiment` enum('positive','neutral','negative'),
	`repliedAt` timestamp,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inbox_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`shortcut` varchar(50),
	`useCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_replies_id` PRIMARY KEY(`id`)
);
