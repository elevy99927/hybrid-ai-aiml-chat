"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const createLogger = () => {
    const logger = winston_1.default.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
        defaultMeta: { service: 'kubernetes-chatbot-backend' },
        transports: [
            new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
            new winston_1.default.transports.File({ filename: 'combined.log' }),
        ],
    });
    // If we're not in production, log to the console as well
    if (process.env.NODE_ENV !== 'production') {
        logger.add(new winston_1.default.transports.Console({
            format: winston_1.default.format.simple()
        }));
    }
    return logger;
};
exports.createLogger = createLogger;
const logger = (0, exports.createLogger)();
exports.default = logger;
