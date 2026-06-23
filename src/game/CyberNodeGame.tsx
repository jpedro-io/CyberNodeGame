import { useEffect, useRef, useState, useCallback } from 'react';
import { CyberGraph, Node, Edge, NODE_COLORS } from './graph';
import { AudioSystem } from './audio';

interface CyberNodeGameProps {
  width?: number;
  height?: number;
}

type GameState = 'playing' | 'victory' | 'defeat';

export function CyberNodeGame({ width = 900, height = 600 }: CyberNodeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<CyberGraph | null>(null);
  const audioRef = useRef<AudioSystem | null>(null);
  
  const [gameState, setGameState] = useState<GameState>('playing');
  const [currentNodeId, setCurrentNodeId] = useState<number>(0);
  const [traceLevel, setTraceLevel] = useState<number>(0);
  const [dataExtracted, setDataExtracted] = useState<number>(0);
  const [showPath, setShowPath] = useState<boolean>(false);
  const [pathCost, setPathCost] = useState<number>(0);
  const [firewallMessage, setFirewallMessage] = useState<string>('');
  const [traversedEdges, setTraversedEdges] = useState<string[]>([]);
  const [movesCount, setMovesCount] = useState<number>(0);
  const [audioStarted, setAudioStarted] = useState<boolean>(false);
  
  const maxTrace = 100;
  const pathRevealCost = 15;

  // Initialize game
  useEffect(() => {
    graphRef.current = new CyberGraph(width, height, 0);
    audioRef.current = new AudioSystem();
    
    // Set initial node
    const nodes = graphRef.current.getNodes();
    const entryNode = nodes.find(n => n.type === 'entry');
    if (entryNode) {
      entryNode.visited = true;
      setCurrentNodeId(entryNode.id);
    }
    
    // Calculate initial path cost
    const mainframe = nodes.find(n => n.type === 'mainframe');
    if (entryNode && mainframe) {
      const path = graphRef.current.dijkstra(entryNode.id, mainframe.id);
      if (path) {
        let cost = 0;
        for (let i = 0; i < path.length - 1; i++) {
          const edges = graphRef.current.getNeighbors(path[i]);
          const edge = edges.find(e => e.to === path[i + 1]);
          if (edge) cost += edge.weight;
        }
        setPathCost(cost);
      }
    }
    
    // Start BGM on first user interaction (browsers block autoplay)
    const startOnInteraction = () => {
      audioRef.current?.startBGM();
      setAudioStarted(true);
      window.removeEventListener('click', startOnInteraction);
      window.removeEventListener('keydown', startOnInteraction);
    };
    window.addEventListener('click', startOnInteraction);
    window.addEventListener('keydown', startOnInteraction);
    // Also try starting immediately (in case of autoplay allowance)
    audioRef.current.startBGM().then(() => setAudioStarted(true));

    return () => {
      window.removeEventListener('click', startOnInteraction);
      window.removeEventListener('keydown', startOnInteraction);
      audioRef.current?.stop();
    };
  }, [width, height]);

  // Game loop for rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    
    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0D1117';
      ctx.fillRect(0, 0, width, height);
      
      // Draw grid background
      drawGrid(ctx, width, height);
      
      const graph = graphRef.current;
      if (!graph) return;
      
      const nodes = graph.getNodes();
      const edges = graph.getEdges();
      
      // Draw edges
      edges.forEach(edge => {
        const fromNode = nodes[edge.from];
        const toNode = nodes[edge.to];
        
        if (fromNode && toNode) {
          let color = '#1a1a2e';
          let lineWidth = 2;
          
          // Check if edge is traversed
          const edgeKey = `${Math.min(edge.from, edge.to)}-${Math.max(edge.from, edge.to)}`;
          const isTraversed = traversedEdges.includes(edgeKey);
          
          if (isTraversed) {
            color = '#00FF88';
            lineWidth = 4;
          } else if (edge.isPath && showPath) {
            color = '#00FF88';
            lineWidth = 3;
          } else if (toNode.type === 'firewall') {
            color = '#FF336680';
          }
          
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.lineTo(toNode.x, toNode.y);
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
          
          // Draw edge weight
          if (!edge.isPath || showPath) {
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            
            ctx.fillStyle = '#0D1117';
            ctx.beginPath();
            ctx.arc(midX, midY, 12, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = edge.isPath && showPath ? '#00FF88' : '#666';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(edge.weight.toString(), midX, midY);
          }
        }
      });
      
      // Draw nodes
      nodes.forEach(node => {
        drawNode(ctx, node, node.id === currentNodeId);
      });
      
      // Draw HUD
      drawHUD(ctx, width, traceLevel, dataExtracted, maxTrace, pathCost);
      
      // Draw firewall message if active
      if (firewallMessage) {
        drawFirewallAlert(ctx, width, height, firewallMessage);
      }
      
      // Draw game over overlays
      if (gameState === 'victory') {
        drawOverlay(ctx, width, height, 'ACESSO CONCEDIDO', 'Mainframe Dominado', '#00FF88');
      } else if (gameState === 'defeat') {
        drawOverlay(ctx, width, height, 'SINAL RASTREADO', 'Conexão Abortada', '#FF3366');
      }
      
      animationId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [currentNodeId, traceLevel, dataExtracted, gameState, showPath, traversedEdges, width, height]);

  // Handle click on canvas
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    const graph = graphRef.current;
    const audio = audioRef.current;
    
    if (!canvas || !graph || !audio) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const nodes = graph.getNodes();
    const nodeRadius = graph.getNodeRadius();
    
    // Check if clicked on a neighbor of current node
    const neighbors = graph.getNeighbors(currentNodeId);
    
    for (const edge of neighbors) {
      const targetNode = nodes[edge.to];
      if (!targetNode) continue;
      
      const dist = Math.sqrt((targetNode.x - x) ** 2 + (targetNode.y - y) ** 2);
      
      if (dist <= nodeRadius + 10) {
        // Prevent moving to already visited nodes (except current node)
        if (targetNode.visited && targetNode.id !== currentNodeId) {
          return;
        }
        
        // Move to this node
        const previousNode = nodes[currentNodeId];
        
        // Add trace cost
        const newTrace = Math.min(traceLevel + edge.weight, maxTrace);
        setTraceLevel(newTrace);
        audio.setTraceLevel(newTrace);
        
        // Play appropriate sound
        if (targetNode.type === 'firewall') {
          audio.playAlert();
          setFirewallMessage('Firewall detectado! Dados não puderam ser extraídos');
          setTimeout(() => setFirewallMessage(''), 2000);
        } else {
          audio.playClick();
        }
        
        // Mark as visited
        targetNode.visited = true;
        setCurrentNodeId(edge.to);
        
        // Track traversed edge
        const edgeKey = `${Math.min(currentNodeId, edge.to)}-${Math.max(currentNodeId, edge.to)}`;
        setTraversedEdges(prev => [...prev, edgeKey]);
        
        // Check win/lose conditions
        if (targetNode.type === 'mainframe') {
          audio.playSuccess();
          
          // Add mainframe data value when reaching it
          setDataExtracted(prev => prev + targetNode.dataValue);
          
          // Increase difficulty and create new graph (next level)
          const newMovesCount = movesCount + 1;
          const newDifficulty = Math.min(5, Math.floor(newMovesCount / 3) + 1);
          graphRef.current = new CyberGraph(width, height, newDifficulty);
          
          const newNodes = graphRef.current.getNodes();
          const newEntryNode = newNodes.find(n => n.type === 'entry');
          if (newEntryNode) {
            newEntryNode.visited = true;
            setCurrentNodeId(newEntryNode.id);
          }
          
          setMovesCount(newMovesCount);
          setTraversedEdges([]);
          setShowPath(false);
          setTraceLevel(0);
          
          // Recalculate path cost for new graph
          const mainframe = newNodes.find(n => n.type === 'mainframe');
          if (newEntryNode && mainframe) {
            const path = graphRef.current.dijkstra(newEntryNode.id, mainframe.id);
            if (path) {
              let cost = 0;
              for (let i = 0; i < path.length - 1; i++) {
                const edges = graphRef.current.getNeighbors(path[i]);
                const ed = edges.find(e => e.to === path[i + 1]);
                if (ed) cost += ed.weight;
              }
              setPathCost(cost);
            }
          }
        } else if (newTrace >= maxTrace) {
          audio.playAlert();
          setGameState('defeat');
        } else {
          // Add data extracted from this node
          setDataExtracted(prev => prev + targetNode.dataValue);
          
          // Increment moves count
          const newMovesCount = movesCount + 1;
          setMovesCount(newMovesCount);
          
          // Update path cost if showing path
          if (showPath) {
            const path = graph.dijkstra(edge.to, nodes.find(n => n.type === 'mainframe')?.id || 0);
            if (path) {
              let cost = 0;
              for (let i = 0; i < path.length - 1; i++) {
                const edges = graph.getNeighbors(path[i]);
                const ed = edges.find(e => e.to === path[i + 1]);
                if (ed) cost += ed.weight;
              }
              setPathCost(cost);
            }
          }
        }
        
        break;
      }
    }
  }, [currentNodeId, gameState, traceLevel, showPath, movesCount, width, height]);

  // Handle reveal path button
  const handleRevealPath = useCallback(() => {
    const graph = graphRef.current;
    if (!graph || dataExtracted < pathRevealCost || showPath) return;
    
    const nodes = graph.getNodes();
    const mainframe = nodes.find(n => n.type === 'mainframe');
    
    if (mainframe) {
      graph.dijkstra(currentNodeId, mainframe.id);
      setShowPath(true);
      setDataExtracted(prev => prev - pathRevealCost);
      
      // Hide path after 5 seconds
      setTimeout(() => {
        setShowPath(false);
        graph.resetVisited();
      }, 5000);
    }
  }, [currentNodeId, dataExtracted, pathRevealCost, showPath]);

  // Handle restart
  const handleRestart = useCallback(() => {
    graphRef.current = new CyberGraph(width, height, 0);
    
    const nodes = graphRef.current.getNodes();
    const entryNode = nodes.find(n => n.type === 'entry');
    if (entryNode) {
      entryNode.visited = true;
      setCurrentNodeId(entryNode.id);
    }
    
    setTraceLevel(0);
    setDataExtracted(0);
    setTraversedEdges([]);
    setShowPath(false);
    setGameState('playing');
    setPathCost(10);
    setMovesCount(0);
    
    audioRef.current?.startBGM();
  }, [width, height]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* HUD */}
      <div
        className="w-full max-w-[900px] flex items-center justify-between gap-4 p-4 bg-[#0D1117] border border-[#1a1a2e] rounded-lg"
        style={{
          backgroundColor: "#0d1117"
        }}>
        <div className="flex-1">
          <div className="text-xs text-[#666] mb-1 font-mono">NÍVEL DE RASTREAMENTO /  CONSUMO DE CPU</div>
          <div className="h-4 bg-[#1a1a2e] rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                traceLevel > 70 ? 'bg-[#FF3366]' : traceLevel > 40 ? 'bg-[#FFaa00]' : 'bg-[#00FF88]'
              }`}
              style={{ width: `${(traceLevel / maxTrace) * 100}%` }}
            />
          </div>
          <div className="text-xs text-[#00FF88] mt-1 font-mono">{traceLevel}% / {maxTrace}%</div>
        </div>
        <div className="text-center px-6">
          <div className="text-xs text-[#666] font-mono">DADOS EXTRAÍDOS</div>
          <div className="text-2xl text-[#00D4FF] font-bold font-mono">{dataExtracted} Gb</div>
        </div>

      </div>
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className="border-2 border-[#1a1a2e] rounded-lg cursor-pointer block"
        style={{ background: '#0D1117', width: `${width}px`, height: `${height}px` }}
      />
      {/* Audio indicator */}
      {!audioStarted && (
        <div className="text-[#666] text-xs font-mono text-center animate-pulse">
          🔊 Clique em qualquer lugar para ativar o áudio
        </div>
      )}
      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={handleRestart}
          className="px-6 py-2 bg-[#FF3366] text-white rounded font-mono text-sm hover:bg-[#cc2952] transition-all"
        >
          REINICIAR
        </button>
      </div>
      {/* Instructions */}
      <div className="text-[#666] text-sm font-mono text-center max-w-[600px]">
        <p>Clique nos nós adjacentes para navegar. Chegue ao Mainframe antes que o rastreamento atinja 100%.</p>
        <p className="mt-1">
          <span className="text-[#00FF88]">● Entrada</span> | 
          <span className="text-[#00D4FF] ml-2">● Neutro</span> | 
          <span className="text-[#FF3366] ml-2">● Firewall</span> | 
          <span className="text-[#FFD700] ml-2">● Mainframe</span>
        </p>
      </div>
    </div>
  );
}

// Drawing helper functions
function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.strokeStyle = '#0a0a12';
  ctx.lineWidth = 1;
  
  const gridSize = 40;
  
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawNode(ctx: CanvasRenderingContext2D, node: Node, isCurrent: boolean): void {
  const radius = 25;
  const color = NODE_COLORS[node.type];
  
  // Glow effect
  const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 2);
  gradient.addColorStop(0, color + '40');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius * 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Node circle
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#0D1117';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = isCurrent ? 4 : 2;
  ctx.stroke();
  
  // Inner circle
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = color + '30';
  ctx.fill();
  
  // Node type indicator
  ctx.fillStyle = color;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const labels: Record<string, string> = {
    entry: 'IN',
    neutral: '',
    firewall: '!',
    mainframe: '★',
  };
  
  ctx.fillText(labels[node.type], node.x, node.y);
  
  // Show data value inside the node
  if (node.dataValue > 0) {
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${node.dataValue}`, node.x, node.y);
  }
  
  // Visited indicator
  if (node.visited && node.type !== 'entry') {
    ctx.beginPath();
    ctx.arc(node.x - radius + 5, node.y - radius + 5, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00FF88';
    ctx.fill();
  }
}

