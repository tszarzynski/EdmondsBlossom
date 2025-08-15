/*Converted to TS from JS by GitHub Copilot. Original JS by Matt Krick from Python: http://jorisvr.nl/maximummatching.html*/

// Algorithm constants
const UNMATCHED = -1;
const UNLABELED = 0;
const VERTEX_LABEL_S = 1; // S-vertex in alternating tree
const VERTEX_LABEL_T = 2; // T-vertex in alternating tree
const BLOSSOM_MULTIPLIER = 2; // For array size calculations
const EDGE_ENDPOINT_COUNT = 2; // Each edge has 2 endpoints

// Delta types for dual variable adjustments
const DELTA_TYPE_NONE = -1;
const DELTA_TYPE_DUAL_DECREASE = 1;
const DELTA_TYPE_EDGE_SLACK = 2;
const DELTA_TYPE_BLOSSOM_SLACK = 3;
const DELTA_TYPE_BLOSSOM_EXPAND = 4;

// Type definitions
type Edge = readonly [number, number, number]; // [vertex1, vertex2, weight]
type Matching = readonly number[]; // Array where index is vertex and value is matched vertex (-1 if unmatched)

/**
 * Edmonds' Blossom algorithm for maximum weight matching
 * @param edges Array of edges, each edge is [vertex1, vertex2, weight]
 * @param maxCardinality If true, find maximum cardinality matching instead of maximum weight
 * @returns Array representing the matching, where index is vertex and value is matched vertex (-1 if unmatched)
 */
export default function blossom(edges: readonly Edge[], maxCardinality?: boolean): Matching {
  // Input validation
  if (!Array.isArray(edges)) {
    throw new Error('Edges must be an array');
  }

  if (edges.length === 0) {
    return [];
  }

  // Validate edge format
  for (const edge of edges) {
    if (!Array.isArray(edge) || edge.length !== 3) {
      throw new Error('Each edge must be an array of [vertex1, vertex2, weight]');
    }
    const [v1, v2, weight] = edge;
    if (!Number.isInteger(v1) || !Number.isInteger(v2) || v1 < 0 || v2 < 0) {
      throw new Error('Vertex indices must be non-negative integers');
    }
    if (typeof weight !== 'number' || !isFinite(weight)) {
      throw new Error('Edge weights must be finite numbers');
    }
  }

  const edmonds = new Edmonds(edges, maxCardinality || false);
  return edmonds.maxWeightMatching();
}

/**
 * Implementation of Edmonds' Blossom algorithm for maximum weight matching
 */
class Edmonds {
  private edges: readonly Edge[];
  private maxCardinality: boolean;
  private nEdge: number;
  private nVertex!: number;
  private maxWeight!: number;
  private endpoint!: number[];
  private neighbend!: number[][];
  private mate!: number[];
  private label!: number[];
  private labelEnd!: number[];
  private inBlossom!: number[];
  private blossomParent!: number[];
  private blossomChilds!: number[][];
  private blossomBase!: number[];
  private blossomEndPs!: number[][];
  private bestEdge!: number[];
  private blossomBestEdges!: number[][];
  private unusedBlossoms!: number[];
  private dualVar!: number[];
  private allowEdge!: boolean[];
  private queue!: number[];

  /**
   * Constructs a new Edmonds algorithm instance
   * @param edges Array of edges in the graph
   * @param maxCardinality Whether to optimize for maximum cardinality
   */
  constructor(edges: readonly Edge[], maxCardinality: boolean) {
    this.edges = edges;
    this.maxCardinality = maxCardinality;
    this.nEdge = edges.length;

    this.initializeGraphProperties();
    this.initializeBlossomStructures();
    this.initializeMatchingStructures();
  }

  /**
   * Helper function to get the opposite endpoint index
   * Edge endpoints are stored in pairs: [2k, 2k+1] for edge k
   */
  private getOppositeEndpoint(endpointIndex: number): number {
    return endpointIndex ^ 1; // Toggle between even/odd
  }

