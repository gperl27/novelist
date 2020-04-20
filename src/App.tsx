import './App.css'
import React, {useEffect, useRef, useState} from 'react';
import MonacoEditor from "react-monaco-editor";
import * as monacoEditor from 'monaco-editor';
import {useSelector} from "react-redux";
import {RootState} from "./modules";
import {Entity} from "./modules/entities";

// git file dir
// characters/{Name}.md
// chapters/{Chapter}.md

function useKeyEntities() {
    const {entities} = useSelector((state: RootState) => state.entities)

    const keyEntities: Entity[] = []

    entities.forEach(entity => {
        entity.entities.forEach(entity => {
            keyEntities.push(entity)
        })
    })

    return keyEntities
}

function App() {
    const {content} = useSelector((state: RootState) => state.content)
    const {entities} = useSelector((state: RootState) => state.entities)
    const keyEntities = useKeyEntities()

    const [value, setValue] = useState('')
    const [isPressingDown, setIsPressingDown] = useState(false)
    const monacoRef = useRef<typeof monacoEditor>()
    const ref = useRef<MonacoEditor>(null)

    function editorWillMount(monaco: typeof monacoEditor) {
        monacoRef.current = monaco
    }

    function EntityDirectory() {
        return (
            <div>
                {entities.map(entity => {
                    return <div key={entity.name}>{entity.name}</div>
                })}
            </div>
        )
    }

    function ContentDirectory() {
        return (
            <div>
                {content.map(cont => {
                    return <div onClick={() => setValue(cont.text)} key={cont.name}>{cont.name}</div>
                })}
            </div>
        )
    }

    function Directory() {
        return (
            <div>
                <div style={{padding: '1rem', border: '1px solid red'}}>
                    <EntityDirectory/>
                </div>
                <div style={{padding: '1rem', border: '1px solid blue'}}>
                    <ContentDirectory/>
                </div>
            </div>
        )
    }


    useEffect(() => {
        function createDependencyProposals(range: monacoEditor.IRange) {
            return keyEntities
                .filter(entity => entity.shouldAutoComplete)
                .map(entity => {
                    return {
                        label: entity.name,
                        kind: monacoEditor.languages.CompletionItemKind.Function,
                        insertText: entity.name,
                        range
                    }
                })
        }

        const hover = monacoRef?.current?.languages.registerHoverProvider('markdown', {
            provideHover: function (model, position) {

                const contents = keyEntities
                    .filter(entity => model.getWordAtPosition(position)?.word === entity.name)
                    .map(entity => {
                        return {
                            value:
                                "Cmd + click to go to " + entity.name + "\n\n" +
                                "## *" + entity.name + " docs here*"
                        }
                    })

                return {
                    contents
                }
            },
        });

        const completion = monacoRef?.current?.languages.registerCompletionItemProvider('markdown', {
            provideCompletionItems: function (model, position) {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };
                return {
                    suggestions: createDependencyProposals(range)
                };
            }
        });

        return () => {
            hover?.dispose()
            completion?.dispose()
        }
    }, [keyEntities])

    useEffect(() => {
        ref?.current?.editor?.focus()
    }, [entities])

    useEffect(() => {
        const providerMap = keyEntities
            .map(entity => {
                const lib = `Go to ${entity.name}`
                const uri = monacoRef?.current?.Uri.file(`${entity.name}.md`);
                const model = monacoRef?.current?.editor.createModel(lib, "markdown", uri);

                const provider = monacoRef?.current?.languages.registerDefinitionProvider('markdown', {
                    provideDefinition(model, position, token) {
                        // @ts-ignore
                        const matches = model.findMatches(entity.name)

                        // @ts-ignore
                        return matches.map(m => {
                            return {
                                uri,
                                // @ts-ignore
                                range: m.range
                            }
                        })
                    }
                })

                return {
                    model, provider
                }
            })

        return () => {
            providerMap.forEach(provider => {
                provider.model?.dispose()
                provider.provider?.dispose()
            })
        }
    }, [value, keyEntities])

    useEffect(() => {
        const editor = ref?.current?.editor

        const keyDown = editor?.onKeyDown(e => {
            if (e.keyCode === 57) {
                setIsPressingDown(true)
            }
        })

        const keyUp = editor?.onKeyUp(e => {
            if (e.keyCode === 57) {
                setIsPressingDown(false)
            }
        })

        const mouseDownListeners = keyEntities.map(entity => {
            return editor?.onMouseDown(function (e) {
                if (isPressingDown) {
                    if (e.target.element?.textContent === entity.name) {
                        console.log('weve got a match baby', 'fire an event')
                    }
                }
            });
        })

        return () => {
            keyDown?.dispose()
            keyUp?.dispose()
            mouseDownListeners.forEach(listener => listener?.dispose())
        }
    }, [isPressingDown, keyEntities])

    return (
        <div>
            <button onClick={() => {
                setIsPressingDown(false)
                setValue(v => v.replace(new RegExp('Kubo', 'g'), "Greg"))
            }}>
                Update chars
            </button>
            <div style={{display: 'flex'}}>
                <Directory/>
                <MonacoEditor
                    ref={ref}
                    onChange={(newValue, e) => {
                        setValue(newValue)
                    }}
                    value={value}
                    width="800"
                    height="600"
                    language="markdown"
                    theme="vs-dark"
                    editorWillMount={editorWillMount}
                    options={{
                        contextmenu: false,
                        gotoLocation: {
                            multiple: "goto",
                            multipleDeclarations: "goto",
                            multipleDefinitions: "goto",
                            multipleImplementations: "goto",
                            multipleReferences: "goto",
                            multipleTypeDefinitions: "goto"
                        }
                    }}
                />
            </div>
        </div>
    );
}

export default App;
