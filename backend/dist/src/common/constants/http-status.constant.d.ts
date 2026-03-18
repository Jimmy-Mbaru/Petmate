import { HttpStatus } from '@nestjs/common';
export declare const HTTP_STATUS: {
    readonly OK: HttpStatus.OK;
    readonly CREATED: HttpStatus.CREATED;
    readonly NO_CONTENT: HttpStatus.NO_CONTENT;
    readonly BAD_REQUEST: HttpStatus.BAD_REQUEST;
    readonly UNAUTHORIZED: HttpStatus.UNAUTHORIZED;
    readonly FORBIDDEN: HttpStatus.FORBIDDEN;
    readonly NOT_FOUND: HttpStatus.NOT_FOUND;
    readonly CONFLICT: HttpStatus.CONFLICT;
    readonly INTERNAL_SERVER_ERROR: HttpStatus.INTERNAL_SERVER_ERROR;
};
export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];
