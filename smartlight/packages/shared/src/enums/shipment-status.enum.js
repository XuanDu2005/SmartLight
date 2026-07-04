"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipmentStatus = void 0;
var ShipmentStatus;
(function (ShipmentStatus) {
    ShipmentStatus["CREATED"] = "CREATED";
    ShipmentStatus["DISPATCHED"] = "DISPATCHED";
    ShipmentStatus["IN_TRANSIT"] = "IN_TRANSIT";
    ShipmentStatus["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    ShipmentStatus["DELIVERED"] = "DELIVERED";
    ShipmentStatus["EXCEPTION"] = "EXCEPTION";
    ShipmentStatus["RETURNED"] = "RETURNED";
    ShipmentStatus["CANCELLED"] = "CANCELLED";
})(ShipmentStatus || (exports.ShipmentStatus = ShipmentStatus = {}));
