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
exports.MatchesQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class MatchesQueryDto {
    similarBreed;
    verifiedOnly;
    activeOnly;
}
exports.MatchesQueryDto = MatchesQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Prefer / restrict to same species (and same breed when possible)',
        example: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === true || value === 'true'),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], MatchesQueryDto.prototype, "similarBreed", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Only include pets whose owner has verified email',
        example: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === true || value === 'true'),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], MatchesQueryDto.prototype, "verifiedOnly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Only include pets whose owner was active recently (last 90 days)',
        example: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === true || value === 'true'),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], MatchesQueryDto.prototype, "activeOnly", void 0);
//# sourceMappingURL=matches-query.dto.js.map