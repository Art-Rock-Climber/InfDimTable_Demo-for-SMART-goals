import React, { useEffect, useRef, useState, useCallback } from "react";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";

import * as XLSX from "xlsx";
window.XLSX = XLSX;

// Свёртка / развёртка дерева
function expandAllRows(rows) {
    rows.forEach(r => {
        r.treeExpand();
        const children = r.getTreeChildren();
        if (children && children.length) expandAllRows(children);
    });
}

function collapseAllRows(rows) {
    rows.forEach(r => {
        r.treeCollapse();
        const children = r.getTreeChildren();
        if (children && children.length) collapseAllRows(children);
    });
}

// Вычисление прогресса
function setDoneRecursively(rootRow, done) {
    const stack = [rootRow];
    while (stack.length) {
        const row = stack.pop();
        row.update({ done, progress: done ? 100 : 0 });

        const children = row.getTreeChildren();
        if (children) children.forEach(c => stack.push(c));
    }
}

function recomputeParentChain(row) {
    let parent = row.getTreeParent();
    while (parent) {
        const children = parent.getTreeChildren() || [];
        if (!children.length) break;

        const doneCount = children.filter(c => c.getData().done).length;
        const progress = Math.round(
            children.reduce((s, c) => s + (c.getData().progress || 0), 0) /
            children.length
        );

        parent.update({
            done: doneCount === children.length,
            progress,
        });

        parent = parent.getTreeParent();
    }
}

// Срезы по глубине
function sliceTreeWithRebase(nodes, depth = 0, min, max) {
    let result = [];

    for (const node of nodes) {
        const absDepth = depth;

        // Режем глубже maxDepth
        if (absDepth > max) continue;

        // Рекурсивно обрабатываем детей
        const slicedChildren = node.children
            ? sliceTreeWithRebase(node.children, depth + 1, min, max)
            : [];

        // Если узел в диапазоне — он становится корнем или обычным узлом
        if (absDepth >= min) {
            result.push({
                ...node,
                absDepth,
                depth: absDepth - min,   // новая глубина
                children: slicedChildren.length ? slicedChildren : undefined,
            });
        }
        // Если узел выше minDepth — «поднимаем» его детей
        else {
            result.push(...slicedChildren);
        }
    }

    return result;
}



// прочее
function ensureIds(nodes, path = "") {
    return nodes.map((node, index) => {
        const id = node.id ?? `${path}${path ? "-" : ""}${index}`;
        return {
            ...node,
            id,
            children: node.children ? ensureIds(node.children, id) : undefined,
        };
    });
}

function addDepth(nodes, depth = 0) {
    return nodes.map(node => ({
        ...node,
        depth,
        children: node.children ? addDepth(node.children, depth + 1) : undefined,
    }));
}

function flattenTree(nodes, depth = 0, minDepth = 0, maxDepth = Infinity) {
    let result = [];
    for (const node of nodes) {
        const { children, ...rest } = node;

        if (depth >= minDepth && depth <= maxDepth) {
            result.push({ ...rest, depth });
        }

        if (children && depth < maxDepth) {
            result = result.concat(
                flattenTree(children, depth + 1, minDepth, maxDepth)
            );
        }
    }
    return result;
}


