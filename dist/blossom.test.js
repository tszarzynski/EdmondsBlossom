"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const blossom_1 = __importDefault(require("./blossom"));
describe('Blossom Algorithm', () => {
    test('should return an empty array if no array is given', () => {
        const data = [];
        const correctAnswer = [];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should handle a single edge', () => {
        const data = [[0, 1, 1]];
        const correctAnswer = [1, 0];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should handle 2 edges', () => {
        const data = [[1, 2, 10], [2, 3, 11]];
        const correctAnswer = [-1, -1, 3, 2];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should handle 3 edges', () => {
        const data = [[1, 2, 5], [2, 3, 11], [3, 4, 5]];
        const correctAnswer = [-1, -1, 3, 2, -1];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should handle maximum cardinality', () => {
        const data = [[1, 2, 5], [2, 3, 11], [3, 4, 5]];
        const correctAnswer = [-1, 2, 1, 4, 3];
        const result = (0, blossom_1.default)(data, true);
        expect(result).toEqual(correctAnswer);
    });
    test('should handle floating point weights', () => {
        const data = [[1, 2, Math.PI], [2, 3, Math.exp(1)], [1, 3, 3.0], [1, 4, Math.sqrt(2.0)]];
        const correctAnswer = [-1, 4, 3, 2, 1];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should handle negative weights', () => {
        const data = [[1, 2, 2], [1, 3, -2], [2, 3, 1], [2, 4, -1], [3, 4, -6]];
        const correctAnswer = [-1, 2, 1, -1, -1];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should handle negative weights with max cardinality', () => {
        const data = [[1, 2, 2], [1, 3, -2], [2, 3, 1], [2, 4, -1], [3, 4, -6]];
        const correctAnswer = [-1, 3, 4, 1, 2];
        const result = (0, blossom_1.default)(data, true);
        expect(result).toEqual(correctAnswer);
    });
    test('should create S-blossom and use it for augmentation (1)', () => {
        const data = [[1, 2, 8], [1, 3, 9], [2, 3, 10], [3, 4, 7]];
        const correctAnswer = [-1, 2, 1, 4, 3];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create S-blossom and use it for augmentation (2)', () => {
        const data = [[1, 2, 8], [1, 3, 9], [2, 3, 10], [3, 4, 7], [1, 6, 5], [4, 5, 6]];
        const correctAnswer = [-1, 6, 3, 2, 5, 4, 1];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create S-blossom, relabel as T-blossom, use for augmentation (1)', () => {
        const data = [[1, 2, 9], [1, 3, 8], [2, 3, 10], [1, 4, 5], [4, 5, 4], [1, 6, 3]];
        const correctAnswer = [-1, 6, 3, 2, 5, 4, 1];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create S-blossom, relabel as T-blossom, use for augmentation (2)', () => {
        const data = [[1, 2, 9], [1, 3, 8], [2, 3, 10], [1, 4, 5], [4, 5, 3], [1, 6, 4]];
        const correctAnswer = [-1, 6, 3, 2, 5, 4, 1];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create S-blossom, relabel as T-blossom, use for augmentation (3)', () => {
        const data = [[1, 2, 9], [1, 3, 8], [2, 3, 10], [1, 4, 5], [4, 5, 3], [3, 6, 4]];
        const correctAnswer = [-1, 2, 1, 6, 5, 4, 3];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create nested S-blossom, use for augmentation', () => {
        const data = [[1, 2, 9], [1, 3, 9], [2, 3, 10], [2, 4, 8], [3, 5, 8], [4, 5, 10], [5, 6, 6]];
        const correctAnswer = [-1, 3, 4, 1, 2, 6, 5];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create S-blossom, relabel as S, include in nested S-blossom', () => {
        const data = [[1, 2, 10], [1, 7, 10], [2, 3, 12], [3, 4, 20], [3, 5, 20], [4, 5, 25], [5, 6, 10], [6, 7, 10], [7, 8, 8]];
        const correctAnswer = [-1, 2, 1, 4, 3, 6, 5, 8, 7];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create nested S-blossom, augment, expand recursively', () => {
        const data = [[1, 2, 8], [1, 3, 8], [2, 3, 10], [2, 4, 12], [3, 5, 12], [4, 5, 14], [4, 6, 12], [5, 7, 12], [6, 7, 14], [7, 8, 12]];
        const correctAnswer = [-1, 2, 1, 5, 6, 3, 4, 8, 7];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create S-blossom, relabel as T, expand', () => {
        const data = [[1, 2, 23], [1, 5, 22], [1, 6, 15], [2, 3, 25], [3, 4, 22], [4, 5, 25], [4, 8, 14], [5, 7, 13]];
        const correctAnswer = [-1, 6, 3, 2, 8, 7, 1, 5, 4];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create nested S-blossom, relabel as T, expand', () => {
        const data = [[1, 2, 19], [1, 3, 20], [1, 8, 8], [2, 3, 25], [2, 4, 18], [3, 5, 18], [4, 5, 13], [4, 7, 7], [5, 6, 7]];
        const correctAnswer = [-1, 8, 3, 2, 7, 6, 5, 4, 1];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create blossom, relabel as T in more than one way, expand, augment', () => {
        const data = [[1, 2, 45], [1, 5, 45], [2, 3, 50], [3, 4, 45], [4, 5, 50], [1, 6, 30], [3, 9, 35], [4, 8, 35], [5, 7, 26], [9, 10, 5]];
        const correctAnswer = [-1, 6, 3, 2, 8, 7, 1, 5, 4, 10, 9];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create blossom, relabel as T in more than one way, expand, augment (2)', () => {
        const data = [[1, 2, 45], [1, 5, 45], [2, 3, 50], [3, 4, 45], [4, 5, 50], [1, 6, 30], [3, 9, 35], [4, 8, 26], [5, 7, 40], [9, 10, 5]];
        const correctAnswer = [-1, 6, 3, 2, 8, 7, 1, 5, 4, 10, 9];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create blossom, relabel as T, expand such that a new least-slack S-to-free edge is produced, augment', () => {
        const data = [[1, 2, 45], [1, 5, 45], [2, 3, 50], [3, 4, 45], [4, 5, 50], [1, 6, 30], [3, 9, 35], [4, 8, 28], [5, 7, 26], [9, 10, 5]];
        const correctAnswer = [-1, 6, 3, 2, 8, 7, 1, 5, 4, 10, 9];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should create nested blossom, relabel as T in more than one way, expand outer blossom such that inner blossom ends up on an augmenting path', () => {
        const data = [[1, 2, 45], [1, 7, 45], [2, 3, 50], [3, 4, 45], [4, 5, 95], [4, 6, 94], [5, 6, 94], [6, 7, 50], [1, 8, 30], [3, 11, 35], [5, 9, 36], [7, 10, 26], [11, 12, 5]];
        const correctAnswer = [-1, 8, 3, 2, 6, 9, 4, 10, 1, 5, 7, 12, 11];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('create nested S-blossom, relabel as S, expand recursively', () => {
        const data = [[1, 2, 40], [1, 3, 40], [2, 3, 60], [2, 4, 55], [3, 5, 55], [4, 5, 50], [1, 8, 15], [5, 7, 30], [7, 6, 10], [8, 10, 10], [4, 9, 30]];
        const correctAnswer = [-1, 2, 1, 5, 9, 3, 7, 6, 10, 4, 8];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should test array structure of nbLists', () => {
        const data = [[1, 2, 5], [1, 3, 6], [1, 4, 2], [2, 3, 4], [2, 4, 1], [3, 4, 3]];
        const correctAnswer = [-1, 2, 1, 4, 3];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should test array structure of nbLists with floats', () => {
        const data = [[1, 2, 47.2612], [1, 3, 46.9176], [2, 3, 49.3305], [1, 4, 44.7978], [2, 4, 49.1123], [2, 5, 51.1539], [4, 5, 50.5430], [2, 6, 48.2873], [3, 6, 47.7470], [4, 6, 46.8674], [5, 6, 48.8397]];
        const correctAnswer = [-1, 3, 6, 1, 5, 4, 2];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
    test('should handle a simple zero-index love triangle', () => {
        const data = [
            [0, 1, 6],
            [0, 2, 10],
            [1, 2, 5]
        ];
        const correctAnswer = [2, -1, 0];
        const result = (0, blossom_1.default)(data);
        expect(result).toEqual(correctAnswer);
    });
});
