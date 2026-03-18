"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGINATION = exports.PaginationQueryDto = void 0;
exports.getPaginationParams = getPaginationParams;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
class PaginationQueryDto {
    limit = DEFAULT_LIMIT;
    offset = 0;
}
exports.PaginationQueryDto = PaginationQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        default: DEFAULT_LIMIT,
        minimum: 1,
        maximum: MAX_LIMIT,
        description: 'Number of items per page',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(MAX_LIMIT),
    __metadata("design:type", Number)
], PaginationQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        default: 0,
        minimum: 0,
        description: 'Number of items to skip (page * limit)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PaginationQueryDto.prototype, "offset", void 0);
exports.PAGINATION = {
    DEFAULT_LIMIT,
    MAX_LIMIT,
};
function getPaginationParams(limit, offset) {
    const take = Math.min(Math.max(1, Number(limit) || exports.PAGINATION.DEFAULT_LIMIT), exports.PAGINATION.MAX_LIMIT);
    const skip = Math.max(0, Number(offset) || 0);
    return { take, skip };
}
//# sourceMappingURL=pagination-query.dto.js.map