export default function TabulatorTableView({ data }) {
    const tableRef = useRef(null);
    const tabulatorRef = useRef(null);
    const tableReadyRef = useRef(false); // флаг законченности инициализации


    // параметры таблицы
    const [treeMode, setTreeMode] = useState(true);
    const [minDepth, setMinDepth] = useState(0);
    const [maxDepth, setMaxDepth] = useState(5);

    // параметры ui
    const [treeMenuOpen, setTreeMenuOpen] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const treeMenuRef = useRef(null);
    const exportMenuRef = useRef(null);

    // фильтр глубины
    const deepFilterRef = useRef({
        cache: {},
        lastValue: null,
        lastMode: null,
    });


    function renameColumn(e, column) {
        const newTitle = prompt("Введите новое название столбца:", column.getDefinition().title);
        if (newTitle) column.updateDefinition({ title: newTitle });
    }


    function countEmptyCells(values, data, calcParams) {
        const field = calcParams.field;

        // Используем глобальную data, переданную в компонент

        // Функция для рекурсивного подсчета
        function countRecursive(nodes) {
            let empty = 0;
            let filled = 0;
            let total = 0;

            for (const node of nodes) {
                const v = node[field];
                if (v == null || (typeof v === "string" && v.trim() === "")) {
                    empty++;
                } else {
                    filled++;
                }
                total++;

                if (node.children && node.children.length > 0) {
                    const childCounts = countRecursive(node.children);
                    empty += childCounts.empty;
                    filled += childCounts.filled;
                    total += childCounts.total;
                }
            }

            return { empty, filled, total };
        }

        // Используем данные, переданные в компонент
        return countRecursive(data);
    }

    function emptyCellsFormatter(cell) {
        const { empty, filled, total } = cell.getValue();

        if (total === 0) return "—";

        if (empty === 0) {
            return `✓ ${filled}/${total}`;
        }

        return `❌ ${filled}/${total}`;
    }

    function deepMatchHeaderFilter(value, rowValue, rowData, params) {
        const isTree = tabulatorRef.current?.options.dataTree;
        const state = deepFilterRef.current;

        if (value !== state.lastValue || isTree !== state.lastMode) {
            state.cache = {};
            state.lastValue = value;
            state.lastMode = isTree;
        }

        if (!value) return true;

        if (!isTree) {
            return rowValue
                ?.toString()
                .toLowerCase()
                .includes(value.toLowerCase());
        }

        const id = rowData.id;
        if (state.cache[id] !== undefined) return state.cache[id];

        const field = params.field;
        const selfMatch =
            rowValue != null &&
            rowValue.toString().toLowerCase().includes(value.toLowerCase());

        let childMatch = false;
        if (rowData.children) {
            for (const c of rowData.children) {
                if (deepMatchHeaderFilter(value, c[field], c, params)) {
                    childMatch = true;
                    break;
                }
            }
        }

        const result = selfMatch || childMatch;
        state.cache[id] = result;
        return result;
    }

    function applyTableData() {
        if (!tabulatorRef.current || !tableReadyRef.current) return;

        const treeData = sliceTreeWithRebase(data, 0, minDepth, maxDepth);
        const tableData = treeMode
            ? treeData
            : flattenTree(treeData);

        tabulatorRef.current.replaceData(tableData);

        const state = deepFilterRef.current;
        state.cache = {};
        state.lastValue = null;
        state.lastMode = null;

        tabulatorRef.current.refreshFilter();
    }


    // Инициализация таблицы
    useEffect(() => {
        if (!tableRef.current) return;

        const table = new Tabulator(tableRef.current, {
            layout: "fitData",
            responsiveLayout: "hide",
            //resizableColumnFit: true,
            layoutColumnsOnNewData: true,
            height: "100%",

            movableColumns: true,
            //movableRows: true,
            //movableRowsHandle: true, // режим ручки
            rowHeader: {
                headerSort: false,
            },
            resizableColumns: true,
            //selectableRange: true,
            //selectableRangeRows: true, !!!!!!!!!!!!!
            
            pagination: true,
            paginationSize: 10,
            paginationCounter: "rows",
            paginationButtonCount: 5,

            history: true,

            dataTree: true,
            dataTreeChildField: "children", // изначально tabulator принимает только _children
            dataTreeStartExpanded: false,

            columns: [
                {
                    title: "Название",
                    field: "name",
                    frozen: true,
                    editor: "input",
                    headerFilter: "input",
                    headerFilterLiveFilter: false,
                    headerFilterFunc: deepMatchHeaderFilter,
                    headerFilterFuncParams: { field: "name" },
                },
                {
                    title: "Описание", field: "description", editor: "input", headerFilter: "input",
                },
                {
                    title: "Specific", field: "specific", editor: "input", headerFilter: "input",
                    //headerDblClick: renameColumn,
                    bottomCalc: countEmptyCells,
                    bottomCalcParams: { field: "specific" },
                    bottomCalcFormatter: emptyCellsFormatter,
                },
                {
                    title: "Measurable",
                    field: "measurable",
                    editor: "input",
                    headerFilter: "input",
                    //headerDblClick: renameColumn,
                    bottomCalc: countEmptyCells,
                    bottomCalcParams: { field: "measurable" },
                    bottomCalcFormatter: emptyCellsFormatter,
                },
                {
                    title: "Achievable", field: "achievable", editor: "input", headerFilter: "input",
                    //headerDblClick: renameColumn,
                    bottomCalc: countEmptyCells,
                    bottomCalcParams: { field: "achievable" },
                    bottomCalcFormatter: emptyCellsFormatter,
                },
                {
                    title: "Realistic", field: "realistic", editor: "input", headerFilter: "input",
                    //headerDblClick: renameColumn,
                    bottomCalc: countEmptyCells,
                    bottomCalcParams: { field: "realistic" },
                    bottomCalcFormatter: emptyCellsFormatter,
                },
                {
                    title: "Time-bound", field: "timebound", editor: "input", headerFilter: "input",
                    //headerDblClick: renameColumn,
                    bottomCalc: countEmptyCells,
                    bottomCalcParams: { field: "timebound" },
                    bottomCalcFormatter: emptyCellsFormatter,
                },
                {
                    title: "✔",
                    field: "done",
                    hozAlign: "center",
                    formatter: "tickCross",
                    cellClick(e, cell) {
                        const row = cell.getRow();
                        const value = !cell.getValue();
                        setDoneRecursively(row, value);
                        recomputeParentChain(row);
                        row.getTable().redraw(true);
                    },
                //    headerDblClick: renameColumn
                },
                {
                    title: "Прогресс",
                    field: "progress",
                    formatter(cell) {
                        const row = cell.getRow();
                        const children = row.getTreeChildren();
                        if (!children || !children.length) {
                            return cell.getValue() ? "100%" : "0%";
                        }

                        const done = children.filter(c => c.getData().done).length;
                        const percent = Math.round((done / children.length) * 100);

                        //return `
                        //  <div style="background:#ddd;height:14px;border-radius:4px;">
                        //    <div style="background:#4caf50;width:${percent}%;height:100%;border-radius:4px;"></div>
                        //  </div>`;
                        return `<div style="background:#ddd; border-radius:4px; width:100%; height:16px; position:relative;">
                                    <div style="background:#4caf50; width:${percent}%; height:100%; border-radius:4px;"></div>
                                    <span style="position:absolute; top:0; left:50%; transform:translateX(-50%); font-size:11px; color:#000;">
                                    ${percent}%
                                    </span>
                                </div>`;
                    },
                //    headerDblClick: renameColumn
                },
            ],
        });

        tabulatorRef.current = table;

        table.on("tableBuilt", () => {
            tableReadyRef.current = true;
            applyTableData();
        });

        return () => table.destroy();
    }, []);

    // Обновление таблицы
    useEffect(() => {
        if (!tableReadyRef.current) return;
        applyTableData();
    }, [data, treeMode, minDepth, maxDepth]);

    useEffect(() => {
        function handleClickOutside(e) {
            if (
                treeMenuOpen &&
                treeMenuRef.current &&
                !treeMenuRef.current.contains(e.target)
            ) {
                setTreeMenuOpen(false);
            }

            if (
                exportMenuOpen &&
                exportMenuRef.current &&
                !exportMenuRef.current.contains(e.target)
            ) {
                setExportMenuOpen(false);
            }
        }

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [treeMenuOpen, exportMenuOpen]);


    // ui
    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap", }}>
                {/* undo / redo */}
                <button onClick={() => tabulatorRef.current.undo()}>↩</button>
                <button onClick={() => tabulatorRef.current.redo()}>↪</button>

                {/* дерево */}
                <div ref={treeMenuRef} style={{ position: "relative" }}>
                    <button onClick={() => setTreeMenuOpen(v => !v)}>
                        📂 Дерево ▼
                    </button>
                    {treeMenuOpen && (
                        <div
                            style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                zIndex: 10,
                                display: "flex",
                                flexDirection: "column",
                                background: "#fff",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                            }}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();

                                        expandAllRows(tabulatorRef.current.getRows());
                                        setTreeMenuOpen(false);
                                    }}
                            >
                                📂 Развернуть всё
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    collapseAllRows(tabulatorRef.current.getRows());
                                    setTreeMenuOpen(false);
                                }}
                            >
                                📁 Свернуть всё
                            </button>
                        </div>
                    )}
                </div>

                {/* экспорт */}
                <div ref={exportMenuRef} style={{ position: "relative" }}>
                    <button onClick={() => setExportMenuOpen(v => !v)}>
                        📊 Экспорт ▼
                    </button>

                    {exportMenuOpen && (
                        <div
                            style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                zIndex: 10,
                                display: "flex",
                                flexDirection: "column",
                                background: "#fff",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                            }}
                        >
                            <button onClick={() => {
                                    tabulatorRef.current.download("xlsx", "data.xlsx");
                                    setExportMenuOpen(false);
                                }}
                            >
                                Excel (XLSX)
                            </button>
                            <button onClick={() => {
                                    tabulatorRef.current.download("csv", "data.csv");
                                    setExportMenuOpen(false);
                                }}
                            >
                                CSV
                            </button>
                        </div>
                    )}
                </div>

                {/* сброс */}
                <button onClick={() => tabulatorRef.current?.clearHeaderFilter()}>
                    🔄 Сброс фильтров
                </button>

                {/* режим */}
                <button onClick={() => setTreeMode(v => !v)}>
                    {treeMode ? "Режим списка" : "Режим дерева"}
                </button>

                {/* фильтры глубины */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                        flexShrink: 0,
                    }}
                >
                    <label>Мин. глубина:</label>
                    <input
                        type="number"
                        min="0"
                        max="5"
                        value={minDepth}
                        onChange={e => setMinDepth(Number(e.target.value))}
                        style={{
                            width: 60,
                            padding: "4px 6px",
                            borderRadius: 4,
                            border: "1px solid var(--tabulator-border-color, #ccc)",
                            background: "var(--tabulator-bg-color, #fff)",
                            color: "var(--tabulator-text-color, #000)",
                        }}
                    />

                    <label>Макс. глубина:</label>
                    <input
                        type="number"
                        min="0"
                        max="5"
                        value={maxDepth}
                        onChange={e => setMaxDepth(Number(e.target.value))}
                        style={{
                            width: 60,
                            padding: "4px 6px",
                            borderRadius: 4,
                            border: "1px solid var(--tabulator-border-color, #ccc)",
                            background: "var(--tabulator-bg-color, #fff)",
                            color: "var(--tabulator-text-color, #000)",
                        }}
                    />
                </div>
            </div>

            <div ref={tableRef} style={{ flex: 1, minHeight: 0 }} />
        </div>
    );

}