  /**
   * Helper function to get the edge index from an endpoint index
   */
  private getEdgeFromEndpoint(endpointIndex: number): number {
    return Math.floor(endpointIndex / EDGE_ENDPOINT_COUNT);
  }

  /**
   * Helper function to check if a vertex has a specific label
   */
  private hasVertexLabel(vertex: number, labelType: number): boolean {
    return this.label[this.inBlossom[vertex]] === labelType;
  }

  /**
   * Helper function to check if a vertex is unlabeled
   */
  private isUnlabeledVertex(vertex: number): boolean {
    return this.hasVertexLabel(vertex, UNLABELED);
  }

  /**
   * Helper function to check if a vertex is an S-vertex
   */
  private isSVertex(vertex: number): boolean {
    return this.hasVertexLabel(vertex, VERTEX_LABEL_S);
  }

  /**
   * Helper function to check if a vertex is a T-vertex
   */
  private isTVertex(vertex: number): boolean {
    return this.hasVertexLabel(vertex, VERTEX_LABEL_T);
  }

  private initializeGraphProperties(): void {
    // Calculate nVertex
    this.nVertex = this.calculateVertexCount();

    // Calculate maxWeight
    this.maxWeight = this.calculateMaxWeight();

    // Initialize endpoint and neighbend
    this.initializeGraphConnectivity();
  }

  private calculateVertexCount(): number {
    let nVertex = 0;
    for (const [i, j] of this.edges) {
      nVertex = Math.max(nVertex, i + 1, j + 1);
    }
    return nVertex;
  }

  private calculateMaxWeight(): number {
    return Math.max(0, ...this.edges.map(edge => edge[2]));
  }

  private initializeGraphConnectivity(): void {
    // Initialize endpoint
    this.endpoint = Array.from(
      { length: EDGE_ENDPOINT_COUNT * this.nEdge },
      (_, p) => this.edges[Math.floor(p / EDGE_ENDPOINT_COUNT)][p % EDGE_ENDPOINT_COUNT]
    );

    // Initialize neighbend
    this.neighbend = initArrArr(this.nVertex);
    for (let k = 0; k < this.nEdge; k++) {
      const [i, j] = this.edges[k];
      this.neighbend[i].push(EDGE_ENDPOINT_COUNT * k + 1);
      this.neighbend[j].push(EDGE_ENDPOINT_COUNT * k);
    }
  }

  private initializeBlossomStructures(): void {
    this.inBlossom = Array.from({ length: this.nVertex }, (_, i) => i);
    this.blossomParent = filledArray(BLOSSOM_MULTIPLIER * this.nVertex, UNMATCHED);
    this.blossomChilds = initArrArr(BLOSSOM_MULTIPLIER * this.nVertex);

    const base = Array.from({ length: this.nVertex }, (_, i) => i);
    const negs = filledArray(this.nVertex, UNMATCHED);
    this.blossomBase = base.concat(negs);

    this.blossomEndPs = initArrArr(BLOSSOM_MULTIPLIER * this.nVertex);
    this.bestEdge = filledArray(BLOSSOM_MULTIPLIER * this.nVertex, UNMATCHED);
    this.blossomBestEdges = initArrArr(BLOSSOM_MULTIPLIER * this.nVertex);

    this.unusedBlossoms = Array.from({ length: this.nVertex }, (_, i) => i + this.nVertex);
  }

  private initializeMatchingStructures(): void {
    this.mate = filledArray(this.nVertex, UNMATCHED);
    this.label = filledArray(BLOSSOM_MULTIPLIER * this.nVertex, UNLABELED);
    this.labelEnd = filledArray(BLOSSOM_MULTIPLIER * this.nVertex, UNMATCHED);

    const mw = filledArray(this.nVertex, this.maxWeight);
    const zeros = filledArray(this.nVertex, 0);
    this.dualVar = mw.concat(zeros);

    this.allowEdge = filledArray(this.nEdge, false);
    this.queue = [];
  }

