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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABTestExperiment = exports.ExperimentType = exports.ExperimentStatus = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("../../../organizations/entities/organization.entity");
var ExperimentStatus;
(function (ExperimentStatus) {
    ExperimentStatus["DRAFT"] = "draft";
    ExperimentStatus["ACTIVE"] = "active";
    ExperimentStatus["PAUSED"] = "paused";
    ExperimentStatus["COMPLETED"] = "completed";
    ExperimentStatus["ARCHIVED"] = "archived";
})(ExperimentStatus || (exports.ExperimentStatus = ExperimentStatus = {}));
var ExperimentType;
(function (ExperimentType) {
    ExperimentType["DISCOUNT_STRATEGY"] = "discount_strategy";
    ExperimentType["LATE_FEE_STRATEGY"] = "late_fee_strategy";
    ExperimentType["PAYMENT_METHOD_PREFERENCE"] = "payment_method_preference";
    ExperimentType["COMMUNICATION_STRATEGY"] = "communication_strategy";
})(ExperimentType || (exports.ExperimentType = ExperimentType = {}));
let ABTestExperiment = class ABTestExperiment {
};
exports.ABTestExperiment = ABTestExperiment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ABTestExperiment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ABTestExperiment.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ABTestExperiment.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ExperimentStatus,
        default: ExperimentStatus.DRAFT,
    }),
    __metadata("design:type", String)
], ABTestExperiment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ExperimentType,
    }),
    __metadata("design:type", String)
], ABTestExperiment.prototype, "experimentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Array)
], ABTestExperiment.prototype, "variants", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], ABTestExperiment.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], ABTestExperiment.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ABTestExperiment.prototype, "targetCriteria", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ABTestExperiment.prototype, "metrics", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ABTestExperiment.prototype, "isAutomaticWinnerSelection", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ABTestExperiment.prototype, "winnerVariantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ABTestExperiment.prototype, "results", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization),
    __metadata("design:type", typeof (_a = typeof organization_entity_1.Organization !== "undefined" && organization_entity_1.Organization) === "function" ? _a : Object)
], ABTestExperiment.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ABTestExperiment.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], ABTestExperiment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], ABTestExperiment.prototype, "updatedAt", void 0);
exports.ABTestExperiment = ABTestExperiment = __decorate([
    (0, typeorm_1.Entity)()
], ABTestExperiment);
//# sourceMappingURL=ab-test-experiment.entity.js.map