//import React, { useState, useEffect, useRef } from 'react';
//import { ReactTabulator } from "react-tabulator";
//import { TabulatorFull as Tabulator } from "tabulator-tables";
//import "react-tabulator/lib/styles.css";
//import "tabulator-tables/dist/css/tabulator.min.css";


//import * as XLSX from "xlsx";
//window.XLSX = XLSX;


//// вынести в отдельный файл
//const ensureIds = (nodes, path = "") => {
//    return nodes.map((node, index) => {
//        const id = node.id ?? `${path}${path ? "-" : ""}${index}`;
//        return {
//            ...node,
//            id,
//            ...(node.children && node.children.length > 0
//                ? { children: ensureIds(node.children, id) }
//                : {}),
//        };
//    });
//};

//const flattenTree = (nodes, depth = 0, minDepth = 0, maxDepth = Infinity) => {
//    let result = [];
//    nodes.forEach(node => {
//        const { children, ...rest } = node;

//        if (depth >= minDepth && depth <= maxDepth) {
//            result.push({ ...rest, depth });
//        }

//        // Рекурсивно обрабатываем детей, но только если не превышена максимальная глубина
//        if (children && children.length && depth < maxDepth) {
//            result = result.concat(flattenTree(children, depth + 1, minDepth, maxDepth));
//        }
//    });
//    return result;
//};

