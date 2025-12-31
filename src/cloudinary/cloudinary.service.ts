import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: "djwtehyeg",
      api_key: "168238965581861",
      api_secret: "e2UOsy_EKwChcKLT0qFQ-hBVPfI",
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'chat-app',
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
          public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );

      upload.end(file.buffer);
    });
  }

  async deleteFile(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }

  async deleteFileByUrl(url: string): Promise<any> {
    // Extract public_id from Cloudinary URL
    const publicId = url
      .split('/')
      .slice(-1)[0]
      .split('.')[0];

    return this.deleteFile(publicId);
  }

  getUrl(publicId: string, options: any = {}): string {
    return cloudinary.url(publicId, {
      secure: true,
      ...options,
    });
  }
}
