import React, { useState, useEffect, useRef } from "react";

import AntDesignTableView from "./tables/AntDesignTableView.jsx";
import PrimeTableView from "./tables/PrimeTableView.jsx";
import TabulatorTableView from "./tables/TabulatorTableView.jsx";

import AntVGraphView from "./AntVGraphView.jsx"
import ReactFlowGraphView from "./ReactFlowGraphView.jsx"

import { Tabs, Tab, Box, useMediaQuery, CssBaseline, ThemeProvider, createTheme } from "@mui/material";

// --- slickgrid-react ---
//import DataSlickGridView from "./DataSlickGridView.jsx";


const DataViewSwitcher = () => {
    const [tabIndex, setTabIndex] = useState(0);
    const [view, setView] = useState("treegrid");
    const [data, setData] = useState([]);
    const graphRef = useRef(null);


    // Авто-тема: светлая или тёмная
    const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
    const theme = createTheme({
        palette: {
            mode: prefersDarkMode ? "dark" : "light",
        },
    });

    useEffect(() => {
        const sampleData = [
            {
                id: "1",
                name: "Основная цель",
                description: "Увеличение продаж",
                specific: "Да",
                measurable: "10",
                achievable: "Да",
                realistic: "9/10",
                timebound: "2025-12-31",
                children: [
                    {
                        id: "6",
                        name: "Подцель 1",
                        description: "Увеличение клиентской базы",
                        specific: "Да",
                        measurable: "15",
                        achievable: "Нет",
                        realistic: "7/10",
                        timebound: "2025-06-30",
                        children: [
                            {
                                id: "7",
                                name: "подподцель",
                                description: "Увеличение лояльности",
                                specific: "Да",
                                measurable: "10",
                                achievable: "Да",
                                realistic: "9/10",
                                timebound: "2025-12-31",
                            },
                            {
                                id: "9",
                                name: "подподцель 2",
                                description: "Увеличение лояльности",
                                specific: "Да",
                                measurable: "10",
                                achievable: "Да",
                                realistic: "9/10",
                                timebound: "2025-12-31",
                            },
                        ],
                    },
                    {
                        id: "8",
                        name: "Подцель ещё",
                        description: "Увеличение клиентской базы",
                        specific: "Да",
                        measurable: "15",
                        achievable: "Нет",
                        realistic: "7/10",
                        timebound: "2025-06-30",
                    },
                ],
            },
            {
                id: "3",
                name: "Основная цель 2",
                description: "Увеличение продаж",
                specific: "Да",
                measurable: "10",
                achievable: "Да",
                realistic: "9/10",
                timebound: "2025-12-31",
                children: [
                    {
                        id: "4",
                        name: "Подцель 2",
                        description: "Увеличение клиентской базы",
                        specific: "Да",
                        measurable: "15",
                        achievable: "Нет",
                        realistic: "7/10",
                        timebound: "2025-06-30",
                    }
                ],
            },
            {
                id: "5",
                name: "Основная цель 3",
                description: "Увеличение продаж",
                specific: "Да",
                measurable: "10",
                achievable: "Да",
                realistic: "9/10",
                timebound: "2025-12-31",
            },
        ];
        setData(sampleData);
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100vh",
                    width: "100%",
                    overflow: "hidden",
                }}
            >
                {/* HEADER */}
                <Box
                    sx={{
                        px: 2,
                        py: 1,
                        borderBottom: "1px solid #ccc",
                        flexShrink: 0,
                    }}
                >
                    <Box sx={{ fontSize: 24, fontWeight: "bold", mb: 1 }}>
                        SMART+
                    </Box>

                    <Tabs
                        value={tabIndex}
                        onChange={(e, v) => setTabIndex(v)}
                        variant="scrollable"
                        scrollButtons
                    >
                        <Tab label="Tabulator" />
                        <Tab label="ReactFlow граф" />
                    </Tabs>
                </Box>

                {/* CONTENT */}
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,      // ✅ ОБЯЗАТЕЛЬНО для flex
                        overflow: "hidden"
                    }}
                >
                    {tabIndex === 0 && (
                        <TabulatorTableView data={data} />
                    )}

                    {tabIndex === 1 && (
                        <ReactFlowGraphView data={data} />
                    )}
                </Box>
            </Box>

        </ThemeProvider>
    );
};

export default DataViewSwitcher;


{/*<div>*/ }
{/*    <button onClick={() => setView("anttable")} style={{ marginRight: 8 }}>*/ }
{/*        Ant Design*/ }
{/*    </button>*/ }
{/*    <button onClick={() => setView("primetable")} style={{ marginRight: 8 }}>*/ }
{/*        PrimeReact*/ }
{/*    </button>*/ }
{/*    <button onClick={() => setView("tabulator")} style={{ marginRight: 8 }}>*/ }
{/*        Tabulator*/ }
{/*    </button>*/ }
{/*    <button onClick={() => setView("graph")}>Граф (AntV G6)</button>*/ }
{/*    <button onClick={() => setView("slickgrid")}>slickgrid</button>*/ }
{/*</div>*/ }

{/* --- Контент выбранной вкладки --- */ }
{/*<main style={{ flex: 1, overflow: "auto", padding: 10 }}>*/ }
{/*    {view === "anttable" && <AntDesignTableView data={data} />}*/ }
{/*    {view === "primetable" && <PrimeTableView data={data} />}*/ }
{/*    {view === "tabulator" && <TabulatorTableView data={data} />}*/ }
{/*    {view === "graph" && <div id="graph-container" style={{ width: "100%", height: "100%" }} />}*/ }
{/*</main>*/ }


{/* --- slickgrid --- */ }
{/*{view === "slickgrid" &&*/ }
{/*    (*/ }
{/*    <DataSlickGridView />*/ }
{/*    )*/ }
{/*}*/ }