//const expandAllRows = (rows) => {
//    rows.forEach(row => {
//        row.treeExpand();
//        const children = row.getTreeChildren();
//        if (children && children.length) expandAllRows(children);
//    });
//};

//const collapseAllRows = (rows) => {
//    rows.forEach(row => {
//        row.treeCollapse();
//        const children = row.getTreeChildren();
//        if (children && children.length) collapseAllRows(children);
//    });
//};

//// Функции пересчёта прогресса
//const setDoneRecursively = (rootRow, done) => {
//    // итеративный обход всех потомков (включая rootRow), чтобы избежать проблем со стеком
//    const stack = [rootRow];
//    while (stack.length) {
//        const row = stack.pop();
//        // Обновляем данные строки: done и progress
//        row.update({ done: done, progress: done ? 100 : 0 });

//        // берём детей и добавляем в стек
//        const children = row.getTreeChildren();
//        if (children && children.length) {
//            children.forEach(ch => stack.push(ch));
//        }
//    }
//}

//const recomputeParentChain = (startRow) => {
//    // пересчитываем вверх от родителя startRow
//    let parent = startRow.getTreeParent?.();
//    while (parent) {
//        const children = parent.getTreeChildren?.() || [];
//        if (children.length === 0) {
//            // если вдруг нет детей — просто пропускаем
//            parent = parent.getTreeParent?.();
//            continue;
//        }

