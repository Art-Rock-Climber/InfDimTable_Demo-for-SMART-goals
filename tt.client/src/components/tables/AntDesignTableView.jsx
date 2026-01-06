import React from "react";
import { Table } from "antd";
import "antd/dist/reset.css";


const AntDesignTableView = ({ data }) => {
    const columns = [
        { title: "Название", dataIndex: "name", key: "name" },
        { title: "Описание", dataIndex: "description", key: "description" },
        { title: "Конкретность", dataIndex: "specific", key: "specific" },
        { title: "Измеримость", dataIndex: "measurable", key: "measurable" },
        { title: "Достижимость", dataIndex: "achievable", key: "achievable" },
        { title: "Реалистичность", dataIndex: "realistic", key: "realistic" },
        { title: "Срок", dataIndex: "timebound", key: "timebound" },
    ];

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Table columns={columns} scroll={{ y: "100%" }} dataSource={data} rowKey="id" expandable={{ childrenColumnName: "children" }} />
        </div>
    );
};

export default AntDesignTableView;
