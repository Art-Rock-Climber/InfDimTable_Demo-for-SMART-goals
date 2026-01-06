//import React from "react";
//import { DataTable } from "primereact/datatable";
//import { Column } from "primereact/column";

//import "primereact/resources/themes/lara-light-blue/theme.css";
//import "primereact/resources/primereact.min.css";
//import "primeicons/primeicons.css";

import React, { useState, useEffect } from "react";
import { TreeTable } from "primereact/treetable";
import { Column } from "primereact/column";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

const PrimeTableView = () => {
    const [nodes, setNodes] = useState([]);

    useEffect(() => {
        const sampleData = [
            {
                key: "1",
                data: {
                    name: "Основная цель",
                    description: "Увеличение продаж",
                    specific: "Да",
                    measurable: "10%",
                    achievable: "Да",
                    realistic: "9/10",
                    timebound: "2025-12-31",
                },
                children: [
                    {
                        key: "2",
                        data: {
                            name: "Подцель 1",
                            description: "Увеличение клиентской базы",
                            specific: "Да",
                            measurable: "15%",
                            achievable: "Нет",
                            realistic: "7/10",
                            timebound: "2025-06-30",
                        },
                    },
                ],
            },
            {
                key: "3",
                data: {
                    name: "Основная цель 2",
                    description: "Увеличение продаж",
                    specific: "Да",
                    measurable: "10%",
                    achievable: "Да",
                    realistic: "9/10",
                    timebound: "2025-12-31",
                },
            },
        ];
        setNodes(sampleData);
    }, []);

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <TreeTable value={nodes} tableStyle={{ minWidth: "60rem" }} style={{ height: "100%" }}>
                <Column field="name" header="Название" />
                <Column field="description" header="Описание" />
                <Column field="specific" header="Конкретность" />
                <Column field="measurable" header="Измеримость" />
                <Column field="achievable" header="Достижимость" />
                <Column field="realistic" header="Реалистичность" />
                <Column field="timebound" header="Срок" />
            </TreeTable>
        </div>
    );
};

export default PrimeTableView;