//        // посчитаем сколько детей помечено done и средний прогресс
//        let doneCount = 0;
//        let sumProgress = 0;
//        children.forEach(ch => {
//            const d = ch.getData?.();
//            if (d?.done) doneCount++;
//            sumProgress += typeof d?.progress === "number" ? d.progress : 0;
//        });

//        const total = children.length;
//        const allDone = doneCount === total;
//        const avgProgress = total ? Math.round(sumProgress / total) : 0;

//        parent.update?.({
//            done: allDone,
//            progress: avgProgress,
//        });

//        // идём выше
//        parent = parent.getTreeParent?.();
//    }
//}




//const TabulatorTableView = ({ data }) => {
//    const tableRef = useRef(null);
//    const tabulatorRef = useRef(null);

//    const [treeMode, setTreeMode] = useState(true);
//    // Фильтр по глубине
//    const [minDepth, setMinDepth] = useState(0);
//    const [maxDepth, setMaxDepth] = useState(5);

//    // Функция для добавления глубины каждому элементу
//    //const addDepth = (nodes, depth = 0) =>
//    //    nodes.map(node => ({
//    //        ...node,
//    //        depth,
//    //        ...(node.children && node.children.length > 0
//    //            ? { children: addDepth(node.children, depth + 1) }
//    //            : {}) // ← не добавляем пустой children
//    //    }));

//    function sliceTreeByDepth(nodes, minDepth, maxDepth, depth = 0) {
//        let result = [];

//        for (const node of nodes) {
//            // Если глубина больше максимальной - полностью пропускаем узел и всех его потомков
//            if (depth > maxDepth) continue;

//            const slicedChildren = node.children
//                ? sliceTreeByDepth(node.children, minDepth, maxDepth, depth + 1)
//                : [];

//            // Узел в диапазоне допустимых глубин
//            if (depth >= minDepth) {
//                const out = {
//                    ...node,
//                    depth,
//                };

//                // Добавляем детей только если они есть И если текущая глубина меньше максимальной
//                if (depth < maxDepth && slicedChildren.length > 0) {
//                    // Важно: удаляем children у узлов, которые находятся на максимальной глубине
//                    out.children = slicedChildren;
//                } else {
//                    // Если это максимальная глубина или нет детей - явно удаляем children
//                    delete out.children;
//                }

//                result.push(out);
//            }
//            // Ниже minDepth - поднимаем детей (но только если они в допустимом диапазоне)
//            else {
//                // Поднимаем только тех детей, которые находятся в допустимом диапазоне
//                result.push(...slicedChildren);
//            }
//        }

//        return result;
//    }

//    function renameColumn(e, column) {
//        const newTitle = prompt("Введите новое название столбца:", column.getDefinition().title);
//        if (newTitle) column.updateDefinition({ title: newTitle });
//    }



//    useEffect(() => {
//        if (!tableRef.current) return;

//        // Уничтожаем предыдущую таблицу, если она есть
//        if (tabulatorRef.current) {
//            tabulatorRef.current.destroy();
//            tabulatorRef.current = null;
//        }

//        // Подготовка данных с глубиной и фильтрацией
//        //const depthData = addDepth(data);
//        const slicedData = sliceTreeByDepth(
//            data,
//            minDepth,
//            maxDepth
//        );

//        // выбор режима
//        const tableData = treeMode
//            ? slicedData
//            : flattenTree(data, 0, minDepth, maxDepth);



//        // Кэш для глубокой фильтрации
//        let deepMatchHeaderFilterStatusMap = {};

//        // Глубокая фильтрация дерева (взято из issue #3020, адаптировано под ваш field = "name")
//        function deepMatchHeaderFilter(headerValue, rowValue, rowData, filterParams) {
//            if (!headerValue) return true;

//            // Кэш по уникальному ID
//            const cachedStatus = deepMatchHeaderFilterStatusMap[rowData.id];
//            if (cachedStatus != null) {
//                return cachedStatus;
//            }

//            const columnName = filterParams.columnName || "name";

//            // Проверяем потомков рекурсивно
//            let anyChildMatch = false;
//            if (rowData.children && rowData.children.length > 0) {
//                for (const child of rowData.children) {
//                    const childMatch = deepMatchHeaderFilter(headerValue, child[columnName], child, filterParams);
//                    if (childMatch) {
//                        anyChildMatch = true;
//                        break;
//                    }
//                }
//            }