function drawHUD(
  ctx: CanvasRenderingContext2D, 
  width: number, 
  traceLevel: number, 
  dataExtracted: number,
  maxTrace: number,
  pathCost: number
): void {
  // Top bar background
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, width, 50);
  
  // Trace level text
  ctx.fillStyle = '#666';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('TRACE LEVEL', 20, 20);
  
  // Trace bar background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(20, 30, 200, 12);
  
  // Trace bar fill
  const traceColor = traceLevel > 70 ? '#FF3366' : traceLevel > 40 ? '#FFaa00' : '#00FF88';
  ctx.fillStyle = traceColor;
  ctx.fillRect(20, 30, (traceLevel / maxTrace) * 200, 12);
  
  // Trace percentage
  ctx.fillStyle = traceColor;
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`${traceLevel}%`, 230, 40);
  
  // Data extracted
  ctx.fillStyle = '#00D4FF';
  ctx.textAlign = 'center';
  ctx.fillText(`DATA: ${dataExtracted}`, width / 2, 35);
  
}

function drawOverlay(
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number, 
  title: string, 
  subtitle: string,
  color: string
): void {
  // Semi-transparent background
  ctx.fillStyle = 'rgba(13, 17, 23, 0.9)';
  ctx.fillRect(0, 0, width, height);
  
  // Title
  ctx.fillStyle = color;
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, height / 2 - 30);
  
  // Subtitle
  ctx.fillStyle = '#666';
  ctx.font = '24px monospace';
  ctx.fillText(subtitle, width / 2, height / 2 + 30);
  
  // Restart hint
  ctx.fillStyle = '#444';
  ctx.font = '16px monospace';
  ctx.fillText('Pressione REINICIAR para jogar novamente', width / 2, height / 2 + 80);
}

function drawFirewallAlert(
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number, 
  message: string
): void {
  // Red alert background
  ctx.fillStyle = 'rgba(255, 51, 102, 0.2)';
  ctx.fillRect(0, height / 2 - 40, width, 80);
  
  // Border
  ctx.strokeStyle = '#FF3366';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, height / 2 - 35, width - 20, 70);
  
  // Message
  ctx.fillStyle = '#FF3366';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, width / 2, height / 2);
}

export default CyberNodeGame;