  /**
   * Executes the maximum weight matching algorithm
   * Main algorithm loop: for each unmatched vertex, try to find an augmenting path
   * @returns Array representing the matching where index is vertex and value is matched vertex
   */
  maxWeightMatching(): Matching {
    // === MAIN ALGORITHM LOOP: Try to match each unmatched vertex ===
    for (let t = 0; t < this.nVertex; t++) {
      // Reset algorithm state for this iteration
      this.label = filledArray(BLOSSOM_MULTIPLIER * this.nVertex, UNLABELED);
      this.bestEdge = filledArray(BLOSSOM_MULTIPLIER * this.nVertex, UNMATCHED);
      this.blossomBestEdges = initArrArr(BLOSSOM_MULTIPLIER * this.nVertex);
      this.allowEdge = filledArray(this.nEdge, false);
      this.queue = [];

      // === PHASE 1: Initialize S-vertices (unmatched vertices become roots) ===
      for (let v = 0; v < this.nVertex; v++) {
        if (this.mate[v] === UNMATCHED && this.label[this.inBlossom[v]] === UNLABELED) {
          this.assignLabel(v, VERTEX_LABEL_S, UNMATCHED);
        }
      }

      let augmented = false;
      while (true) {
        // === PHASE 2: Search for augmenting paths from S-vertices ===
        while (this.queue.length > 0 && !augmented) {
          const currentVertex = this.queue.pop()!;

          // Examine all edges incident to this S-vertex
          for (const edgeEndpoint of this.neighbend[currentVertex]) {
            const edgeIndex = this.getEdgeFromEndpoint(edgeEndpoint);
            const adjacentVertex = this.endpoint[edgeEndpoint];

            // Skip edges within the same blossom
            if (this.inBlossom[currentVertex] === this.inBlossom[adjacentVertex]) continue;

            // Check if edge should be allowed (has zero slack)
            if (!this.allowEdge[edgeIndex]) {
              const edgeSlack = this.slack(edgeIndex);
              if (edgeSlack <= 0) {
                this.allowEdge[edgeIndex] = true;
              }
            }

            if (this.allowEdge[edgeIndex]) {
              if (this.isUnlabeledVertex(adjacentVertex)) {
                // Case 1: Adjacent vertex is unlabeled -> label it as T-vertex
                this.assignLabel(
                  adjacentVertex,
                  VERTEX_LABEL_T,
                  this.getOppositeEndpoint(edgeEndpoint)
                );
              } else if (this.isSVertex(adjacentVertex)) {
                // Case 2: Both vertices are S-vertices -> potential blossom or augmenting path
                const base = this.scanBlossom(currentVertex, adjacentVertex);
                if (base >= 0) {
                  // Found a blossom - contract it
                  this.addBlossom(base, edgeIndex);
                } else {
                  // Found an augmenting path - augment the matching
                  this.augmentMatching(edgeIndex);
                  augmented = true;
                  break;
                }
              } else if (this.label[adjacentVertex] === UNLABELED) {
                // Case 3: Direct vertex labeling (not through blossom)
                this.label[adjacentVertex] = VERTEX_LABEL_T;
                this.labelEnd[adjacentVertex] = this.getOppositeEndpoint(edgeEndpoint);
              }
            } else if (this.isSVertex(adjacentVertex)) {
              // Track best edge for future slack adjustments
              const currentBlossom = this.inBlossom[currentVertex];
              const currentEdgeSlack = this.slack(edgeIndex);
              if (
                this.bestEdge[currentBlossom] === UNMATCHED ||
                currentEdgeSlack < this.slack(this.bestEdge[currentBlossom])
              ) {
                this.bestEdge[currentBlossom] = edgeIndex;
              }
            } else if (this.label[adjacentVertex] === UNLABELED) {
              // Track best edge to unlabeled vertices for slack adjustments
              const currentEdgeSlack = this.slack(edgeIndex);
              if (
                this.bestEdge[adjacentVertex] === UNMATCHED ||
                currentEdgeSlack < this.slack(this.bestEdge[adjacentVertex])
              ) {
                this.bestEdge[adjacentVertex] = edgeIndex;
              }
            }
          }
        }

        if (augmented) break;

        // === PHASE 3: Adjust dual variables to make progress ===
        let deltaType = DELTA_TYPE_NONE;
        let delta = 0;
        let deltaEdge = UNMATCHED;
        let deltaBlossom = UNMATCHED;

        // Find the minimum adjustment needed
        if (!this.maxCardinality) {
          deltaType = DELTA_TYPE_DUAL_DECREASE;
          delta = getMin(this.dualVar, 0, this.nVertex - 1);
        }

        // Check edges from unlabeled vertices to S-vertices
        for (let v = 0; v < this.nVertex; v++) {
          if (this.isUnlabeledVertex(v) && this.bestEdge[v] !== UNMATCHED) {
            const edgeSlack = this.slack(this.bestEdge[v]);
            if (deltaType === DELTA_TYPE_NONE || edgeSlack < delta) {
              delta = edgeSlack;
              deltaType = DELTA_TYPE_EDGE_SLACK;
              deltaEdge = this.bestEdge[v];
            }
          }
        }

        // Check edges from S-blossoms to S-vertices
        const blossomCount = BLOSSOM_MULTIPLIER * this.nVertex;
        for (let b = 0; b < blossomCount; b++) {
          if (
            this.blossomParent[b] === UNMATCHED &&
            this.label[b] === VERTEX_LABEL_S &&
            this.bestEdge[b] !== UNMATCHED
          ) {
            const edgeSlack = this.slack(this.bestEdge[b]);
            const blossomSlackDelta = edgeSlack / 2;
            if (deltaType === DELTA_TYPE_NONE || blossomSlackDelta < delta) {
              delta = blossomSlackDelta;
              deltaType = DELTA_TYPE_BLOSSOM_SLACK;
              deltaEdge = this.bestEdge[b];
            }
          }
        }

        // Check T-blossoms that can be expanded
        const startVertex = this.nVertex;
        const endVertex = this.nVertex * BLOSSOM_MULTIPLIER;
        for (let b = startVertex; b < endVertex; b++) {
          if (
            this.blossomBase[b] >= 0 &&
            this.blossomParent[b] === UNMATCHED &&
            this.label[b] === VERTEX_LABEL_T &&
            (deltaType === DELTA_TYPE_NONE || this.dualVar[b] < delta)
          ) {
            delta = this.dualVar[b];
            deltaType = DELTA_TYPE_BLOSSOM_EXPAND;
            deltaBlossom = b;
          }
        }

        // Fallback if no progress can be made
        if (deltaType === DELTA_TYPE_NONE) {
          deltaType = DELTA_TYPE_DUAL_DECREASE;
          delta = Math.max(0, getMin(this.dualVar, 0, this.nVertex - 1));
        }

        // === PHASE 4: Apply dual variable adjustments ===
        for (let v = 0; v < this.nVertex; v++) {
          const vertexLabel = this.label[this.inBlossom[v]];
          if (vertexLabel === VERTEX_LABEL_S) {
            this.dualVar[v] -= delta;
          } else if (vertexLabel === VERTEX_LABEL_T) {
            this.dualVar[v] += delta;
          }
        }

        // Adjust dual variables for blossoms
        for (let b = this.nVertex; b < this.nVertex * BLOSSOM_MULTIPLIER; b++) {
          if (this.blossomBase[b] >= 0 && this.blossomParent[b] === UNMATCHED) {
            if (this.label[b] === VERTEX_LABEL_S) {
              this.dualVar[b] += delta;
            } else if (this.label[b] === VERTEX_LABEL_T) {
              this.dualVar[b] -= delta;
            }
          }
        }

        // === PHASE 5: Take action based on delta type ===
        if (deltaType === DELTA_TYPE_DUAL_DECREASE) {
          // No more progress possible
          break;
        } else if (deltaType === DELTA_TYPE_EDGE_SLACK) {
          // Allow edge with zero slack and add incident vertex to queue
          this.allowEdge[deltaEdge] = true;
          let vertex1 = this.edges[deltaEdge][0];
          let vertex2 = this.edges[deltaEdge][1];
          if (this.isUnlabeledVertex(vertex1)) {
            [vertex1, vertex2] = [vertex2, vertex1];
          }
          this.queue.push(vertex1);
        } else if (deltaType === DELTA_TYPE_BLOSSOM_SLACK) {
          // Allow edge from S-blossom and add incident vertex to queue
          this.allowEdge[deltaEdge] = true;
          const vertex = this.edges[deltaEdge][0];
          this.queue.push(vertex);
        } else if (deltaType === DELTA_TYPE_BLOSSOM_EXPAND) {
          // Expand T-blossom
          this.expandBlossom(deltaBlossom, false);
        }
      }

      if (!augmented) break;

      for (let b = this.nVertex; b < this.nVertex * BLOSSOM_MULTIPLIER; b++) {
        if (
          this.blossomParent[b] === UNMATCHED &&
          this.blossomBase[b] >= 0 &&
          this.label[b] === VERTEX_LABEL_S &&
          this.dualVar[b] === 0
        ) {
          this.expandBlossom(b, true);
        }
      }
    }

    for (let v = 0; v < this.nVertex; v++) {
      if (this.mate[v] >= 0) {
        this.mate[v] = this.endpoint[this.mate[v]];
      }
    }

    return this.mate;
  }

