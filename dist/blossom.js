"use strict";
/*Converted to TS from JS by GitHub Copilot. Original JS by Matt Krick from Python: http://jorisvr.nl/maximummatching.html*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = blossom;
/**
 * Edmonds' Blossom algorithm for maximum weight matching
 * @param edges Array of edges, each edge is [vertex1, vertex2, weight]
 * @param maxCardinality If true, find maximum cardinality matching instead of maximum weight
 * @returns Array representing the matching, where index is vertex and value is matched vertex (-1 if unmatched)
 */
function blossom(edges, maxCardinality) {
    if (edges.length === 0) {
        return [];
    }
    const edmonds = new Edmonds(edges, maxCardinality || false);
    return edmonds.maxWeightMatching();
}
class Edmonds {
    constructor(edges, maxCardinality) {
        this.edges = edges;
        this.maxCardinality = maxCardinality;
        this.nEdge = edges.length;
        // Calculate nVertex
        let nVertex = 0;
        for (let k = 0; k < this.nEdge; k++) {
            const i = this.edges[k][0];
            const j = this.edges[k][1];
            if (i >= nVertex)
                nVertex = i + 1;
            if (j >= nVertex)
                nVertex = j + 1;
        }
        this.nVertex = nVertex;
        // Calculate maxWeight
        let maxWeight = 0;
        for (let k = 0; k < this.nEdge; k++) {
            const weight = this.edges[k][2];
            if (weight > maxWeight) {
                maxWeight = weight;
            }
        }
        this.maxWeight = maxWeight;
        // Initialize endpoint
        const endpoint = [];
        for (let p = 0; p < 2 * this.nEdge; p++) {
            endpoint[p] = this.edges[Math.floor(p / 2)][p % 2];
        }
        this.endpoint = endpoint;
        // Initialize neighbend
        const neighbend = initArrArr(this.nVertex);
        for (let k = 0; k < this.nEdge; k++) {
            const i = this.edges[k][0];
            const j = this.edges[k][1];
            neighbend[i].push(2 * k + 1);
            neighbend[j].push(2 * k);
        }
        this.neighbend = neighbend;
        // Initialize other arrays
        this.mate = filledArray(this.nVertex, -1);
        this.label = filledArray(2 * this.nVertex, 0);
        this.labelEnd = filledArray(2 * this.nVertex, -1);
        // Initialize inBlossom
        const inBlossom = [];
        for (let i = 0; i < this.nVertex; i++) {
            inBlossom[i] = i;
        }
        this.inBlossom = inBlossom;
        this.blossomParent = filledArray(2 * this.nVertex, -1);
        this.blossomChilds = initArrArr(2 * this.nVertex);
        // Initialize blossomBase
        const base = [];
        for (let i = 0; i < this.nVertex; i++) {
            base[i] = i;
        }
        const negs = filledArray(this.nVertex, -1);
        this.blossomBase = base.concat(negs);
        this.blossomEndPs = initArrArr(2 * this.nVertex);
        this.bestEdge = filledArray(2 * this.nVertex, -1);
        this.blossomBestEdges = initArrArr(2 * this.nVertex);
        // Initialize unusedBlossoms
        const unusedBlossoms = [];
        for (let i = this.nVertex; i < 2 * this.nVertex; i++) {
            unusedBlossoms.push(i);
        }
        this.unusedBlossoms = unusedBlossoms;
        // Initialize dualVar
        const mw = filledArray(this.nVertex, this.maxWeight);
        const zeros = filledArray(this.nVertex, 0);
        this.dualVar = mw.concat(zeros);
        this.allowEdge = filledArray(this.nEdge, false);
        this.queue = [];
    }
    maxWeightMatching() {
        for (let t = 0; t < this.nVertex; t++) {
            this.label = filledArray(2 * this.nVertex, 0);
            this.bestEdge = filledArray(2 * this.nVertex, -1);
            this.blossomBestEdges = initArrArr(2 * this.nVertex);
            this.allowEdge = filledArray(this.nEdge, false);
            this.queue = [];
            for (let v = 0; v < this.nVertex; v++) {
                if (this.mate[v] === -1 && this.label[this.inBlossom[v]] === 0) {
                    this.assignLabel(v, 1, -1);
                }
            }
            let augmented = false;
            while (true) {
                while (this.queue.length > 0 && !augmented) {
                    const v = this.queue.pop();
                    for (let ii = 0; ii < this.neighbend[v].length; ii++) {
                        const p = this.neighbend[v][ii];
                        const k = Math.floor(p / 2);
                        const w = this.endpoint[p];
                        if (this.inBlossom[v] === this.inBlossom[w])
                            continue;
                        if (!this.allowEdge[k]) {
                            const kSlack = this.slack(k);
                            if (kSlack <= 0) {
                                this.allowEdge[k] = true;
                            }
                        }
                        if (this.allowEdge[k]) {
                            if (this.label[this.inBlossom[w]] === 0) {
                                this.assignLabel(w, 2, p ^ 1);
                            }
                            else if (this.label[this.inBlossom[w]] === 1) {
                                const base = this.scanBlossom(v, w);
                                if (base >= 0) {
                                    this.addBlossom(base, k);
                                }
                                else {
                                    this.augmentMatching(k);
                                    augmented = true;
                                    break;
                                }
                            }
                            else if (this.label[w] === 0) {
                                this.label[w] = 2;
                                this.labelEnd[w] = p ^ 1;
                            }
                        }
                        else if (this.label[this.inBlossom[w]] === 1) {
                            const b = this.inBlossom[v];
                            const kSlack = this.slack(k);
                            if (this.bestEdge[b] === -1 || kSlack < this.slack(this.bestEdge[b])) {
                                this.bestEdge[b] = k;
                            }
                        }
                        else if (this.label[w] === 0) {
                            const kSlack = this.slack(k);
                            if (this.bestEdge[w] === -1 || kSlack < this.slack(this.bestEdge[w])) {
                                this.bestEdge[w] = k;
                            }
                        }
                    }
                }
                if (augmented)
                    break;
                let deltaType = -1;
                let delta = 0;
                let deltaEdge = -1;
                let deltaBlossom = -1;
                if (!this.maxCardinality) {
                    deltaType = 1;
                    delta = getMin(this.dualVar, 0, this.nVertex - 1);
                }
                for (let v = 0; v < this.nVertex; v++) {
                    if (this.label[this.inBlossom[v]] === 0 && this.bestEdge[v] !== -1) {
                        const d = this.slack(this.bestEdge[v]);
                        if (deltaType === -1 || d < delta) {
                            delta = d;
                            deltaType = 2;
                            deltaEdge = this.bestEdge[v];
                        }
                    }
                }
                for (let b = 0; b < 2 * this.nVertex; b++) {
                    if (this.blossomParent[b] === -1 && this.label[b] === 1 && this.bestEdge[b] !== -1) {
                        const kSlack = this.slack(this.bestEdge[b]);
                        const d = kSlack / 2;
                        if (deltaType === -1 || d < delta) {
                            delta = d;
                            deltaType = 3;
                            deltaEdge = this.bestEdge[b];
                        }
                    }
                }
                for (let b = this.nVertex; b < this.nVertex * 2; b++) {
                    if (this.blossomBase[b] >= 0 && this.blossomParent[b] === -1 && this.label[b] === 2 &&
                        (deltaType === -1 || this.dualVar[b] < delta)) {
                        delta = this.dualVar[b];
                        deltaType = 4;
                        deltaBlossom = b;
                    }
                }
                if (deltaType === -1) {
                    deltaType = 1;
                    delta = Math.max(0, getMin(this.dualVar, 0, this.nVertex - 1));
                }
                for (let v = 0; v < this.nVertex; v++) {
                    const curLabel = this.label[this.inBlossom[v]];
                    if (curLabel === 1) {
                        this.dualVar[v] -= delta;
                    }
                    else if (curLabel === 2) {
                        this.dualVar[v] += delta;
                    }
                }
                for (let b = this.nVertex; b < this.nVertex * 2; b++) {
                    if (this.blossomBase[b] >= 0 && this.blossomParent[b] === -1) {
                        if (this.label[b] === 1) {
                            this.dualVar[b] += delta;
                        }
                        else if (this.label[b] === 2) {
                            this.dualVar[b] -= delta;
                        }
                    }
                }
                if (deltaType === 1) {
                    break;
                }
                else if (deltaType === 2) {
                    this.allowEdge[deltaEdge] = true;
                    let i = this.edges[deltaEdge][0];
                    let j = this.edges[deltaEdge][1];
                    if (this.label[this.inBlossom[i]] === 0) {
                        [i, j] = [j, i];
                    }
                    this.queue.push(i);
                }
                else if (deltaType === 3) {
                    this.allowEdge[deltaEdge] = true;
                    const i = this.edges[deltaEdge][0];
                    this.queue.push(i);
                }
                else if (deltaType === 4) {
                    this.expandBlossom(deltaBlossom, false);
                }
            }
            if (!augmented)
                break;
            for (let b = this.nVertex; b < this.nVertex * 2; b++) {
                if (this.blossomParent[b] === -1 && this.blossomBase[b] >= 0 &&
                    this.label[b] === 1 && this.dualVar[b] === 0) {
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
    slack(k) {
        const i = this.edges[k][0];
        const j = this.edges[k][1];
        const wt = this.edges[k][2];
        return this.dualVar[i] + this.dualVar[j] - 2 * wt;
    }
    blossomLeaves(b) {
        if (b < this.nVertex) {
            return [b];
        }
        const leaves = [];
        const childList = this.blossomChilds[b];
        for (let t = 0; t < childList.length; t++) {
            if (childList[t] <= this.nVertex) {
                leaves.push(childList[t]);
            }
            else {
                const leafList = this.blossomLeaves(childList[t]);
                for (let v = 0; v < leafList.length; v++) {
                    leaves.push(leafList[v]);
                }
            }
        }
        return leaves;
    }
    assignLabel(w, t, p) {
        const b = this.inBlossom[w];
        this.label[w] = this.label[b] = t;
        this.labelEnd[w] = this.labelEnd[b] = p;
        this.bestEdge[w] = this.bestEdge[b] = -1;
        if (t === 1) {
            this.queue.push(...this.blossomLeaves(b));
        }
        else if (t === 2) {
            const base = this.blossomBase[b];
            this.assignLabel(this.endpoint[this.mate[base]], 1, this.mate[base] ^ 1);
        }
    }
    scanBlossom(v, w) {
        const path = [];
        let base = -1;
        let vCurrent = v;
        let wCurrent = w;
        while (vCurrent !== null || wCurrent !== null) {
            let b;
            if (vCurrent !== null) {
                b = this.inBlossom[vCurrent];
            }
            else {
                b = this.inBlossom[wCurrent];
                wCurrent = null;
            }
            if ((this.label[b] & 4)) {
                base = this.blossomBase[b];
                break;
            }
            path.push(b);
            this.label[b] = 5;
            if (this.labelEnd[b] === -1) {
                vCurrent = null;
            }
            else {
                vCurrent = this.endpoint[this.labelEnd[b]];
                b = this.inBlossom[vCurrent];
                vCurrent = this.endpoint[this.labelEnd[b]];
            }
            if (wCurrent !== null) {
                [vCurrent, wCurrent] = [wCurrent, vCurrent];
            }
        }
        for (let ii = 0; ii < path.length; ii++) {
            const b = path[ii];
            this.label[b] = 1;
        }
        return base;
    }
    addBlossom(base, k) {
        const v = this.edges[k][0];
        const w = this.edges[k][1];
        const bb = this.inBlossom[base];
        let bv = this.inBlossom[v];
        let bw = this.inBlossom[w];
        const b = this.unusedBlossoms.pop();
        this.blossomBase[b] = base;
        this.blossomParent[b] = -1;
        this.blossomParent[bb] = b;
        const path = this.blossomChilds[b] = [];
        const endPs = this.blossomEndPs[b] = [];
        while (bv !== bb) {
            this.blossomParent[bv] = b;
            path.push(bv);
            endPs.push(this.labelEnd[bv]);
            const vNext = this.endpoint[this.labelEnd[bv]];
            bv = this.inBlossom[vNext];
        }
        path.push(bb);
        path.reverse();
        endPs.reverse();
        endPs.push(2 * k);
        while (bw !== bb) {
            this.blossomParent[bw] = b;
            path.push(bw);
            endPs.push(this.labelEnd[bw] ^ 1);
            const wNext = this.endpoint[this.labelEnd[bw]];
            bw = this.inBlossom[wNext];
        }
        this.label[b] = 1;
        this.labelEnd[b] = this.labelEnd[bb];
        this.dualVar[b] = 0;
        const leaves = this.blossomLeaves(b);
        for (let ii = 0; ii < leaves.length; ii++) {
            const vertex = leaves[ii];
            if (this.label[this.inBlossom[vertex]] === 2) {
                this.queue.push(vertex);
            }
            this.inBlossom[vertex] = b;
        }
        const bestEdgeTo = filledArray(2 * this.nVertex, -1);
        for (let ii = 0; ii < path.length; ii++) {
            bv = path[ii];
            let nbLists;
            if (this.blossomBestEdges[bv].length === 0) {
                nbLists = [];
                const pathLeaves = this.blossomLeaves(bv);
                for (let x = 0; x < pathLeaves.length; x++) {
                    const vertex = pathLeaves[x];
                    nbLists[x] = [];
                    for (let y = 0; y < this.neighbend[vertex].length; y++) {
                        const p = this.neighbend[vertex][y];
                        nbLists[x].push(Math.floor(p / 2));
                    }
                }
            }
            else {
                nbLists = [this.blossomBestEdges[bv]];
            }
            for (let x = 0; x < nbLists.length; x++) {
                const nbList = nbLists[x];
                for (let y = 0; y < nbList.length; y++) {
                    const edgeK = nbList[y];
                    let i = this.edges[edgeK][0];
                    let j = this.edges[edgeK][1];
                    if (this.inBlossom[j] === b) {
                        [i, j] = [j, i];
                    }
                    const bj = this.inBlossom[j];
                    if (bj !== b && this.label[bj] === 1 &&
                        (bestEdgeTo[bj] === -1 || this.slack(edgeK) < this.slack(bestEdgeTo[bj]))) {
                        bestEdgeTo[bj] = edgeK;
                    }
                }
            }
            this.blossomBestEdges[bv] = [];
            this.bestEdge[bv] = -1;
        }
        const be = [];
        for (let ii = 0; ii < bestEdgeTo.length; ii++) {
            const edgeK = bestEdgeTo[ii];
            if (edgeK !== -1) {
                be.push(edgeK);
            }
        }
        this.blossomBestEdges[b] = be;
        this.bestEdge[b] = -1;
        for (let ii = 0; ii < this.blossomBestEdges[b].length; ii++) {
            const edgeK = this.blossomBestEdges[b][ii];
            if (this.bestEdge[b] === -1 || this.slack(edgeK) < this.slack(this.bestEdge[b])) {
                this.bestEdge[b] = edgeK;
            }
        }
    }
    expandBlossom(b, endStage) {
        for (let ii = 0; ii < this.blossomChilds[b].length; ii++) {
            const s = this.blossomChilds[b][ii];
            this.blossomParent[s] = -1;
            if (s < this.nVertex) {
                this.inBlossom[s] = s;
            }
            else if (endStage && this.dualVar[s] === 0) {
                this.expandBlossom(s, endStage);
            }
            else {
                const leaves = this.blossomLeaves(s);
                for (let jj = 0; jj < leaves.length; jj++) {
                    const v = leaves[jj];
                    this.inBlossom[v] = s;
                }
            }
        }
        if (!endStage && this.label[b] === 2) {
            const entryChild = this.inBlossom[this.endpoint[this.labelEnd[b] ^ 1]];
            let j = this.blossomChilds[b].indexOf(entryChild);
            let jStep;
            let endpTrick;
            if ((j & 1)) {
                j -= this.blossomChilds[b].length;
                jStep = 1;
                endpTrick = 0;
            }
            else {
                jStep = -1;
                endpTrick = 1;
            }
            let p = this.labelEnd[b];
            while (j !== 0) {
                this.label[this.endpoint[p ^ 1]] = 0;
                this.label[this.endpoint[pIndex(this.blossomEndPs[b], j - endpTrick) ^ endpTrick ^ 1]] = 0;
                this.assignLabel(this.endpoint[p ^ 1], 2, p);
                this.allowEdge[Math.floor(pIndex(this.blossomEndPs[b], j - endpTrick) / 2)] = true;
                j += jStep;
                p = pIndex(this.blossomEndPs[b], j - endpTrick) ^ endpTrick;
                this.allowEdge[Math.floor(p / 2)] = true;
                j += jStep;
            }
            const bv = pIndex(this.blossomChilds[b], j);
            this.label[this.endpoint[p ^ 1]] = this.label[bv] = 2;
            this.labelEnd[this.endpoint[p ^ 1]] = this.labelEnd[bv] = p;
            this.bestEdge[bv] = -1;
            j += jStep;
            while (pIndex(this.blossomChilds[b], j) !== entryChild) {
                const currentBv = pIndex(this.blossomChilds[b], j);
                if (this.label[currentBv] === 1) {
                    j += jStep;
                    continue;
                }
                const leaves = this.blossomLeaves(currentBv);
                let v = -1;
                for (let ii = 0; ii < leaves.length; ii++) {
                    v = leaves[ii];
                    if (this.label[v] !== 0)
                        break;
                }
                if (this.label[v] !== 0) {
                    this.label[v] = 0;
                    this.label[this.endpoint[this.mate[this.blossomBase[currentBv]]]] = 0;
                    this.assignLabel(v, 2, this.labelEnd[v]);
                }
                j += jStep;
            }
        }
        this.label[b] = this.labelEnd[b] = -1;
        this.blossomEndPs[b] = this.blossomChilds[b] = [];
        this.blossomBase[b] = -1;
        this.blossomBestEdges[b] = [];
        this.bestEdge[b] = -1;
        this.unusedBlossoms.push(b);
    }
    augmentBlossom(b, v) {
        let t = v;
        while (this.blossomParent[t] !== b) {
            t = this.blossomParent[t];
        }
        if (t > this.nVertex) {
            this.augmentBlossom(t, v);
        }
        const i = this.blossomChilds[b].indexOf(t);
        let j = i;
        let jStep;
        let endpTrick;
        if ((i & 1)) {
            j -= this.blossomChilds[b].length;
            jStep = 1;
            endpTrick = 0;
        }
        else {
            jStep = -1;
            endpTrick = 1;
        }
        while (j !== 0) {
            j += jStep;
            t = pIndex(this.blossomChilds[b], j);
            const p = pIndex(this.blossomEndPs[b], j - endpTrick) ^ endpTrick;
            if (t >= this.nVertex) {
                this.augmentBlossom(t, this.endpoint[p]);
            }
            j += jStep;
            t = pIndex(this.blossomChilds[b], j);
            if (t >= this.nVertex) {
                this.augmentBlossom(t, this.endpoint[p ^ 1]);
            }
            this.mate[this.endpoint[p]] = p ^ 1;
            this.mate[this.endpoint[p ^ 1]] = p;
        }
        this.blossomChilds[b] = this.blossomChilds[b].slice(i).concat(this.blossomChilds[b].slice(0, i));
        this.blossomEndPs[b] = this.blossomEndPs[b].slice(i).concat(this.blossomEndPs[b].slice(0, i));
        this.blossomBase[b] = this.blossomBase[this.blossomChilds[b][0]];
    }
    augmentMatching(k) {
        const v = this.edges[k][0];
        const w = this.edges[k][1];
        for (let ii = 0; ii < 2; ii++) {
            let s;
            let p;
            if (ii === 0) {
                s = v;
                p = 2 * k + 1;
            }
            else {
                s = w;
                p = 2 * k;
            }
            while (true) {
                const bs = this.inBlossom[s];
                if (bs >= this.nVertex) {
                    this.augmentBlossom(bs, s);
                }
                this.mate[s] = p;
                if (this.labelEnd[bs] === -1)
                    break;
                const t = this.endpoint[this.labelEnd[bs]];
                const bt = this.inBlossom[t];
                s = this.endpoint[this.labelEnd[bt]];
                const j = this.endpoint[this.labelEnd[bt] ^ 1];
                if (bt >= this.nVertex) {
                    this.augmentBlossom(bt, j);
                }
                this.mate[j] = this.labelEnd[bt];
                p = this.labelEnd[bt] ^ 1;
            }
        }
    }
}
// Helper functions
function filledArray(len, fill) {
    const newArray = [];
    for (let i = 0; i < len; i++) {
        newArray[i] = fill;
    }
    return newArray;
}
function initArrArr(len) {
    const arr = [];
    for (let i = 0; i < len; i++) {
        arr[i] = [];
    }
    return arr;
}
function getMin(arr, start, end) {
    let min = Infinity;
    for (let i = start; i <= end; i++) {
        if (arr[i] < min) {
            min = arr[i];
        }
    }
    return min;
}
function pIndex(arr, idx) {
    // if idx is negative, go from the back
    return idx < 0 ? arr[arr.length + idx] : arr[idx];
}
// For CommonJS compatibility
module.exports = blossom;
