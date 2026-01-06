import React from "react";
import { SlickgridReact } from "react-slickgrid";

export default function DataSlickGridView() {
    const columnDefinitions = [
        { id: "id", name: "ID", field: "id", sortable: true },
        { id: "title", name: "Название", field: "title", sortable: true },
        { id: "duration", name: "Длительность", field: "duration", sortable: true },
        { id: "percentComplete", name: "% Готовности", field: "percentComplete", sortable: true },
    ];

    const dataset = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        title: `Задача ${i + 1}`,
        duration: `${Math.round(Math.random() * 10)} дней`,
        percentComplete: Math.round(Math.random() * 100),
    }));

    const gridOptions = {
        enableSorting: true,
        enablePagination: true,
        pagination: {
            pageSizes: [5, 10, 25],
            pageSize: 10,
        },
        enableAutoResize: true,
        enableColumnReorder: true,
    };

    return (
        <div style={{ height: 500 }}>
            <SlickgridReact
                gridId="tasksGrid"
                columnDefinitions={columnDefinitions}
                gridOptions={gridOptions}
                dataset={dataset}
            />
        </div>
    );
}
