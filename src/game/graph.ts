// CYBERNODE - Graph Theory Game
// Graph Logic Module

export type NodeType = 'entry' | 'neutral' | 'firewall' | 'mainframe';

export interface Node {
  id: number;
  x: number;
  y: number;
  type: NodeType;
  visited: boolean;
  dataValue: number; // Quantidade de dados que o nó vale
}

export interface Edge {
  from: number;
  to: number;
  weight: number;
  isPath: boolean;
}

export interface Graph {
  nodes: Node[];
  adjacencyList: Map<number, Edge[]>;
}

// Node colors for rendering
export const NODE_COLORS: Record<NodeType, string> = {
  entry: '#00FF88',      // Green - Start
  neutral: '#00D4FF',    // Cyan - Passage
  firewall: '#FF3366',   // Red - Danger
  mainframe: '#FFD700',  // Gold - Objective
};

// Edge colors
export const EDGE_COLORS = {
  normal: '#1a1a2e',
  path: '#00FF88',
  firewall: '#FF3366',
};

export class CyberGraph {
  private nodes: Node[] = [];
  private adjacencyList: Map<number, Edge[]> = new Map();
  private nodeRadius = 25;
  private canvasWidth: number;
  private canvasHeight: number;
  private difficulty: number = 0;

  constructor(width: number, height: number, difficulty: number = 0) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.difficulty = difficulty;
    this.generateGraph();
  }

  private generateGraph(): void {
    // Increase nodes based on difficulty (more moves = harder = more nodes)
    const numNodes = 12 + Math.floor(this.difficulty * 3);
    const padding = 80;
    const minDistance = 120 - (this.difficulty * 5); // Nodes get closer together
    
    // Node radius decreases with difficulty (min 12px)
    this.nodeRadius = Math.max(12, 25 - (this.difficulty * 2));

    // Generate non-overlapping nodes using force-directed-like approach
    let attempts = 0;
    const maxAttempts = 1000;

    while (this.nodes.length < numNodes && attempts < maxAttempts) {
      const x = padding + Math.random() * (this.canvasWidth - 2 * padding);
      const y = padding + Math.random() * (this.canvasHeight - 2 * padding);

      let overlaps = false;
      for (const node of this.nodes) {
        const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        if (dist < minDistance) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.nodes.push({
          id: this.nodes.length,
          x,
          y,
          type: 'neutral',
          visited: false,
          dataValue: 10 + Math.floor(Math.random() * 20), // 10-30 dados
        });
      }
      attempts++;
    }

    // Set node types
    if (this.nodes.length > 0) {
      // Entry node (start) - left side
      let minDistEntry = Infinity;
      let entryIdx = 0;
      this.nodes.forEach((node, idx) => {
        const dist = node.x + node.y;
        if (dist < minDistEntry) {
          minDistEntry = dist;
          entryIdx = idx;
        }
      });
      this.nodes[entryIdx].type = 'entry';

      // Mainframe (objective) - right side
      let maxDistMainframe = -Infinity;
      let mainframeIdx = 0;
      this.nodes.forEach((node, idx) => {
        const dist = node.x + node.y;
        if (dist > maxDistMainframe && node.type !== 'entry') {
          maxDistMainframe = dist;
          mainframeIdx = idx;
        }
      });
      this.nodes[mainframeIdx].type = 'mainframe';

      // Add some firewall nodes randomly
      const neutralNodes = this.nodes
        .filter(n => n.type === 'neutral')
        .map((_, idx) => idx + this.nodes.findIndex(n => n.type === 'entry') + 1)
        .slice(0, 3);
      
      neutralNodes.forEach(idx => {
        if (idx < this.nodes.length && this.nodes[idx].type === 'neutral') {
          this.nodes[idx].type = 'firewall';
        }
      });
      
      // Set data values based on node type
      this.nodes.forEach(node => {
        switch (node.type) {
          case 'entry':
            node.dataValue = 0;
            break;
          case 'firewall':
            node.dataValue = 0; // Firewall não tem dados para extrair
            break;
          case 'mainframe':
            node.dataValue = 50 + Math.floor(Math.random() * 50); // 50-100 dados
            break;
          // neutral já tem valor definido na criação (10-30)
        }
      });
    }

    // Initialize adjacency list
    this.nodes.forEach(node => {
      this.adjacencyList.set(node.id, []);
    });

    // Create edges - connect each node to 2-4 nearest neighbors
    for (let i = 0; i < this.nodes.length; i++) {
      const distances: { to: number; dist: number }[] = [];
      
      for (let j = 0; j < this.nodes.length; j++) {
        if (i !== j) {
          const dist = Math.sqrt(
            (this.nodes[i].x - this.nodes[j].x) ** 2 +
            (this.nodes[i].y - this.nodes[j].y) ** 2
          );
          distances.push({ to: j, dist });
        }
      }

      distances.sort((a, b) => a.dist - b.dist);
      
      // Connect to 2-4 nearest neighbors
      const numConnections = Math.min(2 + Math.floor(Math.random() * 3), distances.length);
      for (let k = 0; k < numConnections; k++) {
        const targetNode = this.nodes[distances[k].to];
        
        // Calculate weight based on distance and node types
        let weight = Math.floor(distances[k].dist / 10);
        
        // Higher weight for firewall connections
        if (targetNode.type === 'firewall') {
          weight += 15;
        }
        
        // Add edge if not exists
        const existingEdges = this.adjacencyList.get(i) || [];
        const exists = existingEdges.some(e => e.to === distances[k].to);
        
        if (!exists) {
          this.adjacencyList.get(i)?.push({
            from: i,
            to: distances[k].to,
            weight,
            isPath: false,
          });
          
          // Add reverse edge for undirected graph
          this.adjacencyList.get(distances[k].to)?.push({
            from: distances[k].to,
            to: i,
            weight,
            isPath: false,
          });
        }
      }
    }
  }

  getNodes(): Node[] {
    return this.nodes;
  }

  getAdjacencyList(): Map<number, Edge[]> {
    return this.adjacencyList;
  }

  getNode(id: number): Node | undefined {
    return this.nodes.find(n => n.id === id);
  }

  getEdges(): Edge[] {
    const edges: Edge[] = [];
    this.adjacencyList.forEach(edgeList => {
      edges.push(...edgeList);
    });
    return edges;
  }

  getNeighbors(nodeId: number): Edge[] {
    return this.adjacencyList.get(nodeId) || [];
  }

  resetVisited(): void {
    this.nodes.forEach(node => {
      node.visited = false;
    });
    this.adjacencyList.forEach(edgeList => {
      edgeList.forEach(edge => {
        edge.isPath = false;
      });
    });
  }

  // Dijkstra's algorithm to find minimum path
  dijkstra(startId: number, endId: number): number[] | null {
    const distances: Map<number, number> = new Map();
    const previous: Map<number, number | null> = new Map();
    const unvisited = new Set<number>();

    // Initialize
    this.nodes.forEach(node => {
      distances.set(node.id, Infinity);
      previous.set(node.id, null);
      unvisited.add(node.id);
    });

    distances.set(startId, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let minDist = Infinity;
      let current: number | null = null;

      unvisited.forEach(nodeId => {
        const dist = distances.get(nodeId) || Infinity;
        if (dist < minDist) {
          minDist = dist;
          current = nodeId;
        }
      });

      if (current === null || minDist === Infinity) break;
      if (current === endId) break;

      unvisited.delete(current);

      // Update distances to neighbors
      const neighbors = this.getNeighbors(current);
      neighbors.forEach(edge => {
        if (unvisited.has(edge.to)) {
          const newDist = (distances.get(current!) || 0) + edge.weight;
          if (newDist < (distances.get(edge.to) || Infinity)) {
            distances.set(edge.to, newDist);
            previous.set(edge.to, current);
          }
        }
      });
    }

    // Reconstruct path
    const path: number[] = [];
    let current: number | null = endId;

    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    if (path[0] !== startId) return null;

    // Mark edges as path
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      
      const edges = this.adjacencyList.get(from);
      if (edges) {
        const edge = edges.find(e => e.to === to);
        if (edge) {
          edge.isPath = true;
        }
      }
    }

    return path;
  }

  getNodeRadius(): number {
    return this.nodeRadius;
  }
}
