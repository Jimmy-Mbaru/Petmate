import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadResponse {
  url: string;
  publicId: string;
}

export type UploadFolder = 'avatars' | 'pets' | 'products' | 'boarding' | 'documents';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private readonly apiUrl = `${environment.apiUrl}/upload`;

  constructor(private http: HttpClient) {}

  /**
   * Upload image file to Cloudinary or local storage
   * @param file - The image file to upload
   * @param folder - The folder type (avatars, pets, products, boarding, documents)
   * @returns Observable with url and publicId
   */
  uploadImage(file: File, folder: UploadFolder = 'products'): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders();
    // Don't set Content-Type header, let browser set it with boundary

    return this.http.post<UploadResponse>(`${this.apiUrl}/image`, formData, {
      headers,
      params: { folder },
    });
  }
}
