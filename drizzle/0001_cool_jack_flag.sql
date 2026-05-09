CREATE TABLE `reel_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storyId` varchar(128) NOT NULL,
	`storyTitle` text NOT NULL,
	`scenes` json NOT NULL,
	`sceneCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reel_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `reel_cache_storyId_unique` UNIQUE(`storyId`)
);
--> statement-breakpoint
CREATE TABLE `story_analysis_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storyId` varchar(128) NOT NULL,
	`analysis` json NOT NULL,
	`characterBible` json,
	`courtroomDialogue` json,
	`verdict` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `story_analysis_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `story_analysis_cache_storyId_unique` UNIQUE(`storyId`)
);
