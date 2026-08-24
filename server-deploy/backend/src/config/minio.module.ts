import { Global, Module, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';

export const MINIO_CLIENT = 'MINIO_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: MINIO_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const client = new MinioClient({
          endPoint: config.get<string>('MINIO_ENDPOINT', 'localhost'),
          port: parseInt(config.get<string>('MINIO_PORT', '9000'), 10),
          useSSL: config.get<string>('MINIO_USE_SSL') === 'true',
          accessKey: config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
          secretKey: config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
        });
        return client;
      },
    },
  ],
  exports: [MINIO_CLIENT],
})
export class MinioModule implements OnModuleInit {
  constructor(@Inject(MINIO_CLIENT) private readonly client: MinioClient) {}
  async onModuleInit() {
    const bucket = process.env.MINIO_BUCKET || 'health';
    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket, 'us-east-1');
        console.log(`✅ MinIO bucket created: ${bucket}`);
      } else {
        console.log(`✅ MinIO bucket exists: ${bucket}`);
      }
      // 设置公共读
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };
      await this.client.setBucketPolicy(bucket, JSON.stringify(policy));
    } catch (e: any) {
      console.warn(`⚠️ MinIO init warning: ${e.message}`);
    }
  }
}