//            // Кэшируем промежуточный результат для потомков
//            deepMatchHeaderFilterStatusMap[rowData.id] = anyChildMatch;

//            // Если хотя бы один потомок подошёл → показываем текущий узел
//            if (anyChildMatch) {
//                return true;
//            }

//            // Иначе проверяем текущий узел
//            if (rowValue != null && rowValue.toString().toLowerCase().includes(headerValue.toLowerCase())) {
//                return true;
//            }

//            return false;
//        }


//        const table = new Tabulator(tableRef.current, {
//            data: tableData,
//            layout: "fitData",
//            height: "100%",
//            //movableRows: true,
//            //movableRowsHandle: true, // режим ручки
//            rowHeader: {
//                headerSort: false,
//                minWidth: 40,
//                width: 40,
//                frozen: true,
//                //    rowHandle: true,
//                //    formatter: "rownum"
//            },
//            movableColumns: true,
//            resizableColumns: true,
//            //selectableRange: true,
//            //selectableRangeRows: true, !!!!!!!!!!!!!
//            responsiveLayout: "hide",
//            //resizableColumnFit: true,
//            layoutColumnsOnNewData: true,
//            pagination: true,
//            paginationSize: 5,
//            paginationCounter: "rows",
//            paginationButtonCount: 5,
//            //footerElement: "<div id='row-counter' style='text-align:right; padding:6px; font-size:0.9em; color:#555;'></div>",

//            //spreadsheet: true,
//            dataTree: true,
//            dataTreeFilter: true, // Включаем фильтрацию по дереву
//            //dataTreeFilterRecursive: true, // Искать рекурсивно во всех дочерних элементах
//            //dataTreeFilterMode: "full",
//            dataFiltered: function () {
//                // Сброс кэша после фильтрации
//                deepMatchHeaderFilterStatusMap = {};
//            },
//            dataTreeStartExpanded: false,
//            dataTreeChildField: "children", // tabulator по умолчанию ищет _children
//            dataTreeExpandElement: "<span style='font-size:24px; color:#000; cursor:pointer; user-select:none;'>＋</span>",
//            dataTreeCollapseElement: "<span style='font-size:24px; color:#000; cursor:pointer; user-select:none;'>－</span>",
//            history: true,
//            //columnDefaults: {  tooltip: true, },

//            // Также настраиваем глобальную фильтрацию
//            initialFilter: [], // Сбрасываем начальные фильтры
//            columns: [
//                //{
//                //    title: "#",
//                //    //formatter: "rownum",
//                //    hozAlign: "center",
//                //    width: 50,
//                //    headerSort: false,
//                //    resizable: false,
//                //    frozen: true,
//                //    formatter: function (cell) {
//                //        if (!treeMode) {
//                //            return cell.getRow().getPosition(true); // просто порядковый номер при плоском виде
//                //        }

//                //        let row = cell.getRow();
//                //        let numberParts = [];

//                //        while (row) {
//                //            const parent = row.getTreeParent();
//                //            if (parent) {
//                //                const siblings = parent.getTreeChildren();
//                //                const index = siblings.indexOf(row) + 1;
//                //                numberParts.unshift(index);
//                //                row = parent;
//                //            } else {
//                //                const roots = row.getTable().getRows();
//                //                const index = roots.indexOf(row) + 1;
//                //                numberParts.unshift(index);
//                //                break;
//                //            }
//                //        }

//                //        return numberParts.join(".");
//                //    },

//                //},
//                {
//                    title: "Название",
//                    field: "name",
//                    editor: "input",
//                    headerFilter: "input",
//                    headerFilterLiveFilter: false,
//                    headerFilterFunc: treeMode ? deepMatchHeaderFilter : undefined,
//                    headerFilterFuncParams: { columnName: "name" },
//                    headerDblClick: renameColumn,
//                    //headerMenu: ".",

