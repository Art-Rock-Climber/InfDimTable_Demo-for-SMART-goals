import React, { useEffect, useRef, useState, useCallback } from "react";
import { Graph } from "@antv/g6";

export default function AntVGraphView({ data }) {
    const containerRef = useRef(null);
    const graphRef = useRef(null);
    const [collapsedNodes, setCollapsedNodes] = useState(new Set());

    // Функция для преобразования данных
    const convertToGraphData = useCallback((nodes, collapsedSet) => {
        const gNodes = [];
        const gEdges = [];

        const traverse = (items, parentId = null, level = 0) => {
            items.forEach((item) => {
                const isParent = item.children && item.children.length > 0;
                const isCollapsed = collapsedSet.has(item.id);

                // Создаем узел
                const node = {
                    id: item.id,
                    data: {
                        label: item.name,
                        description: item.description,
                        level: level,
                        isParent: isParent,
                        collapsed: isCollapsed,
                    },
                };

                gNodes.push(node);

                // Добавляем связь если есть родитель
                if (parentId) {
                    gEdges.push({
                        id: `${parentId}-${item.id}`,
                        source: parentId,
                        target: item.id,
                    });
                }

                // Рекурсивно добавляем детей если узел не свернут
                if (isParent && !isCollapsed) {
                    traverse(item.children, item.id, level + 1);
                }
            });
        };

        traverse(nodes);
        return { nodes: gNodes, edges: gEdges };
    }, []);

    const toggleNode = useCallback((nodeId) => {
        console.log('Toggling node:', nodeId);
        setCollapsedNodes(prev => {
            const newCollapsed = new Set(prev);
            if (newCollapsed.has(nodeId)) {
                newCollapsed.delete(nodeId);
            } else {
                newCollapsed.add(nodeId);
            }
            return newCollapsed;
        });
    }, []);

    const expandAll = useCallback(() => {
        setCollapsedNodes(new Set());
    }, []);

    const collapseAll = useCallback(() => {
        const allParentNodes = new Set();
        const findParentNodes = (items) => {
            items.forEach(item => {
                if (item.children && item.children.length > 0) {
                    allParentNodes.add(item.id);
                    findParentNodes(item.children);
                }
            });
        };
        findParentNodes(data);
        setCollapsedNodes(allParentNodes);
    }, [data]);

    // Инициализация и обновление графа
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !data || data.length === 0) return;

        const graphData = convertToGraphData(data, collapsedNodes);
        console.log('Graph data nodes:', graphData.nodes.map(n => ({ id: n.id, isParent: n.data.isParent })));

        try {
            // Уничтожаем предыдущий граф если есть
            if (graphRef.current) {
                try {
                    graphRef.current.destroy();
                } catch (e) {
                    console.warn("Error destroying previous graph:", e);
                }
            }

            // Конфигурация графа
            const graph = new Graph({
                container: container,
                data: graphData,
                autoFit: 'view',

                layout: {
                    type: 'dagre',
                    rankdir: 'TB',
                    nodesep: 80,
                    ranksep: 100,
                },

                node: {
                    style: {
                        size: [140, 50],
                        fill: (d) => {
                            if (d.data.level === 0) return '#1890ff';
                            if (d.data.level === 1) return '#52c41a';
                            return '#faad14';
                        },
                        stroke: '#000',
                        lineWidth: 2,
                        labelText: (d) => {
                            const isParent = d.data.isParent;
                            const isCollapsed = d.data.collapsed;
                            const label = d.data.label;
                            const shortLabel = label.length > 12 ? label.substring(0, 12) + '...' : label;
                            return isParent ? `${isCollapsed ? '▶' : '▼'} ${shortLabel}` : `● ${shortLabel}`;
                        },
                        labelFill: '#000',
                        labelFontSize: 12,
                        labelFontWeight: 'bold',
                        labelWordWrap: true,
                        labelMaxWidth: 120,
                    },
                },

                edge: {
                    style: {
                        stroke: '#999',
                        endArrow: {
                            path: 'M 0,0 L 8,4 L 8,-4 Z',
                            fill: '#999',
                        },
                    },
                },

                behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
            });

            graphRef.current = graph;

            // Рендерим граф
            graph.render();

            // ПРАВИЛЬНЫЙ обработчик клика для G6 v5+
            graph.on('node:click', (event) => {
                console.log('Node click event:', event);

                // Получаем данные узла через event.target
                const node = event.target;
                if (!node) {
                    console.log('No node target found');
                    return;
                }

                // Получаем ID узла
                const nodeId = node.id;
                console.log('Clicked node ID:', nodeId);

                if (!nodeId) {
                    console.log('No node ID found');
                    return;
                }

                // Получаем данные узла из графа
                const nodeData = graph.getNodeData(nodeId);
                console.log('Node data:', nodeData);

                if (nodeData && nodeData.data && nodeData.data.isParent) {
                    console.log('Parent node clicked, toggling:', nodeId);
                    toggleNode(nodeId);
                } else {
                    console.log('Not a parent node or no data');
                }
            });

            // Дополнительный обработчик для отладки
            graph.on('afterrender', () => {
                console.log('Graph rendered, nodes:', graph.getNodes().map(n => n.id));
            });

            return () => {
                if (graph && graph.destroy) {
                    graph.off('node:click');
                    graph.off('afterrender');
                    graph.destroy();
                }
            };
        } catch (error) {
            console.error("Graph error:", error);
        }
    }, [data, collapsedNodes, convertToGraphData, toggleNode]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            minHeight: '500px'
        }}>
            {/* Панель управления */}
            <div style={{
                padding: '8px 16px',
                background: '#f5f5f5',
                borderBottom: '1px solid #ddd',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexShrink: 0
            }}>
                <button
                    onClick={expandAll}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    📂 Развернуть всё
                </button>
                <button
                    onClick={collapseAll}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    📁 Свернуть всё
                </button>
                <span style={{
                    marginLeft: 'auto',
                    fontSize: '12px',
                    color: '#666'
                }}>
                    Кликните на узлы ▼ для сворачивания/разворачивания
                </span>
            </div>

            {/* Контейнер графа */}
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    flex: 1,
                    minHeight: '400px',
                    overflow: "hidden",
                    background: "#fafafa"
                }}
            />
        </div>
    );
}