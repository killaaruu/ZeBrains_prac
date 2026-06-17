import {
  Background,
  Controls,
  type Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo } from "react";
import type { CanvasEdge, CanvasNode } from "../types";
import { toFlow } from "./to-flow";

type Props = {
  canvas: { nodes: CanvasNode[]; edges: CanvasEdge[] };
  /** Namespace for persisted manual positions in localStorage. */
  boardId?: string;
};

type Positions = Record<string, { x: number; y: number }>;

function storageKey(boardId: string): string {
  return `sb-positions:${boardId}`;
}

function loadPositions(boardId: string): Positions {
  try {
    return JSON.parse(localStorage.getItem(storageKey(boardId)) ?? "{}") as Positions;
  } catch {
    return {};
  }
}

function savePositions(boardId: string, positions: Positions): void {
  try {
    localStorage.setItem(storageKey(boardId), JSON.stringify(positions));
  } catch {
    /* ignore storage failures (private mode, quota) */
  }
}

export function Canvas({ canvas, boardId = "graph" }: Props) {
  const base = useMemo(() => toFlow(canvas), [canvas]);
  const initialNodes = useMemo(() => {
    const saved = loadPositions(boardId);
    return base.nodes.map((node) => {
      const pos = saved[node.id];
      return pos ? { ...node, position: pos } : node;
    });
  }, [base.nodes, boardId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(base.edges);

  const persist = useCallback(
    (_: unknown, node: Node) => {
      const positions = loadPositions(boardId);
      positions[node.id] = node.position;
      savePositions(boardId, positions);
    },
    [boardId],
  );

  const resetLayout = useCallback(() => {
    savePositions(boardId, {});
    setNodes(base.nodes);
  }, [boardId, base.nodes, setNodes]);

  return (
    <div className="sb-canvas" style={{ height: 440 }}>
      <button type="button" className="sb-reset" onClick={resetLayout}>
        Reset layout
      </button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        onNodeDragStop={persist}
        onNodeClick={(_, node) => {
          window.location.hash = `#/module/${node.id}`;
        }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
