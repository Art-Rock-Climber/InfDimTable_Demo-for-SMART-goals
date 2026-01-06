import React from 'react';
import DataViewSwitcher from './components/DataViewSwitcher.jsx';


import 'primereact/resources/themes/lara-light-blue/theme.css';  // тема
import 'primereact/resources/primereact.min.css';                // базовые стили
//import 'primeicons/primeicons.css';                              // иконки


function App() {
    return (
        <div style={{ padding: 10 }}>
            <DataViewSwitcher />
        </div>
    );
}

export default App;

