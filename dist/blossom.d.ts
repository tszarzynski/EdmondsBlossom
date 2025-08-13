type Edge = [number, number, number];
type Matching = number[];
/**
 * Edmonds' Blossom algorithm for maximum weight matching
 * @param edges Array of edges, each edge is [vertex1, vertex2, weight]
 * @param maxCardinality If true, find maximum cardinality matching instead of maximum weight
 * @returns Array representing the matching, where index is vertex and value is matched vertex (-1 if unmatched)
 */
export default function blossom(edges: Edge[], maxCardinality?: boolean): Matching;
export {};
