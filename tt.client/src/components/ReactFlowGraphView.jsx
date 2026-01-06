import React, { useCallback, useEffect, useState, memo } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    ReactFlowProvider,
    useReactFlow,
    Handle,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';


// Цвета по глубине
const depthColors = ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3'];

// Кастомный узел с кнопками
const CustomNode = memo(({ id, data }) => {
    const { label, hasChildren, collapsed, toggleNode, setPanelNode, depth } = data;
    const bgColor = depthColors[depth % depthColors.length];

    return (
        <div
            style={{
                padding: '8px 12px',
                border: '1px solid #888',
                borderRadius: 6,
                background: bgColor,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                minWidth: 140,
                color: '#000',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                }}
            >
                {hasChildren ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleNode(id);
                        }}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: 14,
                            lineHeight: 1,
                            minWidth: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {collapsed ? '▶' : '▼'}
                    </button>
                ) : (
                    <div
                        style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: '#000',
                            minWidth: '7px',
                        }}
                    />
                )}

                <span
                    style={{
                        flex: 1,
                        fontSize: data.level === 0 ? '14px' : '12px',
                        fontWeight: data.level === 0 ? 'bold' : 'normal',
                        wordBreak: 'break-word',
                        maxWidth: 240,
                    }}
                >
                    {label}
                </span>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setPanelNode(data.original);
                    }}
                    style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: 14,
                        minWidth: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title="Показать детали"
                >
                    ℹ️
                </button>
            </div>

            <Handle type="target" position={Position.Top} />
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
});

const nodeTypes = { customNode: CustomNode };

