import React from 'react';
import MonacoEditor from "react-monaco-editor";

function App() {
    return (
        <div>
            <MonacoEditor
                width="800"
                height="600"
                language="javascript"
                theme="vs-dark"
            />
        </div>
    );
}

export default App;