  /**
   * Calculate the slack of an edge based on dual variables
   * Slack = dual[i] + dual[j] - 2*weight
   * An edge is tight (can be used) when slack = 0
   */
  private slack(edgeIndex: number): number {
    const [vertex1, vertex2, weight] = this.edges[edgeIndex];
    return this.dualVar[vertex1] + this.dualVar[vertex2] - 2 * weight;
  }

  private blossomLeaves(b: number): number[] {
    if (b < this.nVertex) {
      return [b];
    }
    const leaves: number[] = [];
    const childList = this.blossomChilds[b] || [];

    for (const child of childList) {
      if (child <= this.nVertex) {
        leaves.push(child);
      } else {
        leaves.push(...this.blossomLeaves(child));
      }
    }
    return leaves;
  }

  /**
   * Assign a label to a vertex (S or T in the alternating tree)
   * @param vertex The vertex to label
   * @param labelType VERTEX_LABEL_S (1) or VERTEX_LABEL_T (2)
   * @param labelingEdge The edge that caused this labeling
   */
  private assignLabel(vertex: number, labelType: number, labelingEdge: number): void {
    const blossom = this.inBlossom[vertex];
    this.label[vertex] = this.label[blossom] = labelType;
    this.labelEnd[vertex] = this.labelEnd[blossom] = labelingEdge;
    this.bestEdge[vertex] = this.bestEdge[blossom] = UNMATCHED;

    if (labelType === VERTEX_LABEL_S) {
      // S-vertices: add all leaves to processing queue
      this.queue.push(...this.blossomLeaves(blossom));
    } else if (labelType === VERTEX_LABEL_T) {
      // T-vertices: label the matched vertex as S
      const baseVertex = this.blossomBase[blossom];
      this.assignLabel(
        this.endpoint[this.mate[baseVertex]],
        VERTEX_LABEL_S,
        this.getOppositeEndpoint(this.mate[baseVertex])
      );
    }
  }