const GraphContent = ({ data }) => {
    const { fitView } = useReactFlow();
    const [collapsedNodes, setCollapsedNodes] = useState(new Set());
    const [panelNode, setPanelNode] = useState(null);
    const [savedPositions, setSavedPositions] = useState(new Map());


    // Фильтр глубины
    const [minDepth, setMinDepth] = useState(0);
    const [maxDepth, setMaxDepth] = useState(5);


    const toggleNode = useCallback((nodeId) => {
        setCollapsedNodes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) newSet.delete(nodeId);
            else newSet.add(nodeId);
            return newSet;
        });
    }, []);

    // Настройки размеров
    const NODE_PADDING = 16;
    const TRIANGLE_WIDTH = 20;
    const INFO_BUTTON_WIDTH = 24;
    const NODE_HEIGHT = 50;
    const LEVEL_Y_STEP = 120;
    const MIN_HORIZONTAL_GAP = 70;

    // Оценка ширины узла
    const getNodeWidth = (label, hasChildren) => {
        const approxCharWidth = 8;
        let w = label.length * approxCharWidth + NODE_PADDING * 2;
        if (hasChildren) w += TRIANGLE_WIDTH;
        w += INFO_BUTTON_WIDTH;
        return Math.max(w, 140);
    };

    // Подсчёт ширины поддерева
    const getSubtreeWidth = (item) => {
        const nodeWidth = getNodeWidth(item.name, item.children && item.children.length > 0);
        if (!item.children || item.children.length === 0 || collapsedNodes.has(item.id)) {
            return nodeWidth;
        }

        const childrenWidths = item.children.map(getSubtreeWidth);
        const totalChildrenWidth =
            childrenWidths.reduce((a, b) => a + b, 0) +
            MIN_HORIZONTAL_GAP * (childrenWidths.length - 1);

        return Math.max(nodeWidth, totalChildrenWidth);
    };


    const exportImage = useCallback(() => {
        const reactFlowWrapper = document.querySelector('.react-flow');

        if (!reactFlowWrapper) return;

        toPng(reactFlowWrapper, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            filter: (node) => {
                // не экспортируем minimap и controls
                if (node?.classList?.contains('react-flow__minimap')) return false;
                if (node?.classList?.contains('react-flow__controls')) return false;
                return true;
            },
        }).then((dataUrl) => {
            const a = document.createElement('a');
            a.setAttribute('download', 'graph.png');
            a.setAttribute('href', dataUrl);
            a.click();
        });
    }, []);



    // Добавляем глубину каждому элементу
    //const addDepth = (nodes, depth = 0) =>
    //    nodes.map(node => ({
    //        ...node,
    //        depth,
    //        ...(node.children && node.children.length > 0
    //            ? { children: addDepth(node.children, depth + 1) }
    //            : {})
    //    }));

    // Фильтруем дерево по диапазону глубины
    function sliceTreeByDepth(nodes, minDepth, maxDepth, depth = 0) {
        let result = [];

        for (const node of nodes) {
            // Если глубина больше максимальной - полностью пропускаем узел и всех его потомков
            if (depth > maxDepth) continue;

            const slicedChildren = node.children
                ? sliceTreeByDepth(node.children, minDepth, maxDepth, depth + 1)
                : [];

            // Узел в диапазоне допустимых глубин
            if (depth >= minDepth) {
                const out = {
                    ...node,
                    depth,
                };

                // Добавляем детей только если они есть И если текущая глубина меньше максимальной
                if (depth < maxDepth && slicedChildren.length > 0) {
                    // Важно: удаляем children у узлов, которые находятся на максимальной глубине
                    out.children = slicedChildren;
                } else {
                    // Если это максимальная глубина или нет детей - явно удаляем children
                    delete out.children;
                }

                result.push(out);
            }
            // Ниже minDepth - поднимаем детей (но только если они в допустимом диапазоне)
            else {
                // Поднимаем только тех детей, которые находятся в допустимом диапазоне
                result.push(...slicedChildren);
            }
        }

        return result;
    }


    // Рекурсивное построение
    const buildGraph = useCallback(() => {
        const nodes = [];
        const edges = [];
        const positions = new Map();

        // добавляем глубину и фильтруем по диапазону
        //const depthData = addDepth(data);
        const filteredData = sliceTreeByDepth(data, minDepth, maxDepth);


        const traverse = (item, parentId = null, level = 0, xOffset = 0) => {
            const nodeWidth = getNodeWidth(item.name, item.children && item.children.length > 0);
            const subtreeWidth = getSubtreeWidth(item);
            const isCollapsed = collapsedNodes.has(item.id);

            const x = xOffset + subtreeWidth / 2 - nodeWidth / 2;
            const y = level * LEVEL_Y_STEP;

            nodes.push({
                id: item.id.toString(),
                type: 'customNode',
                data: {
                    label: item.name,
                    original: item,
                    setPanelNode,
                    toggleNode,
                    depth: level,
                    hasChildren: item.children && item.children.length > 0,
                    collapsed: isCollapsed,
                },
                position: { x, y },
            });

            positions.set(item.id.toString(), { x, y });

            if (parentId) {
                edges.push({
                    id: `e${parentId}-${item.id}`,
                    source: parentId.toString(),
                    target: item.id.toString(),
                    markerEnd: { type: 'arrowclosed', width: 15, height: 15, color: '#555' },
                    style: { stroke: '#888', strokeWidth: 2 },
                });
            }

            if (item.children && item.children.length > 0 && !isCollapsed) {
                let childX = xOffset;
                item.children.forEach((child) => {
                    const childWidth = getSubtreeWidth(child);
                    traverse(child, item.id, level + 1, childX);
                    childX += childWidth + MIN_HORIZONTAL_GAP;
                });
            }
        };

        // Верхний уровень
        let currentX = 0;
        filteredData.forEach((root) => {
            const rootWidth = getSubtreeWidth(root);
            traverse(root, null, 0, currentX);
            currentX += rootWidth + MIN_HORIZONTAL_GAP;
        });

        return { nodes, edges, positions };
    }, [data, collapsedNodes, minDepth, maxDepth]);

    // Состояния React Flow
    const { nodes: initialNodes, edges: initialEdges, positions: builtPositions } = buildGraph();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const resetPositions = useCallback(() => {
        const { nodes: newNodes, edges: newEdges, positions: newPositions } = buildGraph();
        setNodes(newNodes);
        setEdges(newEdges);
        setSavedPositions(newPositions);
    }, [buildGraph, setNodes, setEdges]);

    const expandAll = useCallback(() => setCollapsedNodes(new Set()), []);
    const collapseAll = useCallback(() => {
        const allParents = new Set();
        const collectParents = (items) => {
            items.forEach((item) => {
                if (item.children && item.children.length > 0) {
                    allParents.add(item.id);
                    collectParents(item.children);
                }
            });
        };
        collectParents(data || []);
        setCollapsedNodes(allParents);
    }, [data]);

    const onNodeDoubleClick = useCallback(
        (event, node) => {
            const savedPosition = savedPositions.get(node.id);
            if (savedPosition) {
                setNodes((nds) =>
                    nds.map((n) =>
                        n.id === node.id ? { ...n, position: savedPosition, dragging: false } : n
                    )
                );
            }
        },
        [savedPositions, setNodes]
    );

    useEffect(() => {
        if (minDepth > maxDepth) {
            setMaxDepth(minDepth);
        }
        if (maxDepth < minDepth) {
            setMinDepth(maxDepth);
        }
        resetPositions();
    }, [minDepth, maxDepth]);

    useEffect(() => {
        resetPositions();
    }, [data, collapsedNodes, resetPositions, minDepth, maxDepth]);

    useEffect(() => {
        if (nodes.length > 0) {
            const timer = setTimeout(() => {
                fitView({ padding: 0.2, duration: 600 });
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [fitView, nodes, edges]);

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px', display: 'flex', gap: '8px', borderBottom: '1px solid #ddd' }}>
                    <button onClick={expandAll}>📂 Развернуть всё</button>
                    <button onClick={collapseAll}>📁 Свернуть всё</button>
                    <button onClick={resetPositions}>🔄 Сброс позиций</button>
                    <button onClick={exportImage}>🖼 Экспорт PNG</button>


                    {/* Диапазон глубины */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16 }}>
                        <label style={{ fontSize: 12 }}>Мин.:</label>
                        <input
                            type="number"
                            min="0"
                            max="5"
                            value={minDepth}
                            onChange={(e) => setMinDepth(Number(e.target.value))}
                            style={{
                                width: 50,
                                padding: '2px 4px',
                                borderRadius: 4,
                                border: '1px solid #ccc',
                                background: '#fff',
                                color: '#000',
                            }}
                        />
                        <label style={{ fontSize: 12 }}>Макс.:</label>
                        <input
                            type="number"
                            min="0"
                            max="5"
                            value={maxDepth}
                            onChange={(e) => setMaxDepth(Number(e.target.value))}
                            style={{
                                width: 50,
                                padding: '2px 4px',
                                borderRadius: 4,
                                border: '1px solid #ccc',
                                background: '#fff',
                                color: '#000',
                            }}
                        />
                    </div>


                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>
                        Двойной клик по узлу — вернуть позицию
                    </span>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeDoubleClick={onNodeDoubleClick}
                        nodesDraggable={true}
                        nodeTypes={nodeTypes}
                        panOnDrag={true}
                        zoomOnScroll={true}
                        zoomOnPinch={true}
                        snapToGrid={false}
                    >
                        <Controls />
                        <MiniMap />
                        <Background variant="dots" gap={20} size={1} />
                    </ReactFlow>
                </div>
            </div>

            {/* Панель информации */}
            <div
                style={{
                    width: '300px',
                    padding: '16px',
                    borderLeft: '1px solid #ddd',
                    background: '#fff',
                    overflowY: 'auto',
                    color: '#000',
                }}
            >
                {panelNode ? (
                    <>
                        <h3>{panelNode.name}</h3>
                        <p><strong>Описание:</strong> {panelNode.description}</p>
                        <p><strong>Specific:</strong> {panelNode.specific}</p>
                        <p><strong>Measurable:</strong> {panelNode.measurable}</p>
                        <p><strong>Achievable:</strong> {panelNode.achievable}</p>
                        <p><strong>Realistic:</strong> {panelNode.realistic}</p>
                        <p><strong>Timebound:</strong> {panelNode.timebound}</p>
                    </>
                ) : (
                    <p>Нажмите ℹ️ на узле, чтобы увидеть детали</p>
                )}
            </div>
        </div>
    );
};

const ReactFlowGraphView = ({ data }) => (
    <div
        style={{
            width: '100%',
            height: '100%',
            border: '1px solid #ddd',
            borderRadius: '12px',
            overflow: 'hidden',
        }}
    >
        <ReactFlowProvider>
            <GraphContent data={data} />
        </ReactFlowProvider>
    </div>
);

export default ReactFlowGraphView;
