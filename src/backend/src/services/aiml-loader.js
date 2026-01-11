"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AimlLoader = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../utils/logger"));
class AimlLoader {
    constructor(aimlEngine) {
        this.aimlEngine = aimlEngine;
    }
    /**
     * Load AIML patterns from a file
     */
    async loadFromFile(filePath) {
        try {
            const xmlContent = await promises_1.default.readFile(filePath, 'utf-8');
            await this.aimlEngine.loadAimlFromString(xmlContent);
            logger_1.default.info(`Successfully loaded AIML patterns from ${filePath}`);
        }
        catch (error) {
            logger_1.default.error(`Failed to load AIML patterns from ${filePath}:`, error);
            throw error;
        }
    }
    /**
     * Load AIML patterns from a directory
     */
    async loadFromDirectory(dirPath) {
        try {
            const files = await promises_1.default.readdir(dirPath);
            const aimlFiles = files.filter(file => file.endsWith('.xml') || file.endsWith('.aiml'));
            if (aimlFiles.length === 0) {
                logger_1.default.warn(`No AIML files found in directory: ${dirPath}`);
                return;
            }
            // For now, load the first AIML file found
            // In a full implementation, we might want to merge multiple files
            const firstFile = aimlFiles[0];
            const filePath = path_1.default.join(dirPath, firstFile);
            await this.loadFromFile(filePath);
            if (aimlFiles.length > 1) {
                logger_1.default.info(`Found ${aimlFiles.length} AIML files, loaded: ${firstFile}`);
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to load AIML patterns from directory ${dirPath}:`, error);
            throw error;
        }
    }
    /**
     * Load default sample patterns
     */
    async loadSamplePatterns() {
        const samplePath = path_1.default.join(__dirname, '../data/sample-patterns.xml');
        await this.loadFromFile(samplePath);
    }
    /**
     * Load patterns from ConfigMap mount point (for Kubernetes deployment)
     */
    async loadFromConfigMap(mountPath = '/etc/aiml') {
        try {
            // Check if ConfigMap mount exists
            await promises_1.default.access(mountPath);
            await this.loadFromDirectory(mountPath);
            logger_1.default.info(`Loaded AIML patterns from ConfigMap at ${mountPath}`);
        }
        catch (error) {
            logger_1.default.warn(`ConfigMap not found at ${mountPath}, falling back to sample patterns`);
            await this.loadSamplePatterns();
        }
    }
    /**
     * Reload patterns (useful for hot-reloading)
     */
    async reloadPatterns(source) {
        logger_1.default.info('Reloading AIML patterns...');
        if (source) {
            if (source.endsWith('.xml') || source.endsWith('.aiml')) {
                await this.loadFromFile(source);
            }
            else {
                await this.loadFromDirectory(source);
            }
        }
        else {
            // Try ConfigMap first, then fallback to samples
            await this.loadFromConfigMap();
        }
        logger_1.default.info('AIML patterns reloaded successfully');
    }
}
exports.AimlLoader = AimlLoader;