  /**
   * Scan for blossom formation when two S-vertices are connected
   * Returns the base vertex of the blossom, or -1 if it's an augmenting path
   * @param vertex1 First S-vertex
   * @param vertex2 Second S-vertex
   * @returns Base vertex of blossom, or -1 for augmenting path
   */
  private scanBlossom(vertex1: number, vertex2: number): number {
    const path: number[] = [];
    let base = UNMATCHED;
    let current1: number | null = vertex1;
    let current2: number | null = vertex2;

    // Trace paths from both vertices until they meet
    while (current1 !== null || current2 !== null) {
      let blossom: number;
      if (current1 !== null) {
        blossom = this.inBlossom[current1];
      } else {
        blossom = this.inBlossom[current2!];
        current2 = null;
      }

      // Check if we've seen this blossom before (using label bit 4 as marker)
      if (this.label[blossom] & 4) {
        base = this.blossomBase[blossom];
        break;
      }

      // Mark this blossom as visited
      path.push(blossom);
      this.label[blossom] = 5; // Set bit pattern to mark as visited

      // Move to parent in alternating tree
      if (this.labelEnd[blossom] === UNMATCHED) {
        current1 = null;
      } else {
        current1 = this.endpoint[this.labelEnd[blossom]];
        blossom = this.inBlossom[current1];
        current1 = this.endpoint[this.labelEnd[blossom]];
      }

      // Swap the two search paths
      if (current2 !== null) {
        [current1, current2] = [current2, current1];
      }
    }

    // Restore labels for visited blossoms
    path.forEach(blossomIndex => (this.label[blossomIndex] = VERTEX_LABEL_S));
    return base;
  }

