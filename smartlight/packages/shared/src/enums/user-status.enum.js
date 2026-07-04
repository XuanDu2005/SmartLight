"use strict";
// Placeholder; full enum map matches Prisma.
// Mirrored here for use in shared types and DTOs without depending on @prisma/client.
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserStatus = void 0;
var UserStatus;
(function (UserStatus) {
    UserStatus["PENDING_VERIFICATION"] = "PENDING_VERIFICATION";
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
    UserStatus["CLOSED"] = "CLOSED";
    UserStatus["ANONYMIZED"] = "ANONYMIZED";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
