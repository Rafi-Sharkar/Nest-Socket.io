-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('image', 'docs', 'link', 'document', 'any', 'video', 'audio');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "fileInstanceId" TEXT;

-- CreateTable
CREATE TABLE "file_instances" (
    "id" TEXT NOT NULL,
    "filename" TEXT,
    "originalFilename" TEXT,
    "path" TEXT,
    "url" TEXT,
    "fileType" "FileType" NOT NULL DEFAULT 'any',
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_instances_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_fileInstanceId_fkey" FOREIGN KEY ("fileInstanceId") REFERENCES "file_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
