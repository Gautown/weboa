declare module "ali-oss" {
  interface OSSOptions {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    stsToken?: string;
    secure?: boolean;
    endpoint?: string;
    cname?: boolean;
  }

  interface PutObjectOptions {
    headers?: Record<string, string>;
    meta?: Record<string, string>;
    mime?: string;
    timeout?: number;
  }

  interface ListObjectsResult {
    objects: Array<{
      name: string;
      lastModified: string;
      etag: string;
      type: string;
      size: number;
      storageClass: string;
    }>;
    prefixes: string[];
    isTruncated: boolean;
    nextMarker?: string;
  }

  interface PutObjectResult {
    name: string;
    url: string;
    res: {
      status: number;
      headers: Record<string, string>;
      size: number;
      rt: number;
    };
  }

  interface SignatureUrlOptions {
    method?: 'GET' | 'PUT' | 'POST' | 'DELETE';
    expires?: number;
    process?: string;
    response?: {
      'content-type'?: string;
      'content-disposition'?: string;
      'cache-control'?: string;
    };
  }

  class OSS {
    constructor(options: OSSOptions);
    
    // 文件操作
    put(name: string, file: File | Buffer | string, options?: PutObjectOptions): Promise<PutObjectResult>;
    get(name: string): Promise<{ content: Buffer; res: any }>;
    delete(name: string): Promise<any>;
    list(query: any): Promise<ListObjectsResult>;
    
    // 签名URL
    signatureUrl(name: string, options?: SignatureUrlOptions): string;
    
    // 分片上传
    multipartUpload(name: string, file: File, options?: any): Promise<any>;
    
    // 其他方法
    head(name: string): Promise<any>;
    copy(name: string, sourceName: string): Promise<any>;
  }

  export default OSS;
}