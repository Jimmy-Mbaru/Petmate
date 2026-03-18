export declare class AuthUserDto {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl: string | null;
}
export declare class AuthResponseDto {
    access_token: string;
    refresh_token: string;
    user: AuthUserDto;
}