  private addBlossom(base: number, k: number): void {
    const v = this.edges[k][0];
    const w = this.edges[k][1];
    const baseBlossom = this.inBlossom[base];
    let vBlossom = this.inBlossom[v];
    let wBlossom = this.inBlossom[w];
    const b = this.unusedBlossoms.pop()!;

    this.blossomBase[b] = base;
    this.blossomParent[b] = UNMATCHED;
    this.blossomParent[baseBlossom] = b;
    const path: number[] = (this.blossomChilds[b] = []);
    const endPs: number[] = (this.blossomEndPs[b] = []);

    while (vBlossom !== baseBlossom) {
      this.blossomParent[vBlossom] = b;
      path.push(vBlossom);
      endPs.push(this.labelEnd[vBlossom]);
      const vNext = this.endpoint[this.labelEnd[vBlossom]];
      vBlossom = this.inBlossom[vNext];
    }
    path.push(baseBlossom);
    path.reverse();
    endPs.reverse();
    endPs.push(EDGE_ENDPOINT_COUNT * k);

    while (wBlossom !== baseBlossom) {
      this.blossomParent[wBlossom] = b;
      path.push(wBlossom);
      endPs.push(this.getOppositeEndpoint(this.labelEnd[wBlossom]));
      const wNext = this.endpoint[this.labelEnd[wBlossom]];
      wBlossom = this.inBlossom[wNext];
    }

    this.label[b] = VERTEX_LABEL_S;
    this.labelEnd[b] = this.labelEnd[baseBlossom];
    this.dualVar[b] = 0;

    const leaves = this.blossomLeaves(b);
    leaves.forEach(vertex => {
      if (this.label[this.inBlossom[vertex]] === VERTEX_LABEL_T) {
        this.queue.push(vertex);
      }
      this.inBlossom[vertex] = b;
    });

    const bestEdgeTo = filledArray(2 * this.nVertex, -1);
    path.forEach(bv => {
      let nbLists: number[][];

      if (this.blossomBestEdges[bv].length === 0) {
        const pathLeaves = this.blossomLeaves(bv);
        nbLists = pathLeaves.map(vertex =>
          this.neighbend[vertex].map(p => this.getEdgeFromEndpoint(p))
        );
      } else {
        nbLists = [this.blossomBestEdges[bv]];
      }

      nbLists.forEach(nbList => {
        nbList.forEach(edgeK => {
          let i = this.edges[edgeK][0];
          let j = this.edges[edgeK][1];

          if (this.inBlossom[j] === b) {
            [i, j] = [j, i];
          }
          const bj = this.inBlossom[j];
          if (
            bj !== b &&
            this.label[bj] === VERTEX_LABEL_S &&
            (bestEdgeTo[bj] === UNMATCHED || this.slack(edgeK) < this.slack(bestEdgeTo[bj]))
          ) {
            bestEdgeTo[bj] = edgeK;
          }
        });
      });
      this.blossomBestEdges[bv] = [];
      this.bestEdge[bv] = UNMATCHED;
    });

    const be = bestEdgeTo.filter(edgeK => edgeK !== UNMATCHED);
    this.blossomBestEdges[b] = be;

    this.bestEdge[b] = this.blossomBestEdges[b].reduce(
      (best, edgeK) => (best === UNMATCHED || this.slack(edgeK) < this.slack(best) ? edgeK : best),
      UNMATCHED
    );
  }

