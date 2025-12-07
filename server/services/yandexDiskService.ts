import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

interface YandexDiskFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  modified?: string;
}

interface YandexDiskUploadResponse {
  href: string;
  method: string;
  templated: boolean;
}

class YandexDiskService {
  private token: string;
  private folderId: string;
  private client: AxiosInstance;
  private baseUrl = 'https://cloud-api.yandex.net/v1/disk';
  private isConfigured = false;

  constructor() {
    this.token = process.env.YANDEX_DISK_TOKEN || '';
    this.folderId = process.env.YANDEX_DISK_FOLDER_ID || 'app:/recordings';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `OAuth ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    this.isConfigured = !!this.token;
    
    if (this.isConfigured) {
      logger.info('✅ YandexDiskService: Configured and ready');
    } else {
      logger.warn('⚠️ YandexDiskService: Not configured (YANDEX_DISK_TOKEN not found)');
    }
  }

  /**
   * Check if service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get connection status with quota info
   */
  async getStatus(): Promise<{ connected: boolean; totalSpace: number; usedSpace: number; quotaPercent: number }> {
    try {
      if (!this.isConfigured) {
        return {
          connected: false,
          totalSpace: 0,
          usedSpace: 0,
          quotaPercent: 0,
        };
      }

      const response = await this.client.get('/');
      const { total_space, used_space } = response.data;
      
      const quotaPercent = (used_space / total_space) * 100;
      
      return {
        connected: true,
        totalSpace: total_space,
        usedSpace: used_space,
        quotaPercent,
      };
    } catch (error) {
      logger.error('Error getting Yandex.Disk status:', error);
      return {
        connected: false,
        totalSpace: 0,
        usedSpace: 0,
        quotaPercent: 0,
      };
    }
  }

  /**
   * Create folder if it doesn't exist
   */
  async ensureFolder(path: string): Promise<boolean> {
    try {
      if (!this.isConfigured) return false;

      // Try to get folder info
      await this.client.get(`/resources?path=${encodeURIComponent(path)}`);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Folder doesn't exist, create it
        try {
          await this.client.put(`/resources?path=${encodeURIComponent(path)}`);
          logger.info(`Created folder on Yandex.Disk: ${path}`);
          return true;
        } catch (createError) {
          logger.error(`Failed to create folder on Yandex.Disk: ${path}`, createError);
          return false;
        }
      }
      logger.error('Error checking folder:', error);
      return false;
    }
  }

  /**
   * Upload file to Yandex.Disk
   */
  async uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string = 'video/mp4'
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Yandex.Disk service not configured',
        };
      }

      // Ensure recordings folder exists
      const folderPath = this.folderId;
      await this.ensureFolder(folderPath);

      const filePath = `${folderPath}/${fileName}`;

      // Get upload URL
      const uploadUrlResponse = await this.client.get<YandexDiskUploadResponse>(
        `/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=false`
      );

      const uploadUrl = uploadUrlResponse.data.href;

      // Upload file
      await axios.put(uploadUrl, fileBuffer, {
        headers: {
          'Content-Type': mimeType,
        },
      });

      logger.info(`Uploaded file to Yandex.Disk: ${filePath}`);

      return {
        success: true,
        path: filePath,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      logger.error(`Failed to upload to Yandex.Disk: ${errorMessage}`, error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get list of files in folder
   */
  async listFiles(path: string = this.folderId): Promise<YandexDiskFile[]> {
    try {
      if (!this.isConfigured) return [];

      const response = await this.client.get(
        `/resources?path=${encodeURIComponent(path)}&sort=-modified`
      );

      return response.data.embedded?.items || [];
    } catch (error) {
      logger.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Delete file from Yandex.Disk
   */
  async deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Yandex.Disk service not configured',
        };
      }

      await this.client.delete(`/resources?path=${encodeURIComponent(path)}&permanently=true`);
      
      logger.info(`Deleted file from Yandex.Disk: ${path}`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      logger.error(`Failed to delete from Yandex.Disk: ${errorMessage}`, error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get public link for a file
   */
  async getPublicLink(path: string): Promise<{ success: boolean; link?: string; error?: string }> {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Yandex.Disk service not configured',
        };
      }

      const response = await this.client.put(
        `/resources/publish?path=${encodeURIComponent(path)}`
      );

      return {
        success: true,
        link: response.data.public_url,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      logger.error(`Failed to get public link: ${errorMessage}`, error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const yandexDiskService = new YandexDiskService();
