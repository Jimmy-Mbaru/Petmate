"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponses = ApiResponses;
exports.ApiResponsesAuth = ApiResponsesAuth;
exports.ApiResponsesProtected = ApiResponsesProtected;
exports.ApiResponsesCreate = ApiResponsesCreate;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
function ApiResponses() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request / validation error' }), (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }));
}
function ApiResponsesAuth() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiResponse)({ status: 200, description: 'Success' }), (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request / validation error' }), (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized / invalid credentials',
    }), (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Conflict (e.g. email already registered)',
    }), (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }));
}
function ApiResponsesProtected() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiResponse)({ status: 200, description: 'Success' }), (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request / validation error' }), (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }), (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }), (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found' }), (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }));
}
function ApiResponsesCreate() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiResponse)({ status: 201, description: 'Created' }), (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request / validation error' }), (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }), (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }), (0, swagger_1.ApiResponse)({ status: 409, description: 'Conflict' }), (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }));
}
//# sourceMappingURL=api-responses.decorator.js.map