//                },
//                { title: "Описание", field: "description", editor: "input", headerFilter: "input", headerDblClick: renameColumn },
//                { title: "Specific", field: "specific", editor: "input", headerFilter: "input", headerDblClick: renameColumn },
//                {
//                    title: "Measurable",
//                    field: "measurable",
//                    editor: "input",
//                    headerFilter: "input",
//                    headerDblClick: renameColumn,
//                    bottomCalc: "avg",
//                    bottomCalcFormatter: "money",
//                    bottomCalcFormatterParams: { precision: 1 },
//                },
//                { title: "Achievable", field: "achievable", editor: "input", headerFilter: "input", headerDblClick: renameColumn },
//                { title: "Relevant", field: "realistic", editor: "input", headerFilter: "input", headerDblClick: renameColumn },
//                { title: "Time-bound", field: "timebound", editor: "input", headerFilter: "input", headerDblClick: renameColumn },

//                {
//                    title: "✔",
//                    field: "done",
//                    hozAlign: "center",
//                    formatter: "tickCross",
//                    editor: false, // убран editor — обрабатываются нажатия для целой клетки
//                    headerFilter: "tickCross",
//                    headerDblClick: renameColumn,
//                    cellClick: function (e, cell) {
//                        const row = cell.getRow();
//                        const newValue = !cell.getValue();

//                        // 1) атомарно выставляем всем потомкам (включая эту строку) новое состояние
//                        setDoneRecursively(row, newValue);

//                        // 2) пересчитываем родителей вверх (опираясь на данные детей)
//                        if (treeMode) {
//                            recomputeParentChain(row);

//                            // 3) чуть позже — подстраиваем рендер (даём Tabulator'у время применить updates),
//                            //    и делаем reformat у строки и её родителя(ей) чтобы отрисовка была корректной.
//                            setTimeout(() => {
//                                try {
//                                    const table = row.getTable();
//                                    // Принудительная перерисовка: redraw — если доступна
//                                    if (typeof table.redraw === "function") table.redraw(true);
//                                } catch (err) {
//                                    // noop
//                                }

//                                // Перерисовываем эту строку и цепочку родителей (чтобы обновились tickCross и прогресс)
//                                row.reformat();
//                                let p = row.getTreeParent();
//                                while (p) {
//                                    p.reformat();
//                                    p = p.getTreeParent();
//                                }
//                            }, 0);
//                        }

//                    }

//                },
//                {
//                    title: "Прогресс",
//                    field: "progress",
//                    headerDblClick: renameColumn,
//                    formatter: function (cell) {
//                        const row = cell.getRow();
//                        const children = row.getTreeChildren();

//                        // Если это листовой узел (без детей)
//                        if (!children || children.length === 0) {
//                            const data = row.getData();
//                            return data.done ? "100%" : "0%";
//                        }

//                        // Если это родительский узел
//                        const doneCount = children.filter(ch => ch.getData().done).length;
//                        const percent = Math.round((doneCount / children.length) * 100);

//                        return `<div style="background:#ddd; border-radius:4px; width:100%; height:16px; position:relative;">
//                                <div style="background:#4caf50; width:${percent}%; height:100%; border-radius:4px;"></div>
//                                <span style="position:absolute; top:0; left:50%; transform:translateX(-50%); font-size:11px; color:#000;">
//                                ${percent}%
//                                </span>
//                            </div>`;
//                    }
//                },

//                //{ title: "Новый столбец", field: "new", editor: "input", headerFilter: "input" },


//            ],
//        });

//        tabulatorRef.current = table;
//        return () => table.destroy();

//    }, [data, treeMode, minDepth, maxDepth]);


//    const [treeMenuOpen, setTreeMenuOpen] = useState(false);
//    const [exportMenuOpen, setExportMenuOpen] = useState(false);



//    return (
//        <div
//            style={{
//                display: "flex",
//                flexDirection: "column",
//                height: "100%",
//                width: "100%",
//                overflow: "hidden",
//                minHeight: 0
//            }}
//        >
//            {/* toolbar */}
//            <div
//                style={{
//                    marginTop: 8,
//                    marginBottom: 10,
//                    display: "flex",
//                    gap: 8,
//                    flexWrap: "wrap",
//                    flexShrink: 0,
//                }}
//            >
//                <button onClick={() => tabulatorRef.current.undo()}>↩️</button>
//                <button onClick={() => tabulatorRef.current.redo()}>↪️</button>

//                {/* Дерево */}
//                <div style={{ position: "relative" }}>
//                    <button onClick={() => setTreeMenuOpen(!treeMenuOpen)}>
//                        📂 Дерево ▼
//                    </button>

