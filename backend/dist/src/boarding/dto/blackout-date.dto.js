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
exports.BlackoutDateRangeDto = exports.AddBlackoutDateDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class AddBlackoutDateDto {
    date;
}
exports.AddBlackoutDateDto = AddBlackoutDateDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Date to black out (ISO date YYYY-MM-DD)',
        example: '2025-12-25',
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], AddBlackoutDateDto.prototype, "date", void 0);
class BlackoutDateRangeDto {
    startDate;
    endDate;
}
exports.BlackoutDateRangeDto = BlackoutDateRangeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Start of range (ISO date)', example: '2025-06-01' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BlackoutDateRangeDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'End of range (ISO date)', example: '2025-06-30' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BlackoutDateRangeDto.prototype, "endDate", void 0);
//# sourceMappingURL=blackout-date.dto.js.map