  private expandBlossom(b: number, endStage: boolean): void {
    this.blossomChilds[b].forEach(s => {
      this.blossomParent[s] = -1;
      if (s < this.nVertex) {
        this.inBlossom[s] = s;
      } else if (endStage && this.dualVar[s] === 0) {
        this.expandBlossom(s, endStage);
      } else {
        const leaves = this.blossomLeaves(s);
        leaves.forEach(v => (this.inBlossom[v] = s));
      }
    });

    if (!endStage && this.label[b] === VERTEX_LABEL_T) {
      const entryChild = this.inBlossom[this.endpoint[this.getOppositeEndpoint(this.labelEnd[b])]];
      let j = this.blossomChilds[b].indexOf(entryChild);
      let jStep: number;
      let endpTrick: number;

      if (j & 1) {
        j -= this.blossomChilds[b].length;
        jStep = 1;
        endpTrick = 0;
      } else {
        jStep = -1;
        endpTrick = 1;
      }

      let p = this.labelEnd[b];
      while (j !== 0) {
        this.label[this.endpoint[this.getOppositeEndpoint(p)]] = UNLABELED;
        this.label[this.endpoint[this.blossomEndPs[b].at(j - endpTrick)! ^ endpTrick ^ 1]] =
          UNLABELED;
        this.assignLabel(this.endpoint[this.getOppositeEndpoint(p)], VERTEX_LABEL_T, p);
        this.allowEdge[this.getEdgeFromEndpoint(this.blossomEndPs[b].at(j - endpTrick)!)] = true;
        j += jStep;
        p = this.blossomEndPs[b].at(j - endpTrick)! ^ endpTrick;
        this.allowEdge[this.getEdgeFromEndpoint(p)] = true;
        j += jStep;
      }

      const bv = this.blossomChilds[b].at(j)!;
      this.label[this.endpoint[this.getOppositeEndpoint(p)]] = this.label[bv] = VERTEX_LABEL_T;
      this.labelEnd[this.endpoint[this.getOppositeEndpoint(p)]] = this.labelEnd[bv] = p;
      this.bestEdge[bv] = UNMATCHED;
      j += jStep;

      while (this.blossomChilds[b].at(j) !== entryChild) {
        const currentBv = this.blossomChilds[b].at(j)!;
        if (this.label[currentBv] === VERTEX_LABEL_S) {
          j += jStep;
          continue;
        }
        const leaves = this.blossomLeaves(currentBv);
        const v = leaves.find(vertex => this.label[vertex] !== UNLABELED) ?? UNMATCHED;
        if (this.label[v] !== UNLABELED) {
          this.label[v] = UNLABELED;
          this.label[this.endpoint[this.mate[this.blossomBase[currentBv]]]] = UNLABELED;
          this.assignLabel(v, VERTEX_LABEL_T, this.labelEnd[v]);
        }
        j += jStep;
      }
    }

    this.label[b] = this.labelEnd[b] = UNMATCHED;
    this.blossomEndPs[b] = [];
    this.blossomChilds[b] = [];
    this.blossomBase[b] = UNMATCHED;
    this.blossomBestEdges[b] = [];
    this.bestEdge[b] = UNMATCHED;
    this.unusedBlossoms.push(b);
  }