//                    {treeMenuOpen && (
//                        <div
//                            style={{
//                                position: "absolute",
//                                top: "100%",
//                                left: 0,
//                                zIndex: 10,
//                                display: "flex",
//                                flexDirection: "column",
//                                //background: "#fff",
//                                //border: "1px solid",
//                            }}
//                        >
//                            <button
//                                onClick={() => {
//                                    //tabulatorRef.current.getRows().forEach(r => r.treeExpand());
//                                    expandAllRows(tabulatorRef.current.getRows());
//                                    setTreeMenuOpen(false);
//                                }}
//                            >
//                                📂 Развернуть всё
//                            </button>

//                            <button
//                                onClick={() => {
//                                    //tabulatorRef.current.getRows().forEach(r => r.treeCollapse());
//                                    collapseAllRows(tabulatorRef.current.getRows());
//                                    setTreeMenuOpen(false);
//                                }}
//                            >
//                                📁 Свернуть всё
//                            </button>
//                        </div>
//                    )}
//                </div>

//                {/* Экспорт */}
//                <div style={{ position: "relative" }}>
//                    <button onClick={() => setExportMenuOpen(!exportMenuOpen)}>
//                        📊 Экспорт ▼
//                    </button>

//                    {exportMenuOpen && (
//                        <div
//                            style={{
//                                position: "absolute",
//                                top: "100%",
//                                left: 0,
//                                zIndex: 10,
//                                display: "flex",
//                                flexDirection: "column",
//                                //background: "#fff",
//                                //border: "1px solid #ccc",
//                            }}
//                        >
//                            <button
//                                onClick={() => {
//                                    tabulatorRef.current.download("xlsx", "goals.xlsx");
//                                    setExportMenuOpen(false);
//                                }}
//                            >
//                                Excel
//                            </button>

//                            <button
//                                onClick={() => {
//                                    tabulatorRef.current.download("csv", "goals.csv");
//                                    setExportMenuOpen(false);
//                                }}
//                            >
//                                CSV
//                            </button>
//                        </div>
//                    )}
//                </div>

//                <button onClick={() => tabulatorRef.current?.clearHeaderFilter()}>
//                    🔄 Сброс фильтров
//                </button>

//                <button
//                    onClick={() => {
//                        const title = prompt("Название нового столбца:");
//                        if (!title) return;

//                        tabulatorRef.current
//                            .addColumn({
//                                title,
//                                field: title.toLowerCase().replace(/\s+/g, "_"),
//                                editor: "input",
//                                headerFilter: "input",
//                            })
//                            .then(() => tabulatorRef.current.redraw(true));
//                    }}
//                >
//                    ➕ Добавить столбец
//                </button>

//                <button
//                    onClick={() => setTreeMode(prev => !prev)}
//                    className="px-3 py-1 bg-blue-500 text-white rounded"
//                >
//                    {treeMode ? "Показать как список" : "Показать как дерево"}
//                </button>
//            </div>

//            {/* фильтры глубины */}
//            <div
//                style={{
//                    display: "flex",
//                    alignItems: "center",
//                    gap: 8,
//                    marginBottom: 10,
//                    flexShrink: 0,
//                }}
//            >
//                <label>Мин. глубина:</label>
//                <input
//                    type="number"
//                    min="0"
//                    max="5"
//                    value={minDepth}
//                    onChange={e => setMinDepth(Number(e.target.value))}
//                    style={{
//                        width: 60,
//                        padding: "4px 6px",
//                        borderRadius: 4,
//                        border: "1px solid var(--tabulator-border-color, #ccc)",
//                        background: "var(--tabulator-bg-color, #fff)",
//                        color: "var(--tabulator-text-color, #000)",
//                    }}
//                />

//                <label>Макс. глубина:</label>
//                <input
//                    type="number"
//                    min="0"
//                    max="5"
//                    value={maxDepth}
//                    onChange={e => setMaxDepth(Number(e.target.value))}
//                    style={{
//                        width: 60,
//                        padding: "4px 6px",
//                        borderRadius: 4,
//                        border: "1px solid var(--tabulator-border-color, #ccc)",
//                        background: "var(--tabulator-bg-color, #fff)",
//                        color: "var(--tabulator-text-color, #000)",
//                    }}
//                />
//            </div>

//            {/* таблица */}
//            <div
//                ref={tableRef}
//                style={{
//                    flex: 1,
//                    minHeight: 0,
//                    width: "100%",
//                }}
//            />

//            {/* <div id="row-counter" /> */}
//        </div>
//    );

//}

//export default TabulatorTableView;
