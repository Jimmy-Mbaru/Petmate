import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const MY_PETS_CACHE_TTL_MS = 30_000; // 30 seconds

export interface Pet {
  id: number;
  name: string;
  species: string;
  breed: string;
  age: number;
  gender: string;
  healthNotes?: string;
  photoUrl?: string;
  photoUrls?: string[];
  isAvailable: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePetDto {
  name: string;
  species: string;
  breed: string;
  age: number;
  gender: string;
  healthNotes?: string;
  photoUrl?: string;
  photoUrls?: string[];
  isAvailable?: boolean;
}

export interface UpdatePetDto {
  name?: string;
  species?: string;
  breed?: string;
  age?: number;
  gender?: string;
  healthNotes?: string;
  photoUrl?: string;
  photoUrls?: string[];
  isAvailable?: boolean;
}

export interface PetMatch {
  id: number | string;
  name: string;
  species: string;
  breed: string;
  age: number;
  gender: string;
  photoUrl?: string;
  photoUrls?: string[];
  matchScore: number;
  matchExplanation: string;
  /** Owner user id for "View profile" link */
  ownerId?: string;
}

/** Backend returns { pet, score, explanations } */
interface BackendPetMatch {
  pet: {
    id: number | string;
    name: string;
    species: string;
    breed: string;
    age: number;
    gender: string;
    photoUrl?: string;
    photoUrls?: string[];
    owner?: { id: string; name: string };
  };
  score: number;
  explanations: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root',
})
export class PetsService {
  private readonly apiUrl = `${environment.apiUrl}/pets`;
  private myPetsFirstPageCache: { response: PaginatedResponse<Pet>; at: number } | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Create a new pet profile (Owner only)
   */
  create(dto: CreatePetDto): Observable<Pet> {
    return this.http.post<Pet>(this.apiUrl, dto);
  }

  /**
   * Browse available pets (paginated, public)
   */
  findAll(
    species?: string,
    breed?: string,
    limit: number = 10,
    offset: number = 0
  ): Observable<PaginatedResponse<Pet>> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    if (species) {
      params = params.set('species', species);
    }
    if (breed) {
      params = params.set('breed', breed);
    }

    return this.http.get<PaginatedResponse<Pet>>(this.apiUrl, { params });
  }

  /**
   * Get pet by ID
   */
  findOne(id: number): Observable<Pet> {
    return this.http.get<Pet>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update own pet
   */
  update(id: number, dto: UpdatePetDto): Observable<Pet> {
    return this.http.patch<Pet>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Delete own pet
   */
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Options sent to GET /pets/:id/matches. Only preferences the backend supports.
   */
  getMatches(
    id: number | string,
    options?: { similarBreed?: boolean; verifiedOnly?: boolean; activeOnly?: boolean },
  ): Observable<PetMatch[]> {
    let params = new HttpParams();
    if (options?.similarBreed === true) params = params.set('similarBreed', 'true');
    if (options?.verifiedOnly === true) params = params.set('verifiedOnly', 'true');
    if (options?.activeOnly === true) params = params.set('activeOnly', 'true');

    return this.http
      .get<BackendPetMatch[]>(`${this.apiUrl}/${id}/matches`, { params })
      .pipe(
        timeout(15000),
        map((items) =>
          (items || []).map((item) => ({
            id: item.pet.id,
            name: item.pet.name,
            species: item.pet.species,
            breed: item.pet.breed,
            age: item.pet.age,
            gender: item.pet.gender,
            photoUrl: item.pet.photoUrl,
            photoUrls: item.pet.photoUrls,
            matchScore: item.score,
            matchExplanation: (item.explanations || []).join(' · '),
            ownerId: item.pet.owner?.id,
          }))
        )
      );
  }

  /**
   * Get user's own pets (authenticated owner; uses backend /pets/my).
   * Caches the first page (limit=1, offset=0) briefly to avoid 429 when multiple components request it.
   */
  getMyPets(limit: number = 20, offset: number = 0): Observable<PaginatedResponse<Pet>> {
    const isFirstPage = limit === 1 && offset === 0;
    const cached = this.myPetsFirstPageCache;
    if (isFirstPage && cached && Date.now() - cached.at < MY_PETS_CACHE_TTL_MS) {
      return of(cached.response);
    }

    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    const request = this.http.get<PaginatedResponse<Pet>>(`${this.apiUrl}/my`, { params });

    if (isFirstPage) {
      return request.pipe(
        tap((response) => {
          this.myPetsFirstPageCache = { response, at: Date.now() };
        }),
      );
    }
    return request;
  }
}
