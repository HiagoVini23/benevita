-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_published_by_id_fkey";

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