  private augmentBlossom(b: number, v: number): void {
    let currentBlossom = v;
    while (this.blossomParent[currentBlossom] !== b) {
      currentBlossom = this.blossomParent[currentBlossom];
    }
    if (currentBlossom > this.nVertex) {
      this.augmentBlossom(currentBlossom, v);
    }

    const baseIndex = this.blossomChilds[b].indexOf(currentBlossom);
    let childIndex = baseIndex;
    let jStep: number;
    let endpTrick: number;

    if (baseIndex & 1) {
      childIndex -= this.blossomChilds[b].length;
      jStep = 1;
      endpTrick = 0;
    } else {
      jStep = -1;
      endpTrick = 1;
    }

    while (childIndex !== 0) {
      childIndex += jStep;
      let childBlossom = this.blossomChilds[b].at(childIndex)!;
      const p = this.blossomEndPs[b].at(childIndex - endpTrick)! ^ endpTrick;
      if (childBlossom >= this.nVertex) {
        this.augmentBlossom(childBlossom, this.endpoint[p]);
      }
      childIndex += jStep;
      childBlossom = this.blossomChilds[b].at(childIndex)!;
      if (childBlossom >= this.nVertex) {
        this.augmentBlossom(childBlossom, this.endpoint[this.getOppositeEndpoint(p)]);
      }
      this.mate[this.endpoint[p]] = this.getOppositeEndpoint(p);
      this.mate[this.endpoint[this.getOppositeEndpoint(p)]] = p;
    }

    this.blossomChilds[b] = this.blossomChilds[b]
      .slice(baseIndex)
      .concat(this.blossomChilds[b].slice(0, baseIndex));
    this.blossomEndPs[b] = this.blossomEndPs[b]
      .slice(baseIndex)
      .concat(this.blossomEndPs[b].slice(0, baseIndex));
    this.blossomBase[b] = this.blossomBase[this.blossomChilds[b][0]];
  }

  private augmentMatching(k: number): void {
    const v = this.edges[k][0];
    const w = this.edges[k][1];

    for (let ii = 0; ii < 2; ii++) {
      let s: number;
      let p: number;

      if (ii === 0) {
        s = v;
        p = EDGE_ENDPOINT_COUNT * k + 1;
      } else {
        s = w;
        p = EDGE_ENDPOINT_COUNT * k;
      }

      while (true) {
        const bs = this.inBlossom[s];
        if (bs >= this.nVertex) {
          this.augmentBlossom(bs, s);
        }
        this.mate[s] = p;
        if (this.labelEnd[bs] === UNMATCHED) break;

        const t = this.endpoint[this.labelEnd[bs]];
        const bt = this.inBlossom[t];
        s = this.endpoint[this.labelEnd[bt]];
        const j = this.endpoint[this.getOppositeEndpoint(this.labelEnd[bt])];

        if (bt >= this.nVertex) {
          this.augmentBlossom(bt, j);
        }
        this.mate[j] = this.labelEnd[bt];
        p = this.getOppositeEndpoint(this.labelEnd[bt]);
      }
    }
  }
}

// Helper functions
/**
 * Creates an array filled with the specified value
 */
function filledArray<T>(len: number, fill: T): T[] {
  return new Array(len).fill(fill);
}

/**
 * Initializes a 2D array with empty arrays
 */
function initArrArr(len: number): number[][] {
  return Array.from({ length: len }, () => []);
}

/**
 * Gets the minimum value in a subarray
 */
function getMin(arr: number[], start: number, end: number): number {
  return Math.min(...arr.slice(start, end + 1));
}
