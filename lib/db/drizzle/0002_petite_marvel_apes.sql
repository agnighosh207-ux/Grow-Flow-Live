ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "reminder_sent_3_day";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "reminder_sent_7_day";