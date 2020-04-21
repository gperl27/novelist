import React, {useEffect, useRef} from 'react';
import MonacoEditor from "react-monaco-editor";
import * as monacoEditor from 'monaco-editor';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "./modules";
import {Entity, selectEntity} from "./modules/entities";
import {EntityEditor} from "./components/EntityEditor";
import {selectContent, updateContent} from "./modules/content";

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
    const dispatch = useDispatch()
    const {content, selectedContent} = useSelector((state: RootState) => {
        const {content, selectedContentId} = state.content
        const selectedContent = state.content.content.find(c => c.id === selectedContentId)

        return {
            selectedContent,
            content
        }
    })

    const {entities} = useSelector((state: RootState) => state.entities)
    const keyEntities = useKeyEntities()
    const monacoRef = useRef<typeof monacoEditor>()
    const ref = useRef<MonacoEditor>(null)

    function editorWillMount(monaco: typeof monacoEditor) {
        monacoRef.current = monaco
    }

    function EntityDirectory() {
        return (
            <div>
                {entities.map(entity => {
                    return <div onClick={() => dispatch(selectEntity(entity.id))} key={entity.name}>{entity.name}</div>
                })}
            </div>
        )
    }

    function ContentDirectory() {
        return (
            <div>
                {content.map(cont => {
                    return <div onClick={() => dispatch(selectContent(cont.id))} key={cont.id}>{cont.name}</div>
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
        const providerMap = keyEntities.map(entity => {
            const commandId = ref?.current?.editor?.addCommand(0, function () {
                dispatch(selectEntity(entity.id))
            }, '');

            const provider = monacoRef?.current?.languages.registerCodeLensProvider('markdown', {
                provideCodeLenses: function (model, token) {
                    const matches = model
                        .findMatches(
                            entity.name,
                            true,
                            false,
                            true,
                            null,
                            true,
                        )
                        .reduce((acc, current) => {
                            const dupe = acc.find(item => item.range.startLineNumber === current.range.startLineNumber);

                            if (!dupe) {
                                return acc.concat([current]);
                            }

                            return acc;
                        }, [] as monacoEditor.editor.FindMatch[]);

                    const lenses: monacoEditor.languages.CodeLens[] = matches.map((match) => {
                        return {
                            range: match.range,
                            command: {
                                id: commandId ?? '',
                                title: `@${entity.name}`
                            }
                        }
                    })

                    return {
                        dispose: () => {
                        },
                        lenses
                    };
                }
            });

            return {provider}
        })

        return () => {
            providerMap.forEach(provider => {
                provider.provider?.dispose()
            })
        }
    }, [dispatch, keyEntities])

    return (
        <div>
            <div style={{display: 'flex'}}>
                <div style={{flex: 1}}>
                    <Directory/>
                </div>
                <div style={{flex: 2}}>
                    <MonacoEditor
                        onChange={(text) => {
                            if (selectedContent) {
                                dispatch(updateContent({
                                    ...selectedContent,
                                    text
                                }))
                            }
                        }}
                        ref={ref}
                        value={selectedContent?.text ?? ''}
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
                <div style={{flex: 1.5}}>
                    <EntityEditor/>
                </div>
            </div>
        </div>
    );
}

export default App;
