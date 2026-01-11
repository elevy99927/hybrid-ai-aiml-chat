"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AimlService = void 0;
const aiml_engine_1 = require("./aiml-engine");
const aiml_loader_1 = require("./aiml-loader");
const logger_1 = __importDefault(require("../utils/logger"));
class AimlService {
    constructor() {
        this.engine = new aiml_engine_1.AimlEngine();
        this.loader = new aiml_loader_1.AimlLoader(this.engine);
        this.lastReload = new Date();
    }
    /**
     * Initialize the AIML service
     */
    async initialize() {
        try {
            await this.loader.loadFromConfigMap();
            this.lastReload = new Date();
            logger_1.default.info('AIML Service initialized successfully');
        }
        catch (error) {
            logger_1.default.error('Failed to initialize AIML Service:', error);
            throw error;
        }
    }
    /**
     * Process a user message
     */
    processMessage(message) {
        return this.engine.processMessage(message);
    }
    /**
     * Get service status
     */
    getStatus() {
        return {
            loaded: this.engine.isLoaded(),
            patternCount: this.engine.getPatternCount(),
            lastReload: this.lastReload,
        };
    }
    /**
     * Get all patterns (for admin interface)
     */
    getPatterns() {
        return this.engine.getPatterns();
    }
    /**
     * Reload patterns
     */
    async reloadPatterns() {
        await this.loader.reloadPatterns();
        this.lastReload = new Date();
    }
}
exports.AimlService = AimlService;
